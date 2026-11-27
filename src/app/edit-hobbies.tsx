import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { HobbyPicker } from '@/components/HobbyPicker';
import { Button, Screen, T } from '@/components/ui';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

export default function EditHobbies() {
  const me = useProfile();
  const { setHobbies } = useApp();
  const [value, setValue] = useState(me.hobbies);
  const [busy, setBusy] = useState(false);

  return (
    <Screen
      footer={
        <Button
          label={busy ? 'جاري الحفظ…' : 'حفظ'}
          disabled={!Object.keys(value).length || busy}
          onPress={async () => {
            setBusy(true);
            try {
              await setHobbies(value);
              router.back();
            } catch (e) {
              Alert.alert('ما قدرنا نحفظ', errorMessage(e));
              setBusy(false);
            }
          }}
        />
      }>
      <T variant="heading">تعديل هواياتي</T>
      <HobbyPicker gender={me.gender} value={value} onChange={setValue} />
    </Screen>
  );
}
