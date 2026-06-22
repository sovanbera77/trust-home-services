import { useStore } from '../store/useStore';

export function useDockets() {
  return useStore((s) => s.dockets as import('../lib/types').Docket[]);
}

export function useDocket(id: string) {
  return useStore((s) => (s.dockets as import('../lib/types').Docket[]).find(d => d.id === id));
}
