import { getAll, get, set, del } from '../db';
import type { InventoryItem } from '../types';

export const inventoryRepo = {
  all: () => getAll<InventoryItem>('inventory'),
  get: (id: string) => get<InventoryItem>('inventory', id),
  save: (item: InventoryItem) => set('inventory', item),
  delete: (id: string) => del('inventory', id),
};
