import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Card, Empty, Row, Screen, T, Tag, useTheme } from '@/components/ui';
import { notice } from '@/lib/confirm';
import { hobby } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useProfile } from '@/lib/store';
import type { Session } from '@/lib/types';

export default function MySessions() {
  const c = useTheme();
  const { mySessions, loadMySessions, online } = useApp();
  const [loading, setLoading] = useState(false);
  const [now] = useState(() => Date.now());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await loadMySessions();
    } finally {
      setLoading(false);
    }
  }, [loadMySessions]);

  useEffect(() => {
    loadMySessions().catch(() => {});
  }, [loadMySessions]);

  const isPast = (s: Session) => s.status !== 'open' || (s.startsAt ? new Date(s.startsAt).getTime() < now : false);
  const upcoming = mySessions.filter((s) => !isPast(s)).reverse();
  const past = mySessions.filter(isPast);

  return (
    <Screen refreshing={loading} onRefresh={() => reload().catch(() => {})}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">جلساتي</T>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={26} color={c.text} />
        </Pressable>
      </Row>
      {!online ? <T variant="muted">سجل الجلسات يحتاج الاتصال بالخادم.</T> : null}

      <T style={{ fontWeight: '700' }}>الجاية</T>
      {upcoming.length ? upcoming.map((s) => <Item key={s.id} s={s} />) : <Empty>ما عندك جلسات جاية. انضم لجلسة أو أنشئ وحدة!</Empty>}

      <T style={{ fontWeight: '700' }}>اللي راحت</T>
      {past.length ? past.map((s) => <Item key={s.id} s={s} past />) : <Empty>ما فيه جلسات سابقة للحين.</Empty>}
    </Screen>
  );
}

function Item({ s, past }: { s: Session; past?: boolean }) {
  const me = useProfile();
  const { ratedIds, rateSession } = useApp();
  const h = hobby(s.hobbyId);
  const cancelled = s.status === 'cancelled';
  const canRate = past && !cancelled && !ratedIds.includes(s.id);

  const rate = async (stars: number) => {
    try {
      await rateSession(s.id, stars);
      notice('شكرًا لك!', 'تقييمك يساعد غيرك يختار المكان المناسب.');
    } catch (e) {
      notice('ما انحفظ التقييم', errorMessage(e));
    }
  };

  return (
    <Pressable accessibilityRole="button" disabled={past} onPress={() => router.push(`/session/${s.id}`)}>
      <Card>
        <Row style={{ gap: 10 }}>
          <T style={{ fontSize: 24 }}>{h.emoji}</T>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>{`${s.kind === 'workshop' ? 'ورشة ' : ''}${h.name}`}</T>
            <T variant="small">{`${s.startsAtLabel}${s.venueName ? ` · ${s.venueName}` : ''}`}</T>
          </View>
          {cancelled ? <Tag label="انلغت" /> : s.hostId === me.id ? <Tag tone="accent" label="أنت المنظم" /> : null}
        </Row>
        {canRate ? <Stars onRate={rate} /> : past && !cancelled ? <T variant="small">قيّمت هالجلسة ✓</T> : null}
      </Card>
    </Pressable>
  );
}

function Stars({ onRate }: { onRate: (stars: number) => void }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T variant="small">كيف كانت الجلسة والمكان؟</T>
      <Row style={{ gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} من ٥`} onPress={() => onRate(n)} hitSlop={6}>
            <Icon name="star-outline" size={30} color={c.accent} />
          </Pressable>
        ))}
      </Row>
    </View>
  );
}
