import { config } from './config';
import { getToken } from './api/auth';
import { docketService, userService, inventoryService, complaintService, attendanceService, notificationService } from './api/services';
import { useStore } from '../store/useStore';

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

type SyncListener = (status: SyncStatus) => void;

interface SyncChange {
  entity: 'docket' | 'user' | 'inventory' | 'complaint' | 'attendance' | 'notification';
  action: 'create' | 'update' | 'delete';
  payload: any;
}

const QUEUE_KEY = 'sync_queue';

class SyncEngine {
  private status: SyncStatus = 'idle';
  private listeners: SyncListener[] = [];
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  get enabled(): boolean {
    return config.useBackend && !!getToken();
  }

  onStatusChange(listener: SyncListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach(l => l(status));
  }

  enqueue(change: SyncChange) {
    const queue = this.getPendingChanges();
    queue.push(change);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async sync() {
    if (!this.enabled || this.status === 'syncing') return;
    this.setStatus('syncing');
    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      this.setStatus('done');
    } catch {
      this.setStatus('error');
    }
  }

  private async pushLocalChanges() {
    const pending = this.getPendingChanges();
    if (pending.length === 0) return;
    const remaining: SyncChange[] = [];
    for (const change of pending) {
      try {
        switch (change.entity) {
          case 'docket':
            if (change.action === 'create') await docketService.create(change.payload as any);
            break;
          case 'inventory':
            if (change.action === 'create') await inventoryService.create(change.payload as any);
            else if (change.action === 'delete') await inventoryService.delete(change.payload.id as string);
            break;
          case 'complaint':
            if (change.action === 'create') await complaintService.create(change.payload as any);
            else if (change.action === 'update') await complaintService.resolve(change.payload.id as string);
            break;
          case 'attendance':
            if (change.action === 'create') await attendanceService.checkin(change.payload as any);
            break;
          case 'notification':
            if (change.action === 'create') await notificationService.create(change.payload as any);
            break;
        }
      } catch {
        remaining.push(change);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }

  private async pullRemoteChanges() {
    try {
      const [users, dockets, inventory, complaints] = await Promise.allSettled([
        userService.getEmployees(),
        docketService.list(),
        inventoryService.list(),
        complaintService.list(),
      ]);
      
      const updates: any = {};
      if (users.status === 'fulfilled' && users.value.length > 0) updates.users = users.value;
      if (dockets.status === 'fulfilled' && dockets.value.length > 0) updates.dockets = dockets.value;
      if (inventory.status === 'fulfilled' && inventory.value.length > 0) updates.inventory = inventory.value;
      if (complaints.status === 'fulfilled' && complaints.value.length > 0) updates.complaints = complaints.value;
      
      if (Object.keys(updates).length > 0) {
        useStore.setState(updates);
      }
    } catch {
      // Silent fail — offline
    }
  }

  private getPendingChanges(): SyncChange[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  getPendingCount(): number {
    return this.getPendingChanges().length;
  }

  startAutoSync(intervalMs = 30000) {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => this.sync(), intervalMs);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

export const syncEngine = new SyncEngine();
