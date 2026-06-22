'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, MessageSquare, Star, MapPin, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface Props { user: any }

export default function CustomerDashboard({ user }: Props) {
  const [dockets, setDockets] = useState<any[]>([]);
  const [form, setForm] = useState({ type: 'repair', title: '', desc: '', address: '', preferredDate: '' });
  const [complaintForm, setComplaintForm] = useState({ title: '', desc: '' });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');

  const load = async () => {
    try {
      const [d, c] = await Promise.all([api.getDockets(), api.getComplaints()]);
      setDockets(d);
      setComplaints(c);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createDocket = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createDocket(form);
    setForm({ type: 'repair', title: '', desc: '', address: '', preferredDate: '' });
    load();
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createComplaint(complaintForm);
    setComplaintForm({ title: '', desc: '' });
    load();
  };

  const cancelDocket = async (id: string) => {
    const reason = prompt('Reason for cancellation:');
    if (reason !== null) {
      await api.rejectDocket(id, reason || 'Cancelled by customer');
      load();
    }
  };

  const handlePayOnline = async (docket: any) => {
    try {
      const order = await api.createPaymentOrder(docket.id, docket.amountReceived);
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: 'Trust Home Services',
        description: docket.title,
        order_id: order.id,
        handler: async (response: any) => {
          await api.verifyPayment({ ...response, docketId: docket.id });
          alert('Payment successful!');
          load();
        },
        prefill: { name: user.name, email: user.email, contact: user.mobile },
        theme: { color: '#4f46e5' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert('Payment failed: ' + err.message);
    }
  };

  const sendChat = async (docketId: string) => {
    if (!chatText.trim()) return;
    await api.sendChat(docketId, chatText);
    setChatText('');
    load();
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', assigned: 'bg-indigo-500/20 text-indigo-400', completed: 'bg-green-500/20 text-green-400', rejected: 'bg-red-500/20 text-red-400' };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors[s] || 'bg-white/10 text-[#94a3b8]'}`}>{s.toUpperCase()}</span>;
  };

  if (loading) return <div className="text-center py-20 text-[#94a3b8]">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Dashboard</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Docket */}
        <div className="glass p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Create New Docket</h3>
          <form onSubmit={createDocket} className="space-y-3">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm">
              <option value="repair">Repair</option>
              <option value="installation">New Installation</option>
            </select>
            <input type="text" placeholder="What needs to be done?" required value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <textarea placeholder="Details..." required rows={2} value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <input type="text" placeholder="Service Address" required value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <input type="date" required value={form.preferredDate}
              onChange={e => setForm({ ...form, preferredDate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <button type="submit" className="w-full py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Submit Request</button>
          </form>
        </div>

        {/* Recent Dockets */}
        <div className="glass p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> My Requests</h3>
          {dockets.length === 0 ? (
            <p className="text-sm text-[#94a3b8] text-center py-8">No requests yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {dockets.map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.title}</span>
                    {statusBadge(d.status)}
                  </div>
                  <p className="text-[#94a3b8] text-xs">{d.type} | {d.date} | {d.address}</p>
                  {d.assignedTo && <p className="text-indigo-400 text-xs">Assigned to: {d.assignedTo}</p>}
                  {d.expectedDate && <p className="text-yellow-400 text-xs">Expected: {d.expectedDate}</p>}
                  {d.completedDate && <p className="text-green-400 text-xs">Completed: {d.completedDate}</p>}
                  {d.status === 'pending' && (
                    <button onClick={() => cancelDocket(d.id)} className="text-xs text-red-400 hover:underline">Cancel</button>
                  )}
                  {(d.status === 'assigned' || d.status === 'completed') && (
                    <div>
                      <button onClick={() => setChatOpen(chatOpen === d.id ? null : d.id)} className="text-xs text-primary-light hover:underline flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Chat
                      </button>
                      {chatOpen === d.id && (
                        <div className="mt-2 border border-white/10 rounded-lg overflow-hidden">
                          <div className="max-h-32 overflow-y-auto p-2 space-y-1 text-xs">
                            {(d.chat || []).map((m: any, i: number) => (
                              <div key={i} className={`p-1.5 rounded ${m.sender === user.username ? 'bg-primary text-white ml-4' : 'bg-white/5 mr-4'}`}>
                                <span className="font-semibold">{m.sender}: </span>{m.text}
                              </div>
                            ))}
                          </div>
                          <div className="flex border-t border-white/10">
                            <input value={chatText} onChange={e => setChatText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && sendChat(d.id)}
                              className="flex-1 px-2 py-1.5 text-xs bg-transparent text-white outline-none" placeholder="Type..." />
                            <button onClick={() => sendChat(d.id)} className="px-3 py-1.5 bg-primary text-xs text-white">Send</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {d.status === 'completed' && d.amountReceived > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-green-400 text-xs font-semibold">₹{d.amountReceived} ({d.paymentMethod || 'Pending'})</p>
                      {(!d.paymentMethod || d.paymentMethod === 'Pending') && d.amountReceived > 0 && (
                        <button onClick={() => handlePayOnline(d)} className="text-xs px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors">
                          Pay Online
                        </button>
                      )}
                    </div>
                  )}
                  {d.status === 'rejected' && d.rejectionReason && (
                    <p className="text-red-400 text-xs">Reason: {d.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complaints */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h3 className="font-semibold mb-4">File a Complaint</h3>
          <form onSubmit={submitComplaint} className="space-y-3">
            <input type="text" placeholder="Subject" required value={complaintForm.title}
              onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <textarea placeholder="Details..." required rows={2} value={complaintForm.desc}
              onChange={e => setComplaintForm({ ...complaintForm, desc: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm" />
            <button type="submit" className="w-full py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">Submit</button>
          </form>
        </div>
        <div className="glass p-6">
          <h3 className="font-semibold mb-4">My Complaints</h3>
          {complaints.length === 0 ? (
            <p className="text-sm text-[#94a3b8] text-center py-8">No complaints.</p>
          ) : (
            <div className="space-y-2">
              {complaints.map(c => (
                <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.title}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[#94a3b8] text-xs mt-1">{c.desc}</p>
                  <p className="text-[#94a3b8] text-xs mt-1">{c.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
