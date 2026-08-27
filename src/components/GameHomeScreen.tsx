// Écran d'accueil générique d'un jeu (maquette 8b) : titre (dernier mot en
// paille), effectif/durée, carte « Partie en cours » (contenu fourni par
// l'appelant — la forme diffère par jeu : segments de manches pour Skull King,
// barre de points pour Belote), actions et footer. Store/navigation-agnostic.
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from './BackButton';
import Button from './Button';
import ScreenHeader from './ScreenHeader';
import ScreenBackground from './ScreenBackground';
import SectionTitle from './SectionTitle';
import { alpha, colors, fonts } from '../theme';

type Props = {
  title: string;
  meta: string;
  statusLabel?: string;
  statusMeta?: string;
  statusContent?: ReactNode;
  footer: string;
  onBack: () => void;
  onNewGame: () => void;
  resumeLabel?: string;
  onResume?: () => void;
  showScoreboard?: boolean;
  scoreboardLabel: string;
  onScoreboard: () => void;
};

export default function GameHomeScreen({
  title,
  meta,
  statusLabel,
  statusMeta,
  statusContent,
  footer,
  onBack,
  onNewGame,
  resumeLabel,
  onResume,
  showScoreboard,
  scoreboardLabel,
  onScoreboard,
}: Props) {
  const words = title.split(' ');
  const last = words.pop();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <ScreenHeader
            left={<BackButton label="Les bons comptes" onPress={onBack} />}
          />

          <View style={styles.body}>
            <View>
              <Text style={styles.title}>
                {words.length > 0 ? `${words.join(' ')} ` : ''}
                <Text style={styles.titleAccent}>{last}</Text>
              </Text>
              <Text style={styles.meta}>{meta}</Text>
            </View>

            {statusContent != null && (
              <View style={styles.statusCard}>
                <View style={styles.statusHead}>
                  <SectionTitle>
                    {statusLabel ?? 'Partie en cours'}
                  </SectionTitle>
                  {statusMeta != null && (
                    <Text style={styles.statusMeta}>{statusMeta}</Text>
                  )}
                </View>
                {statusContent}
              </View>
            )}

            <View style={styles.actions}>
              {resumeLabel != null && onResume != null && (
                <Button label={resumeLabel} onPress={onResume} />
              )}
              {showScoreboard && (
                <Button
                  variant="secondary"
                  label={scoreboardLabel}
                  onPress={onScoreboard}
                />
              )}
              <Button
                variant="destructive"
                label="Nouvelle partie"
                onPress={onNewGame}
              />
            </View>

            <Text style={styles.footer}>{footer}</Text>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 22,
  },
  body: { flex: 1, gap: 22, justifyContent: 'center' },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 62,
    lineHeight: Math.round(62 * 0.82),
    textTransform: 'uppercase',
    color: colors.creme,
  },
  titleAccent: { color: colors.paille },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    color: alpha.creme(0.55),
    marginTop: 10,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    padding: 18,
  },
  statusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  statusMeta: { fontFamily: fonts.mono, fontSize: 10, color: alpha.creme(0.5) },
  actions: { gap: 8 },
  footer: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 17,
    color: alpha.creme(0.4),
  },
});
