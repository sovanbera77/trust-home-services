import type { ActivityLog } from '../../lib/types';
import { activityLogRepo } from '../../lib/repos/activityLogRepo';

type SetState = any;

export const createActivityLogSlice = (set: SetState) => ({
  activityLogs: [] as ActivityLog[],

  addActivityLog: async (log: ActivityLog) => {
    await activityLogRepo.save(log);
    set((state: { activityLogs: ActivityLog[] }) => ({ activityLogs: [...state.activityLogs, log] }));
  },
});
