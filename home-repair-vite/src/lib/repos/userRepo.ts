import { getAll, get, set, del } from '../db';
import type { User } from '../types';

export const userRepo = {
  all: () => getAll<User>('users'),
  get: (username: string) => get<User>('users', username),
  save: (user: User) => set('users', user),
  delete: (username: string) => del('users', username),
};
