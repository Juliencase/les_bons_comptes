// Palmarès de fin de partie : un titre par ligne (emoji, nom du titre, lauréat
// et le chiffre qui le justifie). Présentational — les titres sont calculés
// dans lib/stats.ts, les noms de joueurs résolus par l'écran.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export type AwardRow = {
  id: string;
  emoji: string;
  title: string;
  /** Lauréat(s), déjà mis en forme (« Alice », ou « Alice & Bob » si ex æquo). */
  names: string;
  detail: string;
};

export default function AwardList({ rows }: { rows: AwardRow[] }) {
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <Text style={styles.emoji}>{row.emoji}</Text>
          <View style={styles.body}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.line}>
              <Text style={styles.names}>{row.names}</Text>
              <Text style={styles.detail}> · {row.detail}</Text>
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  emoji: { fontSize: 22, width: 28, textAlign: 'center' },
  body: { flex: 1, gap: 2 },
  title: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  line: { fontSize: 13, lineHeight: 18 },
  names: { color: colors.text, fontWeight: '700' },
  detail: { color: colors.textDim },
});
