import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Chip, ChipRow, Notice, Screen, T } from '@/components/ui';
import { combineDayTime, dayOptions, forGender, num, TIME_OPTIONS, venueHoursFor } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

export default function NewSession() {
  const me = useProfile();
  const { venues, createSession } = useApp();
  const params = useLocalSearchParams<{ venueId?: string }>();
  const myHobbies = Object.keys(me.hobbies);
  const presetVenue = venues.find((v) => v.id === params.venueId);
  const [now] = useState(() => Date.now());
  const days = useMemo(() => dayOptions(new Date(now)), [now]);

  const [hobbyId, setHobbyId] = useState(presetVenue?.hobbies.find((h) => h in me.hobbies) ?? myHobbies[0]);
  const options = useMemo(() => venues.filter((v) => v.hobbies.includes(hobbyId)), [venues, hobbyId]);
  const [venueId, setVenueId] = useState<string | undefined>(presetVenue?.id ?? options[0]?.id);
  const [dayIndex, setDayIndex] = useState(1);
  const [timeIndex, setTimeIndex] = useState(4);
  const [level, setLevel] = useState(me.hobbies[hobbyId] ?? 1);
  const [busy, setBusy] = useState(false);

  const venue = options.find((v) => v.id === venueId) ?? options[0];
  const [, hour, minute] = TIME_OPTIONS[timeIndex];
  const startsAt = combineDayTime(days[dayIndex].date, hour, minute);
  const inPast = startsAt.getTime() < now;

  const pickHobby = (id: string) => {
    setHobbyId(id);
    setLevel(me.hobbies[id] ?? 1);
    setVenueId(venues.find((v) => v.hobbies.includes(id))?.id);
  };

  const publish = async () => {
    if (!venue) return;
    setBusy(true);
    try {
      await createSession({ hobbyId, venueId: venue.id, startsAt, level });
      router.back();
    } catch (e) {
      Alert.alert('ما قدرنا ننشر الجلسة', errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={busy ? 'جاري النشر…' : 'انشر الجلسة'} disabled={!venue || inPast || busy} onPress={publish} />}>
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
        {days.map((d, i) => (
          <Chip key={d.date.toISOString()} label={d.label} on={i === dayIndex} onPress={() => setDayIndex(i)} />
        ))}
      </ChipRow>

      <T style={{ fontWeight: '700' }}>الوقت</T>
      <ChipRow>
        {TIME_OPTIONS.map(([label], i) => (
          <Chip key={label} label={label} on={i === timeIndex} onPress={() => setTimeIndex(i)} />
        ))}
      </ChipRow>
      {inPast ? <T variant="small">هالوقت راح، اختر وقت بعدين.</T> : null}

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
