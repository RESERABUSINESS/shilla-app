import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { useOnboarding } from '@/components/onboarding';
import { Button, Row, Screen, T, useTheme } from '@/components/ui';
import { useColors } from '@/lib/theme';
import type { Gender } from '@/lib/types';

// TODO(auth): replace with phone OTP (Supabase Auth) now, and Nafath identity
// verification later. In production gender comes from verification, never
// from a user choice, and cannot be edited afterwards.

export default function Verify() {
  const { draft, update } = useOnboarding();
  const base = useTheme();
  const [busy, setBusy] = useState(false);
  const canContinue = draft.firstName.trim().length > 1 && draft.gender !== null;

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      router.push('/hobbies');
    }, 700);
  };

  return (
    <Screen
      footer={
        <Button
          label={busy ? 'جاري التحقق…' : 'تحقق (تجريبي)'}
          disabled={!canContinue || busy}
          onPress={submit}
        />
      }>
      <T variant="heading">التحقق من الهوية</T>
      <T variant="muted">نتحقق من الاسم والعمر والجنس. الجنس ما يتغير بعد التسجيل، وعلى أساسه تشوف التطبيق.</T>
      <T style={{ fontWeight: '700' }}>الاسم الأول</T>
      <TextInput
        value={draft.firstName}
        onChangeText={(firstName) => update({ firstName })}
        placeholder="اسمك"
        placeholderTextColor={base.muted}
        maxLength={20}
        style={{ borderWidth: 1, borderColor: base.border, backgroundColor: base.surface, color: base.text, borderRadius: 12, padding: 12, fontSize: 16, textAlign: 'right' }}
      />
      <Row>
        <GenderOption value="m" title="شاب" hint="تشوف الشباب فقط" selected={draft.gender === 'm'} onPress={() => update({ gender: 'm' })} />
        <GenderOption value="f" title="بنت" hint="تشوفين البنات فقط" selected={draft.gender === 'f'} onPress={() => update({ gender: 'f' })} />
      </Row>
      <T variant="small">في النسخة النهائية ما فيه اختيار هنا: الجنس يجي من التحقق مباشرة.</T>
      {busy ? <ActivityIndicator /> : null}
    </Screen>
  );
}

function GenderOption({ value, title, hint, selected, onPress }: { value: Gender; title: string; hint: string; selected: boolean; onPress: () => void }) {
  const c = useColors(value);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, borderColor: selected ? c.accent : c.border, backgroundColor: c.surface }}>
      <T style={{ fontWeight: '700', color: selected ? c.accent : c.text }}>{title}</T>
      <View>
        <T variant="small">{hint}</T>
      </View>
    </Pressable>
  );
}
