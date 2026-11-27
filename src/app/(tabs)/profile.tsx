import { router } from 'expo-router';
import { Alert, Switch } from 'react-native';

import { Avatar, Button, Card, Notice, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { genderWorld } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';

export default function Profile() {
  const c = useTheme();
  const me = useProfile();
  const { togglePrivacy, signOut, online, anonymous } = useApp();
  const confirmSignOut = () => {
    if (!online || !anonymous) {
      signOut().catch(() => {});
      return;
    }
    // Anonymous accounts cannot be recovered after signing out.
    Alert.alert('تسجيل الخروج', 'حسابك تجريبي وما له إيميل. إذا طلعت، ما تقدر ترجع له. متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };
  const f = me.gender === 'f';

  return (
    <Screen>
      <Card>
        <Row style={{ gap: 12 }}>
          <Avatar name={me.firstName} size={46} />
          <T style={{ flex: 1, fontWeight: '700', fontSize: 17 }}>{me.firstName}</T>
          <T variant="small">{`${me.city} · ${me.district}`}</T>
        </Row>
        <Notice>{`${f ? 'تشوفين' : 'تشوف'} عالم ${genderWorld(me.gender)} فقط، والجنس ما يتعدل بعد التحقق.`}</Notice>
      </Card>

      {anonymous ? (
        <Card selected>
          <T style={{ fontWeight: '700' }}>حسابك تجريبي</T>
          <T variant="muted">سجّلت قبل ما نضيف الحسابات، فحسابك ما له إيميل ومرتبط بهالجوال بس. أنشئ حساب بالإيميل عشان تقدر تدخله من أي جوال.</T>
          <Button
            label="أنشئ حساب بالإيميل"
            onPress={() =>
              Alert.alert('حساب جديد', 'بنطلعك من الحساب التجريبي، وبعدها تنشئ حسابك بالإيميل. جلساتك القديمة ما تنتقل معك.', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'كمّل', onPress: () => signOut().catch(() => {}) },
              ])
            }
          />
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontWeight: '700' }}>هواياتي</T>
          <Button kind="secondary" label="تعديل" onPress={() => router.push('/edit-hobbies')} />
        </Row>
        <Row wrap style={{ gap: 6 }}>
          {Object.entries(me.hobbies).map(([id, lvl]) => (
            <Tag key={id} tone="accent" label={`${hobby(id).emoji} ${hobby(id).name} · ${levelLabel(id, lvl)}`} />
          ))}
        </Row>
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>الخصوصية</T>
        <PrivacyRow label="إخفاء صورتي إلا عن اللي معي في الجلسة" value={me.privacy.hidePhoto} onChange={() => togglePrivacy('hidePhoto').catch(() => {})} accent={c.accent} />
        <PrivacyRow label="إظهار الاسم الأول فقط" value={me.privacy.firstNameOnly} onChange={() => togglePrivacy('firstNameOnly').catch(() => {})} accent={c.accent} />
      </Card>

      <Button kind="secondary" label="تسجيل الخروج" onPress={confirmSignOut} />
    </Screen>
  );
}

function PrivacyRow({ label, value, onChange, accent }: { label: string; value: boolean; onChange: () => void; accent: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T style={{ flex: 1, fontSize: 14 }}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: accent }} accessibilityLabel={label} />
    </Row>
  );
}
