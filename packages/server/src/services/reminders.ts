import { db } from '../db/pg';
import { sendWhatsApp } from './whatsapp';
import { sendSms } from './sms';

export async function checkPaymentReminders() {
  const dueDockets = await db.all(`
    SELECT d.*, u.mobile, u.name FROM dockets d
    LEFT JOIN users u ON u.username = d.customer
    WHERE d.status='completed' AND d.is_paid=0 AND d.payment_method IN ('Due', 'Cash')
      AND d.completed_date >= CAST(NOW() - INTERVAL '30 days' AS TEXT)
  `) as any[];

  for (const docket of dueDockets) {
    const msg = `Reminder: Payment of ₹${docket.amount_received} for "${docket.title}" is due. Please pay at earliest. - Trust Home Services`;
    if (docket.customer) {
      sendWhatsApp(docket.customer, msg).catch(() => {});
    }
    if (docket.mobile) {
      sendSms(docket.mobile, msg).catch(() => {});
    }
  }

  const count = dueDockets.length;
  if (count > 0) {
    console.log(`[Reminders] Sent ${count} payment reminder(s)`);
  }
}

// Check every 6 hours
let interval: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler() {
  if (interval) return;
  checkPaymentReminders().catch(console.error);
  interval = setInterval(() => { checkPaymentReminders().catch(console.error); }, 6 * 60 * 60 * 1000);
  console.log('[Reminders] Scheduler started (every 6 hours)');
}

export function stopReminderScheduler() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
