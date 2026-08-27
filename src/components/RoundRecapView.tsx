// Phase 2 d'une manche fraîche : rappel du classement avant la saisie des plis
// et bonus, une fois toutes les mises prises — pas de navigation par joueur ici,
// juste un point d'étape avant d'enchaîner (RoundScreen).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from './BackButton';
import Button from './Button';
import HeaderPill from './HeaderPill';
import RankingList from './RankingList';
import ScreenBackground from './ScreenBackground';
import ScreenHeader from './ScreenHeader';
import SectionTitle from './SectionTitle';
import { rankingRows, roundLabel } from '../lib/scoring';
import { Game } from '../lib/types';
import { alpha, colors, fonts } from '../theme';

type Props = {
  game: Game;
  round: number;
  backLabel: string;
  onBack: () => void;
  onOpenScoreboard: () => void;
  onContinue: () => void;
};

export default function RoundRecapView({
  game,
  round,
  backLabel,
  onBack,
  onOpenScoreboard,
  onContinue,
}: Props) {
  // Classement basé sur les manches déjà validées : la manche en cours
  // (mises tout juste prises) ne compte pas encore.
  const rows = rankingRows(game);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={<BackButton label={backLabel} onPress={onBack} />}
            right={<HeaderPill label="Scores ⌃" onPress={onOpenScoreboard} />}
          />

          <ScrollView contentContainerStyle={styles.body}>
            <View>
              <Text style={styles.title}>{roundLabel(round)}</Text>
              <Text style={styles.meta}>
                Mises enregistrées · classement avant cette manche
              </Text>
            </View>

            <View>
              <SectionTitle>Classement</SectionTitle>
              <RankingList rows={rows} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Saisir les plis et bonus →" onPress={onContinue} />
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  body: { paddingVertical: 18, gap: 22 },
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
  footer: { paddingVertical: 18 },
});
