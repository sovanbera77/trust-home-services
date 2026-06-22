import type { Docket, Notification, Subscription } from './types';
import { uuid } from './utils';

const DAY_MS = 86400000;

export function generateFollowUps(
  dockets: Docket[],
  subscriptions: Subscription[]
): Omit<Notification, 'userId'>[] {
  const reminders: Omit<Notification, 'userId'>[] = [];
  const now = Date.now();

  for (const d of dockets) {
    if (d.status !== 'completed' || !d.completedDate) continue;
    const completed = new Date(d.completedDate).getTime();
    const daysSince = (now - completed) / DAY_MS;

    if (daysSince >= 7 && daysSince < 8 && !d.review) {
      reminders.push({
        id: uuid(),
        title: 'How was your service?',
        body: `Please leave a review for your ${d.title} service.`,
        type: 'info',
        tag: 'review',
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    if (daysSince >= 14 && daysSince < 15 && !d.review) {
      reminders.push({
        id: uuid(),
        title: 'Still waiting for your feedback',
        body: `Your ${d.title} service was completed 2 weeks ago. Share your experience!`,
        type: 'warning',
        tag: 'review_nudge',
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    if (daysSince >= 180 && daysSince < 181) {
      reminders.push({
        id: uuid(),
        title: 'Time for follow-up service',
        body: `It's been 6 months since your ${d.title}. Schedule a check-up!`,
        type: 'warning',
        tag: 'service_due',
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    const endDate = new Date(sub.endDate).getTime();
    const daysUntilEnd = (endDate - now) / DAY_MS;

    if (daysUntilEnd <= 30 && daysUntilEnd > 29) {
      reminders.push({
        id: uuid(),
        title: 'Subscription expiring soon',
        body: `Your ${sub.planName} plan ends on ${sub.endDate.slice(0, 10)}. Renew now to continue benefits.`,
        type: 'warning',
        tag: 'subscription',
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    if (daysUntilEnd <= 7 && daysUntilEnd > 6) {
      reminders.push({
        id: uuid(),
        title: 'Final reminder: subscription ending',
        body: `Your ${sub.planName} plan ends in 7 days. Renew to avoid interruption.`,
        type: 'error',
        tag: 'subscription_final',
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return reminders;
}