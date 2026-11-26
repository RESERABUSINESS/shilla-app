import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { HobbyFilter, matchesFilter } from '@/components/HobbyFilter';
import { SessionCard } from '@/components/SessionCard';
import { Chip, ChipRow, Empty, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { genderWorld } from '@/lib/format';
import { useApp, useProfile } from '@/lib/store';
import type { SessionKind } from '@/lib/types';

export default function Sessions() {
  const c = useTheme();
  const me = useProfile();
  const { sessions } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const [kind, setKind] = useState<SessionKind | null>(null);

  const list = sessions.filter((s) => matchesFilter(s.hobbyId, filter, me.hobbies) && (kind === null || s.kind === kind));

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">قريب منك هالأسبوع</T>
          <Tag tone="accent" label={`🔒 ${genderWorld(me.gender)} فقط`} />
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
        <Text style={{ color: c.onAccent, fontWeight: '700', fontSize: 15 }}>＋ جلسة جديدة</Text>
      </Pressable>
    </View>
  );
}
