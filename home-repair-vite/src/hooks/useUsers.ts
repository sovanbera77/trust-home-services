import { useStore } from '../store/useStore';
import type { User } from '../lib/types';

export function useUsers() {
  return useStore((s) => s.users as User[]);
}

export function useUser(username: string) {
  return useStore((s) => (s.users as User[]).find(u => u.username === username));
}
