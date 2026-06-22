import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { ServiceCategory, ServiceSub } from '../lib/services';
import { SERVICE_CATALOG } from '../lib/services';
import { uuid } from '../lib/utils';
import type { AppStore } from '../lib/types';
import { t } from '../lib/i18n';

export default function ServiceWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>('');
  const [form, setForm] = useState({
    desc: '',
    address: '',
    preferredDate: '',
  });
  const currentUser = useStore((s: AppStore) => s.currentUser);
  const addDocket = useStore((s: AppStore) => s.addDocket);
  const addActivityLog = useStore((s: AppStore) => s.addActivityLog);
  const addNotification = useStore((s: AppStore) => s.addNotification);

  function handleSubmit() {
    if (!currentUser || !selectedCat) return;
    addDocket({
      id: uuid(),
      customer: currentUser.username,
      type: selectedCat.docketType,
      title: selectedSub || selectedCat.name,
      desc: form.desc,
      address: form.address,
      pincode: '',
      preferredDate: form.preferredDate,
      status: 'pending',
      assignedTo: '',
      date: new Date().toISOString(),
      completedDate: '',
      expectedDate: '',
      serviceFee: selectedCat.fromPrice,
      materialCosts: 0,
      usedPart: '',
      amountReceived: 0,
      paymentMethod: '',
      rejectionReason: '',
      rating: 0,
      review: '',
      chat: [],
      photoUrls: [],
      createdAt: new Date().toISOString(),
    });
    addActivityLog({
      id: uuid(),
      docketId: '',
      action: 'created',
      actor: currentUser.name || currentUser.username,
      detail: `${selectedCat.name} - ${selectedSub || 'General'}`,
      timestamp: new Date().toISOString(),
    });
    addNotification({
      id: uuid(),
      userId: 'admin',
      title: 'New Service Request',
      body: `${currentUser.name} requested ${selectedSub || selectedCat.name}`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString(),
    });
    onComplete();
  }

  return (
    <div className="glass p-6 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-6">
        {[t('wizard.selectService'), t('wizard.details'), t('wizard.confirmSubmit')].map((label, i) => (
          <div key={i} className={`flex-1 text-center text-xs font-medium py-2 rounded-lg ${i === step ? 'bg-indigo-600 text-white' : i < step ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[#94a3b8]'}`}>
            {i < step ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">{t('wizard.selectCategory')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {SERVICE_CATALOG.map((cat: ServiceCategory) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat); setSelectedSub(''); }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedCat?.id === cat.id
                    ? 'bg-indigo-600/20 border-indigo-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl block mb-1">{cat.icon}</span>
                <p className="font-medium text-sm">{cat.name}</p>
                <p className="text-xs text-[#94a3b8] mt-1">{cat.subs.length} {t('wizard.subServices')}</p>
              </button>
            ))}
          </div>

          {selectedCat && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium">{t('wizard.chooseSub')}</h4>
              {selectedCat.subs.map((sub: ServiceSub) => (
                <button
                  key={sub.name}
                  onClick={() => setSelectedSub(sub.name)}
                  className={`w-full text-left p-3 rounded-lg text-sm border transition-all ${
                    selectedSub === sub.name
                      ? 'bg-indigo-600/20 border-indigo-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className="float-right text-emerald-400">₹{sub.price}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button className="btn btn-primary" disabled={!selectedCat} onClick={() => setStep(1)}>{t('wizard.next')}</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-medium">{t('wizard.serviceDetails')}</h3>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('wizard.description')}</label>
            <textarea
              rows={3}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="Describe the issue..."
            />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('wizard.address')}</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={currentUser?.address || 'Your address'}
            />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">{t('wizard.date')}</label>
            <input
              type="date"
              value={form.preferredDate}
              onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>{t('wizard.back')}</button>
            <button className="btn btn-primary" disabled={!form.desc || !form.address || !form.preferredDate} onClick={() => setStep(2)}>{t('wizard.next')}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-medium">{t('wizard.confirmSubmit')}</h3>
          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#94a3b8]">Service</span><span>{selectedCat?.icon} {selectedCat?.name} - {selectedSub}</span></div>
            <div className="flex justify-between"><span className="text-[#94a3b8]">Price</span><span className="text-emerald-400">₹{selectedCat?.fromPrice}</span></div>
            <div className="flex justify-between"><span className="text-[#94a3b8]">Description</span><span className="text-right max-w-[60%]">{form.desc}</span></div>
            <div className="flex justify-between"><span className="text-[#94a3b8]">Address</span><span>{form.address}</span></div>
            <div className="flex justify-between"><span className="text-[#94a3b8]">Date</span><span>{new Date(form.preferredDate).toLocaleDateString()}</span></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>{t('wizard.back')}</button>
            <button className="btn btn-primary" onClick={handleSubmit}>{t('wizard.submit')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
