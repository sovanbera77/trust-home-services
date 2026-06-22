import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';

export default function ComplaintsTab() {
  const complaints = useStore((s) => s.complaints);
  const addComplaint = useStore((s) => s.addComplaint);
  const resolveComplaint = useStore((s) => s.resolveComplaint);

  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintCustomer, setComplaintCustomer] = useState('');

  const handleAddComplaint = () => {
    if (!complaintTitle || !complaintDesc || !complaintCustomer) return;
    addComplaint({
      id: Date.now().toString(),
      customer: complaintCustomer,
      title: complaintTitle,
      desc: complaintDesc,
      status: 'pending',
      date: new Date().toISOString(),
    });
    setComplaintTitle('');
    setComplaintDesc('');
    setComplaintCustomer('');
  };

  return (
    <div className="glass p-4">
      <h2 className="text-lg font-semibold text-white mb-4">{t('complaints.title').replace('{count}', String(complaints.length))}</h2>
      <div className="border-b border-white/10 pb-4 mb-4">
        <h3 className="text-sm font-medium text-white mb-3">{t('complaints.new')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input placeholder={t('complaints.customer')} value={complaintCustomer} onChange={e => setComplaintCustomer(e.target.value)} />
          <input placeholder="Title" value={complaintTitle} onChange={e => setComplaintTitle(e.target.value)} />
          <input placeholder="Description" value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} />
        </div>
        <button onClick={handleAddComplaint} className="btn btn-primary text-sm">{t('complaints.add')}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-yellow-400 mb-2">{t('complaints.unresolved').replace('{count}', String(complaints.filter(c => c.status === 'pending').length))}</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {complaints.filter(c => c.status === 'pending').map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{c.title}</p>
                    <p className="text-[#94a3b8] text-xs">by {c.customer} &middot; {new Date(c.date).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => resolveComplaint(c.id)} className="btn bg-green-500/20 text-green-400 border border-green-500/30 text-xs">{t('complaint.resolve')}</button>
                </div>
                <p className="text-[#94a3b8] text-xs mt-1">{c.desc}</p>
              </div>
            ))}
            {complaints.filter(c => c.status === 'pending').length === 0 && <p className="text-[#94a3b8] text-sm text-center py-6">{t('complaints.noUnresolved')}</p>}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-green-400 mb-2">{t('complaints.resolved').replace('{count}', String(complaints.filter(c => c.status === 'resolved').length))}</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {complaints.filter(c => c.status === 'resolved').map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-3 opacity-70">
                <p className="text-white text-sm font-medium">{c.title}</p>
                <p className="text-[#94a3b8] text-xs">by {c.customer} &middot; resolved</p>
                <p className="text-[#94a3b8] text-xs mt-1">{c.desc}</p>
              </div>
            ))}
            {complaints.filter(c => c.status === 'resolved').length === 0 && <p className="text-[#94a3b8] text-sm text-center py-6">{t('complaints.noResolved')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
