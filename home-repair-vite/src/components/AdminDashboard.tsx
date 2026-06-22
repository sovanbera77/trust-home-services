import { lazy, Suspense, useState, useMemo } from 'react';
import { Upload } from 'lucide-react';
import NotificationCenter from './ui/NotificationCenter';
import { publishConfig } from '../lib/siteConfig';
import { useStore } from '../lib/store';
import { t } from '../lib/i18n';
import { can } from '../lib/permissions';

const DocketsTab = lazy(() => import('./admin/DocketsTab'));
const UsersTab = lazy(() => import('./admin/UsersTab'));
const InventoryTab = lazy(() => import('./admin/InventoryTab'));
const ComplaintsTab = lazy(() => import('./admin/ComplaintsTab'));
const AttendanceTab = lazy(() => import('./admin/AttendanceTab'));
const AnalyticsTab = lazy(() => import('./admin/AnalyticsTab'));
const BackgroundTab = lazy(() => import('./admin/BackgroundTab'));
const SettingsTab = lazy(() => import('./admin/SettingsTab'));
const AdminSubs = lazy(() => import('./SubscriptionsTab').then(m => ({ default: m.AdminSubscriptionsTab })));
const LiveTrackingTab = lazy(() => import('./admin/LiveTrackingTab'));

const ALL_TABS = [
  { key: 'Dockets', resource: 'dockets' as const },
  { key: 'Users', resource: 'users' as const },
  { key: 'Inventory', resource: 'inventory' as const },
  { key: 'Complaints', resource: 'complaints' as const },
  { key: 'Attendance', resource: 'dockets' as const },
  { key: 'Tracking', resource: 'dockets' as const },
  { key: 'Analytics', resource: 'analytics' as const },
  { key: 'Plans', resource: 'plans' as const },
  { key: 'Background', resource: 'background' as const },
  { key: 'Settings', resource: 'settings' as const },
];

function TabLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dockets');
  const [publishing, setPublishing] = useState(false);
  const [pubMsg, setPubMsg] = useState('');
  const subscriptionPlans = useStore((s) => s.subscriptionPlans);
  const background = useStore((s) => s.background);
  const bgOpacity = useStore((s) => s.bgOpacity);
  const currentUser = useStore((s) => s.currentUser);
  const userRole = currentUser?.role || '';

  const tabs = useMemo(() =>
    ALL_TABS.filter(t => can(userRole, t.resource, 'read')).map(t => t.key),
    [userRole]
  );

  const currentTab = tabs.includes(activeTab) ? activeTab : (tabs[0] || 'Dockets');

  const handlePublish = async () => {
    setPublishing(true);
    setPubMsg('');
    try {
      const token = prompt('Enter GitHub token to publish changes:');
      if (!token) { setPublishing(false); return; }
      await publishConfig(token, subscriptionPlans, background, bgOpacity);
      setPubMsg(t('admin.published'));
    } catch (e) {
      setPubMsg(t('admin.publishFailed') + ': ' + (e instanceof Error ? e.message : 'unknown error'));
    }
    setPublishing(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="glass p-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">{t('admin.dashboardTitle')}</h1>
          <p className="text-[#94a3b8] text-sm">{t('dashboard.subtitle.admin')}</p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'admin' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn btn-primary text-xs"
            >
              <Upload size={14} className="mr-1" />
              {publishing ? t('admin.publishing') : t('admin.publish')}
            </button>
          )}
          <NotificationCenter />
        </div>
      </div>
      {pubMsg && (
        <div className={`text-sm mb-4 px-4 py-2 rounded-lg ${pubMsg.includes('failed') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {pubMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === tab
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/5 text-[#94a3b8] border border-white/10 hover:bg-white/10'
            }`}
          >
{t('admin.tab.' + tab.toLowerCase())}
          </button>
        ))}
      </div>

      <TabLoader>
        {currentTab === 'Dockets' && <DocketsTab />}
        {currentTab === 'Users' && <UsersTab />}
        {currentTab === 'Inventory' && <InventoryTab />}
        {currentTab === 'Complaints' && <ComplaintsTab />}
        {currentTab === 'Attendance' && <AttendanceTab />}
        {currentTab === 'Tracking' && <LiveTrackingTab />}
        {currentTab === 'Analytics' && <AnalyticsTab />}
        {currentTab === 'Plans' && <AdminSubs />}
        {currentTab === 'Background' && <BackgroundTab />}
        {currentTab === 'Settings' && <SettingsTab />}
      </TabLoader>
    </div>
  );
}
