export interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number;
}

const DEFAULT_GEOFENCE: GeofenceConfig = {
  lat: 20.5937,
  lng: 78.9629,
  radius: 50000,
};

let geofence: GeofenceConfig = { ...DEFAULT_GEOFENCE };

export function getGeofence(): GeofenceConfig {
  return geofence;
}

export function setGeofence(config: GeofenceConfig): void {
  geofence = { ...config };
}

export function resetGeofence(): void {
  geofence = { ...DEFAULT_GEOFENCE };
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(lat: number, lng: number): { inside: boolean; distance: number } {
  const distance = haversine(lat, lng, geofence.lat, geofence.lng);
  return { inside: distance <= geofence.radius, distance };
}
