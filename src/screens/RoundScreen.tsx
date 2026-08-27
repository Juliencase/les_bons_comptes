// Écran de saisie de la manche courante — un joueur à la fois (maquette 9a).
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import BonusButtons from '../components/BonusButtons';
import Button from '../components/Button';
import Callout from '../components/Callout';
import HeaderPill from '../components/HeaderPill';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SegmentBar, { SegmentState } from '../components/SegmentBar';
import SegmentedToggle from '../components/SegmentedToggle';
import Stepper from '../components/Stepper';
import { useStore } from '../lib/store';
import {
  bidKindOf,
  cardsForRound,
  DEFAULT_BID_KIND,
  isEntryComplete,
  rascalPotential,
  roundTotal,
  tricksEnteredForRound,
} from '../lib/scoring';
import { BID_KINDS } from '../lib/scoreSystems';
import { formatSignedScore } from '../lib/format';
import { alpha, colors, fonts } from '../theme';

export default function RoundScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const setBid = useStore((s) => s.setBid);
  const setTricks = useStore((s) => s.setTricks);
  const setBonus = useStore((s) => s.setBonus);
  const setBidKind = useStore((s) => s.setBidKind);
  const commitRound = useStore((s) => s.commitRound);
  const goToRound = useStore((s) => s.goToRound);

  // Position dans la manche — état local, non persisté (cf. plan). Ne peut pas
  // se dériver de isEntryComplete : une manche atteinte démarre à 0 partout
  // (zeroEntry, cf. store.ts), donc chaque entrée est déjà "complète" avant
  // même d'avoir été regardée. On repart toujours du premier joueur à
  // l'arrivée sur l'écran (nouvelle manche, retour des scores, correction).
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [game?.currentRound]);

  if (!game) return null;

  const round = game.currentRound;
  const cards = cardsForRound(game.cardsPerRound, round);
  const editMode = !!game.finishedAt;
  const showPotential = game.scoreSystem === 'rascal' && !game.cannonballRule;

  const entries = game.players.map((p) => game.rounds[round]?.[p.id]);
  const allComplete = entries.every((e) => isEntryComplete(e));
  const playerIndex = Math.min(index, game.players.length - 1);
  const player = game.players[playerIndex];
  const entry = entries[playerIndex] ?? {
    bid: 0,
    tricks: 0,
    bonus: 0,
    validated: false,
  };
  const isLastPlayer = playerIndex === game.players.length - 1;
  const complete = isEntryComplete(entry);
  const bidKind = bidKindOf(entry);
  const roundScore = complete
    ? roundTotal(entry, cards, game.scoreSystem)
    : null;

  const segments: SegmentState[] = game.players.map((_, i) =>
    i === playerIndex ? 'current' : i < playerIndex ? 'done' : 'upcoming',
  );

  const tricksSum = tricksEnteredForRound(game, round);
  // Avertissement non bloquant : uniquement une fois la saisie des plis commencée
  // (à l'état initial tout est à 0, on ne veut pas alerter).
  const tricksMismatch = tricksSum !== 0 && tricksSum !== cards;

  const goNext = () => {
    if (isLastPlayer) {
      if (allComplete) commitRound();
    } else {
      setIndex(playerIndex + 1);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={
              <BackButton
                label={
                  editMode
                    ? 'Scores'
                    : round > 1
                      ? `Manche ${String(round - 1).padStart(2, '0')}`
                      : 'Accueil'
                }
                onPress={() =>
                  editMode
                    ? setScreen('scoreboard')
                    : round > 1
                      ? goToRound(round - 1)
                      : setScreen('home')
                }
              />
            }
            right={
              <HeaderPill
                label="Scores ⌃"
                onPress={() => setScreen('scoreboard')}
              />
            }
          />

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>
                  {editMode
                    ? `Modifier la manche ${round}`
                    : `Manche ${String(round).padStart(2, '0')}`}
                </Text>
                <Text style={styles.meta}>
                  {cards} carte{cards > 1 ? 's' : ''} distribuée
                  {cards > 1 ? 's' : ''}
                  {showPotential
                    ? ` · potentiel ${rascalPotential(cards, DEFAULT_BID_KIND)} pts`
                    : ''}
                </Text>
              </View>
              <View style={styles.playerBadge}>
                <Text style={styles.playerBadgeText}>
                  Joueur {playerIndex + 1} / {game.players.length}
                </Text>
              </View>
            </View>

            <SegmentBar
              segments={segments}
              onPressSegment={setIndex}
              height={4}
            />

            <Text style={styles.playerName} numberOfLines={1}>
              {player.name}
            </Text>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Sa mise</Text>
                <Text style={styles.fieldMax}>max {cards}</Text>
              </View>
              <Stepper
                value={entry.bid}
                min={0}
                max={cards}
                onChange={(v) => setBid(round, player.id, v)}
                accent={colors.sanguine}
                decrementLabel="Diminuer la mise"
                incrementLabel="Augmenter la mise"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Plis remportés</Text>
                <Text style={styles.fieldMax}>max {cards}</Text>
              </View>
              <Stepper
                value={entry.tricks}
                min={0}
                max={cards}
                onChange={(v) => setTricks(round, player.id, v)}
                accent={colors.paille}
                decrementLabel="Diminuer les plis"
                incrementLabel="Augmenter les plis"
              />
            </View>

            {game.scoreSystem === 'rascal' && game.cannonballRule && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Type de mise</Text>
                <SegmentedToggle
                  options={[
                    { id: BID_KINDS[0].key, name: BID_KINDS[0].name },
                    { id: BID_KINDS[1].key, name: BID_KINDS[1].name },
                  ]}
                  selectedId={bidKind}
                  onSelect={(id) =>
                    setBidKind(round, player.id, id ?? DEFAULT_BID_KIND)
                  }
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bonus & malus</Text>
              <BonusButtons
                value={entry.bonus ?? 0}
                onChange={(v) => setBonus(round, player.id, v)}
              />
            </View>

            {tricksMismatch && (
              <Callout>
                {`${tricksSum} pli${tricksSum > 1 ? 's' : ''} annoncé${tricksSum > 1 ? 's' : ''} pour ${cards} carte${cards > 1 ? 's' : ''} — vérifiez, ou continuez.`}
              </Callout>
            )}

            <View style={styles.scoreFooter}>
              <Text style={styles.scoreFooterLabel}>Cette manche</Text>
              <Text
                style={[
                  styles.scoreValue,
                  roundScore == null
                    ? styles.scoreEmpty
                    : roundScore > 0
                      ? styles.scoreGain
                      : roundScore < 0
                        ? styles.scoreLoss
                        : styles.scoreEmpty,
                ]}
              >
                {roundScore == null ? '—' : formatSignedScore(roundScore)}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {editMode ? (
              <Button
                label="Retour au tableau des scores"
                onPress={() => setScreen('scoreboard')}
              />
            ) : (
              <Button
                label={isLastPlayer ? 'Valider la manche' : 'Joueur suivant →'}
                onPress={goNext}
                disabled={!complete}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  body: { paddingVertical: 18, gap: 18 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 46,
    lineHeight: Math.round(46 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.55),
    marginTop: 7,
  },
  playerBadge: {
    backgroundColor: colors.sanguine,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  playerBadgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    color: colors.fond,
  },
  playerName: {
    fontFamily: fonts.displayBlack,
    fontSize: 56,
    lineHeight: Math.round(56 * 0.84),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  field: { gap: 8 },
  fieldHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  fieldMax: { fontFamily: fonts.mono, fontSize: 10, color: alpha.creme(0.4) },
  scoreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.16),
    paddingTop: 14,
  },
  scoreFooterLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.5),
  },
  scoreValue: {
    fontFamily: fonts.displayBlack,
    fontSize: 42,
    lineHeight: 42,
    fontVariant: ['tabular-nums'],
  },
  scoreEmpty: { color: alpha.creme(0.4) },
  scoreGain: { color: colors.paille },
  scoreLoss: { color: colors.grenat },
  footer: { paddingVertical: 18 },
});
