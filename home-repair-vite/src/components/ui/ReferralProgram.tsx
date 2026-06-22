import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Gift, Copy, Check, Users } from 'lucide-react';
import { uuid } from '../../lib/utils';
import type { AppStore, Referral } from '../../lib/types';
import { t } from '../../lib/i18n';

export default function ReferralProgram() {
  const currentUser = useStore((s: AppStore) => s.currentUser);
  const referrals = useStore((s: AppStore) => s.referrals);
  const addReferral = useStore((s: AppStore) => s.addReferral);
  const addNotification = useStore((s: AppStore) => s.addNotification);
  const [redeemCode, setRedeemCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [redeemMsg, setRedeem] = useState('');

  const myReferral = referrals.find((r: Referral) => r.userId === currentUser?.username);
  const referralCode = myReferral?.code || `${currentUser?.username?.slice(0, 4).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const totalEarned = referrals.filter((r: Referral) => r.userId === currentUser?.username).reduce((s: number, r: Referral) => s + r.earned, 0);

  function generateCode() {
    if (!currentUser) return;
    addReferral({
      id: uuid(),
      code: referralCode,
      userId: currentUser.username,
      earned: 0,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    });
    addNotification({
      id: uuid(),
      userId: currentUser.username,
      title: 'Referral Code Created',
      body: `Share your code ${referralCode} with friends! Earn ₹50 per referral.`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRedeem() {
    if (!currentUser || !redeemCode.trim()) return;
    const ok = await useStore.getState().redeemReferral(redeemCode.trim(), currentUser.username);
    if (ok) {
      setRedeem(t('referral.redeemed'));
      setRedeemCode('');
    } else {
      setRedeem(t('referral.invalidCode'));
    }
    setTimeout(() => setRedeem(''), 3000);
  }

  return (
    <div className="glass p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Gift size={24} className="text-indigo-400" />
        <div>
          <h2 className="text-lg font-semibold">{t('referral.title')}</h2>
          <p className="text-sm text-[#94a3b8]">{t('referral.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <p className="text-xs text-[#94a3b8] mb-1">{t('referral.yourCode')}</p>
        <div className="flex items-center gap-2">
          <code className="text-2xl font-bold text-indigo-400 tracking-widest">{referralCode}</code>
          <button onClick={handleCopy} className="btn btn-secondary !p-2">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-[#94a3b8]"><Users size={14} className="inline mr-1" />{t('referral.used').replace('{count}', String(referrals.filter((r: Referral) => r.userId === currentUser?.username).reduce((s: number, r: Referral) => s + r.usedCount, 0)))}</span>
          <span className="text-emerald-400 font-medium">{t('referral.earned').replace('{amount}', String(totalEarned))}</span>
        </div>
      </div>

      {!myReferral && (
        <button className="btn btn-primary w-full" onClick={generateCode}>{t('referral.generate')}</button>
      )}

      <div className="border-t border-white/10 pt-4">
        <label className="text-sm font-medium block mb-2">{t('referral.haveCode')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder={t('referral.enterCode')}
            className="flex-1"
          />
          <button className="btn btn-primary" onClick={handleRedeem}>{t('referral.redeem')}</button>
        </div>
        {redeemMsg && <p className="text-xs mt-2 text-emerald-400">{redeemMsg}</p>}
      </div>

      <div className="border-t border-white/10 pt-4 mt-4">
        <h3 className="text-md font-semibold mb-3">Loyalty Store</h3>
        <p className="text-xs text-[#94a3b8] mb-4">Use your earned points to buy discount coupons.</p>
        <div className="grid grid-cols-1 gap-3">
          {useStore((s: AppStore) => s.loyaltyCoupons).map(coupon => (
            <div key={coupon.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
              <div>
                <div className="font-bold text-indigo-300">{coupon.code}</div>
                <div className="text-xs text-[#94a3b8]">₹{coupon.discountAmt} Off</div>
              </div>
              <button 
                className="btn btn-secondary text-xs py-1 px-3"
                disabled={totalEarned < coupon.pointsCost}
                onClick={async () => {
                  if (!currentUser) return;
                  const ok = await useStore.getState().redeemLoyaltyCoupon(coupon.id, currentUser.username);
                  if (ok) {
                    alert(`Purchased ${coupon.code}!`);
                  }
                }}
              >
                {coupon.pointsCost} pts
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
