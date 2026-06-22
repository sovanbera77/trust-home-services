import type { Docket } from './types';
import type { SubscriptionPlan } from './types';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

function getRazorpay(): RazorpayConstructor | null {
  if (typeof window === 'undefined') return null;
  const r = (window as unknown as Record<string, unknown>).Razorpay;
  return r ? (r as RazorpayConstructor) : null;
}

export function payWithRazorpay(
  docket: Docket,
  userDetails: { name?: string; email?: string; mobile?: string },
  onSuccess: (details: PaymentResult) => void,
  onDismiss?: () => void,
) {
  const Razorpay = getRazorpay();
  if (!Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => payWithRazorpay(docket, userDetails, onSuccess, onDismiss);
    document.body.appendChild(script);
    return;
  }

  const amount = (docket.serviceFee || 0) + (docket.materialCosts || 0);
  if (amount <= 0) return;

  const options: RazorpayOptions = {
    key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder',
    amount: Math.round(amount * 100),
    currency: 'INR',
    name: 'Trust Home Services',
    description: `Payment for ${docket.title}`,
    prefill: {
      name: userDetails.name || '',
      email: userDetails.email || '',
      contact: userDetails.mobile || '',
    },
    handler(response) {
      onSuccess({
        docketId: docket.id,
        amount,
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
        method: 'Online (Razorpay)',
        date: new Date().toISOString(),
      });
    },
    modal: {
      ondismiss: onDismiss,
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

export interface PaymentResult {
  docketId: string;
  amount: number;
  paymentId: string;
  orderId: string;
  signature: string;
  method: string;
  date: string;
}

export function canPay(docket: Docket): boolean {
  return docket.status === 'completed' && ((docket.serviceFee || 0) + (docket.materialCosts || 0)) > 0 && (docket.amountReceived || 0) === 0;
}

export function getPaymentTotal(docket: Docket): number {
  return (docket.serviceFee || 0) + (docket.materialCosts || 0);
}

export function canPaySubscription(plan: SubscriptionPlan): boolean {
  return plan.price > 0;
}

export function subscribeWithRazorpay(
  plan: SubscriptionPlan,
  userDetails: { name?: string; email?: string; mobile?: string },
  onSuccess: (details: PaymentResult) => void,
  onDismiss?: () => void,
) {
  const Razorpay = getRazorpay();
  if (!Razorpay) {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => subscribeWithRazorpay(plan, userDetails, onSuccess, onDismiss);
    document.body.appendChild(script);
    return;
  }

  if (plan.price <= 0) return;

  const options: RazorpayOptions = {
    key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder',
    amount: Math.round(plan.price * 100),
    currency: 'INR',
    name: 'Trust Home Services',
    description: `Subscription: ${plan.name} (${plan.interval})`,
    prefill: {
      name: userDetails.name || '',
      email: userDetails.email || '',
      contact: userDetails.mobile || '',
    },
    handler(response) {
      onSuccess({
        docketId: `sub-${plan.id}`,
        amount: plan.price,
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
        method: 'Online (Razorpay)',
        date: new Date().toISOString(),
      });
    },
    modal: {
      ondismiss: onDismiss,
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
