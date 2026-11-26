import { Pressable, View } from 'react-native';

import { CATEGORIES, HOBBIES, levelLabel, type CategoryId } from '@/lib/hobbies';
import type { Gender, HobbyLevels } from '@/lib/types';
import { useColors } from '@/lib/theme';

import { T } from './ui';

/** Hobby grid grouped by category, plus a level selector for each chosen hobby. */
export function HobbyPicker({ value, onChange, gender }: { value: HobbyLevels; onChange: (v: HobbyLevels) => void; gender: Gender }) {
  const c = useColors(gender);
  const toggle = (id: string) => {
    const next = { ...value };
    if (id in next) delete next[id];
    else next[id] = 0;
    onChange(next);
  };

  return (
    <View style={{ gap: 12 }}>
      {(Object.keys(CATEGORIES) as CategoryId[]).map((cat) => (
        <View key={cat} style={{ gap: 8 }}>
          <T variant="small" style={{ fontWeight: '700' }}>{CATEGORIES[cat]}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HOBBIES.filter((h) => h.category === cat).map((h) => {
              const on = h.id in value;
              return (
                <Pressable
                  key={h.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(h.id)}
                  style={{ width: '31%', borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4, borderColor: on ? c.accent : c.border, backgroundColor: c.surface }}>
                  <T style={{ fontSize: 24 }}>{h.emoji}</T>
                  <T style={{ fontSize: 13, fontWeight: '600', color: on ? c.accent : c.text, textAlign: 'center' }}>{h.name}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {Object.keys(value).length ? <T variant="small" style={{ fontWeight: '700' }}>مستواك</T> : null}
      {Object.keys(value).map((id) => {
        const h = HOBBIES.find((x) => x.id === id)!;
        return (
          <View key={id} style={{ gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <T style={{ fontWeight: '700', fontSize: 13 }}>{`${h.emoji} ${h.name}`}</T>
            <View style={{ flexDirection: 'row', gap: 4, backgroundColor: c.surfaceAlt, borderRadius: 10, padding: 3 }}>
              {[0, 1, 2].map((lvl) => {
                const on = value[id] === lvl;
                return (
                  <Pressable
                    key={lvl}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => onChange({ ...value, [id]: lvl })}
                    style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: on ? c.surface : 'transparent' }}>
                    <T style={{ fontSize: 11.5, fontWeight: on ? '700' : '500', color: on ? c.accent : c.text, textAlign: 'center' }}>{levelLabel(id, lvl)}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
