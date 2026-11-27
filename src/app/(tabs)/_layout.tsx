import { Tabs } from 'expo-router/js-tabs';
import { Text, type ColorValue, type TextStyle } from 'react-native';

import { useTheme } from '@/components/ui';
import { withAppFont } from '@/lib/fonts';

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
        tabBarLabelStyle: withAppFont({ fontSize: 11, fontWeight: '500' }) as TextStyle,
      }}>
      <Tabs.Screen name="sessions" options={{ title: 'الجلسات', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="places" options={{ title: 'الأماكن', tabBarIcon: icon('⌖') }} />
      <Tabs.Screen name="people" options={{ title: 'الناس', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}
