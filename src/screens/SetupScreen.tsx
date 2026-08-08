// Écran de configuration : saisie des joueurs (bornes définies par le jeu actif).
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
import ChipPicker from '../components/ChipPicker';
import IconButton from '../components/IconButton';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import { confirmOverwriteGame } from '../lib/confirm';
import { DEFAULT_FORMAT_KEY, FORMATS, getFormat } from '../lib/formats';
import { getGame, playerRange } from '../lib/games';
import { finalizePlayerNames } from '../lib/names';
import { useStore } from '../lib/store';
import { colors, goldGradient, radius, spacing } from '../theme';

// Seul Skull King est implémenté pour l'instant — cf. CLAUDE.md.
const activeGame = getGame('skull-king');
const { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS } = activeGame;
const FORMAT_OPTIONS = FORMATS.map((f) => ({
  key: f.key,
  label: f.name,
  sublabel: `${f.cardsPerRound.length} manche${f.cardsPerRound.length > 1 ? 's' : ''}`,
}));

export default function SetupScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const startGame = useStore((s) => s.startGame);
  const hasUnfinishedGame = !!game && !game.finishedAt;

  const [names, setNames] = useState<string[]>(() => Array(MIN_PLAYERS).fill(''));
  const [formatKey, setFormatKey] = useState(DEFAULT_FORMAT_KEY);

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

  const start = () => {
    const finalNames = finalizePlayerNames(names, 'Joueur');
    if (hasUnfinishedGame) {
      confirmOverwriteGame(() => startGame(activeGame.key, finalNames, format.cardsPerRound));
      return;
    }
    startGame(activeGame.key, finalNames, format.cardsPerRound);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          left={<BackButton label="Retour" onPress={() => setScreen('home')} />}
          title="Les joueurs"
          subtitle={`${playerRange(activeGame)} joueurs${
            activeGame.duration ? ` · ~${activeGame.duration} min` : ''
          }`}
        />

        <View style={styles.formatSection}>
          <SectionTitle>Format de partie</SectionTitle>
          <ChipPicker
            options={FORMAT_OPTIONS}
            selectedKey={formatKey}
            onSelect={setFormatKey}
          />
          <Text style={styles.formatDescription}>{format.description}</Text>
          <Text style={styles.formatCards}>
            Cartes par manche : {format.cardsPerRound.join(', ')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.hint}>
            {canStart
              ? `${filled.length} joueur${filled.length > 1 ? 's' : ''} · ${format.cardsPerRound.length} manche${format.cardsPerRound.length > 1 ? 's' : ''}`
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
  formatSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  formatDescription: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  formatCards: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  list: { padding: spacing.lg, gap: spacing.md },
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
