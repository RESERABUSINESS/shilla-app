import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, useColorScheme } from 'react-native';

import { onNotificationTap } from '@/lib/notifications';
import { AppProvider, useApp } from '@/lib/store';

// The app is Arabic-first. app.json also sets extra.forcesRTL for native builds.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { ready, profile } = useApp();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Tapping a notification opens its session.
  useEffect(() => onNotificationTap((sessionId) => router.push(`/session/${sessionId}`)), []);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!profile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="session/chat/[id]" />
        <Stack.Screen name="session/invite/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="invite-person/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="suggest-venue" options={{ presentation: 'modal' }} />
        <Stack.Screen name="safety/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="blocked" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-sessions" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session/booking/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="book/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="claim/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="owner/index" />
        <Stack.Screen name="owner/[id]" />
        <Stack.Screen name="edit-hobbies" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AppProvider>
    </ThemeProvider>
  );
}
