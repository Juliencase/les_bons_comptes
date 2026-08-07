// Écran de saisie de la manche courante.
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../lib/store';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import PlayerRoundRow from '../components/PlayerRoundRow';
import ScreenHeader from '../components/ScreenHeader';
import { colors, goldGradient, goldTint, radius, spacing } from '../theme';
import {
  cardsForRound,
  cumulativeTotal,
  isEntryComplete,
  tricksEnteredForRound,
} from '../lib/scoring';

export default function RoundScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const setBid = useStore((s) => s.setBid);
  const setTricks = useStore((s) => s.setTricks);
  const setBonus = useStore((s) => s.setBonus);
  const commitRound = useStore((s) => s.commitRound);
  const goToRound = useStore((s) => s.goToRound);

  if (!game) return null;

  const round = game.currentRound;
  const cards = cardsForRound(round);
  const isLast = round >= game.totalRounds;
  // Partie déjà terminée : on rouvre une manche passée pour corriger un score,
  // les modifications s'appliquent immédiatement (la manche reste validée).
  const editMode = !!game.finishedAt;

  const entries = game.players.map((p) => game.rounds[round]?.[p.id]);
  const allComplete = entries.every((e) => isEntryComplete(e));
  const tricksSum = tricksEnteredForRound(game, round);
  // Avertissement non bloquant : uniquement une fois la saisie des plis commencée
  // (à l'état initial tout est à 0, on ne veut pas alerter).
  const tricksMismatch = tricksSum !== 0 && tricksSum !== cards;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          left={
            <IconButton
              icon="☰"
              label="Retour à l'accueil"
              onPress={() => setScreen(editMode ? 'scoreboard' : 'home')}
            />
          }
          title={editMode ? `Modifier la manche ${round}` : `Manche ${round}/${game.totalRounds}`}
          subtitle={`${cards} carte${cards > 1 ? 's' : ''}`}
          right={<IconButton icon="📊" label="Voir le tableau des scores" onPress={() => setScreen('scoreboard')} />}
          bordered
        />

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${(round / game.totalRounds) * 100}%` }]}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {game.players.map((p) => {
            const entry = game.rounds[round]?.[p.id] ?? {
              bid: 0,
              tricks: 0,
              bonus: 0,
            };
            return (
              <PlayerRoundRow
                key={p.id}
                name={p.name}
                cumulative={cumulativeTotal(game, p.id)}
                entry={entry}
                cards={cards}
                onBid={(v) => setBid(round, p.id, v)}
                onTricks={(v) => setTricks(round, p.id, v)}
                onBonus={(v) => setBonus(round, p.id, v)}
              />
            );
          })}

          {tricksMismatch && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                ⚠️ {tricksSum} pli{tricksSum > 1 ? 's' : ''} saisi
                {tricksSum > 1 ? 's' : ''} pour {cards} carte
                {cards > 1 ? 's' : ''}. Vérifie tes saisies (normal si un
                Kraken/Baleine a détruit un pli).
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {editMode ? (
            <Button label="Retour au tableau des scores" onPress={() => setScreen('scoreboard')} />
          ) : (
            <>
              {round > 1 && (
                <Button
                  variant="ghost"
                  label="‹ Manche précédente"
                  onPress={() => goToRound(round - 1)}
                />
              )}
              <Button
                disabled={!allComplete}
                label={isLast ? 'Terminer la partie' : 'Valider la manche ›'}
                onPress={commitRound}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  progressTrack: { height: 4, backgroundColor: colors.bgAlt },
  progressFill: { height: '100%' },
  list: { padding: spacing.lg },
  warning: {
    backgroundColor: goldTint.medium,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  warningText: { color: colors.goldSoft, fontSize: 13, lineHeight: 19 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
});
