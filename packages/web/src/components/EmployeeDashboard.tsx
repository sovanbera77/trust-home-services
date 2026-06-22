'use client';

import { useState, useEffect } from 'react';
import { MapPin, MessageSquare, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface Props { user: any }

export default function EmployeeDashboard({ user }: Props) {
  const [dockets, setDockets] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [duty, setDuty] = useState('online');

  const load = async () => {
    try {
      const d = await api.getDockets();
      setDockets(d);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const toggleDuty = async (status: string) => {
    setDuty(status);
    await api.updateDuty(status);
  };

  const completeJob = async (id: string) => {
    const fee = prompt('Service Fee (₹):');
    if (fee === null) return;
    const mat = prompt('Material Costs (₹):') || '0';
    const method = prompt('Payment Method (Cash/PhonePe/Due):') || 'Cash';
    await api.completeDocket(id, { serviceFee: parseFloat(fee) || 0, materialCosts: parseFloat(mat) || 0, paymentMethod: method });
    load();
  };

  const sendChat = async (docketId: string) => {
    if (!chatText.trim()) return;
    await api.sendChat(docketId, chatText);
    setChatText('');
    load();
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', assigned: 'bg-indigo-500/20 text-indigo-400', completed: 'bg-green-500/20 text-green-400' };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors[s] || 'bg-white/10 text-[#94a3b8]'}`}>{s.toUpperCase()}</span>;
  };

  const active = dockets.filter(d => d.assignedTo === user.username && d.status === 'assigned');
  const history = dockets.filter(d => d.assignedTo === user.username && d.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employee Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#94a3b8]">Duty:</span>
          <select value={duty} onChange={e => toggleDuty(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm">
            <option value="online">Online (Available)</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h3 className="font-semibold mb-4">Active Jobs ({active.length})</h3>
          {active.length === 0 ? (
            <p className="text-sm text-[#94a3b8] text-center py-8">No active jobs.</p>
          ) : (
            <div className="space-y-3">
              {active.map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.title}</span>
                    {statusBadge(d.status)}
                  </div>
                  <p className="text-[#94a3b8] text-xs">Customer: {d.customer} | {d.address}</p>
                  <p className="text-[#94a3b8] text-xs">{d.desc}</p>
                  {d.expectedDate && <p className="text-yellow-400 text-xs">Expected: {d.expectedDate}</p>}
                  {d.location && (
                    <a href={`https://www.google.com/maps?q=${d.location.lat},${d.location.lng}`} target="_blank"
                      className="text-xs text-green-400 flex items-center gap-1 hover:underline">
                      <MapPin className="w-3 h-3" /> View on Google Maps
                    </a>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => completeJob(d.id)} className="text-xs px-3 py-1 rounded bg-primary text-white">Complete</button>
                    <button onClick={() => setChatOpen(chatOpen === d.id ? null : d.id)} className="text-xs px-3 py-1 rounded bg-white/10 text-[#94a3b8] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                  </div>
                  {chatOpen === d.id && (
                    <div className="border border-white/10 rounded-lg overflow-hidden">
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
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6">
          <h3 className="font-semibold mb-4"><Clock className="w-4 h-4 inline" /> Work History ({history.length})</h3>
          {history.length === 0 ? (
            <p className="text-sm text-[#94a3b8] text-center py-8">No history yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {history.map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-green-400 text-xs font-semibold">₹{d.amountReceived || 0}</span>
                  </div>
                  <p className="text-[#94a3b8] text-xs">Customer: {d.customer} | {d.completedDate || d.date}</p>
                  <p className="text-[#94a3b8] text-xs">Fee: ₹{d.serviceFee || 0} | Materials: ₹{d.materialCosts || 0} | {d.paymentMethod}</p>
                  {d.rating && <p className="text-yellow-400 text-xs">Rating: {'★'.repeat(d.rating)}{'☆'.repeat(5 - d.rating)} {d.review ? `"${d.review}"` : ''}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
