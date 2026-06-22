import { useStore } from '../store/useStore';
import type { Attendance } from '../lib/types';

export function useAttendance() {
  return useStore((s) => s.attendance as Attendance[]);
}
