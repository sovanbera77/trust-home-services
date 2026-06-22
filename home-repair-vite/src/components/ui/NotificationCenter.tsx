import { useState } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import type { Notification, AppStore } from '../../lib/types';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);

  const notifications = useStore((s: AppStore) => s.notifications);
  const currentUser = useStore((s: AppStore) => s.currentUser);
  const markAllRead = useStore((s: AppStore) => s.markAllRead);
  const addNotification = useStore((s: AppStore) => s.addNotification);

  const userNotifs = notifications
    .filter((n: Notification) => n.userId === currentUser?.username || n.userId === 'all')
    .sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unread = userNotifs.filter((n: Notification) => !n.read).length;

  function testNotification() {
    if (!currentUser) return;
    addNotification({
      id: `notif-${Date.now()}`,
      userId: currentUser.username,
      title: t('common.test') + ' Notification',
      body: 'This is a sample notification to verify the system.',
      type: 'info',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const typeColors: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="relative">
      <button
        className="relative btn btn-secondary !p-2"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 glass border border-white/10 rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium">{t('common.notifications')}</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1" onClick={markAllRead}>
                    <CheckCheck size={14} /> {t('common.markAllRead')}
                  </button>
                )}
                <button className="text-xs text-[#94a3b8] hover:text-white" onClick={testNotification}>
                  {t('common.test')}
                </button>
                <button className="text-[#94a3b8] hover:text-white" onClick={() => setOpen(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {userNotifs.length === 0 ? (
                <p className="text-[#94a3b8] text-sm text-center py-8">{t('common.noNotifications')}</p>
              ) : (
                userNotifs.map((n: Notification) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-indigo-500/5' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${typeColors[n.type] || typeColors.info}`}>
                        {n.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-[#64748b] mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
