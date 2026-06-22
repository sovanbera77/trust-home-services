import type { Referral } from '../../lib/types';
import { referralRepo } from '../../lib/repos/referralRepo';

type SetState = any;
type GetState = any;

export const createReferralSlice = (set: SetState, get: GetState) => ({
  referrals: [] as Referral[],
  loyaltyCoupons: [
    { id: 'c1', code: 'LOYALTY500', discountAmt: 500, pointsCost: 1000, isActive: true },
    { id: 'c2', code: 'LOYALTY1000', discountAmt: 1000, pointsCost: 2000, isActive: true },
  ],

  addReferral: async (ref: Referral) => {
    await referralRepo.save(ref);
    set((state: { referrals: Referral[] }) => ({ referrals: [...state.referrals, ref] }));
  },

  redeemReferral: async (code: string, userId: string): Promise<boolean> => {
    const { referrals } = get();
    const ref = referrals.find((r: Referral) => r.code === code);
    if (!ref || ref.userId === userId) return false;
    const updated = { ...ref, usedCount: ref.usedCount + 1, earned: ref.earned + 50 };
    await referralRepo.save(updated);
    set((state: { referrals: Referral[] }) => ({
      referrals: state.referrals.map((r: Referral) => r.id === updated.id ? updated : r),
    }));
    return true;
  },

  redeemLoyaltyCoupon: async (couponId: string, userId: string): Promise<boolean> => {
    const { loyaltyCoupons, referrals } = get();
    const coupon = loyaltyCoupons.find((c: any) => c.id === couponId);
    if (!coupon || !coupon.isActive) return false;

    // We store earned points inside a referral record (as a quick hack for the MVP). Find the user's primary "wallet" ref.
    let ref = referrals.find((r: Referral) => r.userId === userId);
    if (!ref) return false;

    if (ref.earned >= coupon.pointsCost) {
      const updated = { ...ref, earned: ref.earned - coupon.pointsCost };
      await referralRepo.save(updated);
      set((state: { referrals: Referral[] }) => ({
        referrals: state.referrals.map((r: Referral) => r.id === updated.id ? updated : r),
      }));
      // In a real app, we would add the coupon code to the user's active coupons list.
      return true;
    }
    return false;
  },
});
