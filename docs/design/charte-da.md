# Charte de direction artistique — Les Bons Comptes

Règles visuelles à respecter pour toute UI de l'application. Source de vérité pour
l'implémentation. Référence fonctionnelle : `spec-metier.md`.

## 01 · Univers

Affiche de jeu de société, en sombre. Aplats saturés, typographie display, formes
découpées. L'appareil est posé au centre de la table : objet de jeu, pas tableur.

- Les chiffres sont le sujet : toujours le plus grand corps de l'écran.
- Aucune ombre portée. Les surfaces se séparent par un filet ou un aplat, jamais par une élévation.
- Lisible à 60 cm, de biais et à l'envers : contraste franc, pas de gris moyens sur les données.
- La couleur signifie (gagné / perdu / en cours) ; elle ne décore pas.

## 02 · Typographie

Deux polices Google Fonts, aucune autre :

- **Big Shoulders Display** — poids 600 et 900. Titres, noms de joueurs, chiffres.
- **Sometype Mono** — poids 400 et 500. Libellés, méta, règles, aide.

| Rôle | Police | Corps / interligne | Détails |
|---|---|---|---|
| Titre d'écran | BSD 900 | 44–62 / .86 | Capitales, letter-spacing −.01em |
| Nom de joueur | BSD 600 | 24–30 / 1 | Capitales |
| Total, score | BSD 900 | 34–46 / 1 | `font-variant-numeric: tabular-nums`, aligné à droite |
| Valeur saisie | BSD 900 | 42 / 1 | Centrée dans l'incrémenteur |
| Libellé de champ | Mono 500 | 9 / 1 | Capitales, letter-spacing .18em |
| Méta, règle, aide | Mono 400 | 10–11 / 1.5 | Bas de casse, opacité .55 |
| Étiquette d'état | Mono 500 | 9–10 / 1 | Sur aplat, capitales, .14em |

Jamais deux corps display voisins à moins de 6 px d'écart. Aucun texte fonctionnel
sous 9 px. Signe moins typographique (−) pour les négatifs, pas le trait d'union.

## 03 · Palette

| Token | Hex | Emploi |
|---|---|---|
| `--fond` | `#0E1A14` | Fond de tous les écrans, avec la trame |
| `--surface` | `#17261E` | Cartes, lignes de tableau, blocs de données |
| `--creme` | `#F1E8D8` | Texte et chiffres neutres ; filets à 10–24 % |
| `--sanguine` | `#F26430` | Action principale, élément actif, « ici et maintenant » |
| `--paille` | `#E8C25A` | Gain, réussite, tête du classement, titre décerné |
| `--grenat` | `#D9455F` | Perte, malus, action destructrice (remplacer une partie) |

- Une seule couleur d'action par écran.
- Sanguine et grenat ne se touchent jamais.
- Texte sur sanguine / paille / grenat : toujours `--fond`, jamais la crème.

## 04 · Matière & fond

- Trame de points : points 1 px crème à 7 %, pas de 8 px, sur le fond de chaque écran.
  `background-image: radial-gradient(rgba(241,232,216,.07) 1px, transparent 1.2px);
  background-size: 8px 8px;`
- Aplats mats : pas de dégradé, pas de grain, pas de halo, pas de flou — sauf le fond
  d'une modale (opacité .42, flou 2 px).
- Filets : 1 px crème 14 % pour délimiter une surface, 22–28 % pour un contrôle,
  2–4 px pleine couleur pour un état (actif, en tête, danger).
- Angles vifs partout : `border-radius: 0`.

## 05 · Espacements & cibles

- Échelle : 4 · 6 · 8 · 12 · 14 · 18 · 22 · 26 px. Rien entre deux valeurs.
- Marge d'écran : 22 px horizontal, 22–26 px vertical.
- 18–22 px entre sections, 5–8 px entre lignes d'une même liste.
- Cibles tactiles : **48 px minimum** pour un contrôle de saisie, **44 px** pour la
  navigation secondaire ; incrémenteurs 62 px de haut.
- Une ligne = une cible : un interrupteur se déclenche depuis toute sa ligne.

## 06 · Composants

| Composant | Règle |
|---|---|
| Bouton principal | Aplat sanguine, texte `--fond`, BSD 900 22–26 px capitales, letter-spacing .05em, padding 16–18 px, pleine largeur. Un seul par écran. |
| Bouton secondaire | Filet crème 32 %, texte crème ; filet plein au survol. |
| Bouton destructeur | Filet et texte grenat ; s'inverse en aplat grenat au survol. |
| Incrémenteur | Cadre 1 px, hauteur 62 px, − et + de 54–62 px séparés par un filet, valeur centrée BSD 900 42 px. Mise en sanguine, résultat en paille. Appui long pour défiler. |
| Paliers de bonus | −10 · −5 · valeur · +5 · +10 dans un seul cadre. Malus grenat, bonus paille. |
| Pastille de règle | 48 px de haut, mono 11 px capitales. Sélectionnée : aplat paille. Indisponible : filet pointillé, opacité .34. |
| Ligne de classement | Surface + filet, grille rang / nom / méta / total. Premier rang : filet gauche paille 4 px, rang et total en paille. |
| Tuile de jeu | Surface + filet, titre BSD 900 44 px en bas, méta mono. Partie en cours : filet gauche sanguine + étiquette « En cours · manche NN ». À venir : filet pointillé + « Bientôt ». |
| Alerte non bloquante | Filet gauche paille 4 px, fond paille 8 %, mono 10 px. Jamais de bouton. |
| Modale | Une seule dans l'app (remplacement de partie) : panneau bas, bord haut grenat 4 px, écran atténué .42 et flouté 2 px. |

## 07 · Mouvement

| Moment | Durée | Courbe / geste |
|---|---|---|
| Validation de manche | 950 ms | Sortie cubique. Le gain apparaît (350 ms), le total le rattrape en comptant. Aucun rebond. |
| Bascule du classement | 550 ms | `cubic-bezier(.2,.85,.2,1)`. Les lignes glissent ; rang et filet paille changent pendant le glissement. |
| Fin de partie | 600 ms + 280 ms | Le vainqueur s'imprime, puis les titres se posent en cascade de 280 ms. |
| Survol, sélection | 120–200 ms | Changement de filet ou d'aplat, sans déplacement. |

Trois moments animés, pas plus. Une saisie n'est jamais animée. Respecter
`prefers-reduced-motion` en supprimant glissements et comptages, jamais les couleurs.

## 08 · Écriture

- Vocabulaire du jeu, pas du logiciel : manche, donne, plis, mise, preneur.
- Phrases courtes à l'indicatif : « Une partie est en cours ».
- Le chiffre avant le mot : « Manche 07 / 10 », « 7 cartes distribuées ».
- Les avertissements disent le fait puis laissent le choix : « 8 plis annoncés pour
  7 cartes — vérifiez, ou continuez. »
- Connivence de tablée réservée aux titres du palmarès et à la fin de partie
  (« On remet ça »). Nulle part ailleurs.

## 09 · Interdits

- Ombres portées, rayons d'angle, dégradés de fond, halos.
- Emoji dans l'interface — les titres du palmarès restent typographiques.
- Illustrations vectorielles (pirates, crânes, cartes) : la DA est typographique.
- Plus d'une couleur d'action par écran ; couleur sur un chiffre qui ne signifie rien.
- Toute police autre que Big Shoulders Display et Sometype Mono.
- Message d'erreur bloquant sur une incohérence de saisie.

## 10 · Écrans de référence

Maquettes validées, dans le board `DA — Les Bons Comptes` :

| Écran | Référence |
|---|---|
| Accueil général (catalogue) | 8a |
| Premier lancement, aucune partie | 10c |
| Accueil d'un jeu, partie en cours | 8b |
| Confirmation de remplacement | 8d |
| Configuration Skull King | 8c |
| Saisie de manche Skull King | 9a |
| Tableau des scores Skull King | 9b |
| Fin de partie + palmarès | 9c |
| Configuration Belote | 10a |
| Saisie d'une donne Belote | 9d |
| Tableau des scores Belote | 10b |
