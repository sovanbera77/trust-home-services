import { create } from 'zustand';
import type { AppStore } from '../lib/types';
import { createAuthSlice } from './slices/authSlice';
import { createDocketSlice } from './slices/docketSlice';
import { createInventorySlice } from './slices/inventorySlice';
import { createComplaintSlice } from './slices/complaintSlice';
import { createAttendanceSlice } from './slices/attendanceSlice';
import { createNotificationSlice } from './slices/notificationSlice';
import { createConfigSlice } from './slices/configSlice';
import { createSubscriptionSlice } from './slices/subscriptionSlice';
import { createActivityLogSlice } from './slices/activityLogSlice';
import { createReferralSlice } from './slices/referralSlice';

export const useStore = create<AppStore>()((set, get) => ({
  ...(createAuthSlice(set, get) as any),
  ...(createDocketSlice(set, get) as any),
  ...(createInventorySlice(set) as any),
  ...(createComplaintSlice(set, get) as any),
  ...(createAttendanceSlice(set) as any),
  ...(createNotificationSlice(set, get) as any),
  ...(createConfigSlice(set) as any),
  ...(createSubscriptionSlice(set, get) as any),
  ...(createActivityLogSlice(set) as any),
  ...(createReferralSlice(set, get) as any),
}));

// Cross-tab sync via BroadcastChannel
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('trusthome-sync') : null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSync: Record<string, unknown> = {};
useStore.subscribe((state) => {
  pendingSync = {
    users: state.users,
    dockets: state.dockets,
    inventory: state.inventory,
    complaints: state.complaints,
    attendance: state.attendance,
    notifications: state.notifications,
    subscriptions: state.subscriptions,
    subscriptionPlans: state.subscriptionPlans,
    currentUser: state.currentUser,
    background: state.background,
    bgOpacity: state.bgOpacity,
    lang: state.lang,
    activityLogs: state.activityLogs,
    referrals: state.referrals,
  };
  if (!syncTimer) {
    syncTimer = setTimeout(() => {
      syncTimer = null;
      syncChannel?.postMessage({ type: 'store:update', payload: pendingSync });
    }, 500);
  }
});
if (syncChannel) {
  syncChannel.onmessage = (e) => {
    if (e.data?.type === 'store:update' && e.data.payload) {
      useStore.setState(e.data.payload as Partial<AppStore>);
    }
  };
}
