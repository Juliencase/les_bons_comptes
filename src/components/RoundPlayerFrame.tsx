// Ossature partagée des écrans de saisie manche « un joueur à la fois »
// (mises, plis + bonus, correction) : en-tête, titre de manche, barre de
// progression des joueurs, nom du joueur, puis un pied de page à bouton
// unique. Les champs de saisie proprement dits sont fournis par l'appelant via
// `children` (maquette 9a) — agnostique du store, piloté uniquement par props.
import React, { ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from './BackButton';
import Badge from './Badge';
import Button from './Button';
import HeaderPill from './HeaderPill';
import ScreenBackground from './ScreenBackground';
import ScreenHeader from './ScreenHeader';
import SegmentBar, { SegmentState } from './SegmentBar';
import { alpha, colors, fonts } from '../theme';

type Props = {
  backLabel: string;
  onBack: () => void;
  onOpenScoreboard: () => void;
  title: string;
  meta: string;
  playerIndex: number;
  playersCount: number;
  onSelectPlayer: (index: number) => void;
  playerName: string;
  children: ReactNode;
  footerLabel: string;
  onFooterPress: () => void;
  footerDisabled?: boolean;
};

export default function RoundPlayerFrame({
  backLabel,
  onBack,
  onOpenScoreboard,
  title,
  meta,
  playerIndex,
  playersCount,
  onSelectPlayer,
  playerName,
  children,
  footerLabel,
  onFooterPress,
  footerDisabled,
}: Props) {
  const segments: SegmentState[] = useMemo(
    () =>
      Array.from({ length: playersCount }, (_, i) =>
        i === playerIndex ? 'current' : i < playerIndex ? 'done' : 'upcoming',
      ),
    [playerIndex, playersCount],
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={<BackButton label={backLabel} onPress={onBack} />}
            right={<HeaderPill label="Scores ⌃" onPress={onOpenScoreboard} />}
          />

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.meta}>{meta}</Text>
              </View>
              <Badge label={`Joueur ${playerIndex + 1} / ${playersCount}`} />
            </View>

            <SegmentBar
              segments={segments}
              onPressSegment={onSelectPlayer}
              height={4}
            />

            <Text style={styles.playerName} numberOfLines={1}>
              {playerName}
            </Text>

            {children}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={footerLabel}
              onPress={onFooterPress}
              disabled={footerDisabled}
            />
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
  playerName: {
    fontFamily: fonts.displayBlack,
    fontSize: 56,
    lineHeight: Math.round(56 * 0.84),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  footer: { paddingVertical: 18 },
});
