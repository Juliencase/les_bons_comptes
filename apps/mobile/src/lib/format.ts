// Utilitaires de formatage d'affichage (purs, sans dépendance UI).

/** Formate un score signé : « +12 », « -8 », « 0 ». */
export function formatSignedScore(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
