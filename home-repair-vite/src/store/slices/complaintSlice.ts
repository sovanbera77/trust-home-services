import type { Complaint } from '../../lib/types';
import { config } from '../../lib/config';
import { complaintService } from '../../lib/api/services';
import { complaintRepo } from '../../lib/repos/complaintRepo';
import { syncEngine } from '../../lib/sync';

type SetState = any;
type GetState = any;

export const createComplaintSlice = (set: SetState, get: GetState) => ({
  complaints: [] as Complaint[],

  addComplaint: async (complaint: Complaint) => {
    await complaintRepo.save(complaint);
    set((state: { complaints: Complaint[] }) => ({ complaints: [...state.complaints, complaint] }));
    if (config.useBackend) {
      try { await complaintService.create(complaint); }
      catch { syncEngine.enqueue({ entity: 'complaint', action: 'create', payload: complaint }); }
    }
  },

  resolveComplaint: async (id: string) => {
    const { complaints } = get();
    const idx = complaints.findIndex((c: Complaint) => c.id === id);
    if (idx === -1) return;
    const updated = { ...complaints[idx], status: 'resolved' as const };
    await complaintRepo.save(updated);
    const newComplaints = [...complaints];
    newComplaints[idx] = updated;
    set({ complaints: newComplaints });
    if (config.useBackend) {
      try { await complaintService.resolve(id); }
      catch { syncEngine.enqueue({ entity: 'complaint', action: 'update', payload: { id, status: 'resolved' } }); }
    }
  },
});
