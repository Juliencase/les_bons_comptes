// Résolution des noms de joueurs saisis en formulaire (Skull King, Belote) :
// un champ vide retombe sur un libellé par défaut indexé, sans perturber l'ordre.
export function finalizePlayerNames(names: string[], fallbackPrefix: string): string[] {
  return names.map((n, i) => {
    const trimmed = n.trim();
    return trimmed.length > 0 ? trimmed : `${fallbackPrefix} ${i + 1}`;
  });
}
