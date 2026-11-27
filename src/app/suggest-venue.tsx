import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Chip, ChipRow, ErrorText, Field, Notice, Row, Screen, T } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { CATEGORIES, HOBBIES, type CategoryId } from '@/lib/hobbies';
import { errorMessage, resolveLocation } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';
import type { VenueAudience } from '@/lib/types';

/** Add a real place you know. It shows up right away, marked unconfirmed. */
export default function SuggestVenue() {
  const me = useProfile();
  const { suggestVenue, online } = useApp();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [audience, setAudience] = useState<VenueAudience>('both');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const f = me.gender === 'f';

  const toggle = (id: string) => setHobbies((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const loc = await resolveLocation();
      await suggestVenue({ name, kind, lat: loc.lat, lng: loc.lng, audience, hobbies });
      notice('شكرًا لك!', 'انضاف المكان، ويقدر يشوفه الحين كل اللي قريبين منك.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={busy ? 'جاري الإضافة…' : 'أضف المكان'} disabled={!online || busy || name.trim().length < 2 || !hobbies.length} onPress={submit} />}>
      <T variant="heading">اقترح مكان</T>
      <T variant="muted">تعرف ملعب أو استوديو أو مكان حلو لهواية؟ أضفه عشان يستفيد منه غيرك.</T>
      <Field label="اسم المكان" value={name} onChangeText={setName} placeholder="مثلًا: ملاعب بادل الياسمين" maxLength={60} />
      <Field label="نوع المكان (اختياري)" value={kind} onChangeText={setKind} placeholder="مثلًا: ملعب بادل، استوديو فخار" maxLength={40} />

      <T style={{ fontWeight: '700' }}>وش الهوايات اللي تنمارس فيه؟</T>
      {(Object.keys(CATEGORIES) as CategoryId[]).map((cat) => (
        <ChipRow key={cat}>
          {HOBBIES.filter((h) => h.category === cat).map((h) => (
            <Chip key={h.id} label={`${h.emoji} ${h.name}`} on={hobbies.includes(h.id)} onPress={() => toggle(h.id)} />
          ))}
        </ChipRow>
      ))}

      <T style={{ fontWeight: '700' }}>المكان لمين؟</T>
      <Row wrap>
        <Chip label="مشترك (أوقات للرجال وأوقات للنساء)" on={audience === 'both'} onPress={() => setAudience('both')} />
        <Chip label={f ? 'للنساء فقط' : 'للرجال فقط'} on={audience === me.gender} onPress={() => setAudience(me.gender)} />
      </Row>

      <Notice>نستخدم موقعك الحالي كموقع للمكان، فأضفه وأنت فيه أو قريب منه.</Notice>
      {!online ? <T variant="muted">إضافة الأماكن تحتاج الاتصال بالخادم.</T> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  );
}
