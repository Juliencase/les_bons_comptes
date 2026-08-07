// Écran de configuration : saisie des joueurs (2 à 8).
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
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import ScreenHeader from '../components/ScreenHeader';
import { confirmOverwriteGame } from '../lib/confirm';
import { useStore } from '../lib/store';
import { MAX_PLAYERS, MIN_PLAYERS } from '../lib/types';
import { colors, radius, spacing } from '../theme';

export default function SetupScreen() {
  const game = useStore((s) => s.game);
  const setScreen = useStore((s) => s.setScreen);
  const startGame = useStore((s) => s.startGame);
  const hasUnfinishedGame = !!game && !game.finishedAt;

  const [names, setNames] = useState<string[]>(['', '']);

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

  const start = () => {
    // Complète les noms vides par un libellé par défaut, en gardant l'ordre.
    const finalNames = trimmed.map((n, i) => (n.length > 0 ? n : `Joueur ${i + 1}`));
    if (hasUnfinishedGame) {
      confirmOverwriteGame(() => startGame(finalNames));
      return;
    }
    startGame(finalNames);
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
        />

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {names.map((name, i) => (
            <View key={i} style={styles.rowItem}>
              <Text style={styles.index}>{i + 1}</Text>
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
              ? `${filled.length} joueur${filled.length > 1 ? 's' : ''} · 10 manches`
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
  list: { padding: spacing.lg, gap: spacing.md },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  index: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 16,
    width: 22,
    textAlign: 'center',
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
