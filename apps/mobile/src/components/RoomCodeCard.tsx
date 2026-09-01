// Code de salle à partager à l'oral + liste des joueurs déjà présents.
// Agnostique, piloté par props : pas d'accès store ni réseau — réutilisable
// tel quel par un futur écran de join (même payload room_state).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Player } from '@lbc/shared';
import { alpha, colors, fonts } from '../theme';

type Props = {
  code: string;
  players: Player[];
};

export default function RoomCodeCard({ code, players }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>Code de la salle</Text>
        <Text style={styles.code}>{code}</Text>
      </View>

      <View style={styles.players}>
        <Text style={styles.playersLabel}>
          {players.length} joueur{players.length > 1 ? 's' : ''}
        </Text>
        {players.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 22 },
  codeBlock: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    borderLeftWidth: 4,
    borderLeftColor: colors.paille,
    paddingVertical: 26,
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: alpha.creme(0.55),
  },
  code: {
    fontFamily: fonts.displayBlack,
    fontSize: 64,
    lineHeight: Math.round(64 * 0.86),
    letterSpacing: 64 * 0.04,
    color: colors.paille,
    fontVariant: ['tabular-nums'],
  },
  players: { gap: 5 },
  playersLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.sanguine,
    marginBottom: 2,
  },
  playerRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: alpha.creme(0.14),
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  playerName: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 24,
    textTransform: 'uppercase',
    color: colors.creme,
  },
});
