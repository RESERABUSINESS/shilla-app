import { router } from 'expo-router';
import { useState } from 'react';

import { HobbyPicker } from '@/components/HobbyPicker';
import { Button, Screen, T } from '@/components/ui';
import { useApp, useProfile } from '@/lib/store';

export default function EditHobbies() {
  const me = useProfile();
  const { setHobbies } = useApp();
  const [value, setValue] = useState(me.hobbies);

  return (
    <Screen
      footer={
        <Button
          label="حفظ"
          disabled={!Object.keys(value).length}
          onPress={() => {
            setHobbies(value);
            router.back();
          }}
        />
      }>
      <T variant="heading">تعديل هواياتي</T>
      <HobbyPicker gender={me.gender} value={value} onChange={setValue} />
    </Screen>
  );
}
