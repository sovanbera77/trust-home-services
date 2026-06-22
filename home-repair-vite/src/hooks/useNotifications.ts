import { useStore } from '../store/useStore';
import type { Notification } from '../lib/types';

export function useNotifications() {
  return useStore((s) => s.notifications as Notification[]);
}

export function useUnreadCount() {
  return useStore((s) => (s.notifications as Notification[]).filter(n => !n.read).length);
}
