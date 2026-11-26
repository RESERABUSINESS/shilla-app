import { useState } from 'react';
import { Alert } from 'react-native';

import { HobbyFilter } from '@/components/HobbyFilter';
import { Avatar, Button, Card, Empty, Row, Screen, T, Tag } from '@/components/ui';
import { num } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';

export default function People() {
  const me = useProfile();
  const { matches } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const f = me.gender === 'f';
  const list = matches.filter((m) => filter === null || m.shared.includes(filter));

  return (
    <Screen>
      <T variant="heading">{f ? 'بنات يشاركونك اهتماماتك' : 'شباب يشاركونك اهتماماتك'}</T>
      <T variant="muted">مرتبين حسب التوافق: الهوايات المشتركة، قرب المستوى، والمسافة. نعرض المسافة التقريبية فقط، مو الموقع.</T>
      <HobbyFilter value={filter} onChange={setFilter} />
      {list.length ? (
        list.map(({ person: p, shared, score }) => (
          <Card key={p.id}>
            <Row style={{ gap: 12 }}>
              <Avatar name={p.firstName} size={46} hidden={f} />
              <T style={{ flex: 1, fontWeight: '700' }}>{p.firstName}</T>
              <Tag tone="highlight" label={`${num(score)}٪`} />
            </Row>
            <T variant="small">{`تقريبًا ${num(Math.round(p.distanceKm))} كم · متاح: ${p.availability}`}</T>
            <Row wrap style={{ gap: 6 }}>
              {shared.map((h) => (
                <Tag key={h} tone="accent" label={`${hobby(h).emoji} ${hobby(h).name} · ${levelLabel(h, p.hobbies[h])}`} />
              ))}
            </Row>
            {/* TODO(invites): send an invite notification through Supabase. */}
            <Button label={f ? 'ادعيها لجلسة' : 'ادعه لجلسة'} onPress={() => Alert.alert('أرسلنا الدعوة', `وصلت دعوتك لـ${p.firstName}`)} />
          </Card>
        ))
      ) : (
        <Empty>ما فيه أحد بنفس هالهواية قريب منك حاليًا.</Empty>
      )}
    </Screen>
  );
}
