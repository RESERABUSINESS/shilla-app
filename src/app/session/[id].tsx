import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Empty, Row, T, useTheme } from '@/components/ui';
import { num } from '@/lib/format';
import { hobby } from '@/lib/hobbies';
import { errorMessage } from '@/lib/remote';
import { useApp, useChat, useProfile } from '@/lib/store';

export default function SessionChat() {
  const c = useTheme();
  const me = useProfile();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessions, venues } = useApp();
  const [text, setText] = useState('');
  const s = sessions.find((x) => x.id === id);
  const chat = useChat(s);

  if (!s) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <Empty>ما لقينا هالجلسة.</Empty>
        <Button kind="secondary" label="رجوع" onPress={() => router.back()} style={{ margin: 16 }} />
      </SafeAreaView>
    );
  }

  const h = hobby(s.hobbyId);
  const venue = venues.find((v) => v.id === s.venueId);
  const canChat = s.members.some((m) => m.id === me.id) || s.hostId === me.id;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await chat.send(t);
    } catch (e) {
      setText(t);
      Alert.alert('ما انرسلت الرسالة', errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface }}>
          <Button kind="secondary" label="رجوع" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '700' }}>{`${h.emoji} ${s.kind === 'workshop' ? 'ورشة ' : ''}${h.name} · ${venue?.name ?? s.venueName ?? ''}`}</T>
            <T variant="small">{`${s.startsAtLabel} · ${num(s.members.length)} أعضاء`}</T>
          </View>
        </Row>
        <FlatList
          data={chat.messages}
          ListEmptyComponent={<T variant="muted" style={{ textAlign: 'center' }}>{chat.error ?? (canChat ? 'ابدأ السالفة، قل هلا للشلة 👋' : 'المحادثة للأعضاء فقط.')}</T>}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: m }) => {
            const mine = m.authorId === me.id;
            return (
              <View
                style={{
                  maxWidth: '80%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  backgroundColor: mine ? c.accent : c.surface,
                  borderColor: mine ? c.accent : c.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}>
                {!mine ? <T variant="small" style={{ fontWeight: '700' }}>{m.author}</T> : null}
                <T style={{ color: mine ? c.onAccent : c.text }}>{m.text}</T>
              </View>
            );
          }}
        />
        {canChat ? (
          <Row style={{ padding: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
              placeholder="اكتب رسالة…"
              placeholderTextColor={c.muted}
              style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, color: c.text, backgroundColor: c.surfaceAlt, textAlign: 'right' }}
            />
            <Button label="إرسال" onPress={send} />
          </Row>
        ) : (
          <View style={{ padding: 16 }}>
            <T variant="muted" style={{ textAlign: 'center' }}>انضم للجلسة عشان تقدر تكتب في المحادثة.</T>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
