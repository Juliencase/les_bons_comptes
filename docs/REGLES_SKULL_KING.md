# Skull King — Règles pour application de comptage de points

> Synthèse des règles de base + extension, structurée pour développer une app mobile
> qui **compte les points**. Éditeur : Grandpa Beck's Games (2022) / Blackrock Games (FR).

---

## 1. Vue d'ensemble

Skull King est un **jeu de plis avec paris**. À chaque manche, chaque joueur **mise**
(parie) sur le nombre exact de plis qu'il pense remporter. Le score dépend de la
précision de la mise. Le joueur avec le meilleur score total à la fin gagne.

**Ce dont l'app a besoin par joueur et par manche :**
- La **mise** (pari) — nombre de plis annoncé.
- Le **résultat** — nombre de plis réellement remportés.
- Les **bonus** éventuels (voir §5).
- (Extension optionnelle) le **type de mise** : Chevrotine ou Boulet de canon.

---

## 2. Structure d'une partie

- Une partie = **10 manches** (configuration par défaut).
- **Manche N = N cartes distribuées** = N plis à jouer.
  - Manche 1 → 1 carte, Manche 2 → 2 cartes, … Manche 10 → 10 cartes.
- Nombre de joueurs : **2 à 8** (base), jusqu'à **9** avec l'extension complète.
- **7-8 joueurs (base) / 9+ joueurs (extension)** : il peut ne pas y avoir assez de
  cartes pour distribuer N cartes lors des dernières manches. Dans ce cas, on
  distribue le **nombre maximum de cartes possible**, identique pour tous les joueurs.
  → **L'app doit permettre de configurer le nombre de cartes distribuées par manche**
  (il n'est pas toujours égal au numéro de la manche).

### Formats de partie alternatifs (optionnel — configurable)
Le nombre de manches et de cartes peut être personnalisé :
| Nom              | Cartes distribuées par manche |
|------------------|-------------------------------|
| Standard         | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Pas d'impair     | 2, 2, 4, 4, 6, 6, 8, 8, 10, 10 |
| Prêt au combat   | 6, 7, 8, 9, 10 |
| Attaque éclair   | 5, 5, 5, 5, 5 |
| Tir de barrage   | 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 |
| Tourbillon       | 9, 7, 5, 3, 1 (×2 chacune : 9,9,7,7,5,5,3,3,1,1) |
| L'heure du dodo  | 1 (une seule manche) |

> **Implémentation** : le nombre de cartes de chaque manche est la donnée clé pour le
> calcul des scores (mise sur zéro, système Rascal). Stocker un tableau
> `cartesParManche[]` plutôt que de déduire du numéro de manche.

---

## 3. Déroulement d'une manche (pour info — non calculé par l'app)

1. Distribution des cartes.
2. **Paris** : chaque joueur annonce sa mise (0 à N). → saisie dans l'app.
3. Jeu des plis (règles de cartes ci-dessous, §6).
4. Comptage : saisie mise/résultat/bonus → l'app calcule le score de la manche.
5. Manche suivante avec +1 carte (ou selon le format choisi).

---

## 4. Systèmes de score

L'app doit proposer **deux systèmes de score au choix** (à définir en début de partie).

### 4.A — Système « Skull King » (classique)

Points calculés à partir de la **mise** et du **résultat** :

**Mise ≥ 1 :**
- **Mise réussie** (résultat == mise) : `+20 points par pli misé`.
  - Ex : mise 3, réussie → 3 × 20 = **+60**.
- **Mise ratée** (résultat != mise) : `-10 points par pli d'écart`.
  - Écart = `|résultat - mise|`. Aucun point pour les plis réalisés.
  - Ex : mise 2, résultat 4 → écart 2 → **-20**.

**Mise == 0 :**
- **Réussie** (résultat == 0) : `+10 × (nombre de cartes distribuées cette manche)`.
  - Ex : mise 0 à la manche 7 (7 cartes), résultat 0 → **+70**.
- **Ratée** (résultat > 0) : `-10 × (nombre de cartes distribuées cette manche)`.
  - Ex : mise 0 à la manche 9 (9 cartes), résultat 2 → **-90**.

> ⚠️ Le multiplicateur de la mise 0 dépend du **nombre de cartes distribuées**, pas du
> numéro de manche (important pour les formats alternatifs).

```
function scoreSkullKing(mise, resultat, cartesDistribuees):
    if mise == 0:
        return (resultat == 0) ? +10 * cartesDistribuees : -10 * cartesDistribuees
    else:
        if resultat == mise: return +20 * mise
        else: return -10 * abs(resultat - mise)
```

### 4.B — Système « Rascal » (équilibré)

Chaque manche a un **potentiel de points identique pour tous** :
`potentiel = 10 × (nombre de cartes distribuées)`.

Le score dépend de la **précision** (écart = `|résultat - mise|`) :
- **Coup direct** (écart == 0) : gagne **100 %** du potentiel.
- **Frappe à revers** (écart == 1) : gagne **50 %** du potentiel.
- **Échec cuisant** (écart >= 2) : gagne **0 point**.

Ex : 5 cartes → potentiel 50. Coup direct = +50, frappe à revers = +25, échec = 0.

**Les bonus suivent la même règle** : 100 % / 50 % / 0 % des bonus potentiels selon
la précision (voir §5).

#### Règle optionnelle Rascal : type de mise (Chevrotine / Boulet de canon)
Après avoir misé, chaque joueur choisit secrètement :
- **Chevrotine** (main ouverte) : règle Rascal habituelle ci-dessus (×10, 100/50/0 %).
- **Boulet de canon** (poing fermé) : plus risqué.
  - Mise **exacte** (écart 0) : `+15 × cartes distribuées`.
  - Mise **inexacte** (écart >= 1) : **0 point** (pas de demi-points).
  - Les bonus ne sont acquis **que si la mise est exacte**.

```
function scoreRascal(mise, resultat, cartesDistribuees, typeMise, bonusPotentiel):
    ecart = abs(resultat - mise)
    if typeMise == "boulet":
        if ecart == 0: return 15 * cartesDistribuees + bonusPotentiel
        else: return 0
    else: // chevrotine
        base = 10 * cartesDistribuees + bonusPotentiel
        if ecart == 0: return base
        if ecart == 1: return ceil(base / 2)   // frappe à revers : arrondi AU SUPÉRIEUR
        return 0
```
> **Décision produit — arrondi Rascal** : la frappe à revers donne « la moitié des
> points en jeu ». Les valeurs de base sont des multiples de 10, mais les cartes 7/8 de
> l'extension (bonus ±5) peuvent rendre le total impair. Dans ce cas, on **arrondit au
> supérieur** (`ceil`), en faveur du joueur. Ex : moitié de 55 → **28** ; moitié de -5
> (carte 7) → **-2** (ceil de -2,5). À appliquer sur le total « base + bonus » avant
> d'additionner au score cumulé.

---

## 5. Points bonus

Les bonus s'ajoutent au score de la manche.

**Règles importantes :**
- Dans le système **Skull King**, les bonus sont **toujours acquis** (peu importe si
  la mise est réussie ou ratée), **SAUF** exceptions notées ci-dessous (extension 7/8).
- Dans le système **Rascal**, les bonus sont pondérés par la précision (100/50/0 %),
  et en **Boulet de canon** ils exigent une mise exacte.
- L'ordre de jeu des cartes ne change pas l'attribution des bonus.

### 5.A — Bonus « cartes 14 » (fin de manche)
Attribués au joueur qui **possède** (a remporté dans ses plis) ces cartes en fin de manche,
peu importe qui les a jouées :
- **+10 points** par carte **14 de couleur classique** (vert / jaune / violet).
- **+20 points** pour la carte **14 noire** (Drapeau pirate / atout).

### 5.B — Bonus de capture de personnages
Attribués au **gagnant du pli** qui capture ces cartes :
- **+20 points** par **Sirène** capturée par un **Pirate**.
- **+30 points** par **Pirate** capturé par le **Skull King**.
- **+40 points** si une **Sirène** capture le **Skull King**.

> Le bonus n'est attribué que si la carte « capteur » **gagne effectivement le pli**.
> Ex : si une Sirène bat le Skull King qui a lui-même « capturé » un pirate, le Skull King
> ne gagne pas le pli → pas de bonus pour lui ; la Sirène gagne son +40.

### 5.C — Bonus de l'extension
- **Carte 8 (couleur)** : `+5 points` au joueur qui remporte le pli avec elle,
  **seulement si sa mise est correcte**.
- **Carte 7 (couleur)** : `-5 points` au joueur qui la remporte,
  **seulement si sa mise est correcte** (malus conditionnel).
- **Butin** (voir §6) : `+20 points` à **chacun des deux joueurs alliés** si **les deux**
  ont misé correctement.
- **Casier de Davy Jones** : `+20 points` par **Léviathan détruit** (Kraken, Baleine
  blanche, Raie tachetée), inconditionnel.

> **Implémentation bonus** : prévoir une saisie de bonus flexible par joueur/manche.
> Options : (a) un champ « bonus » libre (le plus simple, l'utilisateur additionne
> lui-même), ou (b) des compteurs dédiés (nb de 14 couleur, 14 noir, sirènes capturées,
> pirates capturés, SK capturé par sirène, cartes 7/8, butin, léviathans). L'option (b)
> permet d'appliquer automatiquement les conditions (mise correcte pour 7/8, pondération
> Rascal, etc.).

---

## 6. Cartes du jeu (référence pour hiérarchie & bonus)

> L'app de comptage n'a pas besoin de simuler les plis, mais cette hiérarchie sert à
> comprendre les bonus de capture et à afficher une aide en jeu.

### Cartes de couleur (numérotées)
- 4 couleurs : **vert** (Perroquet), **jaune** (Coffre), **violet** (Carte au trésor),
  **noir** (Drapeau pirate = **atout**).
- Base : numéros **1 à 14** par couleur.
- **Extension** : ajoute une **7**, une **8** et une **0/14** par couleur, plus un **15 joker**.
- Hiérarchie : le noir (atout) bat les 3 couleurs classiques. Il faut suivre la couleur
  d'ouverture si possible ; sinon plus haute de la couleur d'ouverture gagne (l'atout
  bat tout le reste).
- **0/14** (extension) : à la pose, le joueur choisit si elle vaut 0 ou 14. **Ne donne
  aucun bonus** (pas de bonus « 14 »).
- **15 joker** (extension) : joué comme un 15 jaune/violet/vert (jamais noir).

### Cartes spéciales (base)
| Carte        | Nb | Effet (résumé)                                                            |
|--------------|----|---------------------------------------------------------------------------|
| Fuite        | 5  | Perd toujours. Sert à ne pas remporter de pli.                            |
| Pirate       | 5  | Bat toutes les cartes numérotées. 1er pirate joué gagne si plusieurs.     |
| Tigresse     | 1  | Au choix : Pirate **ou** Fuite.                                           |
| Sirène       | 2  | Bat les numérotées ; perd contre les pirates ; **bat le Skull King**.     |
| Skull King   | 1  | Bat numérotées + pirates ; **perd contre les sirènes**.                   |

**Résolution clé (triangle)** : Pirate > Sirène, Sirène > Skull King, Skull King > Pirate.
Si Pirate + Skull King + Sirène dans le même pli → **la Sirène gagne toujours**.

### Cartes avancées / extension (optionnelles)
| Carte                 | Source     | Effet (résumé)                                                                |
|-----------------------|------------|-------------------------------------------------------------------------------|
| Butin (×2)            | avancé     | Alliance avec le gagnant du pli. +20 aux deux si **les deux** misent juste.   |
| Kraken (×1)           | avancé     | Détruit le pli : personne ne gagne, cartes défaussées.                        |
| Baleine blanche (×1)  | avancé     | Annule les spéciales ; le plus **haut numéro** gagne, toutes couleurs.        |
| Mary Throne (Pirate)  | extension  | Pirate classique (+ pouvoir avancé optionnel).                                |
| Dernière salve        | extension  | Ne gagne pas ; le joueur rejoue une carte immédiatement (finit avec 1 de moins). |
| Supplice de la planche| extension  | Ne gagne pas ; retire un Pirate du pli (l'empêche de gagner/marquer).         |
| Raie tachetée         | extension  | **La carte la plus basse gagne** le pli.                                      |
| Casier de Davy Jones  | extension  | Détruit les Léviathans du pli. +20 par léviathan détruit.                     |
| Second                | extension  | Bat tout sauf Skull King et Sirènes. Capturé par SK/Sirène → +30 pour eux.    |

> Impact sur le comptage : **Butin**, **Casier de Davy Jones**, **Second** (+30),
> **cartes 7/8** ajoutent des bonus/malus → à intégrer dans la saisie des bonus (§5).

### Pouvoirs avancés des pirates (optionnel — n'affecte pas directement le score)
Rosie la Douce, Will le Bandit, Rascal le Flambeur (parie 0/10/20 pts → **affecte le
score** : +/- selon réussite de la mise), Juanita Jade, Harry le Géant (modifie la mise
de ±1), Mary Throne. Seul **Rascal le Flambeur** ajoute directement des points
conditionnels (+/- 0, 10 ou 20).

---

## 7. Mode 2 joueurs (info)

Avec 2 joueurs, on ajoute un joueur fantôme « Barbe Grise » qui **ne mise pas et ne
marque pas de points**. → L'app gère simplement 2 joueurs réels ; ignorer le fantôme
côté score.

---

## 8. Modèle de données suggéré pour l'app

```
Partie {
  systemeScore: "SKULL_KING" | "RASCAL"
  regleBouletDeCanon: bool          // option Rascal uniquement
  joueurs: [Joueur]
  manches: [Manche]                 // définit cartesDistribuees par manche
}

Manche {
  numero: int
  cartesDistribuees: int
}

ScoreJoueurManche {
  joueurId
  mancheNumero
  mise: int                         // 0..cartesDistribuees
  resultat: int                     // 0..cartesDistribuees
  typeMise: "CHEVROTINE" | "BOULET" // si option activée
  bonus: int                        // total bonus (ou détail via compteurs, cf §5)
  pointsManche: int                 // calculé
}
```

**Règle de calcul (pseudo) par joueur/manche :**
```
base = (systeme == SKULL_KING)
     ? scoreSkullKing(mise, resultat, cartesDistribuees)
     : scoreRascal(mise, resultat, cartesDistribuees, typeMise, 0)

bonusEffectif = appliquerConditionsBonus(bonus, systeme, typeMise, miseReussie)
pointsManche  = base + bonusEffectif   // (en Rascal, bonus déjà pondéré dans scoreRascal)
total        += pointsManche
```

**Points de vigilance à coder :**
1. Le multiplicateur mise-0 et le potentiel Rascal utilisent **cartesDistribuees**, pas
   le numéro de manche.
2. En **Rascal**, les bonus sont pondérés (100/50/0 %) — ou 0 en Boulet si mise ratée.
3. Bonus **7/8** de l'extension : acquis **seulement si mise correcte**, dans tous les systèmes.
4. Bonus **Butin** : nécessite que **les deux** joueurs alliés aient misé juste.
5. Autoriser un **nombre de cartes distribuées inférieur** au numéro de manche (7-9+ joueurs).
6. Prévoir des **scores négatifs** (mise ratée en Skull King).
7. Validation de saisie : `0 <= mise <= cartesDistribuees` et `0 <= resultat <= cartesDistribuees`.
   La somme des résultats de tous les joueurs sur une manche `<= cartesDistribuees`
   (peut être `<` à cause du Kraken / Baleine / cartes qui détruisent des plis).
8. **Arrondi Rascal (frappe à revers)** : arrondir **au supérieur** (`ceil`) sur le
   total « base + bonus » de la manche. Ne concerne que Rascal-Chevrotine avec bonus
   impairs (cartes 7/8). Voir §4.B.

---

### 8.bis — Décisions de conception (points de vigilance résolus)

| # | Point | Décision |
|---|-------|----------|
| 1 | Multiplicateur mise-0 / potentiel Rascal | Basé sur `cartesDistribuees`, jamais le n° de manche. |
| 2 | Bonus en Rascal | Pondérés 100 / 50 / 0 % ; **0** en Boulet de canon si mise ratée. |
| 3 | Bonus cartes 7/8 (extension) | Acquis **seulement si mise correcte**, dans les deux systèmes. |
| 4 | Bonus Butin | +20 aux deux alliés **seulement si les deux** misent juste. |
| 5 | Cartes distribuées < n° manche | **Autorisé** (7-9+ joueurs) → `cartesParManche[]` configurable. |
| 6 | Scores négatifs | **Autorisés** (mise ratée en système Skull King). |
| 7 | Validation somme des plis | **Souple** : avertir si `Σ résultats ≠ cartesDistribuees`, mais **ne pas bloquer** (Kraken/Baleine/Casier détruisent des plis). |
| 8 | Arrondi Rascal frappe à revers | **Au supérieur** (`ceil`), en faveur du joueur. |

---

## 9. Récapitulatif MVP (version minimale de l'app)

Pour une première version « compteur de points » simple :
1. Créer une partie : noms des joueurs + choix du système (Skull King ou Rascal).
2. Pour chaque manche (1→10) : saisir **mise** puis **résultat** de chaque joueur.
3. Champ **bonus** libre (optionnel) par joueur.
4. Calcul automatique du score de la manche + cumul du total.
5. Tableau de scores et **classement final** (meilleur total gagne).

Extensions ultérieures : système Rascal + Boulet de canon, compteurs de bonus détaillés,
formats de manches personnalisés, historique des parties.
