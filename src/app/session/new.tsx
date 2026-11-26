import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button, Chip, ChipRow, Notice, Screen, T } from '@/components/ui';
import { forGender, num, venueHoursFor } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';

const DAYS = ['بكرة', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const TIMES = ['٦:٠٠ ص', '١٠:٠٠ ص', '٤:٠٠ م', '٦:٠٠ م', '٨:٠٠ م', '٩:٣٠ م'];

export default function NewSession() {
  const me = useProfile();
  const { venues, createSession } = useApp();
  const params = useLocalSearchParams<{ venueId?: string }>();
  const myHobbies = Object.keys(me.hobbies);
  const presetVenue = venues.find((v) => v.id === params.venueId);

  const [hobbyId, setHobbyId] = useState(presetVenue?.hobbies.find((h) => h in me.hobbies) ?? myHobbies[0]);
  const options = useMemo(() => venues.filter((v) => v.hobbies.includes(hobbyId)), [venues, hobbyId]);
  const [venueId, setVenueId] = useState<string | undefined>(presetVenue?.id ?? options[0]?.id);
  const [day, setDay] = useState(DAYS[1]);
  const [time, setTime] = useState(TIMES[4]);
  const [level, setLevel] = useState(me.hobbies[hobbyId] ?? 1);

  const venue = options.find((v) => v.id === venueId) ?? options[0];

  const pickHobby = (id: string) => {
    setHobbyId(id);
    setLevel(me.hobbies[id] ?? 1);
    setVenueId(venues.find((v) => v.hobbies.includes(id))?.id);
  };

  const publish = () => {
    if (!venue) return;
    const womenSlot = venue.audience === 'both' && me.gender === 'f' ? ' · فترة نسائية' : '';
    createSession({ hobbyId, venueId: venue.id, startsAtLabel: `${day} · ${time}${womenSlot}`, level });
    router.back();
  };

  return (
    <Screen footer={<Button label="انشر الجلسة" disabled={!venue} onPress={publish} />}>
      <T variant="heading">جلسة جديدة</T>

      <T style={{ fontWeight: '700' }}>الهواية</T>
      <ChipRow>
        {myHobbies.map((id) => (
          <Chip key={id} label={`${hobby(id).emoji} ${hobby(id).name}`} on={id === hobbyId} onPress={() => pickHobby(id)} />
        ))}
      </ChipRow>

      <T style={{ fontWeight: '700' }}>المكان</T>
      {options.length ? (
        <ChipRow>
          {options.map((v) => (
            <Chip key={v.id} label={`${v.name} · ${num(v.distanceKm)} كم`} on={v.id === venue?.id} onPress={() => setVenueId(v.id)} />
          ))}
        </ChipRow>
      ) : (
        <T variant="muted">ما فيه أماكن مناسبة لهالهواية قريبة منك.</T>
      )}

      <T style={{ fontWeight: '700' }}>اليوم</T>
      <ChipRow>
        {DAYS.map((d) => (
          <Chip key={d} label={d} on={d === day} onPress={() => setDay(d)} />
        ))}
      </ChipRow>

      <T style={{ fontWeight: '700' }}>الوقت</T>
      <ChipRow>
        {TIMES.map((t) => (
          <Chip key={t} label={t} on={t === time} onPress={() => setTime(t)} />
        ))}
      </ChipRow>

      <T style={{ fontWeight: '700' }}>المستوى المطلوب</T>
      <ChipRow>
        {[0, 1, 2].map((l) => (
          <Chip key={l} label={levelLabel(hobbyId, l)} on={l === level} onPress={() => setLevel(l)} />
        ))}
      </ChipRow>

      <T variant="muted">{`العدد المناسب لـ${hobby(hobbyId).name}: ${hobby(hobbyId).groupLabel}`}</T>
      <Notice>
        {`هذي الجلسة تظهر ${forGender(me.gender)} فقط${venue && venue.audience === 'both' ? `، ووقتها ضمن: ${venueHoursFor(venue, me.gender)}` : ''}.`}
      </Notice>
    </Screen>
  );
}
