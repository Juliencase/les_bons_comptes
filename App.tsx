import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  Cinzel_800ExtraBold,
} from '@expo-google-fonts/cinzel';
import { useStore } from './src/lib/store';
import GamesScreen from './src/screens/GamesScreen';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import RoundScreen from './src/screens/RoundScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import { colors } from './src/theme';

export default function App() {
  const screen = useStore((s) => s.screen);
  const hydrated = useStore((s) => s.hydrated);
  const [fontsLoaded] = useFonts({
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Cinzel_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!hydrated || !fontsLoaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : screen === 'home' ? (
        <HomeScreen />
      ) : screen === 'setup' ? (
        <SetupScreen />
      ) : screen === 'round' ? (
        <RoundScreen />
      ) : screen === 'scoreboard' ? (
        <ScoreboardScreen />
      ) : (
        <GamesScreen />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
