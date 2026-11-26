import { hobby } from '@/lib/hobbies';
import { useProfile } from '@/lib/store';

import { Chip, ChipRow } from './ui';

/** "All my hobbies" plus one chip per hobby the viewer picked. */
export function HobbyFilter({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const me = useProfile();
  return (
    <ChipRow>
      <Chip label="كل هواياتي" on={value === null} onPress={() => onChange(null)} />
      {Object.keys(me.hobbies).map((id) => {
        const h = hobby(id);
        return <Chip key={id} label={`${h.emoji} ${h.name}`} on={value === id} onPress={() => onChange(id)} />;
      })}
    </ChipRow>
  );
}

/** True when `hobbyId` passes the filter for this viewer. */
export function matchesFilter(hobbyId: string, filter: string | null, myHobbies: Record<string, number>) {
  return filter === null ? hobbyId in myHobbies : hobbyId === filter;
}
