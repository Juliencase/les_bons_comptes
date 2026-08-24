// Noms de joueurs : résolution des champs de formulaire et mise en forme des
// listes de noms.
/**
 * Un champ vide retombe sur un libellé par défaut indexé, sans perturber l'ordre.
 */
export function finalizePlayerNames(names: string[], fallbackPrefix: string): string[] {
  return names.map((n, i) => {
    const trimmed = n.trim();
    return trimmed.length > 0 ? trimmed : `${fallbackPrefix} ${i + 1}`;
  });
}

/**
 * Énumération lisible : « Alice », « Alice & Bob », « Alice, Bob & Chloé ».
 * Sert partout où plusieurs joueurs partagent une même ligne — vainqueurs ex
 * æquo, titre du palmarès décerné à plusieurs.
 */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
