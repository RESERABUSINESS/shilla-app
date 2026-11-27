import { useState } from 'react';

import { HobbyPicker } from '@/components/HobbyPicker';
import { useOnboarding } from '@/components/onboarding';
import { Button, Screen, T } from '@/components/ui';
import { num } from '@/lib/format';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

export default function Hobbies() {
  const { draft, update } = useOnboarding();
  const { signUp } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = Object.keys(draft.hobbies).length;
  const gender = draft.gender ?? 'm';

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await signUp({ firstName: draft.firstName.trim(), gender, hobbies: draft.hobbies, email: draft.email, password: draft.password });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={busy ? 'جاري إنشاء حسابك…' : `يلا نبدأ (${num(count)} هوايات)`} disabled={!count || busy} onPress={finish} />}>
      <T variant="heading">وش هواياتك؟</T>
      <T variant="muted">اختر وحدة أو أكثر، وحدد مستواك. نستخدمها عشان نطابقك مع ناس قريبين من مستواك.</T>
      <HobbyPicker gender={gender} value={draft.hobbies} onChange={(hobbies) => update({ hobbies })} />
      {error ? <T style={{ color: '#B3261E', fontWeight: '700' }}>{error}</T> : null}
    </Screen>
  );
}
