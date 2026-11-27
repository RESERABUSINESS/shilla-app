import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue, TextStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/components/ui';
import { withAppFont } from '@/lib/fonts';
import { useApp } from '@/lib/store';

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Icon name={name} size={size} color={String(color)} />;
  };

export default function TabsLayout() {
  const c = useTheme();
  const { unread } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: withAppFont({ fontSize: 11, fontWeight: '500' }) as TextStyle,
      }}>
      <Tabs.Screen name="sessions" options={{ title: 'الجلسات', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="places" options={{ title: 'الأماكن', tabBarIcon: icon('map-outline') }} />
      <Tabs.Screen name="people" options={{ title: 'الناس', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'حسابي', tabBarIcon: icon('person-circle-outline'), tabBarBadge: unread ? unread : undefined }}
      />
    </Tabs>
  );
}
