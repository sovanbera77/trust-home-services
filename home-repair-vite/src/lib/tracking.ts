import { getCurrentPosition } from './native';
import { userService } from './api/services';
import { config } from './config';
import { realtime } from './realtime';

let watchId: ReturnType<typeof setInterval> | null = null;

export function startTracking(username: string, intervalMs = 300000) {
  stopTracking();
  if (!config.useBackend || !username) return;
  const tick = async () => {
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        await userService.setDuty('online');
        realtime.sendLocation({ lat: pos.lat, lng: pos.lng });
      }
    } catch {
      console.warn('[tracking] Failed to send location update');
    }
  };
  tick();
  watchId = setInterval(tick, intervalMs);
}

export function stopTracking() {
  if (watchId) {
    clearInterval(watchId);
    watchId = null;
  }
}
