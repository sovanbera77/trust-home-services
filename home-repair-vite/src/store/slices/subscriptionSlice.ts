import type { Subscription, SubscriptionPlan } from '../../lib/types';
import { subscriptionPlanRepo, subscriptionRepo } from '../../lib/repos/subscriptionRepo';
import { uuid } from '../../lib/utils';

const INTERVAL_DAYS: Record<SubscriptionPlan['interval'], number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

type SetState = any;
type GetState = any;

export const createSubscriptionSlice = (set: SetState, get: GetState) => ({
  subscriptionPlans: [] as SubscriptionPlan[],
  subscriptions: [] as Subscription[],

  addSubscriptionPlan: async (plan: SubscriptionPlan) => {
    await subscriptionPlanRepo.save(plan);
    set((state: { subscriptionPlans: SubscriptionPlan[] }) => ({ subscriptionPlans: [...state.subscriptionPlans, plan] }));
  },

  updateSubscriptionPlan: async (id: string, updates: Partial<SubscriptionPlan>) => {
    const { subscriptionPlans } = get();
    const idx = subscriptionPlans.findIndex((p: SubscriptionPlan) => p.id === id);
    if (idx === -1) return;
    const updated = { ...subscriptionPlans[idx], ...updates };
    await subscriptionPlanRepo.save(updated);
    const newPlans = [...subscriptionPlans];
    newPlans[idx] = updated;
    set({ subscriptionPlans: newPlans });
  },

  deleteSubscriptionPlan: async (id: string) => {
    await subscriptionPlanRepo.remove(id);
    set((state: { subscriptionPlans: SubscriptionPlan[] }) => ({
      subscriptionPlans: state.subscriptionPlans.filter((p: SubscriptionPlan) => p.id !== id),
    }));
  },

  subscribe: async (planId: string, username: string) => {
    const { subscriptionPlans } = get();
    const plan = subscriptionPlans.find((p: SubscriptionPlan) => p.id === planId);
    if (!plan) return;
    const start = new Date();
    const days = INTERVAL_DAYS[plan.interval as keyof typeof INTERVAL_DAYS];
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    // Cancel any existing active subscription for this user first
    const existing = get().subscriptions.filter(
      (s: Subscription) => s.user === username && s.status === 'active'
    );
    await Promise.all(
      existing.map(async (s: Subscription) => {
        const cancelled = { ...s, status: 'cancelled' as const };
        await subscriptionRepo.save(cancelled);
        return cancelled;
      })
    );
    const sub: Subscription = {
      id: uuid(),
      user: username,
      planId: plan.id,
      planName: plan.name,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'active',
      createdAt: start.toISOString(),
    };
    await subscriptionRepo.save(sub);
    set((state: { subscriptions: Subscription[] }) => {
      const rest = state.subscriptions.map((s: Subscription) =>
        s.user === username && s.status === 'active' ? { ...s, status: 'cancelled' as const } : s
      );
      return { subscriptions: [...rest, sub] };
    });
  },

  cancelSubscription: async (id: string) => {
    const { subscriptions } = get();
    const idx = subscriptions.findIndex((s: Subscription) => s.id === id);
    if (idx === -1) return;
    const updated = { ...subscriptions[idx], status: 'cancelled' as const };
    await subscriptionRepo.save(updated);
    const newSubs = [...subscriptions];
    newSubs[idx] = updated;
    set({ subscriptions: newSubs });
  },
});
