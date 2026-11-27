import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { HobbyFilter, matchesFilter } from '@/components/HobbyFilter';
import { Button, Card, Chip, ChipRow, Empty, Row, Screen, T, Tag } from '@/components/ui';
import { VenueMap } from '@/components/VenueMap';
import { num, venueHoursFor } from '@/lib/format';
import { hobby } from '@/lib/hobbies';
import { DEFAULT_LOCATION, savedLocation, type LatLng } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';
import type { Venue } from '@/lib/types';

const PAGE = 25;

export default function Places() {
  const me = useProfile();
  const { venues, refresh, refreshing, online } = useApp();
  const [filter, setFilter] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [center, setCenter] = useState<LatLng>(DEFAULT_LOCATION);

  // Venues load from the saved location, so re-read it whenever they change.
  useEffect(() => {
    savedLocation().then(setCenter).catch(() => {});
  }, [venues]);

  const matching = venues.filter((v) => v.hobbies.some((h) => matchesFilter(h, filter, me.hobbies)));
  const ordered = selected ? [...matching].sort((a, b) => (a.id === selected ? -1 : b.id === selected ? 1 : 0)) : matching;

  return (
    <Screen refreshing={refreshing} onRefresh={() => refresh().catch(() => {})}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">أماكن قريبة لهواياتك</T>
        <T variant="small">{`${num(matching.length)} مكان`}</T>
      </Row>
      <HobbyFilter
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setSelected(null);
          setLimit(PAGE);
        }}
      />
      <ChipRow>
        <Chip label="الخريطة" on={showMap} onPress={() => setShowMap(true)} />
        <Chip label="القائمة فقط" on={!showMap} onPress={() => setShowMap(false)} />
        {online ? <Chip label="＋ اقترح مكان" onPress={() => router.push('/suggest-venue')} /> : null}
      </ChipRow>
      {showMap ? <VenueMap venues={matching.slice(0, 150)} center={center} selectedId={selected} onSelect={setSelected} /> : null}

      {ordered.length ? (
        ordered.slice(0, limit).map((v) => <VenueCard key={v.id} venue={v} selected={v.id === selected} />)
      ) : (
        <Empty>{'ما لقينا أماكن قريبة لهالهواية.\nتعرف مكان؟ اقترحه وخل غيرك يستفيد.'}</Empty>
      )}
      {ordered.length > limit ? <Button kind="secondary" label="اعرض أماكن أكثر" onPress={() => setLimit((l) => l + PAGE)} /> : null}
      {online ? <T variant="small" style={{ textAlign: 'center' }}>بيانات الأماكن من OpenStreetMap © مساهمو OpenStreetMap</T> : null}
    </Screen>
  );
}

function VenueCard({ venue: v, selected }: { venue: Venue; selected: boolean }) {
  const me = useProfile();
  const directions = () => {
    const q = v.latitude != null ? `${v.latitude},${v.longitude}` : `${v.name} ${me.city}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`).catch(() => {});
  };
  return (
    <Card selected={selected}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <T style={{ fontWeight: '700', flex: 1 }}>{v.name}</T>
        {v.priceLabel ? <Tag label={v.priceLabel} /> : null}
      </Row>
      <T variant="small">
        {[v.kind, v.district, `${num(v.distanceKm)} كم`, v.rating ? `★ ${num(v.rating)}` : ''].filter(Boolean).join(' · ')}
      </T>
      <Row wrap style={{ gap: 6 }}>
        {v.hobbies.map((h) => (
          <Tag key={h} label={`${hobby(h).emoji} ${hobby(h).name}`} />
        ))}
        <Tag tone="accent" label={venueHoursFor(v, me.gender)} />
        {v.verified === false ? <Tag label={v.source === 'user' ? 'اقتراح مستخدم' : 'غير مؤكد'} /> : null}
      </Row>
      <Row>
        <Button style={{ flex: 1 }} label="أنشئ جلسة هنا" onPress={() => router.push({ pathname: '/session/new', params: { venueId: v.id } })} />
        <Button style={{ flex: 1 }} kind="secondary" label="الاتجاهات" onPress={directions} />
      </Row>
    </Card>
  );
}
