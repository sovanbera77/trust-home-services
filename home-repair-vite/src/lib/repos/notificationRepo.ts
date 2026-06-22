import { getAll, get, set, del } from '../db';
import type { Notification } from '../types';

export const notificationRepo = {
  all: () => getAll<Notification>('notifications'),
  get: (id: string) => get<Notification>('notifications', id),
  save: (notification: Notification) => set('notifications', notification),
  delete: (id: string) => del('notifications', id),
};
