import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/lib/store';
import { radius, space, useColors, type Colors } from '@/lib/theme';

/** Colors for the current viewer (accent follows their gender). */
export function useTheme(): Colors {
  const { profile } = useApp();
  return useColors(profile?.gender ?? 'm');
}

export function Screen({
  children,
  scroll = true,
  footer,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }]}>{children}</View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {body}
      {footer ? <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.surface }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

type TextVariant = 'title' | 'heading' | 'body' | 'muted' | 'small';

export function T({ children, variant = 'body', style, numberOfLines }: { children: ReactNode; variant?: TextVariant; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const c = useTheme();
  const v: Record<TextVariant, TextStyle> = {
    title: { fontSize: 28, fontWeight: '700', color: c.text },
    heading: { fontSize: 18, fontWeight: '700', color: c.text },
    body: { fontSize: 15, color: c.text },
    muted: { fontSize: 13.5, color: c.muted, lineHeight: 22 },
    small: { fontSize: 12.5, color: c.muted },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[{ textAlign: 'left', writingDirection: 'rtl' }, v[variant], style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, selected }: { children: ReactNode; style?: StyleProp<ViewStyle>; selected?: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: selected ? c.accent : c.border }, style]}>{children}</View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'done';

export function Button({ label, kind = 'primary', style, ...rest }: PressableProps & { label: string; kind?: ButtonKind; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : c.surfaceAlt;
  const fg = kind === 'primary' ? c.onAccent : kind === 'done' ? c.success : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'primary' ? c.accent : c.border, opacity: rest.disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}>
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.border }]}>
      <Text style={{ color: on ? c.onAccent : c.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'highlight' }) {
  const c = useTheme();
  const map = {
    neutral: { bg: c.surfaceAlt, fg: c.muted, border: c.border },
    accent: { bg: c.surface, fg: c.accent, border: c.accent },
    highlight: { bg: c.ball, fg: c.onBall, border: c.ball },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: map.bg, borderColor: map.border }]}>
      <Text style={{ color: map.fg, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
      {children}
    </ScrollView>
  );
}

export function Progress({ value }: { value: number }) {
  const c = useTheme();
  return (
    <View style={[styles.progress, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: '100%', backgroundColor: c.accent, borderRadius: 6 }} />
    </View>
  );
}

export function Avatar({ name, size = 28, hidden }: { name: string; size?: number; hidden?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: hidden ? c.surfaceAlt : c.surfaceAlt, borderWidth: 2, borderColor: c.surface }}>
      <Text style={{ color: hidden ? c.muted : c.accent, fontWeight: '700', fontSize: size * 0.42 }}>{hidden ? '•' : name.trim()[0]}</Text>
    </View>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.notice, { borderColor: c.accent, backgroundColor: c.surface }]}>
      <Text style={{ color: c.text, fontSize: 13, lineHeight: 21, textAlign: 'left' }}>🔒 {children}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <T variant="muted" style={{ textAlign: 'center' }}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: space.lg, gap: space.md, paddingBottom: 110 },
  footer: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 10 },
  button: { borderWidth: 1, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  tag: { borderWidth: 1, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  progress: { height: 6, borderRadius: 6, overflow: 'hidden', borderWidth: 1 },
  notice: { borderWidth: 1, borderRadius: radius.md, padding: 12 },
});

/** Labelled text input. */
export function Field({ label, ...rest }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontWeight: '700' }}>{label}</T>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...rest}
        style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, borderRadius: 12, padding: 12, fontSize: 16, textAlign: 'right' }}
      />
    </View>
  );
}

/** Inline error text. */
export function ErrorText({ children }: { children: ReactNode }) {
  return <T style={{ color: '#C62828', fontWeight: '700' }}>{children}</T>;
}

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
