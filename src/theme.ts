// Thème partagé — palette « pirate » sobre.
export const colors = {
  bg: '#0f2027',
  bgAlt: '#16323d',
  card: '#1d3d49',
  cardAlt: '#234a58',
  border: '#2d5a6b',
  gold: '#e0a92e',
  goldSoft: '#f4d488',
  text: '#f4efe6',
  textDim: '#a9c0c9',
  positive: '#5fd08a',
  negative: '#ef6f6f',
  danger: '#c0453f',
  white: '#ffffff',
};

/** Dégradé or utilisé pour les boutons pleins, badges et titres accentués. */
export const goldGradient = [colors.goldSoft, colors.gold, '#946c1e'] as const;

export const fonts = {
  display: 'Cinzel_800ExtraBold',
  displaySemiBold: 'Cinzel_600SemiBold',
  displayBold: 'Cinzel_700Bold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

// Largeur de contenu maximale : sans plafond, useWindowDimensions() renvoie la
// largeur de la fenêtre navigateur (web) au lieu de celle, bornée, d'un écran
// de téléphone — les mises en page pensées pour mobile (grille de cartes,
// image d'accueil) exploseraient en taille sur un grand écran desktop.
export const contentMaxWidth = 480;

// Teintes translucides de l'or, utilisées pour mettre en évidence la manche
// courante (fond de ligne, cellule, encadré d'avertissement) sans dupliquer
// des rgba() en dur à plusieurs endroits.
export const goldTint = {
  subtle: 'rgba(224,169,46,0.08)',
  medium: 'rgba(224,169,46,0.12)',
  strong: 'rgba(224,169,46,0.15)',
  border: 'rgba(224,169,46,0.3)',
};

// Opacités partagées pour les retours d'interaction (Pressable) — évite les
// valeurs magiques dupliquées et garantit un feedback tactile cohérent partout.
export const opacity = {
  /** Retour au toucher standard (boutons, cartes cliquables). */
  pressed: 0.7,
  /** Retour au toucher plus marqué pour les cibles petites/icône seule. */
  pressedSubtle: 0.6,
  /** Élément désactivé / non actionnable dans son état courant. */
  disabled: 0.4,
};
