import { getAll, get, set, del } from '../db';
import type { Complaint } from '../types';

export const complaintRepo = {
  all: () => getAll<Complaint>('complaints'),
  get: (id: string) => get<Complaint>('complaints', id),
  save: (complaint: Complaint) => set('complaints', complaint),
  delete: (id: string) => del('complaints', id),
};
