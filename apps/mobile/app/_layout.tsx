import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadActiveWorkout } from '../src/activeWorkout';
import { SessionProvider } from '../src/session';
import { useColors } from '../src/theme';

export default function RootLayout() {
  useEffect(() => {
    void loadActiveWorkout();
  }, []);
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Screens />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const c = useColors();
  const scheme = useColorScheme();
  return (
    <>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.accent,
          headerTitleStyle: { color: c.text },
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="pair" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout"
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add food' }} />
        <Stack.Screen
          name="menu"
          options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }}
        />
      </Stack>
    </>
  );
}
