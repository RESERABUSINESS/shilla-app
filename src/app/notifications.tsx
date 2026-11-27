import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Empty, Row, Screen, T, useTheme } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { hobby } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp } from '@/lib/store';
import type { AppNotification } from '@/lib/types';

const ICON: Record<AppNotification['kind'], IconName> = {
  joined: 'person-add-outline',
  invite: 'mail-outline',
  cancelled: 'close-circle-outline',
};

function text(n: AppNotification) {
  const h = n.hobbyId ? ` · ${hobby(n.hobbyId).name}` : '';
  if (n.kind === 'joined') return `${n.actorName ?? 'أحد'} انضم لجلستك${h}`;
  if (n.kind === 'invite') return `${n.actorName ?? 'أحد'} يدعوك لجلسة${h}`;
  return `انلغت جلسة كنت منضم لها${h}`;
}

function ago(iso: string) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `قبل ${min.toLocaleString('ar-SA')} دقيقة`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `قبل ${hours.toLocaleString('ar-SA')} ساعة`;
  return `قبل ${Math.round(hours / 24).toLocaleString('ar-SA')} يوم`;
}

export default function Notifications() {
  const c = useTheme();
  const { notifications, markAllRead, answerInvite, sessions, refresh, refreshing, online } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  // Opening the screen marks everything as read.
  useEffect(() => {
    markAllRead().catch(() => {});
  }, [markAllRead]);

  const answer = async (n: AppNotification, accept: boolean) => {
    setBusy(n.id);
    try {
      await answerInvite(n, accept);
      if (accept && n.sessionId) router.push(`/session/${n.sessionId}`);
    } catch (e) {
      notice('ما تمت العملية', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => refresh().catch(() => {})}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">الإشعارات</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>
      {!online ? <T variant="muted">الإشعارات تحتاج الاتصال بالخادم.</T> : null}
      {notifications.length ? (
        notifications.map((n) => {
          const sessionExists = n.sessionId && sessions.some((s) => s.id === n.sessionId);
          const pendingInvite = n.kind === 'invite' && n.inviteStatus === 'pending' && sessionExists;
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              disabled={!sessionExists}
              onPress={() => router.push(`/session/${n.sessionId}`)}>
              <Card selected={!n.read}>
                <Row style={{ gap: 10, alignItems: 'flex-start' }}>
                  <Icon name={ICON[n.kind]} size={22} color={c.accent} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T style={{ fontWeight: n.read ? '400' : '700' }}>{text(n)}</T>
                    <T variant="small">{ago(n.createdAt)}</T>
                  </View>
                </Row>
                {pendingInvite ? (
                  <Row>
                    <Button style={{ flex: 1 }} label="أقبل وأنضم" disabled={busy === n.id} onPress={() => answer(n, true)} />
                    <Button style={{ flex: 1 }} kind="secondary" label="لا، شكرًا" disabled={busy === n.id} onPress={() => answer(n, false)} />
                  </Row>
                ) : n.kind === 'invite' && n.inviteStatus === 'accepted' ? (
                  <T variant="small">قبلت الدعوة ✓</T>
                ) : n.kind === 'invite' && n.inviteStatus === 'declined' ? (
                  <T variant="small">رفضت الدعوة</T>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      ) : (
        <Empty>{'ما عندك إشعارات للحين.\nبتوصلك هنا الدعوات، واللي ينضمون لجلساتك.'}</Empty>
      )}
    </Screen>
  );
}
