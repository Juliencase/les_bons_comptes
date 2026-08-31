// Fond commun à tous les écrans : aplat --fond + trame de points (charte §04).
// La trame est un PNG statique assez grand rendu en `cover` plutôt qu'un
// `resizeMode="repeat"` — ce dernier est peu fiable sur Android physique.
import React, { ReactNode } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenBackground({ children, style }: Props) {
  return (
    <View style={[styles.fill, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require('../../assets/texture/dot-grid.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.fond },
});
