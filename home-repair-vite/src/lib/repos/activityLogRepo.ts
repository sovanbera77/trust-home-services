import { getAll, get, set, del } from '../db';
import type { ActivityLog } from '../types';

export const activityLogRepo = {
  all: () => getAll<ActivityLog>('activityLogs'),
  get: (id: string) => get<ActivityLog>('activityLogs', id),
  save: (log: ActivityLog) => set('activityLogs', log),
  delete: (id: string) => del('activityLogs', id),
};
