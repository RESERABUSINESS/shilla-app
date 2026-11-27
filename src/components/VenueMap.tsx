import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { hobby } from '@/lib/hobbies';
import type { Venue } from '@/lib/types';

import { useTheme } from './ui';

type Props = {
  venues: Venue[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect: (venueId: string) => void;
};

/** Map of venues around the viewer. Tapping a pin selects the venue. */
export function VenueMap({ venues, center, selectedId, onSelect }: Props) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: c.border }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
        showsUserLocation
        showsMyLocationButton={false}>
        {venues
          .filter((v) => v.latitude != null && v.longitude != null)
          .map((v) => (
            <Marker
              key={v.id}
              coordinate={{ latitude: v.latitude!, longitude: v.longitude! }}
              title={v.name}
              description={`${v.kind} · ${v.hobbies.map((h) => hobby(h).emoji).join(' ')}`}
              pinColor={v.id === selectedId ? c.ball : c.accent}
              onPress={() => onSelect(v.id)}
            />
          ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
});
