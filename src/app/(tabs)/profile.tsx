import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Avatar, Button, Card, Notice, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { genderWorld, num } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';

export default function Profile() {
  const c = useTheme();
  const me = useProfile();
  const { signOut, online, anonymous, unread, sessions } = useApp();
  const f = me.gender === 'f';
  const mySessions = sessions.filter((s) => s.hostId === me.id || s.members.some((m) => m.id === me.id));

  return (
    <Screen>
      <Card>
        <Row style={{ gap: 12 }}>
          <Avatar name={me.firstName} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontWeight: '700', fontSize: 18 }}>{me.firstName}</T>
            <T variant="small">{`${me.city}${me.district ? ` · ${me.district}` : ''}`}</T>
          </View>
        </Row>
        <Notice>{`${f ? 'تشوفين' : 'تشوف'} عالم ${genderWorld(me.gender)} فقط، والجنس ما يتعدل بعد التسجيل.`}</Notice>
      </Card>

      {online && anonymous ? (
        <Card selected>
          <T style={{ fontWeight: '700' }}>حسابك تجريبي</T>
          <T variant="muted">سجّلت قبل ما نضيف الحسابات، فحسابك ما له إيميل ومرتبط بهالجوال بس. أنشئ حساب بالإيميل عشان تقدر تدخله من أي جوال.</T>
          <Button
            label="أنشئ حساب بالإيميل"
            onPress={() =>
              confirmAction('حساب جديد', 'بنطلعك من الحساب التجريبي، وبعدها تنشئ حسابك بالإيميل. جلساتك القديمة ما تنتقل معك.', 'كمّل', () =>
                signOut().catch(() => {}),
              )
            }
          />
        </Card>
      ) : null}

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <MenuRow icon="notifications-outline" label="الإشعارات" badge={unread} href="/notifications" />
        <MenuRow icon="calendar-outline" label={`جلساتي (${num(mySessions.length)})`} href="/sessions" />
        <MenuRow icon="heart-outline" label="تعديل هواياتي" href="/edit-hobbies" />
        <MenuRow icon="add-circle-outline" label="اقترح مكان" href="/suggest-venue" />
        <MenuRow icon="settings-outline" label="الإعدادات" href="/settings" last />
      </Card>

      <Card>
        <T style={{ fontWeight: '700' }}>هواياتي</T>
        <Row wrap style={{ gap: 6 }}>
          {Object.entries(me.hobbies).map(([id, lvl]) => (
            <Tag key={id} tone="accent" label={`${hobby(id).emoji} ${hobby(id).name} · ${levelLabel(id, lvl)}`} />
          ))}
        </Row>
      </Card>
    </Screen>
  );

  function MenuRow({ icon, label, href, badge, last }: { icon: IconName; label: string; href: Href; badge?: number; last?: boolean }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(href)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
        <Icon name={icon} size={22} color={c.accent} />
        <T style={{ flex: 1 }}>{label}</T>
        {badge ? <Tag tone="highlight" label={num(badge)} /> : null}
        <Icon name="chevron-back" size={18} color={c.muted} />
      </Pressable>
    );
  }
}
