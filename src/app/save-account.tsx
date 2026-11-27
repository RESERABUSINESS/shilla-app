import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, ErrorText, Field, isValidEmail, Screen, T } from '@/components/ui';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';

/** Adds an email and password to an account created before accounts existed. */
export default function SaveAccount() {
  const { saveAccount } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveAccount(email, password);
      Alert.alert('انحفظ حسابك', 'تقدر الحين تدخل حسابك من أي جوال بالإيميل وكلمة المرور.');
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label={busy ? 'جاري الحفظ…' : 'احفظ حسابي'} disabled={!isValidEmail(email) || password.length < 6 || busy} onPress={submit} />}>
      <T variant="heading">احفظ حسابك</T>
      <T variant="muted">حسابك الحالي مرتبط بهالجوال بس. أضف إيميل وكلمة مرور عشان ما يضيع، وتقدر تدخله من أي جوال. جلساتك ومحادثاتك تبقى مثل ما هي.</T>
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
      <Field label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="٦ أحرف أو أكثر" secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Screen>
  );
}
