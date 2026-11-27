import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Switch } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, Chip, ChipRow, Field, Row, Screen, T, useTheme } from '@/components/ui';
import { CITIES } from '@/lib/cities';
import { confirmAction, notice } from '@/lib/confirm';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';
import type { NotifyPrefs } from '@/lib/types';

export default function Settings() {
  const c = useTheme();
  const me = useProfile();
  const { saveName, setNotifyPrefs, togglePrivacy, signOut, deleteAccount, online, anonymous, updateLocation, setCity } = useApp();
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    try {
      const ok = await updateLocation();
      if (!ok) notice('ما قدرنا نحدد موقعك', 'اسمح لشلة بالوصول للموقع من إعدادات الجوال، أو اختر مدينتك من القائمة.');
    } catch (e) {
      notice('ما قدرنا نحفظ', errorMessage(e));
    } finally {
      setLocating(false);
    }
  };
  const [name, setName] = useState(me.firstName);
  const [savingName, setSavingName] = useState(false);
  const f = me.gender === 'f';

  const updateName = async () => {
    setSavingName(true);
    try {
      await saveName(name);
      notice('تم', 'انحفظ اسمك.');
    } catch (e) {
      notice('ما قدرنا نحفظ', errorMessage(e));
    } finally {
      setSavingName(false);
    }
  };

  const toggleNotify = (key: keyof NotifyPrefs) =>
    setNotifyPrefs({ ...me.notify, [key]: !me.notify[key] }).catch((e) => notice('ما قدرنا نحفظ', errorMessage(e)));

  const confirmSignOut = () => {
    const warn = online && anonymous ? 'حسابك تجريبي وما له إيميل. إذا طلعت، ما تقدر ترجع له.' : 'تقدر ترجع لحسابك بالإيميل وكلمة المرور.';
    confirmAction('تسجيل الخروج', warn, 'تسجيل الخروج', () => signOut().catch(() => {}));
  };

  const confirmDelete = () =>
    confirmAction('حذف الحساب', 'بنحذف حسابك وكل جلساتك ومحادثاتك نهائيًا. ما نقدر نرجعها بعدين.', 'احذف حسابي', () =>
      confirmAction('متأكد؟', 'هذي آخر خطوة، والحذف نهائي.', 'نعم، احذف', () =>
        deleteAccount().catch((e) => notice('ما قدرنا نحذف', errorMessage(e))),
      ),
    );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">الإعدادات</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>

      <Card>
        <Field label="اسمك الأول" value={name} onChangeText={setName} maxLength={20} />
        <Button
          label={savingName ? 'جاري الحفظ…' : 'احفظ الاسم'}
          disabled={savingName || name.trim().length < 2 || name.trim() === me.firstName}
          onPress={updateName}
        />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>موقعك</T>
        <T>{`${me.city || 'ما حددته'}${me.district ? ` · ${me.district}` : ''}`}</T>
        <T variant="small">نستخدمه عشان نعرض لك الأماكن والجلسات والناس القريبين. موقعك الدقيق ما يشوفه أحد.</T>
        <Button kind="secondary" label={locating ? 'جاري تحديد موقعك…' : 'حدّث موقعي من الجوال'} disabled={locating} onPress={locate} />
        <T variant="small">أو اختر مدينتك:</T>
        <ChipRow>
          {CITIES.map((city) => (
            <Chip
              key={city.id}
              label={city.name}
              on={me.city === city.name && !me.district}
              onPress={() => setCity(city.id).catch((e) => notice('ما قدرنا نحفظ', errorMessage(e)))}
            />
          ))}
        </ChipRow>
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>الإشعارات</T>
        <Toggle label="إشعارات على الجوال (دعوات، ومن ينضم لجلساتك)" value={me.notify.push} onChange={() => toggleNotify('push')} />
        <Toggle label="رسائل المحادثات" value={me.notify.messages} onChange={() => toggleNotify('messages')} />
        <Toggle label="تذكير قبل الجلسة بساعة" value={me.notify.reminders} onChange={() => toggleNotify('reminders')} />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>الخصوصية</T>
        <Toggle label="إخفاء صورتي إلا عن اللي معي في الجلسة" value={me.privacy.hidePhoto} onChange={() => togglePrivacy('hidePhoto').catch(() => {})} />
        <Toggle label="إظهار الاسم الأول فقط" value={me.privacy.firstNameOnly} onChange={() => togglePrivacy('firstNameOnly').catch(() => {})} />
        <T variant="small">{`ما يشوفك إلا ${f ? 'البنات' : 'الشباب'}، وموقعك الدقيق ما يشوفه أحد. نعرض المسافة التقريبية بس.`}</T>
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>الأمان</T>
        <Button kind="secondary" label="المحظورين" onPress={() => router.push('/blocked')} />
        <Button kind="secondary" label="الشروط وقواعد المجتمع" onPress={() => router.push('/terms')} />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>شارك شلة</T>
        <Button
          kind="secondary"
          label="ادعُ أصحابك للتطبيق"
          onPress={() => Share.share({ message: 'جرّب شلة: تلاقي ناس يشاركونك هوايتك وتمارسونها سوا، قريب منك.' }).catch(() => {})}
        />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>عن التطبيق</T>
        <T variant="small">{`شلة · الإصدار ${Constants.expoConfig?.version ?? ''}`}</T>
        <T variant="small">بيانات الأماكن من OpenStreetMap © مساهمو OpenStreetMap.</T>
      </Card>

      <Button kind="secondary" label="تسجيل الخروج" onPress={confirmSignOut} />
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={{ paddingVertical: 12 }}>
        <T style={{ textAlign: 'center', color: '#C62828', fontWeight: '700' }}>حذف الحساب نهائيًا</T>
      </Pressable>
    </Screen>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  const c = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T style={{ flex: 1, fontSize: 14 }}>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent }} accessibilityLabel={label} />
    </Row>
  );
}
