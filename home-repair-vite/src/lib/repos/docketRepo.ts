import { getAll, get, set, del } from '../db';
import type { Docket } from '../types';

export const docketRepo = {
  all: () => getAll<Docket>('dockets'),
  get: (id: string) => get<Docket>('dockets', id),
  save: (docket: Docket) => set('dockets', docket),
  delete: (id: string) => del('dockets', id),
};
