// Écran de configuration : saisie des joueurs (bornes définies par le jeu actif),
// puis format de partie et système de score. Les joueurs sont en tête pour rester
// atteignables clavier ouvert — les réglages, eux, se saisissent sans clavier.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ChipPicker, { ChipOption } from '../components/ChipPicker';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import ToggleRow from '../components/ToggleRow';
import { DEFAULT_FORMAT_KEY, FORMATS, getFormat } from '../lib/formats';
import { getGame } from '../lib/games';
import { finalizePlayerNames } from '../lib/names';
import {
  BID_KINDS,
  DEFAULT_SCORE_SYSTEM,
  SCORE_SYSTEMS,
} from '../lib/scoreSystems';
import { useStore } from '../lib/store';
import { ScoreSystem } from '../lib/types';
import { alpha, colors, fonts } from '../theme';

// Seul Skull King est implémenté pour l'instant — cf. CLAUDE.md.
const activeGame = getGame('skull-king');
const { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS } = activeGame;
const [CHEVROTINE, BOULET] = BID_KINDS;

const FORMAT_OPTIONS: ChipOption[] = FORMATS.map((f) => ({
  key: f.key,
  label: f.name,
}));

export default function SetupScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const startGame = useStore((s) => s.startGame);

  const [names, setNames] = useState<string[]>(() =>
    Array(MIN_PLAYERS).fill(''),
  );
  const [formatKey, setFormatKey] = useState(DEFAULT_FORMAT_KEY);
  const [systemKey, setSystemKey] = useState<ScoreSystem>(DEFAULT_SCORE_SYSTEM);
  const [cannonballRule, setCannonballRule] = useState(false);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));

  const addPlayer = () =>
    setNames((prev) => (prev.length < MAX_PLAYERS ? [...prev, ''] : prev));

  const removePlayer = (i: number) =>
    setNames((prev) =>
      prev.length > MIN_PLAYERS ? prev.filter((_, idx) => idx !== i) : prev,
    );

  const trimmed = names.map((n) => n.trim());
  const filled = trimmed.filter((n) => n.length > 0);
  const canStart = filled.length >= MIN_PLAYERS;

  const format = getFormat(formatKey);
  const isRascal = systemKey === 'rascal';

  const start = () => {
    const finalNames = finalizePlayerNames(names, 'Joueur');
    startGame(activeGame.key, finalNames, {
      cardsPerRound: format.cardsPerRound,
      scoreSystem: systemKey,
      // L'option n'a de sens qu'en Rascal : on ne la traîne pas en classique.
      cannonballRule: isRascal && cannonballRule,
    });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <ScreenHeader
              left={
                <BackButton
                  label="Skull King"
                  onPress={() => setScreen('home')}
                />
              }
            />
            <Text style={styles.title}>Nouvelle partie</Text>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <SectionTitle index="01">Joueurs</SectionTitle>
                  <Text style={styles.sectionMeta}>
                    {names.length} / {MAX_PLAYERS}
                  </Text>
                </View>
                <View style={styles.list}>
                  {names.map((name, i) => (
                    <View key={i} style={styles.rowItem}>
                      <Text style={styles.index}>{i + 1}</Text>
                      <TextInput
                        style={styles.input}
                        value={name}
                        placeholder={`Joueur ${i + 1}`}
                        placeholderTextColor={alpha.creme(0.35)}
                        onChangeText={(t) => setName(i, t)}
                        maxLength={16}
                        returnKeyType="done"
                      />
                      {names.length > MIN_PLAYERS && (
                        <Pressable
                          onPress={() => removePlayer(i)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer le joueur ${i + 1}`}
                          style={({ pressed }) => [
                            styles.removeBtn,
                            pressed && styles.removeBtnPressed,
                          ]}
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}

                  {names.length < MAX_PLAYERS && (
                    <Button
                      variant="dashed"
                      label="+ Ajouter un joueur"
                      onPress={addPlayer}
                    />
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <SectionTitle index="02">Format de partie</SectionTitle>
                <ChipPicker
                  options={FORMAT_OPTIONS}
                  selectedKey={formatKey}
                  onSelect={setFormatKey}
                />
                <View style={styles.cardsBox}>
                  <Text style={styles.cardsLabel}>Cartes</Text>
                  <Text style={styles.cardsValue}>
                    {format.cardsPerRound.join(' · ')}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <SectionTitle index="03">Système de score</SectionTitle>
                <View style={styles.systems}>
                  {SCORE_SYSTEMS.map((s) => {
                    const selected = s.key === systemKey;
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => setSystemKey(s.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.systemCard,
                          selected && styles.systemCardSelected,
                        ]}
                      >
                        <View style={styles.systemHead}>
                          <Text style={styles.systemName}>{s.name}</Text>
                          <View
                            style={[
                              styles.radio,
                              selected && styles.radioSelected,
                            ]}
                          />
                        </View>
                        <Text style={styles.systemDescription}>
                          {s.description}
                        </Text>

                        {s.key === 'rascal' && selected && (
                          <ToggleRow
                            title="Boulet de canon"
                            subtitle={`${BOULET.hint}. Sinon : ${CHEVROTINE.hint}.`}
                            value={cannonballRule}
                            onChange={setCannonballRule}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.hint}>
                {/* Une ligne laissée vide donne quand même un joueur (« Joueur 3 »,
                    cf. finalizePlayerNames) : on compte les lignes, pas les noms saisis. */}
                {canStart
                  ? `${names.length} joueurs · ${format.cardsPerRound.length} manches`
                  : `Au moins ${MIN_PLAYERS} joueurs`}
              </Text>
              <Button
                label="Distribuer la manche 01"
                disabled={!canStart}
                onPress={start}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22 },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 46,
    lineHeight: Math.round(46 * 0.86),
    textTransform: 'uppercase',
    color: colors.creme,
    marginTop: 14,
  },
  body: { paddingVertical: 22, gap: 22 },
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.45),
  },
  list: { gap: 5 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    paddingLeft: 12,
    paddingRight: 6,
  },
  index: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: alpha.creme(0.4),
    width: 16,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    textTransform: 'uppercase',
    color: colors.creme,
    padding: 0,
  },
  removeBtn: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnPressed: {},
  removeText: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: alpha.creme(0.45),
  },
  cardsBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
  },
  cardsLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.16,
    textTransform: 'uppercase',
    color: alpha.creme(0.45),
  },
  cardsValue: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    letterSpacing: 22 * 0.06,
    color: colors.creme,
    fontVariant: ['tabular-nums'],
  },
  systems: { gap: 6 },
  systemCard: { borderWidth: 1, borderColor: alpha.creme(0.22), padding: 14 },
  systemCardSelected: {
    borderColor: colors.sanguine,
    backgroundColor: alpha.sanguine(0.07),
  },
  systemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  systemName: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    lineHeight: 26,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: alpha.creme(0.4),
  },
  radioSelected: { backgroundColor: colors.sanguine, borderWidth: 0 },
  systemDescription: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: alpha.creme(0.5),
    marginTop: 7,
  },
  footer: { paddingVertical: 18, gap: 8 },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.45),
    textAlign: 'center',
  },
});
