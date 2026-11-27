import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { Avatar, Button, Card, Empty, Row, Screen, T, useTheme } from '@/components/ui';
import { confirmAction, notice } from '@/lib/confirm';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

export default function Blocked() {
  const c = useTheme();
  const { blocked, loadBlocked, unblock } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadBlocked().catch(() => {});
  }, [loadBlocked]);

  const askUnblock = (id: string, name: string) =>
    confirmAction(`إلغاء حظر ${name}`, 'بترجعون تشوفون بعض في التطبيق.', 'ألغِ الحظر', async () => {
      setBusy(id);
      try {
        await unblock(id);
      } catch (e) {
        notice('ما تمت العملية', errorMessage(e));
      } finally {
        setBusy(null);
      }
    });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">المحظورين</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>
      {blocked.length ? (
        blocked.map((b) => (
          <Card key={b.id}>
            <Row style={{ gap: 12 }}>
              <Avatar name={b.firstName} size={40} />
              <T style={{ flex: 1, fontWeight: '700' }}>{b.firstName}</T>
              <Button kind="secondary" label="ألغِ الحظر" disabled={busy === b.id} onPress={() => askUnblock(b.id, b.firstName)} />
            </Row>
          </Card>
        ))
      ) : (
        <Empty>ما حظرت أحد.</Empty>
      )}
    </Screen>
  );
}
