import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { HobbyFilter, matchesFilter } from '@/components/HobbyFilter';
import { Icon } from '@/components/Icon';
import { SessionCard } from '@/components/SessionCard';
import { Chip, ChipRow, Empty, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { withAppFont } from '@/lib/fonts';
import { genderWorld, num } from '@/lib/format';
import { useApp, useProfile } from '@/lib/store';
import type { SessionKind } from '@/lib/types';

export default function Sessions() {
  const c = useTheme();
  const me = useProfile();
  const { sessions, refresh, refreshing, unread, online } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const [kind, setKind] = useState<SessionKind | null>(null);

  const list = sessions.filter((s) => matchesFilter(s.hobbyId, filter, me.hobbies) && (kind === null || s.kind === kind));

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={() => refresh().catch(() => {})}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <T variant="heading">قريب منك هالأسبوع</T>
            <Tag tone="accent" label={`🔒 ${genderWorld(me.gender)} فقط`} />
          </View>
          {online ? (
            <Pressable accessibilityRole="button" accessibilityLabel="الإشعارات" onPress={() => router.push('/notifications')} hitSlop={10} style={{ padding: 4 }}>
              <Icon name="notifications-outline" size={26} color={c.text} />
              {unread ? (
                <View style={{ position: 'absolute', top: 0, end: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: c.onAccent, fontSize: 11, fontWeight: '700' }}>{num(unread)}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </Row>
        <ChipRow>
          <Chip label="الكل" on={kind === null} onPress={() => setKind(null)} />
          <Chip label="جلسات أعضاء" on={kind === 'meetup'} onPress={() => setKind('meetup')} />
          <Chip label="ورش" on={kind === 'workshop'} onPress={() => setKind('workshop')} />
        </ChipRow>
        <HobbyFilter value={filter} onChange={setFilter} />
        {list.length ? list.map((s) => <SessionCard key={s.id} session={s} />) : <Empty>{'ما فيه شي هنا الحين.\nكن أول واحد وأنشئ جلسة.'}</Empty>}
      </Screen>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/session/new')}
        style={{ position: 'absolute', bottom: 20, end: 16, backgroundColor: c.accent, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 18, elevation: 4 }}>
        <Row style={{ gap: 6 }}>
          <Icon name="add" size={20} color={c.onAccent} />
          <Text style={withAppFont({ color: c.onAccent, fontWeight: '700', fontSize: 15 })}>جلسة جديدة</Text>
        </Row>
      </Pressable>
    </View>
  );
}
