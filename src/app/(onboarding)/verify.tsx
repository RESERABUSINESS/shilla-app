import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useOnboarding } from '@/components/onboarding';
import { Icon } from '@/components/Icon';
import { Button, Chip, ChipRow, Field, isValidEmail, Row, Screen, T, useTheme } from '@/components/ui';
import { CITIES } from '@/lib/cities';
import { useColors } from '@/lib/theme';
import type { Gender } from '@/lib/types';

// Account details. TODO(auth): phone OTP, then Nafath. In production gender
// comes from identity verification, never from a user choice.

export default function CreateAccount() {
  const { draft, update } = useOnboarding();
  const base = useTheme();
  const nameOk = draft.firstName.trim().length >= 2;
  const emailOk = isValidEmail(draft.email);
  const passwordOk = draft.password.length >= 6;
  const canContinue = nameOk && emailOk && passwordOk && draft.gender !== null && draft.cityId !== null && draft.agreed;

  return (
    <Screen footer={<Button label="التالي: اختر هواياتك" disabled={!canContinue} onPress={() => router.push('/hobbies')} />}>
      <T variant="heading">إنشاء حساب</T>
      <T variant="muted">بالإيميل وكلمة المرور تقدر تدخل حسابك من أي جوال.</T>

      <Field label="الاسم الأول" value={draft.firstName} onChangeText={(firstName) => update({ firstName })} placeholder="اسمك" maxLength={20} />
      <Field
        label="الإيميل"
        value={draft.email}
        onChangeText={(email) => update({ email })}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      {draft.email && !emailOk ? <T variant="small">اكتب إيميل صحيح.</T> : null}
      <Field
        label="كلمة المرور"
        value={draft.password}
        onChangeText={(password) => update({ password })}
        placeholder="٦ أحرف أو أكثر"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      {draft.password && !passwordOk ? <T variant="small">كلمة المرور لازم تكون ٦ أحرف أو أكثر.</T> : null}

      <T style={{ fontWeight: '700' }}>أنت</T>
      <Row>
        <GenderOption value="m" title="شاب" hint="تشوف الشباب فقط" selected={draft.gender === 'm'} onPress={() => update({ gender: 'm' })} />
        <GenderOption value="f" title="بنت" hint="تشوفين البنات فقط" selected={draft.gender === 'f'} onPress={() => update({ gender: 'f' })} />
      </Row>
      <T variant="small">الجنس ما يتغير بعد التسجيل، وعلى أساسه تشوف التطبيق.</T>

      <T style={{ fontWeight: '700' }}>مدينتك</T>
      <ChipRow>
        {CITIES.map((c) => (
          <Chip key={c.id} label={c.name} on={draft.cityId === c.id} onPress={() => update({ cityId: c.id })} />
        ))}
      </ChipRow>
      <T variant="small">إذا سمحت بالموقع، ناخذ حيّك بالضبط ونعرض لك الأقرب. وإذا لا، نستخدم مدينتك.</T>

      <Row style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.agreed }}
          accessibilityLabel="أوافق على الشروط وقواعد المجتمع"
          onPress={() => update({ agreed: !draft.agreed })}
          hitSlop={8}>
          <Icon name={draft.agreed ? 'checkbox' : 'square-outline'} size={26} color={draft.agreed ? base.accent : base.muted} />
        </Pressable>
        <T>أوافق على</T>
        <Pressable accessibilityRole="link" onPress={() => router.push('/terms')} hitSlop={8} style={{ flex: 1 }}>
          <T style={{ fontWeight: '700', textDecorationLine: 'underline' }}>الشروط وقواعد المجتمع</T>
        </Pressable>
      </Row>

      <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} style={{ paddingVertical: 8 }}>
        <T style={{ textAlign: 'center', fontWeight: '700' }}>عندك حساب؟ سجّل دخول</T>
      </Pressable>
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
