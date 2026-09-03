---
name: task
description: End-to-end orchestrated workflow for a single feature/bugfix/refactor request on Les Bons Comptes — clean-baseline check, plan approval, implementation, verification, size-scaled code review, recap approval, branch+PR (or direct-to-main on explicit request).
---

Usage: `/task <free-text description>` — e.g.
`/task Ajouter un bouton pour annuler la derniere manche saisie`.
Add "push direct sur main" (or equivalent) to the description to use the
direct-to-main path instead of the default branch+PR path.

Les Bons Comptes is a monorepo: `apps/mobile` (React Native / Expo, TypeScript
strict), `apps/api` (Go WebSocket server, skeleton) and `packages/shared` (the
TS contract generated from the Go structs). This orchestrates `code-review`
(scaled to the diff's size and risk — see step 8) into one flow with explicit
approval checkpoints. Default
path: a feature branch cut from an
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
  for the commit type in step 13 and the branch prefix in step 5 (per root
  `CLAUDE.md`'s Conventional Commits convention).
- **push mode**: `branch-pr` (default) unless the description explicitly
  says to push directly on `main` (e.g. "push direct sur main", "direct sur
  main") — in that case `direct-main`.
- **side touched**: `mobile`, `api`, `shared`, or a combination — this picks
  which per-directory `CLAUDE.md` to read, which subagent to delegate to in
  step 6, and which gates to run in step 7. A change to
  `apps/api/internal/protocol/` is *always* `api` + `shared` (the generated
  contract must be regenerated and committed with it).
- **game/area touched** (mobile only; paths below are under `apps/mobile/`):
  Skull King (`src/lib/scoring.ts`, `src/lib/stats.ts`, `src/screens/*`
  non-Belote), Belote (`src/lib/belote/`, `src/screens/Belote*`), or
  shared (`src/components/`, `src/theme.ts`, `src/lib/store.ts`,
  `src/lib/types.ts`, `src/lib/names.ts`) — see
  `apps/mobile/CLAUDE.md`'s Architecture section. Actually look at the
  relevant code
  first (e.g. find the existing screen/engine function for the feature)
  rather than guessing blind — a quick read of the obviously relevant files
  is enough here, this isn't a full deep investigation. If the relevant
  site isn't obvious from the description alone (multiple candidate
  files/functions, or an unfamiliar area of the codebase), delegate the
  lookup to `cavecrew-investigator` instead of grepping around inline —
  its compressed `path:line — symbol` output is cheaper on main context
  than reading full files yourself for a pure lookup.
- **UI-visible?**: whether the change affects a screen/component (drives
  step 7's verification depth).

### 2. Grill-me: specify the feature (AskUserQuestion)

A free-text `/task` description usually under-specifies product behavior —
don't fill those gaps by guessing. Before drafting any technical plan, look
for the decisions the description leaves open (exact UX/copy, where the
control lives, behavior on edge cases — first entry, empty state, an already
finished game, offline/AsyncStorage edge cases, which of the two games it
applies to, whether existing saved games need to keep working) and put them
to the user via `AskUserQuestion` — a small batch of targeted questions
(1-4 at a time; ask another round if answers open new ones), not one giant
open-ended question. Keep questions concrete and closed where possible
(offer the options you'd otherwise have picked yourself), and prefer your
own best-guess default as the first/recommended option.

Skip this step only when the description already fully pins down the
behavior — a precise bug fix with an unambiguous expected result, a copy or
constant tweak, a mechanical refactor with no behavior change. When in
doubt, grill rather than assume: this step is about product/feature
decisions, not the technical approach — that's step 4's plan checkpoint,
which should already reflect what got settled here.

### 3. Clean-baseline check & sync

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

### 4. Plan checkpoint (AskUserQuestion)

Present, as the question context (not as options): inferred type, push mode
(branch+PR, or direct-on-main if explicitly requested), the branch name
that will be used if applicable (see step 5), side and game/area touched, and
a short technical approach outline (which files/functions, and whether it
touches the scoring engine, the store, the Go hub, or is purely
presentational).

Options: "Valider tel quel" / "Ajuster" (go back into discussion with the
user, then re-present this checkpoint) / "Annuler". Do not touch any code
before this is approved.

### 5. Create branch (skip if push mode is `direct-main`)

From the now up-to-date local `main`:
```bash
git checkout -b <type>/<short-kebab-slug>
```
Slug is a short kebab-case summary of the description (2-4 words), matching
the style of existing branches in this repo (`fix/base-url-subdomain`,
`ci/eas-build-on-merge`). If push mode is `direct-main`, stay on `main`
instead.

### 6. Implementation

Do the actual work, delegating by side:

- **`mobile`** — delegate to the `react-native-expert` subagent for
  component/screen/hook work, scoring-engine changes, or anything where
  clean code, TypeScript strictness, or architecture quality matter — it
  already knows this repo's conventions (immutable store patches,
  presentational-component rules, `src/theme.ts` tokens) and is expected to
  consult `vercel-react-native-skills` and `docs/design/charte-da.md` itself
  per its own instructions.
- **`api`** — delegate to the `go-expert` subagent for all of it, including
  `apps/api/internal/hub/` and `internal/game/` concurrency (goroutines,
  channels, `select`, shared state). This used to be a hand-write-only zone
  for the user's Go learning exercise; that's retired, the user now learns Go
  on a separate project and needs this one shipped. See `apps/api/CLAUDE.md`.
- **`shared`** — never hand-edit `packages/shared/src/generated/`. Change the
  Go struct in `apps/api/internal/protocol/`, run `make generate`, and commit
  both together.

Handle small/mechanical changes directly.

Respect: `apps/mobile/src/lib/scoring.ts` /
`apps/mobile/src/lib/belote/scoring.ts` stay pure (no store/React dependency),
presentational components in `apps/mobile/src/components/` stay prop-driven
only, French UI copy/comments match the surrounding code.

For a small/mechanical change where the exact site is already known and it
touches at most 2 files (a copy tweak, a constant, a one-line logic fix),
delegate to `cavecrew-builder` instead of editing inline — it edits, re-reads
to verify, and reports back in a few compressed lines rather than the full
diff context. Don't chain it after `cavecrew-investigator` for anything
bigger than that — it'll just return `too-big.` and the turn is wasted;
go straight to `react-native-expert` or handle it in the main thread
instead.

### 7. Verification

Non-negotiable before moving to step 7, scaled to the side touched:

- **`mobile` or `shared`**:
  ```bash
  npm run typecheck
  npm test
  ```
- **`api`** (from the repo root):
  ```bash
  make check-go        # gofmt -l . + go vet ./... + go test ./...
  ```
  Note `-race` is **not** run here: it needs cgo and a C compiler, which the
  usual Windows dev box lacks. CI runs it. Never report it as passing from a
  local run that didn't execute it.
- **contract touched** (`apps/api/internal/protocol/`): also
  ```bash
  make generate
  git status --short packages/shared/src/generated
  ```
  and stage the regenerated file with the Go change.

Everything must pass — fix and re-run rather than proceeding on a red run. If
touching `apps/mobile/src/lib/scoring.ts`,
`apps/mobile/src/lib/belote/scoring.ts`, `apps/mobile/src/lib/stats.ts`,
or `apps/mobile/src/lib/store.ts`, run the matching test file directly first
(e.g. `npx jest src/lib/scoring.test.ts` from `apps/mobile`) to iterate faster,
then the full suite.

Don't do the manual browser walkthrough here even if the change is
UI-visible — `tsc`/`npm test` are enough of a gate to move into review.
The one full manual pass in the Browser pane happens once, at step 11, after
any review-driven fixes have landed — no point exercising the UI twice when
the code between the two passes may still change.

### 8. Review scope decision

Once implementation is believed complete and verified, measure the diff
before deciding how to review it:
```bash
git diff --stat HEAD
```
(or against the branch's base if commits already exist). Pick a scope:

- **`light`** — diff touches ≤150 changed lines total AND doesn't touch
  `apps/mobile/src/lib/scoring.ts`, `apps/mobile/src/lib/belote/scoring.ts`,
  `apps/mobile/src/lib/store.ts`, `apps/mobile/src/lib/stats.ts`, or
  `apps/api/internal/hub/` (no scoring/store/concurrency logic at stake).
  Delegate the diff to
  `cavecrew-reviewer` for a single compressed pass instead of reading it
  inline yourself — its `path:line: severity: problem. fix.` findings are
  cheap on main context. Fix what it reports, and note in the final report
  that this was a light `cavecrew-reviewer` pass rather than the full
  multi-angle review. Skip to step 10 (no findings checkpoint needed — you
  already applied fixes directly).
- **`full`** — anything larger, or touching scoring/store/concurrency logic
  regardless of size (these are the project's actual invariants — worth the
  full pass). Proceed to step 9.

If genuinely unsure which bucket a borderline diff falls in, default to
`full` — the cost of an unnecessary full review is lower than missing a real
issue in scoring, store or hub code.

### 9. Code review (full scope only)

Invoke the `code-review` skill against the diff **at medium effort**
(explicitly pass/state medium — do not leave the level unspecified, since
`code-review` otherwise reuses whatever level was last used in the session,
which may be far higher than this project's stakes call for). Reserve
`high` or above for changes you judge genuinely risky (e.g. a scoring-engine
rewrite, a migration) — ask the user first if you think a diff warrants
going above medium.

Do **not** also invoke `simplify` beforehand — `code-review`'s own angles
already cover reuse, simplification, efficiency, and altitude alongside
correctness and conventions, so running `simplify` first only means the same
class of cleanup issues gets found (and fixed, and re-checked) twice. Reach
for `simplify` on its own only if the user explicitly asks for a dedicated
cleanup pass outside this flow.

When `code-review`'s verify phase has several candidates, verify them in a
small number of batched Agent calls grouped by theme (e.g. all
correctness-flavored candidates in one call, all cleanup-flavored ones in
another) rather than spawning one verifier agent per candidate — same
recall, far fewer agents.

### 10. Findings checkpoint (AskUserQuestion, full scope only)

Summarize `code-review` findings (severity + one-line summary each) in the
chat, then ask via `AskUserQuestion` how to proceed: "Corriger tous les
findings" / "Choisir lesquels corriger" (if chosen, follow up to let the
user pick a subset) / "Ignorer et continuer tel quel". Apply only what was
approved.

### 11. Final verification

Re-run the step-7 gates for the side touched if step 10 changed any code
(light scope: only if your step-8 self-fixes changed anything since step 7).

If the change is **UI-visible** (step 1), this is the one point in the flow
where you start the app (`preview_start` with the `npm start`/`web` dev
server) and exercise the changed screen in the Browser pane — golden path
plus the obvious edge case. Do not claim a UI change works without having
seen it render at least once, here.

### 12. Final recap checkpoint (AskUserQuestion)

Present: files changed (grouped by concern, not a raw file list if it's
large), a one-paragraph summary of the change, and what will happen next
per push mode:
- `branch-pr`: "commit sur `<branch>`, push, puis ouverture d'une PR".
- `direct-main`: "commit et push direct sur `main` (déclenche le déploiement
  web immédiatement)".

Options: "Valider" (proceed with step 13 as described above) / "Ajuster
encore" (go back, then re-present this checkpoint) / "Annuler (pas de
commit)".

### 13. Commit, push, and PR

Group the diff into one or more logical commits (not mechanically one
commit per file, and not a single giant commit if the change has clearly
separate concerns) using Conventional Commits (`type(scope): description`,
all lowercase, no trailing period — per root `CLAUDE.md`). In this monorepo
the scope should say which side is touched when it isn't obvious:
`feat(api):`, `fix(mobile):`, `chore(shared):`, and the finer game scopes
(`fix(belote):`) still apply inside the mobile app. Write each
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
  and a Test plan section reflecting step 11's verification. Do not merge it
  — the user merges when ready.
- **`direct-main`**: push directly (`git push origin main`).

### 14. Final report

For `branch-pr`: report the branch name, commit(s), and the PR URL, and
remind the user nothing deploys until they merge it. For `direct-main`:
report commit(s) pushed and remind the user this just triggered the web
auto-deploy to the Pi (`deploy.yml`). Either way, if the change should also
ship as an APK, mention that `npm run update-apk` is a separate, manual
step this skill does not run.
