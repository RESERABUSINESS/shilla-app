import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Card, Empty, ErrorText, Row, Screen, T, Tag } from '@/components/ui';
import { confirmAction, notice } from '@/lib/confirm';
import { formatDateTime, formatDuration, sar } from '@/lib/format';
import { hobby } from '@/lib/hobbies';
import * as remote from '@/lib/remote';
import { useApp } from '@/lib/store';
import type { Slot } from '@/lib/types';

/** Host: pick an open slot at the session's partner venue and request it. */
export default function BookSlot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, venues, refresh } = useApp();
  const s = sessions.find((x) => x.id === id);
  const venue = venues.find((v) => v.id === s?.venueId);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!s) return;
    let alive = true;
    remote
      .loadOpenSlots(s.venueId, s.hobbyId)
      .then((list) => alive && setSlots(list))
      .catch((e) => alive && setError(remote.errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [s]);

  if (!s) return null;

  const request = (slot: Slot) =>
    confirmAction(
      'طلب حجز',
      `${formatDateTime(new Date(slot.startsAt))} · ${sar(slot.priceSar)}. إذا أكد المكان، وقت الجلسة يصير وقت هالحجز وتوصل الشلة إشعار.`,
      'أرسل الطلب',
      async () => {
        setBusy(slot.id);
        try {
          await remote.requestBooking(slot.id, s.id);
          await refresh();
          notice('انرسل طلبك', 'بيوصلك إشعار لما يأكد المكان.');
          router.back();
        } catch (e) {
          setError(remote.errorMessage(e));
          setBusy(null);
        }
      },
    );

  return (
    <Screen footer={<Button kind="secondary" label="رجوع" onPress={() => router.back()} />}>
      <T variant="heading">{`احجز في ${venue?.name ?? 'المكان'}`}</T>
      <T variant="muted">{`الأوقات المتاحة لـ${hobby(s.hobbyId).name}. اختر وقت ونرسل الطلب للمكان.`}</T>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {slots === null ? (
        <T variant="muted">جاري التحميل…</T>
      ) : slots.length ? (
        slots.map((slot) => (
          <Card key={slot.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontWeight: '700', flex: 1 }}>{formatDateTime(new Date(slot.startsAt))}</T>
              <Tag tone="highlight" label={sar(slot.priceSar)} />
            </Row>
            <T variant="small">{`المدة: ${formatDuration(slot.durationMinutes)}`}</T>
            <Button label={busy === slot.id ? 'جاري الإرسال…' : 'اطلب هالوقت'} disabled={busy !== null} onPress={() => request(slot)} />
          </Card>
        ))
      ) : (
        <Empty>{'ما فيه أوقات متاحة حاليًا.\nجرّب بعدين، أو اتصل بالمكان.'}</Empty>
      )}
    </Screen>
  );
}
