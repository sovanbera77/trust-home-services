import { useState } from 'react';
import { useStore } from '../store/useStore';
import { uuid } from '../lib/utils';
import { subscribeWithRazorpay, canPaySubscription } from '../lib/paymentService';
import { Plus, Trash2, Star, CheckCircle, Edit3, X, Save, CreditCard } from 'lucide-react';
import type { SubscriptionPlan } from '../lib/types';
import { t } from '../lib/i18n';

const INTERVAL_LABEL: Record<SubscriptionPlan['interval'], string> = {
  monthly: '/ month',
  quarterly: '/ quarter',
  yearly: '/ year',
};

export function AdminSubscriptionsTab() {
  const subscriptionPlans = useStore((s) => s.subscriptionPlans);
  const addSubscriptionPlan = useStore((s) => s.addSubscriptionPlan);
  const updateSubscriptionPlan = useStore((s) => s.updateSubscriptionPlan);
  const deleteSubscriptionPlan = useStore((s) => s.deleteSubscriptionPlan);
  const [form, setForm] = useState({
    name: '',
    price: 499,
    interval: 'yearly' as SubscriptionPlan['interval'],
    perks: '',
    popular: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubscriptionPlan | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const plan: SubscriptionPlan = {
      id: uuid(),
      name: form.name.trim(),
      price: Number(form.price) || 0,
      interval: form.interval,
      perks: form.perks.split('\n').map((p) => p.trim()).filter(Boolean),
      popular: form.popular,
      active: true,
    };
    await addSubscriptionPlan(plan);
    setForm({ name: '', price: 499, interval: 'yearly', perks: '', popular: false });
  };

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setEditForm({ ...plan });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleEditSave = async () => {
    if (!editForm || !editForm.name.trim()) return;
    await updateSubscriptionPlan(editingId!, {
      name: editForm.name.trim(),
      price: Number(editForm.price) || 0,
      interval: editForm.interval,
      perks: editForm.perks,
      popular: editForm.popular,
    });
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <div className="space-y-6">
      <div className="glass p-4">
        <h2 className="text-lg font-semibold text-white mb-4">{t('subscription.createPlan')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('subscription.planName')}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Home Shield" />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('subscription.price')}</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('subscription.interval')}</label>
            <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as SubscriptionPlan['interval'] })}>
              <option value="monthly">{t('subscription.monthly')}</option>
              <option value="quarterly">{t('subscription.quarterly')}</option>
              <option value="yearly">{t('subscription.yearly')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('subscription.popular')}</label>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" className="!w-4 !h-4" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
              {t('subscription.popularLabel')}
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-[#94a3b8] block mb-1">{t('subscription.perks')}</label>
            <textarea rows={3} value={form.perks} onChange={(e) => setForm({ ...form, perks: e.target.value })} placeholder={'4 maintenance visits\n15% off all repairs\nEmergency priority'} />
          </div>
        </div>
        <button className="btn btn-primary mt-3" onClick={handleAdd}>
          <Plus size={16} className="mr-1" /> {t('subscription.addPlan')}
        </button>
      </div>

      <div className="glass p-4">
        <h2 className="text-lg font-semibold text-white mb-4">{t('subscription.allPlans').replace('{count}', String(subscriptionPlans.length))}</h2>
        {subscriptionPlans.length === 0 ? (
          <p className="text-[#94a3b8] text-sm">{t('subscription.noPlans')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="card p-4 relative">
                {plan.popular && (
                  <span className="absolute -top-2 right-3 text-[10px] font-bold bg-gradient-to-r from-[#818cf8] to-[#c084fc] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} /> {t('subscription.popularBadge')}
                  </span>
                )}

                {editingId === plan.id && editForm ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-[#94a3b8] block mb-0.5">{t('subscription.planName')}</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-[#94a3b8] block mb-0.5">{t('subscription.price')}</label>
                      <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-xs text-[#94a3b8] block mb-0.5">{t('subscription.interval')}</label>
                      <select value={editForm.interval} onChange={(e) => setEditForm({ ...editForm, interval: e.target.value as SubscriptionPlan['interval'] })}>
                        <option value="monthly">{t('subscription.monthly')}</option>
                        <option value="quarterly">{t('subscription.quarterly')}</option>
                        <option value="yearly">{t('subscription.yearly')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#94a3b8] block mb-0.5">{t('subscription.perks')}</label>
                      <textarea rows={3} value={Array.isArray(editForm.perks) ? editForm.perks.join('\n') : editForm.perks} onChange={(e) => setEditForm({ ...editForm, perks: e.target.value.split('\n').map((p) => p.trim()).filter(Boolean) })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="!w-4 !h-4" checked={editForm.popular} onChange={(e) => setEditForm({ ...editForm, popular: e.target.checked })} />
                      {t('subscription.popular')}
                    </label>
                    <div className="flex gap-2 mt-2">
                      <button className="btn btn-primary text-xs flex-1" onClick={handleEditSave}>
                        <Save size={13} className="mr-1" /> {t('subscription.save')}
                      </button>
                      <button className="btn btn-secondary text-xs" onClick={cancelEdit}>
                        <X size={13} className="mr-1" /> {t('subscription.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-1">₹{plan.price}<span className="text-xs text-[#94a3b8] font-normal">{INTERVAL_LABEL[plan.interval]}</span></p>
                    <ul className="mt-3 space-y-1">
                      {plan.perks.map((p, i) => (
                        <li key={i} className="text-xs text-[#94a3b8] flex items-start gap-1.5">
                          <CheckCircle size={12} className="text-green-400 mt-0.5 shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-secondary text-xs text-blue-400 flex-1" onClick={() => startEdit(plan)}>
                        <Edit3 size={13} className="mr-1" /> {t('subscription.edit')}
                      </button>
                      <button className="btn btn-secondary text-xs text-red-400" onClick={() => deleteSubscriptionPlan(plan.id)}>
                        <Trash2 size={13} className="mr-1" /> {t('subscription.delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerSubscriptions() {
  const subscriptionPlans = useStore((s) => s.subscriptionPlans);
  const subscriptions = useStore((s) => s.subscriptions);
  const currentUser = useStore((s) => s.currentUser);
  const subscribe = useStore((s) => s.subscribe);
  const cancelSubscription = useStore((s) => s.cancelSubscription);
  const activePlans = subscriptionPlans.filter((p) => p.active);
  const mySub = subscriptions.find((s) => s.user === currentUser?.username && s.status === 'active');

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!currentUser) return;
    if (!canPaySubscription(plan)) {
      subscribe(plan.id, currentUser.username);
      return;
    }
    subscribeWithRazorpay(
      plan,
      { name: currentUser.name, email: currentUser.email, mobile: currentUser.mobile },
      () => {
        subscribe(plan.id, currentUser.username);
      },
    );
  };

  return (
    <div>
      {mySub && (
        <div className="card p-4 mb-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-[#94a3b8]">{t('subscription.yourPlan')}</p>
              <h3 className="font-semibold text-lg">{mySub.planName}</h3>
              <p className="text-xs text-[#94a3b8] mt-1">
                Renews on {new Date(mySub.endDate).toLocaleDateString()}
              </p>
            </div>
            <button className="btn btn-secondary text-xs" onClick={() => cancelSubscription(mySub.id)}>
              {t('subscription.cancelPlan')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {activePlans.map((plan) => (
          <div key={plan.id} className={`card p-5 relative flex flex-col ${plan.popular ? 'border-[#818cf8]/50' : ''}`}>
            {plan.popular && (
              <span className="absolute -top-2 right-3 text-[10px] font-bold bg-gradient-to-r from-[#818cf8] to-[#c084fc] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={10} /> {t('subscription.popularBadge')}
              </span>
            )}
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="text-2xl font-bold mt-1">₹{plan.price}<span className="text-xs text-[#94a3b8] font-normal">{INTERVAL_LABEL[plan.interval]}</span></p>
            <ul className="mt-3 space-y-1.5 flex-1">
              {plan.perks.map((p, i) => (
                <li key={i} className="text-xs text-[#94a3b8] flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-green-400 mt-0.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
            <button
              className={`btn mt-4 ${mySub?.planId === plan.id ? 'btn-secondary' : 'btn-primary'}`}
              disabled={!!mySub}
              onClick={() => handleSubscribe(plan)}
            >
              {mySub?.planId === plan.id ? t('subscription.currentPlan') : mySub ? t('subscription.switchPlans') : (
                <><CreditCard size={14} className="mr-1" /> {t('subscription.subscribe')}</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
