'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Package, Users, Download, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';

interface Props { user: any }

export default function AdminDashboard({ user }: Props) {
  const [dockets, setDockets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<'dockets' | 'users' | 'inventory' | 'analytics'>('dockets');

  const load = async () => {
    try {
      const [d, e, c, i, s] = await Promise.all([
        api.getDockets(), api.getEmployees(), api.getCustomers(),
        api.getInventory(), api.getStats(),
      ]);
      setDockets(d); setEmployees(e); setCustomers(c); setInventory(i); setStats(s);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const exportCSV = async (type: string) => {
    let data: any[] = [];
    let headers = '';
    let rows: string[] = [];
    const BOM = '\uFEFF';

    if (type === 'dockets') {
      data = dockets; headers = 'ID,Customer,Type,Title,Status,Amount\n';
      rows = data.map(d => `"${d.id}","${d.customer}","${d.type}","${d.title}","${d.status}",${d.amountReceived || 0}`);
    } else if (type === 'employees') {
      data = employees; headers = 'Username,Name,Mobile,Specialty,Status\n';
      rows = data.map(e => `"${e.username}","${e.name || ''}","${e.mobile || ''}","${e.specialty || ''}","${e.status || 'offline'}"`);
    } else if (type === 'inventory') {
      data = inventory; headers = 'Name,Price,Stock,SKU\n';
      rows = data.map(i => `"${i.name}",${i.price},${i.stock},"${i.sku}"`);
    }

    if (rows.length === 0) return;
    const csv = BOM + headers + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { pending: 'bg-yellow-500/20 text-yellow-400', assigned: 'bg-indigo-500/20 text-indigo-400', completed: 'bg-green-500/20 text-green-400', rejected: 'bg-red-500/20 text-red-400' };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors[s] || 'bg-white/10 text-[#94a3b8]'}`}>{s.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <div className="flex gap-2">
          {['dockets', 'users', 'inventory', 'analytics'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-white/5 text-[#94a3b8] hover:bg-white/10'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dockets' && (
        <div className="glass p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">All Service Requests ({dockets.length})</h3>
            <button onClick={() => exportCSV('dockets')} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {dockets.map(d => (
              <div key={d.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.title}</span>
                      {statusBadge(d.status)}
                    </div>
                    <p className="text-[#94a3b8] text-xs">Customer: {d.customer} | {d.type} | {d.address}</p>
                    {d.location && <p className="text-green-400 text-xs"><MapPin className="w-3 h-3 inline" /> GPS Shared</p>}
                    {d.assignedTo && <p className="text-indigo-400 text-xs">Assigned: {d.assignedTo}</p>}
                    {d.expectedDate && <p className="text-yellow-400 text-xs">Expected: {d.expectedDate}</p>}
                    {d.completedDate && <p className="text-green-400 text-xs">Completed: {d.completedDate} | ₹{d.amountReceived || 0}</p>}
                    {d.rejectionReason && <p className="text-red-400 text-xs">Rejected: {d.rejectionReason}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold"><Users className="w-4 h-4 inline" /> Employees ({employees.length})</h3>
              <button onClick={() => exportCSV('employees')} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white"><Download className="w-3 h-3" /> CSV</button>
            </div>
            {employees.map(e => (
              <div key={e.username} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name || e.username}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${e.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{e.status === 'online' ? 'Online' : 'Offline'}</span>
                </div>
                <p className="text-[#94a3b8] text-xs">{e.username} | {e.specialty || 'General'} | {e.mobile || 'N/A'}</p>
              </div>
            ))}
          </div>
          <div className="glass p-6">
            <h3 className="font-semibold mb-4">Customers ({customers.length})</h3>
            {customers.map(c => (
              <div key={c.username} className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm mb-2">
                <span className="font-medium">{c.name || c.username}</span>
                <p className="text-[#94a3b8] text-xs">{c.username} | {c.mobile || 'N/A'} | {c.email || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="glass p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold"><Package className="w-4 h-4 inline" /> Inventory ({inventory.length})</h3>
            <button onClick={() => exportCSV('inventory')} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white"><Download className="w-3 h-3" /> CSV</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {inventory.map((i: any) => (
              <span key={i.id} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm flex items-center gap-2">
                {i.name} (₹{i.price}) <span className="text-[#94a3b8]">x{i.stock}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Dockets', value: stats.totalDockets },
              { label: 'Pending', value: stats.pendingDockets },
              { label: 'Completed', value: stats.completedDockets },
              { label: 'Revenue', value: `₹${stats.totalRevenue}` },
              { label: 'Employees', value: stats.totalEmployees },
              { label: 'Customers', value: stats.totalCustomers },
            ].map(s => (
              <div key={s.label} className="glass p-4 text-center">
                <div className="text-2xl font-bold text-primary-light">{s.value}</div>
                <div className="text-xs text-[#94a3b8]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass p-6">
              <h3 className="font-semibold mb-4"><BarChart3 className="w-4 h-4 inline" /> Docket Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Pending', count: stats.pendingDockets },
                  { name: 'Assigned', count: stats.assignedDockets || 0 },
                  { name: 'Completed', count: stats.completedDockets },
                  { name: 'Rejected', count: stats.rejectedDockets || 0 },
                ]}>
                  <CartesianGrid stroke="#ffffff10" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass p-6">
              <h3 className="font-semibold mb-4">Revenue by Technician</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={(stats.empRevenue || []).map((e: any) => ({ name: e.assigned_to, value: e.revenue }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {(stats.empRevenue || []).map((_: any, i: number) => (
                      <Cell key={i} fill={['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              {(stats.empRevenue || []).length === 0 && (
                <p className="text-sm text-[#94a3b8] text-center py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
