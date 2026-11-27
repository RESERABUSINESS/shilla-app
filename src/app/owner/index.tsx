import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Empty, Row, Screen, T, useTheme } from '@/components/ui';
import { hobby } from '@/lib/hobbies';
import { useApp } from '@/lib/store';

/** Partners: the venues you manage. */
export default function OwnerHome() {
  const c = useTheme();
  const { ownedVenues, loadOwnedVenues } = useApp();

  useEffect(() => {
    loadOwnedVenues().catch(() => {});
  }, [loadOwnedVenues]);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">لوحة مكاني</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>
      {ownedVenues.length ? (
        ownedVenues.map((v) => (
          <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push(`/owner/${v.id}`)}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ fontWeight: '700', flex: 1 }}>{v.name}</T>
                <Icon name="chevron-back" size={18} color={c.muted} />
              </Row>
              <T variant="small">{`${v.kind} · ${v.hobbies.map((h) => hobby(h).name).join('، ')}`}</T>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty>{'ما عندك أماكن مسجلة.\nمن صفحة المكان اضغط «أنت صاحب المكان؟» وقدم طلب.'}</Empty>
      )}
    </Screen>
  );
}
