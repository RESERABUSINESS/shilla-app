import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Empty, Row, Screen, T } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { hobby } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

/** Pick one of your sessions to invite a person to. */
export default function InvitePerson() {
  const me = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, sessions, invite } = useApp();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const match = matches.find((m) => m.person.id === id);

  if (!match) {
    return (
      <Screen>
        <Empty>ما لقينا هالشخص.</Empty>
        <Button kind="secondary" label="رجوع" onPress={() => router.back()} />
      </Screen>
    );
  }

  const p = match.person;
  const mine = sessions.filter(
    (s) =>
      (s.hostId === me.id || s.members.some((m) => m.id === me.id)) &&
      !s.members.some((m) => m.id === p.id) &&
      match.shared.includes(s.hobbyId),
  );
  const f = me.gender === 'f';

  const send = async (sessionId: string) => {
    setBusy(sessionId);
    try {
      await invite(sessionId, p.id);
      setSent((x) => ({ ...x, [sessionId]: true }));
    } catch (e) {
      notice('ما انرسلت الدعوة', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen footer={<Button kind="secondary" label="تم" onPress={() => router.back()} />}>
      <T variant="heading">{`ادعُ ${p.firstName} لجلسة`}</T>
      <T variant="muted">{`اختر جلسة من جلساتك ${f ? 'تناسبها' : 'تناسبه'}. ${f ? 'بيوصلها' : 'بيوصله'} إشعار بالدعوة.`}</T>
      {mine.length ? (
        mine.map((s) => (
          <Card key={s.id}>
            <Row style={{ gap: 10 }}>
              <T style={{ fontSize: 24 }}>{hobby(s.hobbyId).emoji}</T>
              <T style={{ flex: 1, fontWeight: '700' }}>{hobby(s.hobbyId).name}</T>
            </Row>
            <T variant="small">{`${s.startsAtLabel}${s.venueName ? ` · ${s.venueName}` : ''}`}</T>
            <Button
              kind={sent[s.id] ? 'done' : 'primary'}
              label={sent[s.id] ? 'انرسلت الدعوة ✓' : busy === s.id ? 'جاري الإرسال…' : 'ادعُ لهالجلسة'}
              disabled={sent[s.id] || busy === s.id}
              onPress={() => send(s.id)}
            />
          </Card>
        ))
      ) : (
        <>
          <Empty>{`ما عندك جلسة قادمة في هواية ${f ? 'تحبها' : 'يحبها'} ${p.firstName}.`}</Empty>
          <Button label="أنشئ جلسة جديدة" onPress={() => router.replace('/session/new')} />
        </>
      )}
    </Screen>
  );
}
