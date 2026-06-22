import type { Attendance } from '../../lib/types';
import { config } from '../../lib/config';
import { attendanceService } from '../../lib/api/services';
import { attendanceRepo } from '../../lib/repos/attendanceRepo';
import { syncEngine } from '../../lib/sync';

type SetState = any;

export const createAttendanceSlice = (set: SetState) => ({
  attendance: [] as Attendance[],

  addAttendance: async (record: Attendance) => {
    await attendanceRepo.save(record);
    set((state: { attendance: Attendance[] }) => ({ attendance: [...state.attendance, record] }));
    if (config.useBackend) {
      try { await attendanceService.checkin({ lat: record.lat, lng: record.lng }); }
      catch { syncEngine.enqueue({ entity: 'attendance', action: 'create', payload: record }); }
    }
  },
});
