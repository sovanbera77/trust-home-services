import { useStore } from '../store/useStore';
import type { Complaint } from '../lib/types';

export function useComplaints() {
  return useStore((s) => s.complaints as Complaint[]);
}
