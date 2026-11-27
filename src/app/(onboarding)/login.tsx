import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { useOnboarding } from '@/components/onboarding';
import { Button, ErrorText, Field, isValidEmail, Screen, T } from '@/components/ui';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

export default function Login() {
  const { signIn, online } = useApp();
  const { update } = useOnboarding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const complete = await signIn(email, password);
      // Signed in: the root navigator switches to the app automatically.
      if (!complete) {
        // The account exists but sign-up was not finished: continue it.
        update({ email, password });
        router.replace('/verify');
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={<Button label={busy ? 'جاري الدخول…' : 'دخول'} disabled={!online || !isValidEmail(email) || password.length < 6 || busy} onPress={submit} />}>
      <T variant="heading">تسجيل الدخول</T>
      {!online ? <T variant="muted">تسجيل الدخول يحتاج الاتصال بالخادم.</T> : null}
      <Field
        label="الإيميل"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <Field label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" onSubmitEditing={submit} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Pressable accessibilityRole="link" onPress={() => router.replace('/verify')} style={{ paddingVertical: 8 }}>
        <T style={{ textAlign: 'center', fontWeight: '700' }}>ما عندك حساب؟ أنشئ حساب جديد</T>
      </Pressable>
    </Screen>
  );
}
