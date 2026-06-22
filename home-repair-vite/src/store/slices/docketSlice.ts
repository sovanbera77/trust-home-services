import type { Docket } from '../../lib/types';
import { config } from '../../lib/config';
import { docketService } from '../../lib/api/services';
import { docketRepo } from '../../lib/repos/docketRepo';
import { syncEngine } from '../../lib/sync';

type SetState = any;
type GetState = any;

export const createDocketSlice = (set: SetState, get: GetState) => ({
  dockets: [] as Docket[],

  addDocket: async (docket: Docket) => {
    await docketRepo.save(docket);
    set((state: { dockets: Docket[] }) => {
      const idx = state.dockets.findIndex((d: Docket) => d.id === docket.id);
      if (idx >= 0) {
        const updated = [...state.dockets];
        updated[idx] = docket;
        return { dockets: updated };
      }
      return { dockets: [...state.dockets, docket] };
    });

    // Auto-dispatch logic: if pending, try to assign an online employee immediately
    if (docket.status === 'pending') {
      const users = (get() as any).users; // Need to ensure get() returns users if we cast or we can access useStore
      if (!users) {
         // fallback: import useStore to get users
         import('../useStore').then(({ useStore }) => {
            const employees = useStore.getState().users.filter(u => u.role === 'employee' && u.status === 'online');
            if (employees.length > 0) {
              const assignedTo = employees[Math.floor(Math.random() * employees.length)].username; // Pick random online for now
              get().updateDocket(docket.id, { status: 'assigned', assignedTo });
            }
         });
      }
    }
    if (config.useBackend) {
      try {
        await docketService.create(docket);
      } catch {
        syncEngine.enqueue({ entity: 'docket', action: 'create', payload: docket });
      }
    }
  },

  updateDocket: async (id: string, updates: Partial<Docket>) => {
    const { dockets } = get();
    const idx = dockets.findIndex((d: Docket) => d.id === id);
    if (idx === -1) return;
    const updated = { ...dockets[idx], ...updates };
    await docketRepo.save(updated);
    const newDockets = [...dockets];
    newDockets[idx] = updated;
    set({ dockets: newDockets });

    // Trigger Smart Notifications
    if (updates.status === 'assigned') {
      import('../../lib/sms').then(m => {
        // Send SMS/WhatsApp using local fallback for now
        m.openSms('+919876543210', `Your request "${updated.title}" has been assigned to a technician.`);
      });
    } else if (updates.status === 'completed') {
      import('../../lib/sms').then(m => {
        m.openSms('+919876543210', `Your request "${updated.title}" is completed! Thank you for using TrustHome.`);
      });
    }

    if (config.useBackend) {
      try {
        if (updates.status === 'assigned' && updates.assignedTo) {
          await docketService.assign(id, updates.assignedTo);
        } else if (updates.status === 'completed') {
          await docketService.complete(id, updates as any);
        } else if (updates.status === 'rejected' && updates.rejectionReason) {
          await docketService.reject(id, updates.rejectionReason);
        } else if (updates.expectedDate) {
          await docketService.setDate(id, updates.expectedDate);
        }
      } catch {
        syncEngine.enqueue({ entity: 'docket', action: 'update', payload: { id, ...updates } });
      }
    }
  },
});
