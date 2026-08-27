---
name: task
description: End-to-end orchestrated workflow for a single feature/bugfix/refactor request on Les Bons Comptes — clean-baseline check, plan approval, implementation, verification, simplify, code-review, recap approval, branch+PR (or direct-to-main on explicit request).
---

Usage: `/task <free-text description>` — e.g.
`/task Ajouter un bouton pour annuler la derniere manche saisie`.
Add "push direct sur main" (or equivalent) to the description to use the
direct-to-main path instead of the default branch+PR path.

Les Bons Comptes is a single repo (React Native / Expo, TypeScript strict, no
backend). This orchestrates `simplify` and `code-review` into one flow with
explicit approval checkpoints. Default path: a feature branch cut from an
up-to-date `main`, pushed, then a PR opened for the user to merge themselves
— nothing lands on `main` without the user reviewing the PR. Direct-to-`main`
only happens when the `/task` description explicitly asks for it, since
pushing to `main` triggers the web auto-deploy
(`.github/workflows/deploy.yml`) immediately. Either way, commits and any
push are only made after explicit approval at the checkpoints below, so
nothing is pushed without the user having signed off on it.

## Steps

### 1. Classify and scope (read-only)

From the description, work out:
- **type**: one of `feat|fix|refactor|test|chore|docs|style|perf` — used
  for the commit type in step 11 and the branch prefix in step 4 (per root
  `CLAUDE.md`'s Conventional Commits convention).
- **push mode**: `branch-pr` (default) unless the description explicitly
  says to push directly on `main` (e.g. "push direct sur main", "direct sur
  main") — in that case `direct-main`.
- **game/area touched**: Skull King (`src/lib/scoring.ts`, `src/lib/stats.ts`,
  `src/screens/*` non-Belote), Belote (`src/lib/belote/`,
  `src/screens/Belote*`), or shared (`src/components/`, `src/theme.ts`,
  `src/lib/store.ts`, `src/lib/types.ts`, `src/lib/names.ts`) — see root
  `CLAUDE.md`'s Architecture section. Actually look at the relevant code
  first (e.g. find the existing screen/engine function for the feature)
  rather than guessing blind — a quick read of the obviously relevant files
  is enough here, this isn't a full deep investigation.
- **UI-visible?**: whether the change affects a screen/component (drives
  step 6's verification depth).

### 2. Clean-baseline check & sync

Run:
```bash
git status --short
git branch --show-current
git fetch origin main
```
Status must be empty. If not on `main`, or the tree is dirty, or `main`
can't fast-forward cleanly, stop and tell the user why — ask how they want
to proceed (switch branch, stash, abort). Never auto-stash or
auto-checkout on their behalf. If on `main` and clean, fast-forward it:
```bash
git pull --ff-only origin main
```

### 3. Plan checkpoint (AskUserQuestion)

Present, as the question context (not as options): inferred type, push mode
(branch+PR, or direct-on-main if explicitly requested), the branch name
that will be used if applicable (see step 4), game/area touched, and a
short technical approach outline (which files/functions, and whether it
touches the scoring engine, the store, or is purely presentational).

Options: "Valider tel quel" / "Ajuster" (go back into discussion with the
user, then re-present this checkpoint) / "Annuler". Do not touch any code
before this is approved.

### 4. Create branch (skip if push mode is `direct-main`)

From the now up-to-date local `main`:
```bash
git checkout -b <type>/<short-kebab-slug>
```
Slug is a short kebab-case summary of the description (2-4 words), matching
the style of existing branches in this repo (`fix/base-url-subdomain`,
`ci/eas-build-on-merge`). If push mode is `direct-main`, stay on `main`
instead.

### 5. Implementation

Do the actual work. Delegate to the `react-native-expert` subagent for
component/screen/hook work, scoring-engine changes, or anything where
clean code, TypeScript strictness, or architecture quality matter — it
already knows this repo's conventions (immutable store patches,
presentational-component rules, `src/theme.ts` tokens) and is expected to
consult `vercel-react-native-skills` and `docs/design/charte-da.md` itself
per its own instructions. Handle small/mechanical changes directly.

Respect: `src/lib/scoring.ts` / `src/lib/belote/scoring.ts` stay pure
(no store/React dependency), presentational components in
`src/components/` stay prop-driven only, French UI copy/comments match the
surrounding code.

### 6. Verification

Non-negotiable before moving to step 7:
```bash
npx tsc --noEmit
npm test
```
Both must pass — fix and re-run rather than proceeding on a red run. If
touching `src/lib/scoring.ts`, `src/lib/belote/scoring.ts`, `src/lib/stats.ts`,
or `src/lib/store.ts`, run the matching test file directly first (e.g.
`npx jest src/lib/scoring.test.ts`) to iterate faster, then the full suite.

If the change is **UI-visible** (step 1), also start the app
(`preview_start` with the `npm start`/`web` dev server) and exercise the
changed screen in the Browser pane — golden path plus the obvious edge
case — before calling this step done. Do not claim a UI change works
without having seen it render.

### 7. Simplify

Once implementation is believed complete and verified, invoke the
`simplify` skill against the changed code.

### 8. Code review

Invoke the `code-review` skill against the diff.

### 9. Code-review checkpoint (AskUserQuestion)

Summarize findings (severity + one-line summary each) in the chat, then
ask via `AskUserQuestion` how to proceed: "Corriger tous les findings" /
"Choisir lesquels corriger" (if chosen, follow up to let the user pick a
subset) / "Ignorer et continuer tel quel". Apply only what was approved,
then re-run step 6's verification if any fix touched code.

### 10. Final recap checkpoint (AskUserQuestion)

Present: files changed (grouped by concern, not a raw file list if it's
large), a one-paragraph summary of the change, and what will happen next
per push mode:
- `branch-pr`: "commit sur `<branch>`, push, puis ouverture d'une PR".
- `direct-main`: "commit et push direct sur `main` (déclenche le déploiement
  web immédiatement)".

Options: "Valider" (proceed with step 11 as described above) / "Ajuster
encore" (go back, then re-present this checkpoint) / "Annuler (pas de
commit)".

### 11. Commit, push, and PR

Group the diff into one or more logical commits (not mechanically one
commit per file, and not a single giant commit if the change has clearly
separate concerns) using Conventional Commits (`type(scope): description`,
all lowercase, no trailing period — per root `CLAUDE.md`; scope is
optional, used when it adds precision e.g. `fix(belote): ...`). Write each
title yourself from the actual staged diff of that commit — never reuse the
raw `/task` description verbatim as the title, even when a commit happens
to cover the whole request. Title only by default — no body unless
something isn't derivable from the diff (e.g. why a counterintuitive
choice was made), in which case 1-2 lines max, no bullet list. Do **not**
add a `Co-Authored-By` trailer, any other co-author trailer, or any
mention of Claude in the message.

Then, per the approved push mode:
- **`branch-pr`**: push the branch (`git push -u origin <branch>`), then
  open a PR (`gh pr create --title ... --body ...`) with a short Summary
  and a Test plan section reflecting step 6's verification. Do not merge it
  — the user merges when ready.
- **`direct-main`**: push directly (`git push origin main`).

### 12. Final report

For `branch-pr`: report the branch name, commit(s), and the PR URL, and
remind the user nothing deploys until they merge it. For `direct-main`:
report commit(s) pushed and remind the user this just triggered the web
auto-deploy to the Pi (`deploy.yml`). Either way, if the change should also
ship as an APK, mention that `npm run update-apk` is a separate, manual
step this skill does not run.
