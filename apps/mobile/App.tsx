import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  BigShouldersDisplay_600SemiBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  SometypeMono_400Regular,
  SometypeMono_500Medium,
} from '@expo-google-fonts/sometype-mono';
import { useStore } from './src/lib/store';
import GamesScreen from './src/screens/GamesScreen';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import RoundScreen from './src/screens/RoundScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import BeloteHomeScreen from './src/screens/BeloteHomeScreen';
import BeloteSetupScreen from './src/screens/BeloteSetupScreen';
import BeloteRoundScreen from './src/screens/BeloteRoundScreen';
import BeloteScoreboardScreen from './src/screens/BeloteScoreboardScreen';
import RoomScreen from './src/screens/RoomScreen';
import { colors } from './src/theme';
import ScreenBackground from './src/components/ScreenBackground';

export default function App() {
  const screen = useStore((s) => s.screen);
  const hydrated = useStore((s) => s.hydrated);
  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_600SemiBold,
    BigShouldersDisplay_900Black,
    SometypeMono_400Regular,
    SometypeMono_500Medium,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!hydrated || !fontsLoaded ? (
        <ScreenBackground style={styles.loading}>
          <ActivityIndicator color={colors.sanguine} size="large" />
        </ScreenBackground>
      ) : screen === 'home' ? (
        <HomeScreen />
      ) : screen === 'setup' ? (
        <SetupScreen />
      ) : screen === 'round' ? (
        <RoundScreen />
      ) : screen === 'scoreboard' ? (
        <ScoreboardScreen />
      ) : screen === 'belote-home' ? (
        <BeloteHomeScreen />
      ) : screen === 'belote-setup' ? (
        <BeloteSetupScreen />
      ) : screen === 'belote-round' ? (
        <BeloteRoundScreen />
      ) : screen === 'belote-scoreboard' ? (
        <BeloteScoreboardScreen />
      ) : screen === 'room' ? (
        <RoomScreen />
      ) : (
        <GamesScreen />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
