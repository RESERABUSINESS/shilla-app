import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Chip, ErrorText, Field, Row, Screen, T } from '@/components/ui';
import { sar } from '@/lib/format';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

/** Host: record a booking made by phone or another app, and its cost. */
export default function EditBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, saveBookingDetails } = useApp();
  const s = sessions.find((x) => x.id === id);
  const [booked, setBooked] = useState(s?.bookingStatus === 'booked');
  const [price, setPrice] = useState(s?.totalPriceSar ? String(s.totalPriceSar) : '');
  const [note, setNote] = useState(s?.bookingNote ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!s) return null;
  const total = price.trim() ? Number(price.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))) : null;
  const valid = total === null || (Number.isFinite(total) && total >= 0);
  const share = total && s.members.length ? total / s.members.length : null;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveBookingDetails(s.id, { status: booked ? 'booked' : 'none', totalPriceSar: total, note });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={busy ? 'جاري الحفظ…' : 'احفظ'} disabled={busy || !valid} onPress={save} />}>
      <T variant="heading">تفاصيل الحجز</T>
      <T variant="muted">احجز المكان بالطريقة اللي تناسبك (اتصال، تطبيق المكان...)، وبعدها سجّل الحجز هنا عشان الشلة تعرف وكل واحد يدفع نصيبه.</T>

      <T style={{ fontWeight: '700' }}>حالة الحجز</T>
      <Row>
        <Chip label="لم يُحجز بعد" on={!booked} onPress={() => setBooked(false)} />
        <Chip label="تم الحجز ✓" on={booked} onPress={() => setBooked(true)} />
      </Row>
      {booked ? <T variant="small">بيوصل إشعار لكل اللي منضمين إن المكان انحجز.</T> : null}

      <Field label="التكلفة الكلية بالريال (اختياري)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="مثلًا ٢٠٠" />
      {!valid ? <T variant="small">اكتب رقم صحيح.</T> : null}
      {share ? <T>{`على كل واحد: ${sar(share)} (${s.members.length.toLocaleString('ar-SA')} أشخاص)`}</T> : null}

      <Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} placeholder="مثلًا: ملعب رقم ٣، الحجز باسمي" maxLength={300} multiline />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  );
}
