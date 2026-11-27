// Cities the app covers. Used when the user does not share their location, and
// to name the city from coordinates when reverse geocoding is not available.

export type City = { id: string; name: string; lat: number; lng: number };

export const CITIES: City[] = [
  { id: 'riyadh', name: 'الرياض', lat: 24.7136, lng: 46.6753 },
  { id: 'jeddah', name: 'جدة', lat: 21.5433, lng: 39.1728 },
  { id: 'makkah', name: 'مكة', lat: 21.3891, lng: 39.8579 },
  { id: 'madinah', name: 'المدينة', lat: 24.5247, lng: 39.5692 },
  { id: 'dammam', name: 'الدمام', lat: 26.4207, lng: 50.0888 },
  { id: 'khobar', name: 'الخبر', lat: 26.2172, lng: 50.1971 },
];

export const cityById = (id: string) => CITIES.find((c) => c.id === id);

const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** The covered city within 60 km of a point, if any. */
export function nearestCity(p: { lat: number; lng: number }): City | undefined {
  const best = [...CITIES].sort((a, b) => distanceKm(p, a) - distanceKm(p, b))[0];
  return best && distanceKm(p, best) <= 60 ? best : undefined;
}
