// Utilitaires de confirmation (popups natives) — isolés du rendu des écrans.
import { Alert } from 'react-native';

/**
 * Alerte de confirmation avant d'écraser la partie en cours (démarrage d'une nouvelle partie).
 * L'appelant est responsable de ne l'invoquer que si une partie non terminée existe.
 */
export function confirmOverwriteGame(onConfirm: () => void): void {
  Alert.alert(
    'Partie en cours',
    'Une partie est déjà en cours. Démarrer une nouvelle partie supprimera définitivement sa progression.',
    [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Nouvelle partie', style: 'destructive', onPress: onConfirm },
    ],
  );
}
