import type { Notification } from '../../lib/types';
import { config } from '../../lib/config';
import { notificationService } from '../../lib/api/services';
import { notificationRepo } from '../../lib/repos/notificationRepo';
import { syncEngine } from '../../lib/sync';

type SetState = any;
type GetState = any;

export const createNotificationSlice = (set: SetState, get: GetState) => ({
  notifications: [] as Notification[],

  addNotification: async (notification: Notification) => {
    await notificationRepo.save(notification);
    set((state: { notifications: Notification[] }) => ({ notifications: [...state.notifications, notification] }));
    if (config.useBackend) {
      try { await notificationService.create({ ...notification, tag: notification.tag || '', userId: notification.userId || '' }); }
      catch { syncEngine.enqueue({ entity: 'notification', action: 'create', payload: notification }); }
    }
  },

  markAllRead: async () => {
    const { notifications } = get();
    const updated = notifications.map((n: Notification) => ({ ...n, read: true }));
    await Promise.all(updated.map((n: Notification) => notificationRepo.save(n)));
    set({ notifications: updated });
    if (config.useBackend) {
      try { await notificationService.markAllRead(); }
      catch { /* no offline sync needed for read status */ }
    }
  },
});
