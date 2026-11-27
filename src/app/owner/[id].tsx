import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Chip, ChipRow, Empty, ErrorText, Field, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { confirmAction, notice } from '@/lib/confirm';
import { combineDayTime, dayOptions, formatDateTime, formatDuration, sar, TIME_OPTIONS } from '@/lib/format';
import { hobby } from '@/lib/hobbies';
import * as remote from '@/lib/remote';
import { useApp } from '@/lib/store';
import type { Gender, Slot, VenueBooking } from '@/lib/types';

const DURATIONS = [60, 90, 120];
const SLOT_STATUS: Record<Slot['status'], string> = { open: 'متاح', held: 'عليه طلب', booked: 'محجوز', cancelled: 'ملغي' };

/** Partner dashboard for one venue: booking requests, confirmed bookings, and slots. */
export default function OwnerVenue() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ownedVenues } = useApp();
  const venue = ownedVenues.find((v) => v.id === id);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [s, b] = await Promise.all([remote.loadOwnerSlots(id), remote.loadOwnerBookings(id)]);
    setSlots(s);
    setBookings(b);
  }, [id]);

  useEffect(() => {
    let alive = true;
    Promise.all([remote.loadOwnerSlots(id), remote.loadOwnerBookings(id)])
      .then(([s, b]) => {
        if (!alive) return;
        setSlots(s);
        setBookings(b);
      })
      .catch((e) => alive && setError(remote.errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');

  const respond = async (b: VenueBooking, accept: boolean) => {
    setBusy(b.id);
    try {
      await remote.respondBooking(b.id, accept);
      await reload();
    } catch (e) {
      notice('ما تمت العملية', remote.errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = (slot: Slot) =>
    confirmAction('حذف الوقت', formatDateTime(new Date(slot.startsAt)), 'احذف', async () => {
      try {
        await remote.deleteSlot(slot.id);
        await reload();
      } catch (e) {
        notice('ما تمت العملية', remote.errorMessage(e));
      }
    });

  if (!venue) {
    return (
      <Screen>
        <Empty>ما لقينا هالمكان في أماكنك.</Empty>
        <Button kind="secondary" label="رجوع" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading" style={{ flex: 1 }}>{venue.name}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-forward" size={26} color={c.text} />
        </Pressable>
      </Row>
      <T variant="small">للخصوصية، ما تظهر أسماء اللي يحجزون. يظهر عدد الأشخاص ورمز الحجز بس.</T>
      {error ? <ErrorText>{error}</ErrorText> : null}

      <T style={{ fontWeight: '700' }}>{`طلبات الحجز (${pending.length.toLocaleString('ar-SA')})`}</T>
      {pending.length ? (
        pending.map((b) => (
          <Card key={b.id} selected>
            <T style={{ fontWeight: '700' }}>{b.slot ? formatDateTime(new Date(b.slot.startsAt)) : ''}</T>
            <T variant="small">{`${b.slot ? `${hobby(b.slot.hobbyId).name} · ${b.slot.audience === 'f' ? 'للنساء' : 'للرجال'} · ` : ''}${b.partySize.toLocaleString('ar-SA')} أشخاص`}</T>
            <Row>
              <Button style={{ flex: 1 }} label="أكد الحجز" disabled={busy === b.id} onPress={() => respond(b, true)} />
              <Button style={{ flex: 1 }} kind="secondary" label="اعتذر" disabled={busy === b.id} onPress={() => respond(b, false)} />
            </Row>
          </Card>
        ))
      ) : (
        <T variant="muted">ما فيه طلبات جديدة.</T>
      )}

      <T style={{ fontWeight: '700' }}>الحجوزات المؤكدة</T>
      {confirmed.length ? (
        confirmed.map((b) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontWeight: '700', flex: 1 }}>{b.slot ? formatDateTime(new Date(b.slot.startsAt)) : ''}</T>
              <Tag tone="highlight" label={`رمز ${b.code}`} />
            </Row>
            <T variant="small">{`${b.partySize.toLocaleString('ar-SA')} أشخاص${b.slot ? ` · ${b.slot.audience === 'f' ? 'للنساء' : 'للرجال'} · ${sar(b.slot.priceSar)}` : ''}`}</T>
          </Card>
        ))
      ) : (
        <T variant="muted">ما فيه حجوزات مؤكدة.</T>
      )}

      <AddSlot venueId={venue.id} hobbies={venue.hobbies} audience={venue.audience} onAdded={reload} />

      <T style={{ fontWeight: '700' }}>أوقاتك</T>
      {slots.length ? (
        slots.map((slot) => (
          <Card key={slot.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontWeight: '700', flex: 1 }}>{formatDateTime(new Date(slot.startsAt))}</T>
              <Tag tone={slot.status === 'open' ? 'accent' : 'neutral'} label={SLOT_STATUS[slot.status]} />
            </Row>
            <T variant="small">{`${hobby(slot.hobbyId).name} · ${slot.audience === 'f' ? 'للنساء' : 'للرجال'} · ${formatDuration(slot.durationMinutes)} · ${sar(slot.priceSar)}`}</T>
            {slot.status === 'open' ? (
              <Pressable accessibilityRole="button" onPress={() => remove(slot)} style={{ alignSelf: 'flex-start' }}>
                <T variant="small" style={{ color: '#C62828' }}>احذف هالوقت</T>
              </Pressable>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty>ما نزلت أوقات للحين. أضف أوقاتك المتاحة فوق.</Empty>
      )}
    </Screen>
  );
}

function AddSlot({ venueId, hobbies, audience, onAdded }: { venueId: string; hobbies: string[]; audience: 'm' | 'f' | 'both'; onAdded: () => Promise<void> }) {
  const [now] = useState(() => Date.now());
  const days = useMemo(() => dayOptions(new Date(now)).concat(dayOptions(new Date(now + 7 * 86400000)).map((d) => ({ ...d, label: `${d.label} الجاي` }))), [now]);
  const audiences: Gender[] = audience === 'both' ? ['m', 'f'] : [audience];
  const [hobbyId, setHobbyId] = useState(hobbies[0]);
  const [who, setWho] = useState<Gender>(audiences[0]);
  const [dayIndex, setDayIndex] = useState(1);
  const [timeIndex, setTimeIndex] = useState(4);
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const priceNum = Number(price.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
  const [, h, m] = TIME_OPTIONS[timeIndex];
  const startsAt = combineDayTime(days[dayIndex].date, h, m);

  const add = async () => {
    setBusy(true);
    try {
      await remote.addSlot({ venueId, hobbyId, audience: who, startsAt, durationMinutes: duration, priceSar: priceNum });
      await onAdded();
      notice('انضاف الوقت', formatDateTime(startsAt));
    } catch (e) {
      notice('ما انضاف الوقت', remote.errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <T style={{ fontWeight: '700' }}>أضف وقت متاح</T>
      {hobbies.length > 1 ? (
        <ChipRow>
          {hobbies.map((x) => (
            <Chip key={x} label={hobby(x).name} on={x === hobbyId} onPress={() => setHobbyId(x)} />
          ))}
        </ChipRow>
      ) : null}
      {audiences.length > 1 ? (
        <Row>
          <Chip label="للرجال" on={who === 'm'} onPress={() => setWho('m')} />
          <Chip label="للنساء" on={who === 'f'} onPress={() => setWho('f')} />
        </Row>
      ) : null}
      <ChipRow>
        {days.map((d, i) => (
          <Chip key={d.date.toISOString()} label={d.label} on={i === dayIndex} onPress={() => setDayIndex(i)} />
        ))}
      </ChipRow>
      <ChipRow>
        {TIME_OPTIONS.map(([label], i) => (
          <Chip key={label} label={label} on={i === timeIndex} onPress={() => setTimeIndex(i)} />
        ))}
      </ChipRow>
      <Row>
        {DURATIONS.map((d) => (
          <Chip key={d} label={formatDuration(d)} on={d === duration} onPress={() => setDuration(d)} />
        ))}
      </Row>
      <View>
        <Field label="السعر بالريال" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="مثلًا ٢٠٠" />
      </View>
      <Button
        label={busy ? 'جاري الإضافة…' : 'أضف الوقت'}
        disabled={busy || !price.trim() || !Number.isFinite(priceNum) || priceNum < 0 || startsAt.getTime() < now}
        onPress={add}
      />
    </Card>
  );
}
