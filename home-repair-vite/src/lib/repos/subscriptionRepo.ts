import { getAll, set, del } from '../db';
import type { Subscription, SubscriptionPlan } from '../types';

export const subscriptionPlanRepo = {
  all: () => getAll<SubscriptionPlan>('subscriptionPlans'),
  save: (plan: SubscriptionPlan) => set('subscriptionPlans', plan),
  remove: (id: string) => del('subscriptionPlans', id),
};

export const subscriptionRepo = {
  all: () => getAll<Subscription>('subscriptions'),
  save: (sub: Subscription) => set('subscriptions', sub),
  remove: (id: string) => del('subscriptions', id),
};
