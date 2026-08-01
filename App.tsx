import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from './src/lib/store';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import RoundScreen from './src/screens/RoundScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import { colors } from './src/theme';

export default function App() {
  const screen = useStore((s) => s.screen);
  const hydrated = useStore((s) => s.hydrated);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!hydrated ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : screen === 'setup' ? (
        <SetupScreen />
      ) : screen === 'round' ? (
        <RoundScreen />
      ) : screen === 'scoreboard' ? (
        <ScoreboardScreen />
      ) : (
        <HomeScreen />
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
