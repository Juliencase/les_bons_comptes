// Écran multijoueur : création d'une salle à distance (WebSocket, apps/api).
// Le hub Go n'est pas encore branché (apps/api/internal/hub) — la connexion
// échoue systématiquement pour l'instant ; cet écran gère cet échec proprement
// (message clair, bouton pour réessayer) sans jamais planter.
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import Callout from '../components/Callout';
import RoomCodeCard from '../components/RoomCodeCard';
import ScreenBackground from '../components/ScreenBackground';
import ScreenHeader from '../components/ScreenHeader';
import { useRoomSocket } from '../lib/ws';
import { useStore } from '../lib/store';
import { alpha, colors, fonts } from '../theme';

export default function RoomCreateScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const [playerName, setPlayerName] = useState('');
  const { status, room, errorMessage, createRoom } = useRoomSocket();

  const trimmedName = playerName.trim();
  const isConnecting = status === 'connecting';
  const canSubmit = trimmedName.length > 0 && !isConnecting;

  const submit = () => {
    if (!canSubmit) return;
    createRoom(trimmedName);
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
                <BackButton label="Jeux" onPress={() => setScreen('games')} />
              }
            />
            <Text style={styles.title}>Multijoueur</Text>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {status === 'connected' && room ? (
                <RoomCodeCard code={room.code} players={room.players} />
              ) : (
                <View style={styles.form}>
                  <Text style={styles.hint}>
                    Créez une salle à distance et partagez le code à l&apos;oral
                    avec les autres joueurs.
                  </Text>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Votre nom</Text>
                    <TextInput
                      style={styles.input}
                      value={playerName}
                      onChangeText={setPlayerName}
                      placeholder="Joueur"
                      placeholderTextColor={alpha.creme(0.35)}
                      maxLength={16}
                      returnKeyType="done"
                      editable={!isConnecting}
                      onSubmitEditing={submit}
                    />
                  </View>

                  {isConnecting && (
                    <View style={styles.connecting}>
                      <ActivityIndicator color={colors.sanguine} />
                      <Text style={styles.connectingText}>
                        Connexion à la salle…
                      </Text>
                    </View>
                  )}

                  {status === 'error' && errorMessage != null && (
                    <Callout>{errorMessage}</Callout>
                  )}
                </View>
              )}
            </ScrollView>

            {status !== 'connected' && (
              <View style={styles.footer}>
                <Button
                  label={status === 'error' ? 'Réessayer' : 'Créer la salle'}
                  onPress={submit}
                  disabled={!canSubmit}
                />
              </View>
            )}
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
  body: { paddingVertical: 22, flexGrow: 1 },
  form: { gap: 18 },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 17,
    color: alpha.creme(0.5),
  },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.55),
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: alpha.creme(0.18),
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    textTransform: 'uppercase',
    color: colors.creme,
    paddingHorizontal: 12,
  },
  connecting: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectingText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.55),
  },
  footer: { paddingVertical: 18 },
});
