import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import { Avatar, Button, Card, Empty, Row, Screen, T, Tag } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { num } from '@/lib/format';
import { hobby, levelLabel } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

/** Invite people who share this session's hobby. */
export default function InviteToSession() {
  const me = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, matches, invite } = useApp();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const s = sessions.find((x) => x.id === id);

  if (!s) {
    return (
      <Screen>
        <Empty>ما لقينا هالجلسة.</Empty>
        <Button kind="secondary" label="رجوع" onPress={() => router.back()} />
      </Screen>
    );
  }

  const h = hobby(s.hobbyId);
  const memberIds = new Set([s.hostId, ...s.members.map((m) => m.id)]);
  const candidates = matches.filter((m) => m.shared.includes(s.hobbyId) && !memberIds.has(m.person.id));
  const f = me.gender === 'f';

  const send = async (personId: string) => {
    setBusy(personId);
    try {
      await invite(s.id, personId);
      setSent((x) => ({ ...x, [personId]: true }));
    } catch (e) {
      notice('ما انرسلت الدعوة', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen footer={<Button kind="secondary" label="تم" onPress={() => router.back()} />}>
      <T variant="heading">{`ادعُ ناس لجلسة ${h.name}`}</T>
      <T variant="muted">{`${f ? 'بنات' : 'شباب'} قريبين منك يحبون ${h.name}. بيوصلهم إشعار ويقدرون يقبلون أو يرفضون.`}</T>
      {candidates.length ? (
        candidates.map(({ person: p, score }) => (
          <Card key={p.id}>
            <Row style={{ gap: 12 }}>
              <Avatar name={p.firstName} size={42} hidden={f} />
              <T style={{ flex: 1, fontWeight: '700' }}>{p.firstName}</T>
              <Tag tone="highlight" label={`${num(score)}٪`} />
            </Row>
            <T variant="small">{`${levelLabel(s.hobbyId, p.hobbies[s.hobbyId] ?? 1)} · تقريبًا ${num(Math.round(p.distanceKm))} كم`}</T>
            <Button
              kind={sent[p.id] ? 'done' : 'primary'}
              label={sent[p.id] ? 'انرسلت الدعوة ✓' : busy === p.id ? 'جاري الإرسال…' : 'ادعُ'}
              disabled={sent[p.id] || busy === p.id}
              onPress={() => send(p.id)}
            />
          </Card>
        ))
      ) : (
        <Empty>{`ما فيه أحد قريب منك يحب ${h.name} للحين.\nادعُ أصحابك يسجلون في صحبة!`}</Empty>
      )}
      <Button
        kind="secondary"
        label="ادعُ أصحابك من خارج التطبيق"
        onPress={() => Share.share({ message: `تعال معي ${h.name} ${s.startsAtLabel}. حمّل تطبيق صحبة وانضم للجلسة!` }).catch(() => {})}
      />
    </Screen>
  );
}
