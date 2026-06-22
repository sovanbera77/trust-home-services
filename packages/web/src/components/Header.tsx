'use client';

import { Bell, LogOut, User, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useLanguage, LANGUAGES, t } from '@/lib/i18n';

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [lang, setLang] = useLanguage();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const n = await api.getNotifications();
        setNotifications(n);
        setUnread(n.filter((x: any) => !x.read).length);
      } catch {}
    };
    load();

    // Socket.IO real-time connection
    const token = localStorage.getItem('token');
    if (token) {
      const s = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001', {
        auth: { token }
      });
      s.on('notification', (notif: any) => {
        setNotifications(prev => [notif, ...prev]);
        setUnread(prev => prev + 1);
      });
      s.on('connect_error', () => {});
      socketRef.current = s;
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  const handleMarkAllRead = async () => {
    await api.markAllRead();
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-white/10 bg-[rgba(30,41,59,0.7)] backdrop-blur-md">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="h-9 w-9 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <span className="text-xl font-bold bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
          Trust Home Services
        </span>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <Bell className="w-5 h-5 text-[#94a3b8]" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 w-80 glass p-3 z-50 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button onClick={handleMarkAllRead} className="text-xs text-primary-light hover:underline">Mark all read</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#94a3b8] text-center py-4">No notifications</p>
                ) : (
                  notifications.slice(0, 20).map((n: any) => (
                    <div key={n.id} className={`text-sm py-2 border-b border-white/5 last:border-0 ${n.read ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                        <span className="font-medium">{n.title}</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-0.5">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowLang(!showLang)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <Globe className="w-5 h-5 text-[#94a3b8]" />
            </button>
            {showLang && (
              <div className="absolute right-0 top-10 glass p-2 z-50 min-w-[120px]">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded ${lang === l.code ? 'bg-primary text-white' : 'text-[#94a3b8] hover:bg-white/5'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm text-[#94a3b8] hidden sm:block">
            <User className="w-3.5 h-3.5 inline mr-1" />
            {user.name || user.username} ({user.role})
          </span>
          <button onClick={onLogout} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#94a3b8]">
            <LogOut className="w-4 h-4 inline mr-1" />
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
