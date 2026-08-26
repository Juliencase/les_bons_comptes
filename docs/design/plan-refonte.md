# Plan de refonte DA — Les Bons Comptes

Source : projet Claude Design `45dfd8ae-f98b-4fae-8173-80e879b44d77`.
Références lues : `charte-da.md` (les règles) et `DA - Les Bons Comptes.dc.html`
(les 11 maquettes validées — tours 8 / 9 / 10 — plus le kit de composants `5a`).
`support.js` est le runtime du canvas Claude Design : aucune valeur pour
l'implémentation, ne rien en porter.

Ce document planifie ; il n'implémente rien.

## 0 · Ce que les maquettes ajoutent à la charte

La charte donne les règles, les maquettes donnent les valeurs exactes : chaque
artboard est du HTML en styles inline sur une base de 392 px, directement
transposable en styles RN. Trois écrans changent le **produit**, pas seulement
l'habillage :

| Maquette | Changement de fond |
|---|---|
| `9a` | La saisie Skull King passe **joueur par joueur** (« Joueur 2 / 5 », « Joueur suivant → ») au lieu de la liste de tous les joueurs actuelle. |
| `8d` | La confirmation de remplacement devient une **modale maison** (panneau bas, bord haut grenat 4 px) au lieu de `Alert.alert`. |
| `9c` | Le palmarès affiche en plus les **titres non décernés** (« Le Presque et Le Chasseur de trésor n'ont pas été décernés : personne ne s'est détaché »), donnée que `awards()` ne renvoie pas aujourd'hui. |

Deux interdits de la charte (§09) touchent par ailleurs des données, pas des
styles : les **images de jeu** (`assets/game/*.png`, `GameDef.image`) et les
**emoji** (`GameDef.emoji`, `AwardRow.emoji`, `IconButton icon="📊"`).

## 1 · Décisions à trancher avant d'écrire du code

1. **Images de jeu** — `8a` / `8b` / `10c` sont 100 % typographiques. Supprimer
   `GameDef.image`, `GameHomeScreen.image` et `assets/game/` ? (recommandé :
   oui, sinon la DA est cassée dès l'écran d'entrée).
2. **Saisie joueur par joueur** (`9a`) — c'est la maquette validée, mais c'est
   un vrai changement d'usage à table. À confirmer explicitement : elle rend
   `PlayerRoundRow` (207 lignes) obsolète.
3. **Flou de la modale** (`8d`, charte §04 : opacité .42 + flou 2 px) — RN n'a
   pas `filter: blur`. Soit `expo-blur`, soit l'atténuation seule.
   Recommandé : atténuation seule, pas de dépendance supplémentaire.
4. **Trame de points** (§04) — pas de `radial-gradient` en RN. Options : PNG 8×8
   tuilé via `ImageBackground resizeMode="repeat"` (zéro dépendance) ou
   `react-native-svg`. Recommandé : PNG tuilé, validé sur web avant
   généralisation.
5. **Jeux « Bientôt »** — `8a` montre Tarot **et** Rami, `10c` seulement Tarot.
   Ajouter deux entrées `available: false` dans `GAMES` ?

## 2 · Phasage

### P0 — Fondations

- `npm i @expo-google-fonts/big-shoulders-display @expo-google-fonts/sometype-mono`
  puis `npm rm @expo-google-fonts/cinzel expo-linear-gradient`.
- `App.tsx` : `useFonts` → BSD 600/900 + Sometype Mono 400/500.
- `src/theme.ts` réécrit :
  - `colors` = les 6 tokens (`fond #0E1A14`, `surface #17261E`, `creme #F1E8D8`,
    `sanguine #F26430`, `paille #E8C25A`, `grenat #D9455F`) + les états de survol
    relevés dans les maquettes (`#FF7845`, `#EC5670`).
  - `filets` : crème à 12 / 14 / 16 / 20 / 22 / 24 / 28 / 32 / 40 % — les valeurs
    effectivement utilisées par les maquettes ; remplace `goldTint`.
  - `spacing` : 4 · 5 · 6 · 8 · 12 · 14 · 18 · 22 · 26.
  - `radius` supprimé (angles vifs partout).
  - `type` : les 7 rôles du §02 en styles prêts à l'emploi (`fontFamily`,
    `fontSize`, `lineHeight` calculé, `letterSpacing`, `textTransform`), avec
    `fontVariant: ['tabular-nums']` sur les rôles chiffrés.
  - `goldGradient` supprimé.
- Supprimer les 4 `shadow`/`elevation` et les 7 usages de `LinearGradient`.
- Ajouter `ScreenBackground` (fond + trame), utilisé par les 9 écrans.

`npx tsc --noEmit` sert de liste de travail : les 26 fichiers qui importent le
thème remontent en erreur, ce qui borne exactement le chantier.

### P1 — Primitives (`src/components/`, toujours store-agnostiques)

Refonte : `Button` (3 variantes : aplat sanguine / filet crème 32 % / filet
grenat), `Stepper` (cadre 1 px, 62 px de haut, − et + de 62 px, valeur BSD 900
42 px), `BonusButtons` (−10 · −5 · valeur · +5 · +10 dans un seul cadre),
`ChipPicker` (pastilles 48 px, sélection en aplat paille), `SegmentedToggle`,
`ScoreGrid`, `RankingList` (filet gauche paille 4 px sur le premier), `GameCard`,
`WinnerCard`, `AwardList` (sans emoji), `ScreenHeader` (retour mono 10 px +
action droite en pastille filet).

Nouveaux — tous présents dans le kit `5a` et réutilisés par au moins deux
écrans : `SectionLabel` (« 01 · Joueurs »), `ToggleRow` (interrupteur 58×34,
ligne entière cliquable — boulet de canon, capot, Belote-Rebelote), `Callout`
(alerte non bloquante : filet gauche paille 4 px, fond paille 8 %),
`ProgressBar` (Belote) et `SegmentBar` (segments par manche, `8b` / `9a`),
`Sheet` (la modale unique de `8d`).

À supprimer : `IconButton` (emoji), `PlayerRoundRow` (si décision 2 = oui),
`BackButton` / `SectionTitle` s'ils sont absorbés par `ScreenHeader` /
`SectionLabel`.

### P2 — Écrans sans changement de flux

`GamesScreen` (`8a`, cas vide `10c`) · `HomeScreen` (`8b`) · `BeloteHomeScreen` ·
`SetupScreen` (`8c`) · `BeloteSetupScreen` (`10a`) · `ScoreboardScreen` (`9b`) ·
`BeloteScoreboardScreen` (`10b`) · `BeloteRoundScreen` (`9d`).

Points non triviaux relevés dans les maquettes :

- `9b` : la grille des manches abrège les noms à 3 lettres en en-tête et code
  chaque cellule en paille / grenat — `ScoreGrid` doit accepter une couleur par
  cellule, ce qu'il ne fait pas.
- `10b` : « Nous · 274 pts avant l'objectif » — calcul dérivé à ajouter à
  `src/lib/belote/scoring.ts` (pur, testable).
- `8c` : sections numérotées, et le boulet de canon est imbriqué dans la carte
  Rascal (visible seulement quand Rascal est choisi).

### P3 — Changements de flux (le vrai risque)

- **`RoundScreen` → `9a`** : un joueur plein écran, trois incrémenteurs empilés,
  barre de progression par joueur, pied « Cette manche +50 », bouton « Joueur
  suivant → » puis « Valider la manche » sur le dernier.
  Recommandation : **dériver** le joueur courant (le premier dont l'entrée est
  incomplète) plutôt que d'ajouter un index au store — ça survit à l'aller-retour
  vers les scores (`Scores ⌃`) sans nouvel état persisté, et le mode correction
  (`editMode`) ouvre directement le joueur tapé.
- **Modale `8d`** : `src/lib/confirm.ts` (`Alert.alert`) remplacé par le
  composant `Sheet` piloté par un état local dans les deux écrans d'accueil.
- **`stats.ts`** : exposer les titres non décernés (p. ex. `awards()` renvoyant
  `{ awarded, unawarded }`, ou un `unawardedTitles(game)`) — **avec test** dans
  `src/lib/stats.test.ts`.
- **`games.ts`** : suppression de `emoji` et `image`, ajout des entrées
  « Bientôt » (décision 5).

### P4 — Mouvement (§07, maquettes `7a` / `7b` / `7c`)

Trois moments seulement, en `Animated` (API RN, pas de nouvelle dépendance) :
validation de manche 950 ms, bascule du classement 550 ms
`cubic-bezier(.2,.85,.2,1)`, fin de partie 600 ms puis cascade de 280 ms.
`prefers-reduced-motion` = `AccessibilityInfo.isReduceMotionEnabled()` et son
écouteur : on supprime glissements et comptages, jamais les couleurs.

## 3 · Vérification

Aucun test de composant dans le repo (`@testing-library/react-native` absent) :
la refonte est couverte par `npx tsc --noEmit` + `npm test` (les moteurs purs ne
bougent pas, sauf les deux ajouts de P3, qui arrivent avec leurs tests) et par un
passage à la main sur les 11 écrans, **web inclus** — la branche courante corrige
justement la cible web, il ne faut pas la recasser. La trame de points et
`fontVariant` sont les deux points à vérifier en premier sur web.

## 4 · Ordre de livraison suggéré

P0 en une PR (elle casse volontairement l'aspect, mais compile), puis une PR par
bloc de P1 / P2 pour garder des diffs relisibles, P3 en PR séparées (chacune
change un comportement), P4 en dernier.
