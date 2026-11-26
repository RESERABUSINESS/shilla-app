import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { HobbyFilter, matchesFilter } from '@/components/HobbyFilter';
import { Button, Card, Empty, Row, Screen, T, Tag } from '@/components/ui';
import { num, venueHoursFor } from '@/lib/format';
import { hobby } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';

// TODO(places): load venues from Supabase (curated table, PostGIS distance),
// and use Google Places only to discover new candidates for review.
// Add a map view once a maps library is chosen (needs a development build).

export default function Places() {
  const me = useProfile();
  const { venues } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const list = venues.filter((v) => v.hobbies.some((h) => matchesFilter(h, filter, me.hobbies)));

  return (
    <Screen>
      <T variant="heading">أماكن قريبة لهواياتك</T>
      <HobbyFilter value={filter} onChange={setFilter} />
      {list.length ? (
        list.map((v) => (
          <Card key={v.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <T style={{ fontWeight: '700', flex: 1 }}>{v.name}</T>
              <Tag label={v.priceLabel} />
            </Row>
            <T variant="small">{`${v.kind} · ${v.district} · ${num(v.distanceKm)} كم · ★ ${num(v.rating)}`}</T>
            <Row wrap style={{ gap: 6 }}>
              {v.hobbies.map((h) => (
                <Tag key={h} label={`${hobby(h).emoji} ${hobby(h).name}`} />
              ))}
              <Tag tone="accent" label={venueHoursFor(v, me.gender)} />
            </Row>
            <Row>
              <Button style={{ flex: 1 }} label="أنشئ جلسة هنا" onPress={() => router.push({ pathname: '/session/new', params: { venueId: v.id } })} />
              <Button
                style={{ flex: 1 }}
                kind="secondary"
                label="الاتجاهات"
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.district} الرياض`)}`)}
              />
            </Row>
          </Card>
        ))
      ) : (
        <Empty>ما لقينا أماكن مناسبة قريبة لهالهواية.</Empty>
      )}
    </Screen>
  );
}
