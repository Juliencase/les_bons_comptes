// En-tête d'écran générique : slot gauche/droite optionnels + titre centré.
// Agnostique — ne connaît ni le store ni la navigation, tout vient des props/slots.
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  left?: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Séparation visuelle avec le contenu en dessous (utile sans marge de scroll). */
  bordered?: boolean;
};

export default function ScreenHeader({ left, title, subtitle, right, bordered }: Props) {
  return (
    <View style={[styles.header, bordered && styles.bordered]}>
      <View style={[styles.side, styles.sideLeft]}>{left}</View>
      {title != null && (
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bordered: { borderBottomWidth: 1, borderBottomColor: colors.border },
  side: { flex: 1 },
  sideLeft: { alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  center: { flex: 2, alignItems: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.gold, fontSize: 13, fontWeight: '600' },
});
