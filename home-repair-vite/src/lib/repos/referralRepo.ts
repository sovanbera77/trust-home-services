import { getAll, get, set, del } from '../db';
import type { Referral } from '../types';

export const referralRepo = {
  all: () => getAll<Referral>('referrals'),
  get: (id: string) => get<Referral>('referrals', id),
  save: (ref: Referral) => set('referrals', ref),
  delete: (id: string) => del('referrals', id),
};
