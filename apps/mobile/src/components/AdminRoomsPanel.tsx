// Bandeau de debug listant les salles multijoueur actives côté serveur
// (GET /admin/rooms) — outil temporaire pour observer l'état réel du hub
// pendant le développement de la reconnexion, pas une feature grand public :
// esthétique volontairement sobre, mais tokens du thème quand même. Gère son
// propre fetch en interne (pas de prop pour les données) : ce n'est donc pas
// data-agnostique au sens strict de la convention du projet, mais il
// n'importe ni le store ni la navigation, ce qui en est le point réel.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminRoomSnapshot } from '@lbc/shared';
import { fetchAdminRooms } from '../lib/adminApi';
import { alpha, colors, fonts, spacing } from '../theme';

/** Heure lisible ("14:32:07") depuis un timestamp Unix en secondes. */
function formatCreatedAt(createdAtSeconds: number): string {
  return new Date(createdAtSeconds * 1000).toLocaleString('fr-FR');
}

function summaryLabel(
  loading: boolean,
  error: string | null,
  rooms: AdminRoomSnapshot[] | null,
): string {
  if (loading) return 'DEBUG · …';
  if (error) return 'DEBUG · erreur de chargement';
  const count = rooms?.length ?? 0;
  return `DEBUG · ${count} salle${count > 1 ? 's' : ''} active${count > 1 ? 's' : ''}`;
}

export default function AdminRoomsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [rooms, setRooms] = useState<AdminRoomSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminRooms()
      .then(setRooms)
      .catch(() => setError('Échec du chargement des salles.'))
      .finally(() => setLoading(false));
  }, []);

  // Chargement initial, pour que le compteur du bandeau replié soit à jour
  // sans attendre un dépli — pas de polling au-delà : voir le bouton
  // "Rafraîchir" plus bas pour un rechargement manuel ponctuel.
  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        style={styles.header}
      >
        <Text style={styles.headerText}>
          {summaryLabel(loading, error, rooms)}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.actions}>
            <Pressable
              onPress={load}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Rafraîchir</Text>
            </Pressable>
            <Pressable
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Replier</Text>
            </Pressable>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <ScrollView style={styles.list}>
            {(rooms ?? []).map((room) => (
              <RoomRow key={room.code} room={room} />
            ))}
            {rooms != null && rooms.length === 0 && (
              <Text style={styles.emptyText}>Aucune salle active.</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function RoomRow({ room }: { room: AdminRoomSnapshot }) {
  return (
    <View style={styles.row}>
      <Text style={styles.roomCode}>
        {room.code} · {formatCreatedAt(room.createdAt)}
      </Text>
      <Text style={styles.roomDetail}>Créateur : {room.creatorName}</Text>
      <Text style={styles.roomDetail}>
        Joueurs : {room.players.map((p) => p.name).join(', ') || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.24),
  },
  header: {
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s12,
  },
  headerText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.1,
    color: alpha.paille(0.9),
  },
  body: {
    paddingHorizontal: spacing.s12,
    paddingBottom: spacing.s12,
    maxHeight: 240,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.s12,
    marginBottom: spacing.s8,
  },
  actionButton: {
    paddingVertical: spacing.s4,
  },
  actionText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 10 * 0.1,
    textTransform: 'uppercase',
    color: colors.creme,
  },
  errorText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.grenat,
    marginBottom: spacing.s8,
  },
  list: {
    maxHeight: 200,
  },
  row: {
    paddingVertical: spacing.s6,
    borderTopWidth: 1,
    borderTopColor: alpha.creme(0.12),
  },
  roomCode: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.creme,
  },
  roomDetail: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.7),
  },
  emptyText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: alpha.creme(0.55),
    paddingVertical: spacing.s6,
  },
});
