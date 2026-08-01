// Écran de saisie de la manche courante.
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import PlayerRoundRow from '../components/PlayerRoundRow';
import { colors, radius, spacing } from '../theme';
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
        <View style={styles.header}>
          <Pressable onPress={() => setScreen('home')} hitSlop={10}>
            <Text style={styles.headerBtn}>☰</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              Manche {round}/{game.totalRounds}
            </Text>
            <Text style={styles.subtitle}>{cards} carte{cards > 1 ? 's' : ''}</Text>
          </View>
          <Pressable onPress={() => setScreen('scoreboard')} hitSlop={10}>
            <Text style={styles.headerBtn}>📊</Text>
          </Pressable>
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
          {round > 1 && (
            <Pressable
              style={({ pressed }) => [
                styles.prevBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => goToRound(round - 1)}
            >
              <Text style={styles.prevText}>‹ Manche précédente</Text>
            </Pressable>
          )}
          <Pressable
            disabled={!allComplete}
            style={({ pressed }) => [
              styles.primary,
              !allComplete && styles.disabled,
              pressed && allComplete && styles.pressed,
            ]}
            onPress={commitRound}
          >
            <Text style={styles.primaryText}>
              {isLast ? 'Terminer la partie' : 'Valider la manche ›'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { fontSize: 22, color: colors.gold },
  headerCenter: { alignItems: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  list: { padding: spacing.lg },
  warning: {
    backgroundColor: 'rgba(224,169,46,0.12)',
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
  prevBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  prevText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  primary: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: { color: colors.bg, fontSize: 18, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
