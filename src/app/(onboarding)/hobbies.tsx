import { HobbyPicker } from '@/components/HobbyPicker';
import { useOnboarding } from '@/components/onboarding';
import { Button, Screen, T } from '@/components/ui';
import { num } from '@/lib/format';
import { useApp } from '@/lib/store';

export default function Hobbies() {
  const { draft, update } = useOnboarding();
  const { saveProfile } = useApp();
  const count = Object.keys(draft.hobbies).length;
  const gender = draft.gender ?? 'm';

  const finish = () =>
    saveProfile({
      id: `local-${Date.now()}`,
      firstName: draft.firstName.trim(),
      gender,
      city: 'الرياض',
      district: 'الملقا',
      hobbies: draft.hobbies,
      privacy: { hidePhoto: gender === 'f', firstNameOnly: gender === 'f' },
    });

  return (
    <Screen footer={<Button label={`يلا نبدأ (${num(count)} هوايات)`} disabled={!count} onPress={finish} />}>
      <T variant="heading">وش هواياتك؟</T>
      <T variant="muted">اختر وحدة أو أكثر، وحدد مستواك. نستخدمها عشان نطابقك مع ناس قريبين من مستواك.</T>
      <HobbyPicker gender={gender} value={draft.hobbies} onChange={(hobbies) => update({ hobbies })} />
    </Screen>
  );
}
