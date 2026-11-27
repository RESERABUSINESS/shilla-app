import { View } from 'react-native';

import { num } from '@/lib/format';
import type { Venue } from '@/lib/types';

import { T, useTheme } from './ui';

type Props = {
  venues: Venue[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect: (venueId: string) => void;
};

/** The web preview has no native map; the list below it shows the venues. */
export function VenueMap({ venues }: Props) {
  const c = useTheme();
  return (
    <View style={{ height: 80, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
      <T variant="muted">{`الخريطة متاحة في التطبيق على الجوال · ${num(venues.length)} مكان`}</T>
    </View>
  );
}
