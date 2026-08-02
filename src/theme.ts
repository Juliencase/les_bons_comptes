// Thème partagé — palette « pirate » sobre.
export const colors = {
  bg: '#0f2027',
  bgAlt: '#16323d',
  card: '#1d3d49',
  cardAlt: '#234a58',
  border: '#2d5a6b',
  gold: '#e0a92e',
  goldSoft: '#f0cd7a',
  text: '#f4efe6',
  textDim: '#a9c0c9',
  positive: '#5fd08a',
  negative: '#ef6f6f',
  danger: '#c0453f',
  white: '#ffffff',
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

