// Écran de configuration : saisie des joueurs (bornes définies par le jeu actif),
// puis format de partie et système de score. Les joueurs sont en tête pour rester
// atteignables clavier ouvert — les réglages, eux, se saisissent sans clavier.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ChipPicker, { ChipOption } from '../components/ChipPicker';
import IconButton from '../components/IconButton';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import { confirmOverwriteGame } from '../lib/confirm';
import { DEFAULT_FORMAT_KEY, FORMATS, getFormat } from '../lib/formats';
import { getGame, playerRange } from '../lib/games';
import { finalizePlayerNames } from '../lib/names';
import {
  BID_KINDS,
  DEFAULT_SCORE_SYSTEM,
  getScoreSystem,
  SCORE_SYSTEMS,
} from '../lib/scoreSystems';
import { useStore } from '../lib/store';
import { ScoreSystem } from '../lib/types';
import { colors, goldGradient, radius, spacing } from '../theme';

// Seul Skull King est implémenté pour l'instant — cf. CLAUDE.md.
const activeGame = getGame('skull-king');
const { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS } = activeGame;
const [CHEVROTINE, BOULET] = BID_KINDS;

const FORMAT_OPTIONS: ChipOption[] = FORMATS.map((f) => ({
  key: f.key,
  label: f.name,
  sublabel: `${f.cardsPerRound.length} manche${f.cardsPerRound.length > 1 ? 's' : ''}`,
}));
const SYSTEM_OPTIONS: ChipOption[] = SCORE_SYSTEMS.map((s) => ({
  key: s.key,
  label: s.name,
  sublabel: s.tagline,
}));
// Option Rascal « Boulet de canon » : chaque joueur choisit alors son type de
// mise à chaque manche (cf. docs/REGLES_SKULL_KING.md §4.B).
const CANNONBALL_OPTIONS: ChipOption[] = [
  { key: 'off', label: 'Chevrotine seule', sublabel: 'règle de base' },
  { key: 'on', label: '+ Boulet de canon', sublabel: 'option risquée' },
];

export default function SetupScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const startGame = useStore((s) => s.startGame);
  const hasUnfinishedGame = !!game && !game.finishedAt;

  const [names, setNames] = useState<string[]>(() => Array(MIN_PLAYERS).fill(''));
  const [formatKey, setFormatKey] = useState(DEFAULT_FORMAT_KEY);
  const [systemKey, setSystemKey] = useState<ScoreSystem>(DEFAULT_SCORE_SYSTEM);
  const [cannonballRule, setCannonballRule] = useState(false);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const addPlayer = () =>
    setNames((prev) =>
      prev.length < MAX_PLAYERS ? [...prev, ''] : prev,
    );

  const removePlayer = (i: number) =>
    setNames((prev) =>
      prev.length > MIN_PLAYERS ? prev.filter((_, idx) => idx !== i) : prev,
    );

  const trimmed = names.map((n) => n.trim());
  const filled = trimmed.filter((n) => n.length > 0);
  const canStart = filled.length >= MIN_PLAYERS;

  const format = getFormat(formatKey);
  const system = getScoreSystem(systemKey);
  const isRascal = systemKey === 'rascal';

  const start = () => {
    const finalNames = finalizePlayerNames(names, 'Joueur');
    const setup = {
      cardsPerRound: format.cardsPerRound,
      scoreSystem: systemKey,
      // L'option n'a de sens qu'en Rascal : on ne la traîne pas en classique.
      cannonballRule: isRascal && cannonballRule,
    };
    if (hasUnfinishedGame) {
      confirmOverwriteGame(() => startGame(activeGame.key, finalNames, setup));
      return;
    }
    startGame(activeGame.key, finalNames, setup);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          left={<BackButton label="Retour" onPress={() => setScreen('home')} />}
          title="La partie"
          subtitle={`${playerRange(activeGame)} joueurs${
            activeGame.duration ? ` · ~${activeGame.duration} min` : ''
          }`}
        />

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <SectionTitle>Les joueurs</SectionTitle>
            <View style={styles.list}>
              {names.map((name, i) => (
                <View key={i} style={styles.rowItem}>
                  <LinearGradient colors={goldGradient} style={styles.avatar}>
                    <Text style={styles.index}>{i + 1}</Text>
                  </LinearGradient>
                  <TextInput
                    style={styles.input}
                    value={name}
                    placeholder={`Joueur ${i + 1}`}
                    placeholderTextColor={colors.textDim}
                    onChangeText={(t) => setName(i, t)}
                    maxLength={16}
                    returnKeyType="done"
                  />
                  {names.length > MIN_PLAYERS && (
                    <IconButton
                      icon="✕"
                      label={`Supprimer le joueur ${i + 1}`}
                      tone="danger"
                      circle
                      onPress={() => removePlayer(i)}
                    />
                  )}
                </View>
              ))}

              {names.length < MAX_PLAYERS && (
                <Button variant="dashed" label="+ Ajouter un joueur" onPress={addPlayer} />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle>Format de partie</SectionTitle>
            <ChipPicker
              options={FORMAT_OPTIONS}
              selectedKey={formatKey}
              onSelect={setFormatKey}
            />
            <Text style={styles.description}>{format.description}</Text>
            <Text style={styles.accent}>
              Cartes par manche : {format.cardsPerRound.join(', ')}
            </Text>
          </View>

          <View style={styles.section}>
            <SectionTitle>Système de score</SectionTitle>
            <ChipPicker
              options={SYSTEM_OPTIONS}
              selectedKey={systemKey}
              onSelect={(key) => setSystemKey(key as ScoreSystem)}
            />
            <Text style={styles.description}>{system.description}</Text>

            {isRascal && (
              <View style={styles.subSection}>
                <SectionTitle>Type de mise</SectionTitle>
                <ChipPicker
                  options={CANNONBALL_OPTIONS}
                  selectedKey={cannonballRule ? 'on' : 'off'}
                  onSelect={(key) => setCannonballRule(key === 'on')}
                />
                <Text style={styles.description}>
                  {cannonballRule
                    ? `À chaque manche, chaque joueur choisit en plus son type de mise — ${CHEVROTINE.name} (${CHEVROTINE.hint}) ou ${BOULET.name} (${BOULET.hint}).`
                    : `Tout le monde joue la règle Rascal habituelle : ${CHEVROTINE.hint}.`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.hint}>
            {/* Une ligne laissée vide donne quand même un joueur (« Joueur 3 »,
                cf. finalizePlayerNames) : on compte les lignes, pas les noms saisis. */}
            {canStart
              ? `${names.length} joueur${names.length > 1 ? 's' : ''} · ${format.cardsPerRound.length} manche${format.cardsPerRound.length > 1 ? 's' : ''} · système ${system.name}`
              : `Au moins ${MIN_PLAYERS} joueurs`}
          </Text>
          <Button label="Commencer la partie" disabled={!canStart} onPress={start} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.xs },
  subSection: { marginTop: spacing.md, gap: spacing.xs },
  description: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  accent: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  list: { gap: spacing.md, marginTop: spacing.xs },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    color: colors.bg,
    fontWeight: '800',
    fontSize: 13,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  hint: { color: colors.textDim, textAlign: 'center', fontSize: 13 },
});
