import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/components/onboarding';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
