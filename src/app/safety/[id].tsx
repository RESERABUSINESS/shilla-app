import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Chip, ErrorText, Field, Row, Screen, T, useTheme } from '@/components/ui';
import { confirmAction, notice } from '@/lib/confirm';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

const REASONS = ['إزعاج أو تحرش', 'كلام أو محتوى غير لائق', 'حساب وهمي أو منتحل', 'ما حضر للجلسة', 'سبب ثاني'];

/** Report and/or block a person. */
export default function Safety() {
  const c = useTheme();
  const { id, name, sessionId } = useLocalSearchParams<{ id: string; name?: string; sessionId?: string }>();
  const { report, block } = useApp();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = name || 'هالشخص';

  const sendReport = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await report(id, details.trim() ? `${reason}: ${details.trim()}` : reason, sessionId);
      notice('وصلنا بلاغك', 'شكرًا لك. بنراجعه ونتخذ الإجراء المناسب. تقدر تحظره بعد إذا تبغى ما تشوفه.');
      setReason(null);
      setDetails('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = () =>
    confirmAction(`حظر ${who}`, `ما بتشوفون بعض في التطبيق: لا بروفايل ولا جلسات ولا رسائل. ${who} ما يوصله إشعار بالحظر.`, 'احظر', async () => {
      setBusy(true);
      try {
        await block(id);
        notice('تم الحظر', `ما بتشوف ${who} بعد الحين. تقدر تلغي الحظر من الإعدادات.`);
        router.back();
      } catch (e) {
        setError(errorMessage(e));
        setBusy(false);
      }
    });

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">{`إبلاغ أو حظر: ${who}`}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>

      <Card>
        <T style={{ fontWeight: '700' }}>بلّغ عن مشكلة</T>
        <T variant="muted">البلاغ سري، وما نقول لأحد مين بلّغ.</T>
        <Row wrap>
          {REASONS.map((r) => (
            <Chip key={r} label={r} on={reason === r} onPress={() => setReason(r)} />
          ))}
        </Row>
        <Field label="تفاصيل (اختياري)" value={details} onChangeText={setDetails} placeholder="وش صار؟" maxLength={500} multiline />
        <Button label={busy ? 'جاري الإرسال…' : 'أرسل البلاغ'} disabled={!reason || busy} onPress={sendReport} />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>{`احظر ${who}`}</T>
        <T variant="muted">ما بتشوفون بعض في التطبيق أبدًا، لين تلغي الحظر.</T>
        <Button kind="secondary" label={`احظر ${who}`} disabled={busy} onPress={confirmBlock} />
      </Card>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  );
}
