import { router } from 'expo-router';
import { View } from 'react-native';

import { num } from '@/lib/format';
import { hobby, levelLabel, participantsWord } from '@/lib/hobbies';
import { useApp, useProfile } from '@/lib/store';
import type { Session } from '@/lib/types';

import { Avatar, Button, Card, Progress, Row, T, Tag, useTheme } from './ui';

export function SessionCard({ session: s }: { session: Session }) {
  const c = useTheme();
  const me = useProfile();
  const { venues, toggleMembership } = useApp();
  const h = hobby(s.hobbyId);
  const venue = venues.find((v) => v.id === s.venueId);
  const isWorkshop = s.kind === 'workshop';
  const joined = s.members.includes(me.firstName);
  const isHost = s.hostName === me.firstName;
  const full = s.capacity > 0 && s.members.length >= s.capacity;

  const countLabel = isWorkshop
    ? `${num(s.capacity - s.members.length)} مقاعد متبقية`
    : s.capacity
      ? `${num(s.members.length)} من ${num(s.capacity)} ${participantsWord(s.hobbyId)}`
      : `${num(s.members.length)} منضمين · مفتوحة`;

  return (
    <Card>
      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt }}>
          <T style={{ fontSize: 22 }}>{h.emoji}</T>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '700' }}>{isWorkshop ? `ورشة ${h.name}` : h.name}{h.teams ? ' · فرق' : ''}</T>
            {isWorkshop && s.priceSar ? <Tag tone="highlight" label={`${num(s.priceSar)} ر.س`} /> : <Tag label={levelLabel(s.hobbyId, s.level)} />}
          </Row>
          <T variant="small">{s.startsAtLabel}{s.durationLabel ? ` · ${s.durationLabel}` : ''}</T>
          {venue ? <T variant="small">{venue.name} · {num(venue.distanceKm)} كم</T> : null}
          <T variant="small">{isWorkshop ? `يقدمها: ${s.hostName}` : `ينظمها: ${s.hostName}`}</T>
        </View>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 0 }}>
          {s.members.slice(0, 5).map((m, i) => (
            <View key={m} style={{ marginStart: i ? -8 : 0 }}>
              <Avatar name={m} />
            </View>
          ))}
        </Row>
        <T variant="small">{countLabel}</T>
      </Row>
      {s.capacity > 0 ? <Progress value={s.members.length / s.capacity} /> : null}
      <Row>
        {joined || isHost ? (
          <>
            <Button style={{ flex: 1 }} kind="done" label={isHost ? 'جلستك' : isWorkshop ? 'محجوز ✓' : 'منضم ✓'} onPress={() => !isHost && toggleMembership(s.id)} />
            <Button style={{ flex: 1 }} label="المحادثة" onPress={() => router.push(`/session/${s.id}`)} />
          </>
        ) : (
          <>
            <Button style={{ flex: 1 }} disabled={full} label={full ? 'مكتملة' : isWorkshop ? 'احجز مقعد' : 'انضم'} onPress={() => toggleMembership(s.id)} />
            <Button style={{ flex: 1 }} kind="secondary" label="التفاصيل" onPress={() => router.push(`/session/${s.id}`)} />
          </>
        )}
      </Row>
    </Card>
  );
}
