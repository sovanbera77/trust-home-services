import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { uuid } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import ContactCard from '../ui/ContactCard';
import DocketTimeline from '../ui/DocketTimeline';
import type { Docket, User } from '../../lib/types';
import { t } from '../../lib/i18n';

interface ScoredEmployee extends User {
  score: number;
  workload: number;
  avgRating: number | null;
  ratingCount: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function suggestEmployees(docket: Docket | null, employees: User[], dockets: Docket[]): ScoredEmployee[] {
  if (!docket) return [];
  const activeCounts: Record<string, number> = {};
  for (const d of dockets) {
    if (d.assignedTo && (d.status === 'assigned' || d.status === 'pending')) {
      activeCounts[d.assignedTo] = (activeCounts[d.assignedTo] || 0) + 1;
    }
  }
  const ratingSums: Record<string, { sum: number; count: number }> = {};
  for (const d of dockets) {
    if (d.assignedTo && d.rating != null) {
      if (!ratingSums[d.assignedTo]) ratingSums[d.assignedTo] = { sum: 0, count: 0 };
      ratingSums[d.assignedTo].sum += d.rating;
      ratingSums[d.assignedTo].count += 1;
    }
  }
  return employees
    .filter(e => e.role === 'employee')
    .map(e => {
      let score = 0;
      const title = (docket.title || '').toLowerCase();
      const specialty = (e.specialty || '').toLowerCase();
      if (specialty && title.includes(specialty)) score += 40;
      else if (!specialty || specialty === 'general') score += 10;
      const workload = activeCounts[e.username] || 0;
      score += Math.max(0, 20 - workload * 5);
      if (docket.location && e.location) {
        const dist = haversineKm(docket.location.lat, docket.location.lng, e.location.lat, e.location.lng);
        score += Math.max(0, 20 - dist);
      } else {
        score += 5;
      }
      const r = ratingSums[e.username];
      if (r && r.count > 0) score += (r.sum / r.count / 5) * 10;
      if (e.status === 'online') score += 10;
      return { ...e, score: Math.round(score * 10) / 10, workload, avgRating: r ? r.sum / r.count : null, ratingCount: r?.count ?? 0 };
    })
    .sort((a, b) => b.score - a.score);
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  assigned: 'bg-indigo-500/20 text-indigo-400',
  completed: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
};

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateInvoice(d: Docket) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Trust Home Services', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Premium Field Service Management', 105, 28, { align: 'center' });
  doc.line(20, 32, 190, 32);
  doc.setFontSize(14);
  doc.text('INVOICE', 105, 42, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Invoice #: ${d.id.slice(0, 8)}`, 20, 54);
  doc.text(`Date: ${d.completedDate || d.date}`, 20, 60);
  doc.text(`Customer: ${d.customer}`, 20, 66);
  doc.text(`Service: ${d.title}`, 20, 72);
  doc.text(`Type: ${d.type}`, 20, 78);
  doc.line(20, 84, 190, 84);
  doc.text('Description', 20, 92);
  doc.text('Amount', 160, 92);
  doc.line(20, 96, 190, 96);
  doc.text(d.desc || d.title, 20, 104);
  doc.text(`\u20B9${d.amountReceived || 0}`, 160, 104);
  doc.line(20, 112, 190, 112);
  doc.setFontSize(12);
  doc.text(`Total: \u20B9${d.amountReceived || 0}`, 160, 122);
  doc.text(`Payment: ${d.paymentMethod || 'N/A'}`, 20, 122);
  doc.setFontSize(8);
  doc.text('Thank you for choosing Trust Home Services!', 105, 160, { align: 'center' });
  doc.text('Contact: +91-9876543210 | sovan@engineer.com', 105, 166, { align: 'center' });
  doc.save(`invoice-${d.id.slice(0, 8)}.pdf`);
}

export default function DocketsTab() {
  const dockets = useStore((s) => s.dockets);
  const users = useStore((s) => s.users);
  const updateDocket = useStore((s) => s.updateDocket);
  const addNotification = useStore((s) => s.addNotification);
  const addActivityLog = useStore((s) => s.addActivityLog);
  const activityLogs = useStore((s) => s.activityLogs);
  const getUser = (username: string) => users.find((u) => u.username === username);

  const [assignModal, setAssignModal] = useState<{ docketId: string } | null>(null);
  const [assignUsername, setAssignUsername] = useState('');

  const assignDocket = useMemo(() => {
    if (!assignModal) return null;
    return dockets.find(d => d.id === assignModal.docketId) || null;
  }, [assignModal, dockets]);

  const employeeSuggestions = useMemo(() => {
    return suggestEmployees(assignDocket, users, dockets);
  }, [assignDocket, users, dockets]);

  const [completeModal, setCompleteModal] = useState<{ docketId: string } | null>(null);
  const [serviceFee, setServiceFee] = useState('');
  const [materialCosts, setMaterialCosts] = useState('');
  const [usedPart, setUsedPart] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [expectedDateId, setExpectedDateId] = useState<string | null>(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [timelineDocketId, setTimelineDocketId] = useState<string | null>(null);

  const handleAssign = () => {
    if (!assignModal || !assignUsername.trim()) return;
    const docket = dockets.find(d => d.id === assignModal.docketId);
    updateDocket(assignModal.docketId, { assignedTo: assignUsername.trim(), status: 'assigned' });
    addActivityLog({ id: uuid(), docketId: assignModal.docketId, action: 'assigned', actor: 'admin', detail: `Assigned to ${assignUsername.trim()}`, timestamp: new Date().toISOString() });
    addNotification({ id: uuid(), userId: assignUsername.trim(), title: 'New Assignment', body: 'A docket has been assigned to you', type: 'info', read: false, createdAt: new Date().toISOString() });
    if (docket) {
      addNotification({ id: uuid(), userId: docket.customer, title: 'Docket Assigned', body: `Your docket "${docket.title}" has been assigned to ${assignUsername.trim()}`, type: 'info', read: false, createdAt: new Date().toISOString() });
    }
    setAssignModal(null);
    setAssignUsername('');
  };

  const handleComplete = () => {
    if (!completeModal) return;
    const docket = dockets.find(d => d.id === completeModal.docketId);
    updateDocket(completeModal.docketId, {
      status: 'completed',
      serviceFee: parseFloat(serviceFee) || 0,
      materialCosts: parseFloat(materialCosts) || 0,
      usedPart,
      amountReceived: parseFloat(amountReceived) || 0,
      paymentMethod,
      completedDate: new Date().toISOString(),
    });
    addActivityLog({ id: uuid(), docketId: completeModal.docketId, action: 'completed', actor: 'admin', detail: `Completed — ₹${parseFloat(amountReceived) || 0} received`, timestamp: new Date().toISOString() });
    if (docket) {
      addNotification({ id: uuid(), userId: docket.customer, title: 'Work Completed', body: `Your docket "${docket.title}" has been marked complete`, type: 'success', read: false, createdAt: new Date().toISOString() });
    }
    setCompleteModal(null);
    setServiceFee('');
    setMaterialCosts('');
    setUsedPart('');
    setAmountReceived('');
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    updateDocket(rejectId, { status: 'rejected', rejectionReason: rejectReason.trim() });
    addActivityLog({ id: uuid(), docketId: rejectId, action: 'rejected', actor: 'admin', detail: rejectReason.trim(), timestamp: new Date().toISOString() });
    setRejectId(null);
    setRejectReason('');
  };

  const handleUpdateExpectedDate = () => {
    if (!expectedDateId || !expectedDate) return;
    updateDocket(expectedDateId, { expectedDate });
    setExpectedDateId(null);
    setExpectedDate('');
  };

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{t('dockets.title').replace('{count}', String(dockets.length))}</h2>
        <button onClick={() => downloadCSV('dockets.csv', [['ID','Title','Status','Customer','Type','Address','Assigned To','Service Fee','Material Costs','Amount Received','Payment Method','Created'], ...dockets.map(d => [d.id, d.title, d.status, d.customer || '', d.type, d.address || '', d.assignedTo || '', String(d.serviceFee || ''), String(d.materialCosts || ''), String(d.amountReceived || ''), d.paymentMethod || '', d.createdAt || ''])])} className="btn btn-secondary text-xs">{t('dockets.csvExport')}</button>
      </div>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {dockets.map(d => (
          <div key={d.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold text-white">{d.title}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${statusColors[d.status] || 'bg-gray-500/20 text-gray-400'}`}>{d.status}</span>
              </div>
              <span className="text-xs text-[#94a3b8]">{d.id}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#94a3b8] mb-3">
              <div><span className="text-white/60">Customer:</span> {d.customer}</div>
              <div><span className="text-white/60">Type:</span> {d.type}</div>
              <div><span className="text-white/60">Address:</span> {d.address}</div>
              <div><span className="text-white/60">Assigned:</span> {d.assignedTo || '-'}</div>
              <div><span className="text-white/60">Created:</span> {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</div>
              <div><span className="text-white/60">Expected:</span> {d.expectedDate ? new Date(d.expectedDate).toLocaleDateString() : '-'}</div>
              <div><span className="text-white/60">Fee:</span> ₹{d.serviceFee || 0}</div>
              <div><span className="text-white/60">Received:</span> ₹{d.amountReceived || 0}</div>
            </div>
            {(d.status !== 'rejected') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <ContactCard user={getUser(d.customer)} label="Customer" />
                {d.assignedTo && <ContactCard user={getUser(d.assignedTo)} label="Assigned Technician" />}
              </div>
            )}
            {d.status === 'completed' && d.completedDate && (
              <div className="text-xs text-green-400 mb-1">{t('dockets.completedLabel')}: {new Date(d.completedDate).toLocaleString()}</div>
            )}
            {d.status === 'completed' && (
              <button onClick={() => generateInvoice(d)} className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors mb-2">
                {t('dockets.downloadInvoice')}
              </button>
            )}
            <div className="flex flex-wrap gap-2">
              {d.status === 'pending' && (
                <>
                  <button onClick={() => setAssignModal({ docketId: d.id })} className="btn btn-primary text-xs">{t('dockets.assign')}</button>
                  <button onClick={() => { setRejectId(d.id); setRejectReason(''); }} className="btn bg-red-500/20 text-red-400 border border-red-500/30 text-xs">{t('dockets.reject')}</button>
                </>
              )}
              {d.status === 'assigned' && (
                <>
                  <button onClick={() => setAssignModal({ docketId: d.id })} className="btn bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs">{t('dockets.reassign')}</button>
                  <button onClick={() => setCompleteModal({ docketId: d.id })} className="btn btn-primary text-xs">{t('dockets.complete')}</button>
                  <button onClick={() => { setExpectedDateId(d.id); setExpectedDate(d.expectedDate || ''); }} className="btn btn-secondary text-xs">{t('dockets.updateDate')}</button>
                </>
              )}
            </div>
            <button onClick={() => setTimelineDocketId(timelineDocketId === d.id ? null : d.id)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">
              {timelineDocketId === d.id ? t('dockets.hideTimeline') : t('dockets.showTimeline')}
            </button>
            {timelineDocketId === d.id && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <DocketTimeline logs={activityLogs.filter(l => l.docketId === d.id)} />
              </div>
            )}
          </div>
        ))}
        {dockets.length === 0 && <p className="text-[#94a3b8] text-sm text-center py-8">{t('dockets.noDockets')}</p>}
      </div>

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAssignModal(null)}>
          <div className="glass p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">{t('dockets.assignModal')}</h3>
            <p className="text-xs text-[#94a3b8] mb-3">{assignDocket?.title} — {assignDocket?.customer}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {employeeSuggestions.map((emp, i) => (
                <button
                  key={emp.username}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${assignUsername === emp.username ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                  onClick={() => setAssignUsername(emp.username)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{emp.name}</span>
                      <span className="text-xs text-indigo-400">{emp.specialty || 'General'}</span>
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold">Suggested</span>}
                    </div>
                    <span className="text-xs text-[#94a3b8]">{emp.score} pts</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-[#94a3b8]">
                    <span>Jobs: {emp.workload}</span>
                    {emp.avgRating != null && <span>Rating: {emp.avgRating.toFixed(1)}★</span>}
                    <span className={emp.status === 'online' ? 'text-green-400' : ''}>{emp.status}</span>
                  </div>
                </button>
              ))}
              {employeeSuggestions.length === 0 && <p className="text-xs text-[#94a3b8] text-center py-4">{t('dockets.noEmployees')}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAssignModal(null)} className="btn btn-secondary text-sm">{t('common.cancel')}</button>
              <button onClick={handleAssign} className="btn btn-primary text-sm">{t('dockets.assign')}</button>
            </div>
          </div>
        </div>
      )}

      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCompleteModal(null)}>
          <div className="glass p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">{t('dockets.completeModal')}</h3>
            <div className="space-y-3">
              <input type="number" placeholder="Service Fee" value={serviceFee} onChange={e => setServiceFee(e.target.value)} />
              <input type="number" placeholder="Material Costs" value={materialCosts} onChange={e => setMaterialCosts(e.target.value)} />
              <input placeholder="Used Part" value={usedPart} onChange={e => setUsedPart(e.target.value)} />
              <input type="number" placeholder="Amount Received" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Cash">Cash</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Due">Due</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setCompleteModal(null)} className="btn btn-secondary text-sm">{t('common.cancel')}</button>
              <button onClick={handleComplete} className="btn btn-primary text-sm">{t('dockets.complete')}</button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRejectId(null)}>
          <div className="glass p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">{t('dockets.rejectModal')}</h3>
            <textarea placeholder={t('dockets.rejectionReason')} value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectId(null)} className="btn btn-secondary text-sm">{t('common.cancel')}</button>
              <button onClick={handleReject} className="btn bg-red-500/20 text-red-400 border border-red-500/30 text-sm">{t('dockets.reject')}</button>
            </div>
          </div>
        </div>
      )}

      {expectedDateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setExpectedDateId(null)}>
          <div className="glass p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">{t('dockets.dateModal')}</h3>
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setExpectedDateId(null)} className="btn btn-secondary text-sm">{t('common.cancel')}</button>
              <button onClick={handleUpdateExpectedDate} className="btn btn-primary text-sm">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
