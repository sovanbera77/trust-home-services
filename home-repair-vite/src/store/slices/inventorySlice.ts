import type { InventoryItem } from '../../lib/types';
import { config } from '../../lib/config';
import { inventoryService } from '../../lib/api/services';
import { inventoryRepo } from '../../lib/repos/inventoryRepo';
import { syncEngine } from '../../lib/sync';

type SetState = any;

export const createInventorySlice = (set: SetState) => ({
  inventory: [] as InventoryItem[],

  addInventory: async (item: InventoryItem) => {
    await inventoryRepo.save(item);
    set((state: { inventory: InventoryItem[] }) => ({ inventory: [...state.inventory, item] }));
    if (config.useBackend) {
      try { await inventoryService.create(item); }
      catch { syncEngine.enqueue({ entity: 'inventory', action: 'create', payload: item }); }
    }
  },

  deleteInventory: async (id: string) => {
    await inventoryRepo.delete(id);
    set((state: { inventory: InventoryItem[] }) => ({ inventory: state.inventory.filter((i: InventoryItem) => i.id !== id) }));
    if (config.useBackend) {
      try { await inventoryService.delete(id); }
      catch { syncEngine.enqueue({ entity: 'inventory', action: 'delete', payload: { id } }); }
    }
  },
});
