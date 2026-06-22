import { useStore } from '../store/useStore';
import type { InventoryItem } from '../lib/types';

export function useInventory() {
  return useStore((s) => s.inventory as InventoryItem[]);
}
