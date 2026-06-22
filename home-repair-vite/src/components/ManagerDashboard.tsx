import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { set as dbSet } from '../lib/db';
import StatusBadge from './ui/StatusBadge';
import DocketTimeline from './ui/DocketTimeline';
import NotificationCenter from './ui/NotificationCenter';
import { uuid } from '../lib/utils';
import { CheckCircle, XCircle, Users, ClipboardList } from 'lucide-react';

export default function ManagerDashboard() {
  const currentUser = useStore(s => s.currentUser);
  const users = useStore(s => s.users);
  const dockets = useStore(s => s.dockets);
  const addNotification = useStore(s => s.addNotification);
  const addActivityLog = useStore(s => s.addActivityLog);
  const activityLogs = useStore(s => s.activityLogs);
  const [now] = useState(() => Date.now());
  const [timelineDocketId, setTimelineDocketId] = useState<string | null>(null);

  const team = useMemo(() =>
    users.filter(u => u.role === 'employee' && u.manager === currentUser?.username),
    [users, currentUser?.username]
  );

  const teamDockets = useMemo(() => {
    const teamUsernames = new Set(team.map(e => e.username));
    return dockets.filter(d => d.assignedTo && teamUsernames.has(d.assignedTo));
  }, [dockets, team]);

  const pendingApproval = useMemo(() =>
    teamDockets.filter(d => d.status === 'completed' && d.amountReceived == null),
    [teamDockets]
  );

  const completed = useMemo(() =>
    teamDockets.filter(d => d.status === 'completed' && d.amountReceived != null),
    [teamDockets]
  );

  const teamPerf = useMemo(() =>
    team.map(emp => {
      const empDockets = dockets.filter(d => d.assignedTo === emp.username);
      const done = empDockets.filter(d => d.status === 'completed').length;
      return {
        name: emp.name,
        total: empDockets.length,
        completed: done,
        rate: empDockets.length ? Math.round((done / empDockets.length) * 100) : 0,
      };
    }).filter(e => e.total > 0),
    [team, dockets]
  );

  const handleApprove = async (docketId: string) => {
    const d = dockets.find(x => x.id === docketId);
    if (!d) return;
    const updated = { ...d, amountReceived: d.serviceFee || d.materialCosts || 0, isPaid: true, paymentMethod: 'approved', completedDate: new Date(now).toISOString() };
    await dbSet('dockets', updated);
    useStore.setState({ dockets: dockets.map(x => x.id === docketId ? updated : x) });
    addNotification({ id: uuid(), userId: d.assignedTo || '', title: 'Docket approved', body: `Your ${d.title} docket has been approved.`, type: 'success', tag: 'approval', read: false, time: new Date(now).toISOString(), createdAt: new Date(now).toISOString() });
    addActivityLog({ id: uuid(), docketId, action: 'completed', actor: currentUser?.username || '', detail: 'Approved by manager', timestamp: new Date(now).toISOString() });
  };

  const handleReject = async (docketId: string) => {
    const d = dockets.find(x => x.id === docketId);
    if (!d) return;
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    const updated = { ...d, status: 'assigned' as const, rejectionReason: reason };
    await dbSet('dockets', updated);
    useStore.setState({ dockets: dockets.map(x => x.id === docketId ? updated : x) });
    addNotification({ id: uuid(), userId: d.assignedTo || '', title: 'Docket needs revision', body: `Your ${d.title} docket was rejected: ${reason}`, type: 'warning', tag: 'revision', read: false, time: new Date(now).toISOString(), createdAt: new Date(now).toISOString() });
    addActivityLog({ id: uuid(), docketId, action: 'rejected', actor: currentUser?.username || '', detail: reason, timestamp: new Date(now).toISOString() });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="glass p-6 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t('manager.dashboardTitle')}</h1>
          <p className="text-[#94a3b8] text-sm mt-1">{t('manager.teamOverview').replace('{count}', String(team.length))}</p>
        </div>
        <NotificationCenter />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass p-4 text-center">
          <ClipboardList size={20} className="mx-auto mb-2 text-indigo-400" />
          <p className="text-2xl font-bold text-white">{teamDockets.length}</p>
          <p className="text-xs text-[#94a3b8]">{t('manager.teamDockets')}</p>
        </div>
        <div className="glass p-4 text-center">
          <CheckCircle size={20} className="mx-auto mb-2 text-yellow-400" />
          <p className="text-2xl font-bold text-yellow-400">{pendingApproval.length}</p>
          <p className="text-xs text-[#94a3b8]">{t('manager.pendingApproval')}</p>
        </div>
        <div className="glass p-4 text-center">
          <Users size={20} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-2xl font-bold text-emerald-400">{completed.length}</p>
          <p className="text-xs text-[#94a3b8]">{t('manager.approved')}</p>
        </div>
      </div>

      {pendingApproval.length > 0 && (
        <div className="glass p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-yellow-400" />
            {t('manager.pendingApproval')}
          </h2>
          <div className="space-y-3">
            {pendingApproval.map(d => (
              <div key={d.id} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-[#94a3b8]">{d.customer} &middot; {d.assignedTo}</p>
                  <p className="text-xs text-[#94a3b8]">Fee: ₹{d.serviceFee || 0} &middot; Materials: ₹{d.materialCosts || 0}</p>
                </div>
                <button onClick={() => handleApprove(d.id)} className="btn bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs flex items-center gap-1">
                  <CheckCircle size={14} /> {t('manager.approve')}
                </button>
                <button onClick={() => handleReject(d.id)} className="btn bg-red-500/20 text-red-400 border border-red-500/30 text-xs flex items-center gap-1">
                  <XCircle size={14} /> {t('manager.reject')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {teamPerf.length > 0 && (
        <div className="glass p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-400" />
            {t('manager.teamPerformance')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamPerf.map(emp => (
              <div key={emp.name} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="font-medium text-sm">{emp.name}</p>
                <div className="flex gap-4 mt-2 text-xs text-[#94a3b8]">
                  <span>{t('manager.jobs')}: {emp.total}</span>
                  <span>{t('manager.done')}: {emp.completed}</span>
                  <span>{t('manager.rate')}: {emp.rate}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${emp.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass p-4">
        <h2 className="text-lg font-semibold mb-4">{t('manager.allTeamDockets')}</h2>
        {teamDockets.length === 0 ? (
          <p className="text-[#94a3b8] text-sm text-center py-8">{t('manager.noDockets')}</p>
        ) : (
          <div className="space-y-2">
            {teamDockets.map(d => (
              <div key={d.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-[#94a3b8]">{d.customer} → {d.assignedTo} &middot; {d.date?.slice(0, 10)}</p>
                  </div>
                  <span className="text-xs text-[#94a3b8]">₹{d.amountReceived || d.serviceFee || 0}</span>
                  <button onClick={() => setTimelineDocketId(timelineDocketId === d.id ? null : d.id)} className="text-xs text-indigo-400 hover:text-indigo-300 ml-2">
                    {timelineDocketId === d.id ? 'Hide' : 'Timeline'}
                  </button>
                </div>
                {timelineDocketId === d.id && (
                  <div className="pt-3 mt-3 border-t border-white/10">
                    <DocketTimeline logs={activityLogs.filter(l => l.docketId === d.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}