import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { useMemo, useState } from 'react';
import { getRecommendations, getSmartScheduling } from '../../lib/recommendations';

const PIE_COLORS = ['#4f46e5', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#a78bfa', '#2dd4bf'];

function linearRegression(values: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0]?.y ?? 0 };
  const sumX = values.reduce((s, v) => s + v.x, 0);
  const sumY = values.reduce((s, v) => s + v.y, 0);
  const sumXY = values.reduce((s, v) => s + v.x * v.y, 0);
  const sumX2 = values.reduce((s, v) => s + v.x * v.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function getHourFromDate(dateStr: string): number {
  try { return new Date(dateStr).getHours(); } catch { return 0; }
}

export default function AnalyticsTab() {
  const dockets = useStore((s) => s.dockets);
  const users = useStore((s) => s.users);
  const attendance = useStore((s) => s.attendance);

  const employees = users.filter(u => u.role === 'employee');
  const customers = users.filter(u => u.role === 'customer');

  const pendingDocketCount = dockets.filter(d => d.status === 'pending').length;
  const completedDocketCount = dockets.filter(d => d.status === 'completed').length;
  const totalRevenue = dockets.reduce((sum, d) => sum + (d.amountReceived || 0), 0);

  const barData = [
    { name: 'Pending', count: pendingDocketCount },
    { name: 'Assigned', count: dockets.filter(d => d.status === 'assigned').length },
    { name: 'Completed', count: completedDocketCount },
    { name: 'Rejected', count: dockets.filter(d => d.status === 'rejected').length },
  ];

  const revenueByEmployee: Record<string, number> = {};
  dockets.filter(d => d.status === 'completed' && d.assignedTo).forEach(d => {
    const key = d.assignedTo || 'Unassigned';
    revenueByEmployee[key] = (revenueByEmployee[key] || 0) + (d.amountReceived || 0);
  });
  const pieData = Object.entries(revenueByEmployee).map(([name, value]) => ({ name, value }));

  const employeePerformance = employees.map(emp => {
    const empDockets = dockets.filter(d => d.assignedTo === emp.username);
    const completed = empDockets.filter(d => d.status === 'completed').length;
    return {
      name: emp.name,
      total: empDockets.length,
      completed,
      rate: empDockets.length ? Math.round((completed / empDockets.length) * 100) : 0,
    };
  }).filter(e => e.total > 0);

  const revenueTrend: { month: string; revenue: number }[] = useMemo(() => {
    const byMonth: Record<string, number> = {};
    dockets.filter(d => (d.amountReceived || 0) > 0).forEach(d => {
      const key = (d.completedDate || d.date || d.createdAt || new Date().toISOString()).slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + (d.amountReceived || 0);
    });
    return Object.entries(byMonth).sort().map(([month, revenue]) => ({ month, revenue }));
  }, [dockets]);

  const forecastData = useMemo(() => {
    if (revenueTrend.length < 2) return null;
    const points = revenueTrend.map((r, i) => ({ x: i, y: r.revenue }));
    const { slope, intercept } = linearRegression(points);
    const nextMonthIdx = revenueTrend.length;
    const forecast = Math.max(0, Math.round(intercept + slope * nextMonthIdx));
    const lastMonth = revenueTrend[revenueTrend.length - 1].month;
    const [y, m] = lastMonth.split('-').map(Number);
    const nextLabel = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return { forecast, nextLabel, slope, rSquared: 0 };
  }, [revenueTrend]);

  const [now] = useState(() => Date.now());
  const atRiskCustomers = useMemo(() => {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const customerLastBooking: Record<string, { lastDate: string; count: number }> = {};
    dockets.filter(d => d.customer).forEach(d => {
      const dt = d.completedDate || d.date || d.createdAt || new Date().toISOString();
      if (!customerLastBooking[d.customer] || dt > customerLastBooking[d.customer].lastDate) {
        customerLastBooking[d.customer] = { lastDate: dt, count: (customerLastBooking[d.customer]?.count || 0) + 1 };
      } else {
        customerLastBooking[d.customer].count += 1;
      }
    });
    return Object.entries(customerLastBooking)
      .filter(([, v]) => v.count >= 1 && (now - new Date(v.lastDate).getTime()) > THIRTY_DAYS)
      .map(([customer, v]) => {
        const user = customers.find(u => u.username === customer);
        return { name: user?.name || customer, lastDate: v.lastDate, daysAgo: Math.floor((now - new Date(v.lastDate).getTime()) / (24 * 60 * 60 * 1000)) };
      })
      .sort((a, b) => b.daysAgo - a.daysAgo);
  }, [dockets, customers, now]);

  const peakHours = useMemo(() => {
    const byHour: Record<number, number> = {};
    dockets.forEach(d => {
      const hour = getHourFromDate(d.date || d.createdAt || new Date().toISOString());
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: byHour[h] || 0 }));
  }, [dockets]);

  const employeeUtilization = (() => {
    const uniqueDays = new Set(dockets.map(d => (d.date || d.createdAt || new Date().toISOString()).slice(0, 10)));
    const totalWorkDays = uniqueDays.size || 1;
    return employees.map(emp => {
      const empDays = new Set(
        attendance
          .filter(a => a.user_id === emp.username)
          .map(a => a.created_at.slice(0, 10))
      );
      const presentDays = empDays.size;
      return {
        name: emp.name,
        presentDays,
        totalDays: totalWorkDays,
        rate: Math.min(100, Math.round((presentDays / totalWorkDays) * 100)),
      } as const;
    }).filter(e => e.presentDays > 0);
  })();

  const servicePopularity: { name: string; count: number }[] = useMemo(() => {
    const byService: Record<string, number> = {};
    dockets.forEach(d => {
      const key = d.title || 'Other';
      byService[key] = (byService[key] || 0) + 1;
    });
    return Object.entries(byService)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [dockets]);

  const recs = getRecommendations(dockets);
  const tips = getSmartScheduling(dockets);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('analytics.totalDockets'), value: dockets.length, color: 'text-blue-400' },
          { label: t('analytics.pending'), value: pendingDocketCount, color: 'text-yellow-400' },
          { label: t('analytics.completed'), value: completedDocketCount, color: 'text-green-400' },
          { label: t('analytics.revenue'), value: `₹${totalRevenue}`, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="glass p-4 text-center">
            <p className="text-[#94a3b8] text-xs mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.revenueTrend')}</h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
                <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-[#94a3b8] text-sm text-center py-12">No revenue data</p>}
          {forecastData && (
            <div className="mt-3 flex items-center justify-between text-xs px-2">
              <span className="text-[#94a3b8]">{t('analytics.forecastNext')} ({forecastData.nextLabel})</span>
              <span className="text-emerald-400 font-bold text-base">₹{forecastData.forecast.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.servicePopularity')}</h3>
          {servicePopularity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicePopularity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
               <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
             </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-[#94a3b8] text-sm text-center py-12">{t('analytics.noData')}</p>}
        </div>

        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.docketStatus')}</h3>
          {barData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
               <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
             </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-[#94a3b8] text-sm text-center py-12">{t('analytics.noData')}</p>}
        </div>

        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.revenueByEmployee')}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ₹${value}`}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                 <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
               </PieChart>
             </ResponsiveContainer>
           ) : <p className="text-[#94a3b8] text-sm text-center py-12">{t('analytics.noRevenue')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            {t('analytics.peakHours')}
            <span className="text-[10px] text-[#94a3b8] font-normal">({t('analytics.peakHoursSub')})</span>
          </h3>
          {peakHours.some(h => h.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={2} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f8fafc' }} />
                <Bar dataKey="count" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-[#94a3b8] text-sm text-center py-8">{t('analytics.noData')}</p>}
        </div>

        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.employeeUtilization')}</h3>
          {employeeUtilization.length > 0 ? (
            <div className="space-y-3">
              {employeeUtilization.map(emp => (
                <div key={emp.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">{emp.name}</span>
                    <span className="text-[#94a3b8]">{emp.presentDays}/{emp.totalDays}d ({emp.rate}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${emp.rate}%`,
                      background: emp.rate > 75 ? 'linear-gradient(90deg, #34d399, #10b981)' :
                                   emp.rate > 50 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' :
                                                   'linear-gradient(90deg, #f87171, #ef4444)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[#94a3b8] text-sm text-center py-8">{t('analytics.noData')}</p>}
        </div>
      </div>

      {atRiskCustomers.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            {t('analytics.churnRisk')}
            <span className="text-[#f87171] text-xs font-normal">({atRiskCustomers.length} {t('analytics.atRisk')})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#94a3b8] text-xs border-b border-white/10">
                  <th className="text-left py-2 pr-4">{t('analytics.customer')}</th>
                  <th className="text-left py-2 pr-4">{t('analytics.lastBooking')}</th>
                  <th className="text-right py-2">{t('analytics.daysInactive')}</th>
                </tr>
              </thead>
              <tbody>
                {atRiskCustomers.slice(0, 10).map(c => (
                  <tr key={c.name} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4 text-[#94a3b8]">{c.lastDate.slice(0, 10)}</td>
                    <td className="py-2 text-right text-[#f87171]">{c.daysAgo}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {employeePerformance.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.employeePerformance')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employeePerformance.map(emp => (
              <div key={emp.name} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="font-medium text-sm">{emp.name}</p>
                <div className="flex gap-4 mt-2 text-xs text-[#94a3b8]">
                  <span>Jobs: {emp.total}</span>
                  <span>Done: {emp.completed}</span>
                  <span>Rate: {emp.rate}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${emp.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.aiRecommendations')}</h3>
          <div className="grid grid-cols-1 gap-2">
            {recs.map((r, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{r.reason}</p>
                </div>
                <span className="text-sm text-emerald-400 font-medium whitespace-nowrap ml-4">₹{r.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-sm font-medium text-white mb-4">{t('analytics.schedulingInsights')}</h3>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-[#94a3b8] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
