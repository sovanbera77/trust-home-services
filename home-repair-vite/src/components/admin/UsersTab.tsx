import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { set as dbSet, del as dbDel } from '../../lib/db';
import { hashPassword, uuid } from '../../lib/utils';
import type { User } from '../../lib/types';
import { t } from '../../lib/i18n';
import { can } from '../../lib/permissions';

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

export default function UsersTab() {
  const users = useStore((s) => s.users);
  const signup = useStore((s) => s.signup);
  const currentUser = useStore((s) => s.currentUser);
  const userRole = currentUser?.role || '';

  const employees = users.filter(u => u.role === 'employee');
  const managers = users.filter(u => u.role === 'manager');
  const customers = users.filter(u => u.role === 'customer');
  const isAdmin = userRole === 'admin';

  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpSpecialty, setNewEmpSpecialty] = useState('');
  const [newEmpMobile, setNewEmpMobile] = useState('');
  const [newEmpIsManager, setNewEmpIsManager] = useState(false);
  const [newEmpManager, setNewEmpManager] = useState('');

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editManager, setEditManager] = useState('');

  const handleAddEmployee = async () => {
    if (!newEmpUsername || !newEmpName || !newEmpPassword) { alert('Fill username, name, and password'); return; }
    if (users.find(u => u.username === newEmpUsername)) { alert('Username already exists'); return; }
    const role = newEmpIsManager ? 'manager' : 'employee';
    await signup({ username: newEmpUsername, password: newEmpPassword, role, name: newEmpName, mobile: newEmpMobile, specialty: newEmpSpecialty, address: '', email: '', status: 'offline', manager: role === 'employee' ? newEmpManager || undefined : undefined });
    setNewEmpUsername(''); setNewEmpName(''); setNewEmpPassword(''); setNewEmpSpecialty(''); setNewEmpMobile(''); setNewEmpManager('');
    alert(role === 'manager' ? 'Manager added' : 'Employee added');
  };

  const handlePromoteToManager = async (user: User) => {
    const updated = { ...user, role: 'manager' as const };
    await dbSet('users', updated);
    useStore.setState({ users: users.map(u => u.username === user.username ? updated : u) });
  };

  const handleDemoteToEmployee = async (user: User) => {
    const updated = { ...user, role: 'employee' as const };
    await dbSet('users', updated);
    useStore.setState({ users: users.map(u => u.username === user.username ? updated : u) });
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    const updated = { ...editUser, name: editName, mobile: editMobile, email: editEmail, specialty: editSpecialty };
    if (editUser.role === 'employee') updated.manager = editManager || undefined;
    if (editPassword) updated.password = await hashPassword(editPassword);
    await dbSet('users', updated);
    useStore.setState({ users: users.map(u => u.username === editUser.username ? updated : u) });
    setEditUser(null); setEditPassword('');
    alert('User updated');
  };

  const handleResetUsers = async () => {
    if (!confirm('This will reset ALL non-admin users. Continue?')) return;
    const nonAdmin = users.filter(u => u.role !== 'admin');
    for (const u of nonAdmin) {
      await dbDel('users', u.username);
    }
    const rawDefaults: User[] = [
      { id: uuid(), username: 'emp1', password: 'emp123', role: 'employee', name: 'Ravi Kumar', mobile: '9876543211', email: 'ravi@engineer.com', address: 'Delhi', specialty: 'Plumbing', status: 'offline' },
      { id: uuid(), username: 'emp2', password: 'emp123', role: 'employee', name: 'Sneha Sharma', mobile: '9876543212', email: 'sneha@engineer.com', address: 'Mumbai', specialty: 'Electrical', status: 'offline' },
      { id: uuid(), username: 'cust1', password: 'cust123', role: 'customer', name: 'Amit Singh', mobile: '9876543213', email: 'amit@email.com', address: 'Noida', specialty: '', status: 'offline' },
      { id: uuid(), username: 'cust2', password: 'cust123', role: 'customer', name: 'Priya Patel', mobile: '9876543214', email: 'priya@email.com', address: 'Delhi', specialty: '', status: 'offline' },
    ];
    const defaults = await Promise.all(rawDefaults.map(async u => ({ ...u, password: await hashPassword(u.password) })));
    for (const u of defaults) { await dbSet('users', u); }
    useStore.setState({ users: users.filter(u => u.role === 'admin').concat(defaults) });
    alert('Users reset to defaults');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={handleResetUsers} className="btn bg-red-500/20 text-red-400 border border-red-500/30 text-sm">{t('users.resetAll')}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">{t('users.employees').replace('{count}', String(employees.length))}</h2>
            <button onClick={() => downloadCSV('employees.csv', [['Username','Name','Specialty','Mobile','Status'], ...employees.map(e => [e.username, e.name, e.specialty, e.mobile, e.status])])} className="btn btn-secondary text-xs">{t('users.csv')}</button>
          </div>
          {isAdmin && (
            <div className="border-b border-white/10 pb-3 mb-3">
              <h3 className="text-xs font-medium text-[#94a3b8] mb-2">{t('users.addEmployee')}</h3>
              <div className="grid grid-cols-2 gap-2">
<input placeholder={t('auth.username')} value={newEmpUsername} onChange={e => setNewEmpUsername(e.target.value)} className="text-xs" />
                <input placeholder={t('users.name')} value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="text-xs" />
                <input placeholder={t('auth.password')} type="password" value={newEmpPassword} onChange={e => setNewEmpPassword(e.target.value)} className="text-xs" />
                <input placeholder={t('users.specialty')} value={newEmpSpecialty} onChange={e => setNewEmpSpecialty(e.target.value)} className="text-xs" />
                <input placeholder={t('users.mobile')} value={newEmpMobile} onChange={e => setNewEmpMobile(e.target.value)} className="text-xs" />
                {!newEmpIsManager && managers.length > 0 && (
                  <select value={newEmpManager} onChange={e => setNewEmpManager(e.target.value)} className="text-xs">
                    <option value="">{t('users.noManager')}</option>
                    {managers.map(m => <option key={m.username} value={m.username}>{m.name}</option>)}
                  </select>
                )}
                <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                  <input type="checkbox" checked={newEmpIsManager} onChange={e => setNewEmpIsManager(e.target.checked)} className="w-3.5 h-3.5" />
                  {t('users.asManager')}
                </label>
                <button onClick={handleAddEmployee} className="btn btn-primary text-xs">Add</button>
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {employees.map(e => (
              <div key={e.username} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${e.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{e.name}</p>
                  <p className="text-[#94a3b8] text-xs">@{e.username} &middot; {e.specialty} &middot; {e.mobile}{e.manager ? ` · ${t('users.reportsTo')} ${managers.find(m => m.username === e.manager)?.name || e.manager}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${e.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{e.status}</span>
                {can(userRole, 'users', 'write') && (
                  <button onClick={() => { setEditUser(e); setEditName(e.name); setEditMobile(e.mobile); setEditEmail(e.email); setEditSpecialty(e.specialty); setEditPassword(''); setEditManager(e.manager || ''); }} className="text-indigo-400 hover:text-indigo-300 text-xs">Edit</button>
                )}
                {isAdmin && (
                  <button onClick={() => handlePromoteToManager(e)} className="text-emerald-400 hover:text-emerald-300 text-xs">Promote</button>
                )}
              </div>
            ))}
            {employees.length === 0 && <p className="text-[#94a3b8] text-sm text-center py-6">{t('users.noEmployees')}</p>}
          </div>
        </div>
        <div className="space-y-4">
          {managers.length > 0 && (
            <div className="glass p-4">
              <h2 className="text-lg font-semibold text-white mb-3">{t('users.managers')} ({managers.length})</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {managers.map(m => (
                  <div key={m.username} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${m.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.name}</p>
                      <p className="text-[#94a3b8] text-xs">@{m.username} &middot; {m.specialty} &middot; {m.mobile}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">manager</span>
                    {isAdmin && (
                      <button onClick={() => handleDemoteToEmployee(m)} className="text-yellow-400 hover:text-yellow-300 text-xs">Demote</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">{t('users.customers').replace('{count}', String(customers.length))}</h2>
              <button onClick={() => downloadCSV('customers.csv', [['Username','Name','Mobile','Email'], ...customers.map(c => [c.username, c.name, c.mobile, c.email])])} className="btn btn-secondary text-xs">{t('users.csv')}</button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {customers.map(c => (
                <div key={c.username} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-[#94a3b8] text-xs">@{c.username} &middot; {c.mobile} &middot; {c.email}</p>
                  </div>
                  <button onClick={() => { setEditUser(c); setEditName(c.name); setEditMobile(c.mobile); setEditEmail(c.email); setEditSpecialty(''); setEditPassword(''); }} className="text-indigo-400 hover:text-indigo-300 text-xs">Edit</button>
                </div>
              ))}
              {customers.length === 0 && <p className="text-[#94a3b8] text-sm text-center py-6">{t('users.noCustomers')}</p>}
            </div>
          </div>
        </div>
      </div>
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditUser(null)}>
          <div className="glass p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">{t('users.editUser').replace('{role}', editUser.role).replace('{username}', editUser.username)}</h3>
            <div className="space-y-3">
<div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.name')}</label><input value={editName} onChange={e => setEditName(e.target.value)} /></div>
               <div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.mobile')}</label><input value={editMobile} onChange={e => setEditMobile(e.target.value)} /></div>
               <div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.email')}</label><input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
               {editUser.role === 'employee' && <div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.specialty')}</label><input value={editSpecialty} onChange={e => setEditSpecialty(e.target.value)} /></div>}
               {editUser.role === 'employee' && (
                 <div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.manager')}</label>
                   <select value={editManager} onChange={e => setEditManager(e.target.value)} className="w-full">
                     <option value="">{t('users.noManager')}</option>
                     {managers.map(m => <option key={m.username} value={m.username}>{m.name}</option>)}
                   </select>
                 </div>
               )}
               <div><label className="block text-xs text-[#94a3b8] mb-1">{t('users.newPassword')}</label><input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder={t('users.passwordPlaceholder')} /></div>
<div className="flex gap-2 mt-4">
                 <button onClick={handleEditUser} className="btn btn-primary flex-1">{t('users.save')}</button>
                 <button onClick={() => setEditUser(null)} className="btn bg-white/10 text-[#94a3b8] border border-white/10 flex-1">{t('users.cancel')}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
