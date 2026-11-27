import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Avatar, Button, Card, Empty, Progress, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { confirmAction, notice } from '@/lib/confirm';
import { num, venueHoursFor } from '@/lib/format';
import { hobby, levelLabel, participantsWord } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';

export default function SessionDetails() {
  const c = useTheme();
  const me = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, venues, toggleMembership, cancelSession, online, refresh, refreshing } = useApp();
  const [busy, setBusy] = useState(false);
  const s = sessions.find((x) => x.id === id);

  if (!s) {
    return (
      <Screen>
        <Empty>{'ما لقينا هالجلسة.\nيمكن انلغت أو خلص موعدها.'}</Empty>
        <Button kind="secondary" label="رجوع" onPress={() => router.back()} />
      </Screen>
    );
  }

  const h = hobby(s.hobbyId);
  const venue = venues.find((v) => v.id === s.venueId);
  const isHost = s.hostId === me.id;
  const isMember = isHost || s.members.some((m) => m.id === me.id);
  const isWorkshop = s.kind === 'workshop';
  const full = s.capacity > 0 && s.members.length >= s.capacity;
  const title = `${isWorkshop ? 'ورشة ' : ''}${h.name}`;
  const venueName = venue?.name ?? s.venueName ?? '';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notice('ما تمت العملية', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const directions = () => {
    const q = venue?.latitude != null ? `${venue.latitude},${venue.longitude}` : `${venueName} ${me.city}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`).catch(() => {});
  };

  const share = () =>
    Share.share({
      message: `تعال معي ${title} ${s.startsAtLabel}${venueName ? ` في ${venueName}` : ''}. حمّل تطبيق شلة وانضم للجلسة!`,
    }).catch(() => {});

  const confirmCancel = () =>
    confirmAction('إلغاء الجلسة', 'بنبلغ كل اللي انضموا إن الجلسة انلغت. متأكد؟', 'ألغِ الجلسة', () =>
      run(async () => {
        await cancelSession(s.id);
        router.back();
      }),
    );

  return (
    <Screen refreshing={refreshing} onRefresh={() => refresh().catch(() => {})}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12}>
          <Icon name="chevron-forward" size={26} color={c.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="مشاركة" onPress={share} hitSlop={12}>
          <Icon name="share-outline" size={24} color={c.text} />
        </Pressable>
      </Row>

      <Row style={{ gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt }}>
          <T style={{ fontSize: 30 }}>{h.emoji}</T>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="title" style={{ fontSize: 24 }}>{title}</T>
          <Row wrap style={{ gap: 6 }}>
            <Tag label={levelLabel(s.hobbyId, s.level)} />
            {isWorkshop && s.priceSar ? <Tag tone="highlight" label={`${num(s.priceSar)} ر.س`} /> : null}
            {h.teams ? <Tag label="فرق" /> : null}
          </Row>
        </View>
      </Row>

      <Card>
        <InfoRow icon="time-outline" text={`${s.startsAtLabel}${s.durationLabel ? ` · ${s.durationLabel}` : ''}`} />
        <InfoRow icon="location-outline" text={venue ? `${venueName} · ${venue.kind} · ${num(venue.distanceKm)} كم` : venueName} />
        {venue ? <InfoRow icon="information-circle-outline" text={venueHoursFor(venue, me.gender)} /> : null}
        <InfoRow icon="person-outline" text={`${isWorkshop ? 'يقدمها' : 'ينظمها'}: ${s.hostName}`} />
        <Button kind="secondary" label="الاتجاهات" onPress={directions} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={{ fontWeight: '700' }}>المنضمين</T>
          <T variant="small">
            {s.capacity
              ? `${num(s.members.length)} من ${num(s.capacity)} ${participantsWord(s.hobbyId)}`
              : `${num(s.members.length)} · مجموعة مفتوحة`}
          </T>
        </Row>
        {s.capacity ? <Progress value={s.members.length / s.capacity} /> : null}
        {s.members.map((m) => (
          <Row key={m.id} style={{ gap: 10 }}>
            <Avatar name={m.name} size={34} />
            <T style={{ flex: 1 }}>{m.id === me.id ? `${m.name} (أنت)` : m.name}</T>
            {m.id === s.hostId ? <Tag tone="accent" label={isWorkshop ? 'المقدم' : 'المنظم'} /> : null}
          </Row>
        ))}
      </Card>

      {isMember ? (
        <View style={{ gap: 10 }}>
          <Button label="المحادثة" onPress={() => router.push(`/session/chat/${s.id}`)} />
          {online ? <Button kind="secondary" label="ادعُ ناس للجلسة" onPress={() => router.push(`/session/invite/${s.id}`)} /> : null}
          {isHost ? (
            <Button kind="secondary" label="ألغِ الجلسة" disabled={busy} onPress={confirmCancel} />
          ) : (
            <Button kind="secondary" label={isWorkshop ? 'ألغِ حجزي' : 'انسحب من الجلسة'} disabled={busy} onPress={() => run(() => toggleMembership(s.id))} />
          )}
        </View>
      ) : (
        <Button
          label={full ? 'الجلسة مكتملة' : isWorkshop ? 'احجز مقعد' : 'انضم للجلسة'}
          disabled={full || busy}
          onPress={() => run(() => toggleMembership(s.id))}
        />
      )}
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: 'time-outline' | 'location-outline' | 'information-circle-outline' | 'person-outline'; text: string }) {
  const c = useTheme();
  return (
    <Row style={{ gap: 10, alignItems: 'flex-start' }}>
      <Icon name={icon} size={20} color={c.accent} />
      <T style={{ flex: 1, lineHeight: 22 }}>{text}</T>
    </Row>
  );
}
