// Thème partagé — charte « affiche de jeu de société en sombre » (charte-da.md).
import { TextStyle } from 'react-native';

export const colors = {
  fond: '#0E1A14',
  surface: '#17261E',
  creme: '#F1E8D8',
  sanguine: '#F26430',
  sanguineHover: '#FF7845',
  paille: '#E8C25A',
  grenat: '#D9455F',
  grenatHover: '#EC5670',
};

/** Teintes translucides — un filet ou un fond, jamais une ombre (charte §04/§09). */
export const alpha = {
  creme: (a: number) => `rgba(241,232,216,${a})`,
  paille: (a: number) => `rgba(232,194,90,${a})`,
  sanguine: (a: number) => `rgba(242,100,48,${a})`,
  grenat: (a: number) => `rgba(217,69,95,${a})`,
};

export const fonts = {
  displaySemiBold: 'BigShouldersDisplay_600SemiBold',
  displayBlack: 'BigShouldersDisplay_900Black',
  mono: 'SometypeMono_400Regular',
  monoMedium: 'SometypeMono_500Medium',
};

// Échelle d'espacement charte §05 — rien entre deux valeurs.
export const spacing = {
  s4: 4,
  s5: 5,
  s6: 6,
  s8: 8,
  s12: 12,
  s14: 14,
  s18: 18,
  s22: 22,
  s26: 26,
};

// Angles vifs partout (charte §04) : pas de token radius, borderRadius reste à 0.

// Largeur de contenu maximale : sans plafond, useWindowDimensions() renvoie la
// largeur de la fenêtre navigateur (web) au lieu de celle, bornée, d'un écran
// de téléphone — les mises en page pensées pour mobile (grille de cartes,
// tuiles) exploseraient en taille sur un grand écran desktop.
export const contentMaxWidth = 480;

// Opacités partagées pour les retours d'interaction (Pressable) — la charte
// décrit des survols web (filet/aplat qui change de couleur) ; sur tactile,
// on retombe sur une légère baisse d'opacité au lieu d'un vrai hover.
export const opacity = {
  pressed: 0.7,
  pressedSubtle: 0.6,
  disabled: 0.4,
};

/**
 * Rôles typographiques du §02 de la charte, prêts à l'emploi. Chaque rôle
 * couvre une plage de tailles selon l'écran (ex. titre d'écran 44–62 px) : on
 * passe la taille au call site plutôt que de figer une valeur unique.
 * `fontVariant: ['tabular-nums']` est appliqué aux rôles qui affichent des
 * chiffres alignés (score, valeur saisie) — jamais sur les rôles texte.
 */
export const type = {
  /** Titre d'écran : BSD 900, capitales, interligne .86, tracking -0.01em. */
  screenTitle: (size: number): TextStyle => ({
    fontFamily: fonts.displayBlack,
    fontSize: size,
    lineHeight: Math.round(size * 0.86),
    textTransform: 'uppercase',
    letterSpacing: -size * 0.01,
  }),
  /** Nom de joueur/équipe : BSD 600, capitales, interligne 1. */
  playerName: (size = 26): TextStyle => ({
    fontFamily: fonts.displaySemiBold,
    fontSize: size,
    lineHeight: size,
    textTransform: 'uppercase',
  }),
  /** Total, score cumulé : BSD 900, chiffres tabulaires, interligne 1. */
  score: (size = 40): TextStyle => ({
    fontFamily: fonts.displayBlack,
    fontSize: size,
    lineHeight: size,
    fontVariant: ['tabular-nums'],
  }),
  /** Valeur saisie (incrémenteur) : BSD 900 42px, centrée, chiffres tabulaires. */
  enteredValue: (size = 42): TextStyle => ({
    fontFamily: fonts.displayBlack,
    fontSize: size,
    lineHeight: size,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  }),
  /** Libellé de champ : Mono 500 9px, capitales, tracking .18em. */
  fieldLabel: (size = 9): TextStyle => ({
    fontFamily: fonts.monoMedium,
    fontSize: size,
    lineHeight: size,
    textTransform: 'uppercase',
    letterSpacing: size * 0.18,
  }),
  /** Méta, règle, aide : Mono 400 10–11px, bas de casse, opacité .55. */
  meta: (size = 10): TextStyle => ({
    fontFamily: fonts.mono,
    fontSize: size,
    lineHeight: Math.round(size * 1.5),
  }),
  /** Étiquette d'état (pastille, badge) : Mono 500 9–10px, capitales, tracking .14em. */
  stateLabel: (size = 9): TextStyle => ({
    fontFamily: fonts.monoMedium,
    fontSize: size,
    lineHeight: size,
    textTransform: 'uppercase',
    letterSpacing: size * 0.14,
  }),
};
