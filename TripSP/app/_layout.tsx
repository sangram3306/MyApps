import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/context/AppContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/theme/colors';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from '../src/components/AnimatedSplashScreen';

// Removed top-level SplashScreen.preventAutoHideAsync()

function RootLayoutInner() {
  const { state } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const isDark = state.settings.theme === 'dark';
  const colors = Colors[state.settings.theme];

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  return (
    <>
      {showSplash && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
          <AnimatedSplashScreen onAnimationComplete={() => setShowSplash(false)} />
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-trip"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-entry"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-entry"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutInner />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
