// Écran multijoueur : créer une salle à distance ou en rejoindre une avec un
// code (WebSocket, apps/api). Une coupure après connexion passe par l'état
// `reconnecting` (useRoomSocket) : la salle reste affichée, avec une petite
// bannière, plutôt que de retomber sur le formulaire.
import React, { useEffect, useRef, useState } from 'react';
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
import SegmentedToggle, {
  SegmentedOption,
} from '../components/SegmentedToggle';
import { getSavedPlayerName, savePlayerName } from '../lib/playerName';
import { useRoomSocket } from '../lib/ws';
import { useStore } from '../lib/store';
import { alpha, colors, fonts, opacity } from '../theme';

type RoomMode = 'create' | 'join';

const MODE_OPTIONS: [SegmentedOption<RoomMode>, SegmentedOption<RoomMode>] = [
  { id: 'create', name: 'Créer' },
  { id: 'join', name: 'Rejoindre' },
];

const ROOM_CODE_LENGTH = 4;

export default function RoomScreen() {
  const setScreen = useStore((s) => s.setScreen);
  const [mode, setMode] = useState<RoomMode>('join');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const codeInputRef = useRef<TextInput>(null);
  const { status, room, errorMessage, createRoom, joinRoom, leaveRoom } =
    useRoomSocket();

  // Préremplit le nom avec la dernière valeur mémorisée (voir submit, qui la
  // met à jour) — seulement si l'utilisateur n'a rien tapé entre-temps.
  useEffect(() => {
    let cancelled = false;
    void getSavedPlayerName().then((saved) => {
      if (cancelled || !saved) return;
      setPlayerName((current) => (current === '' ? saved : current));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isJoinMode = mode === 'join';
  const trimmedName = playerName.trim();
  const isConnecting = status === 'connecting';
  const isReconnecting = status === 'reconnecting';
  // Une reconnexion garde la dernière salle connue affichée (bannière plutôt
  // que retour au formulaire) : voir useRoomSocket, état `reconnecting`.
  const isInRoom = status === 'connected' || isReconnecting;
  const canSubmit =
    trimmedName.length > 0 &&
    !isConnecting &&
    (!isJoinMode || roomCode.length === ROOM_CODE_LENGTH);

  const submit = () => {
    if (!canSubmit) return;
    void savePlayerName(trimmedName);
    if (isJoinMode) {
      joinRoom(roomCode, trimmedName);
    } else {
      createRoom(trimmedName);
    }
  };

  const goBack = () => {
    leaveRoom();
    setScreen('games');
  };

  const submitLabel =
    status === 'error'
      ? 'Réessayer'
      : isJoinMode
        ? 'Rejoindre la salle'
        : 'Créer la salle';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <ScreenHeader
              left={<BackButton label="Jeux" onPress={goBack} />}
            />
            <Text style={styles.title}>Multijoueur</Text>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {isInRoom && room ? (
                <View style={styles.room}>
                  {isReconnecting && (
                    <View style={styles.connecting}>
                      <ActivityIndicator color={colors.sanguine} />
                      <Text style={styles.connectingText}>Reconnexion…</Text>
                    </View>
                  )}
                  <RoomCodeCard code={room.code} players={room.players} />
                </View>
              ) : (
                <View style={styles.form}>
                  <View
                    style={isConnecting && styles.toggleDisabled}
                    pointerEvents={isConnecting ? 'none' : 'auto'}
                  >
                    <SegmentedToggle
                      options={MODE_OPTIONS}
                      selectedId={mode}
                      onSelect={(id) => id && setMode(id)}
                    />
                  </View>

                  <Text style={styles.hint}>
                    {isJoinMode
                      ? 'Entrez le code à 4 chiffres communiqué par le créateur de la salle.'
                      : "Créez une salle à distance et partagez le code à l'oral avec les autres joueurs."}
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
                      returnKeyType={isJoinMode ? 'next' : 'done'}
                      editable={!isConnecting}
                      onSubmitEditing={
                        isJoinMode
                          ? () => codeInputRef.current?.focus()
                          : submit
                      }
                    />
                  </View>

                  {isJoinMode && (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Code de la salle</Text>
                      <TextInput
                        ref={codeInputRef}
                        style={styles.input}
                        value={roomCode}
                        onChangeText={(raw) =>
                          setRoomCode(raw.replace(/[^0-9]/g, ''))
                        }
                        placeholder="0000"
                        placeholderTextColor={alpha.creme(0.35)}
                        keyboardType="number-pad"
                        maxLength={ROOM_CODE_LENGTH}
                        returnKeyType="done"
                        editable={!isConnecting}
                        onSubmitEditing={submit}
                      />
                    </View>
                  )}

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

            {!isInRoom && (
              <View style={styles.footer}>
                <Button
                  label={submitLabel}
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
  room: { gap: 18 },
  form: { gap: 18 },
  toggleDisabled: { opacity: opacity.disabled },
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
