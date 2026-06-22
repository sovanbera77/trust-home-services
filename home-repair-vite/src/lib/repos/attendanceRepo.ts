import { getAll, get, set, del } from '../db';
import type { Attendance } from '../types';

export const attendanceRepo = {
  all: () => getAll<Attendance>('attendance'),
  get: (id: string) => get<Attendance>('attendance', id),
  save: (record: Attendance) => set('attendance', record),
  delete: (id: string) => del('attendance', id),
};
