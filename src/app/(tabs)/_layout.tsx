import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/components/ui';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 18, color }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const c = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}>
      <Tabs.Screen name="sessions" options={{ title: 'الجلسات', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="places" options={{ title: 'الأماكن', tabBarIcon: icon('⌖') }} />
      <Tabs.Screen name="people" options={{ title: 'الناس', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}
