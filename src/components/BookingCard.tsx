import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { confirmAction, notice } from '@/lib/confirm';
import { sar } from '@/lib/format';
import * as remote from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';
import type { Session, Venue, VenueBooking } from '@/lib/types';

import { Button, Card, Row, T, Tag } from './ui';

const STATUS: Record<NonNullable<Session['bookingStatus']>, { label: string; tone: 'neutral' | 'accent' | 'highlight' }> = {
  none: { label: 'لم يُحجز بعد', tone: 'neutral' },
  requested: { label: 'بانتظار تأكيد المكان', tone: 'accent' },
  booked: { label: 'تم الحجز ✓', tone: 'highlight' },
};

/** Booking status, cost split, who paid, and how to book, for one session. */
export function BookingCard({ session: s, venue }: { session: Session; venue?: Venue }) {
  const me = useProfile();
  const { setPaid, refresh, online } = useApp();
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<VenueBooking | null>(null);
  const isHost = s.hostId === me.id;
  const status = s.bookingStatus ?? 'none';
  const myRow = s.members.find((m) => m.id === me.id);
  const paidCount = s.members.filter((m) => m.paid).length;
  const share = s.totalPriceSar && s.members.length ? s.totalPriceSar / s.members.length : null;

  // The host sees their in-app booking request, to cancel it.
  useEffect(() => {
    if (!online || !isHost || status === 'none') return;
    let alive = true;
    remote
      .loadActiveBooking(s.id)
      .then((b) => alive && setActive(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [online, isHost, status, s.id]);

  const togglePaid = async () => {
    setBusy(true);
    try {
      await setPaid(s.id, me.id, !myRow?.paid);
    } catch (e) {
      notice('ما تمت العملية', remote.errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = () =>
    active &&
    confirmAction('إلغاء الحجز', 'بنبلغ المكان إنك ألغيت، والوقت يرجع متاح لغيرك.', 'ألغِ الحجز', async () => {
      setBusy(true);
      try {
        await remote.cancelBooking(active.id);
        setActive(null);
        await refresh();
      } catch (e) {
        notice('ما تمت العملية', remote.errorMessage(e));
      } finally {
        setBusy(false);
      }
    });

  if (!online) return null;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ fontWeight: '700' }}>الحجز</T>
        <Tag tone={STATUS[status].tone} label={STATUS[status].label} />
      </Row>

      {s.bookingNote ? <T>{s.bookingNote}</T> : null}

      {s.totalPriceSar ? (
        <View style={{ gap: 4 }}>
          <T>{`التكلفة: ${sar(s.totalPriceSar)} · على كل واحد ${share ? sar(share) : '—'}`}</T>
          <T variant="small">{`دفعوا: ${paidCount.toLocaleString('ar-SA')} من ${s.members.length.toLocaleString('ar-SA')}`}</T>
        </View>
      ) : status === 'none' ? (
        <T variant="muted">{isHost ? 'احجز المكان، وبعدها حدّث الحجز هنا عشان الكل يعرف ويدفع نصيبه.' : 'المنظم ما حجز المكان للحين.'}</T>
      ) : null}

      {myRow && s.totalPriceSar ? (
        <Button kind={myRow.paid ? 'done' : 'primary'} label={myRow.paid ? 'دفعت نصيبي ✓' : 'دفعت نصيبي'} disabled={busy} onPress={togglePaid} />
      ) : null}

      {isHost ? (
        <View style={{ gap: 8 }}>
          {venue?.isPartner && status === 'none' ? (
            <Button label="احجز من التطبيق" onPress={() => router.push(`/book/${s.id}`)} />
          ) : null}
          {active ? (
            <Button kind="secondary" label={active.status === 'pending' ? 'ألغِ طلب الحجز' : 'ألغِ الحجز'} disabled={busy} onPress={cancelRequest} />
          ) : (
            <Button kind="secondary" label="حدّث تفاصيل الحجز" onPress={() => router.push(`/session/booking/${s.id}`)} />
          )}
        </View>
      ) : null}

      {status === 'none' && (venue?.phone || venue?.website) ? (
        <Row>
          {venue?.phone ? (
            <Button style={{ flex: 1 }} kind="secondary" label="اتصل بالمكان" onPress={() => Linking.openURL(`tel:${venue.phone}`).catch(() => {})} />
          ) : null}
          {venue?.website ? (
            <Button style={{ flex: 1 }} kind="secondary" label="موقع المكان" onPress={() => Linking.openURL(venue.website!).catch(() => {})} />
          ) : null}
        </Row>
      ) : null}
    </Card>
  );
}
