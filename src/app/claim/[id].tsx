import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorText, Field, Notice, Screen, T } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { errorMessage, claimVenue } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

/** A business asks to manage its venue and take bookings in the app. */
export default function ClaimVenue() {
  const me = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { venues } = useApp();
  const venue = venues.find((v) => v.id === id);
  const [business, setBusiness] = useState(venue?.name ?? '');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await claimVenue(me.id, id, business, contact);
      notice('وصلنا طلبك', 'بنتواصل معك للتأكد، وبعدها تنفتح لك «لوحة مكاني» عشان تنزل أوقاتك وتستقبل الحجوزات.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={<Button label={busy ? 'جاري الإرسال…' : 'أرسل الطلب'} disabled={busy || business.trim().length < 2 || contact.trim().length < 5} onPress={submit} />}>
      <T variant="heading">أنت صاحب المكان؟</T>
      <T variant="muted">{`سجّل «${venue?.name ?? 'مكانك'}» كشريك في صحبة: تنزل أوقاتك المتاحة، والناس يحجزون منك مباشرة من التطبيق.`}</T>
      <Field label="اسم النشاط" value={business} onChangeText={setBusiness} maxLength={80} />
      <Field label="رقم التواصل" value={contact} onChangeText={setContact} keyboardType="phone-pad" placeholder="05xxxxxxxx" maxLength={80} />
      <Notice>بنتواصل معك على هالرقم للتأكد إنك صاحب المكان قبل ما نفعّل الحساب.</Notice>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  );
}
