import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, MessageSquare } from 'lucide-react'
import { useStore } from '../lib/store'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from './LanguageSelector'
import ConnectionStatus from './ConnectionStatus'
import ChatPanel from './chat/ChatPanel'
import CallModal from './ui/CallModal'
import { useReminders } from '../hooks/useReminders'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const currentUser = useStore((s) => s.currentUser)
  useReminders()
  const notifications = useStore((s) => s.notifications)
  const logout = useStore((s) => s.logout)
  const markAllRead = useStore((s) => s.markAllRead)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [notifOpen, setNotifOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <span className="font-bold text-lg bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
            Trust Home Services
          </span>
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />

          <div className="relative" ref={notifRef}>
            <button
              className="relative p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell size={20} className="text-[#94a3b8]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 glass w-80 max-h-96 overflow-y-auto z-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{t('common.notifications')}</span>
                  {unreadCount > 0 && (
                    <button className="text-xs text-primary-light hover:underline" onClick={markAllRead}>
                      {t('common.markAllRead')}
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#94a3b8] text-center py-4">{t('common.noNotifications')}</p>
                ) : (
                  notifications.map((n) => (
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

          <button onClick={() => setChatOpen(!chatOpen)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <MessageSquare size={20} className="text-[#94a3b8]" />
          </button>

          <span className="text-sm text-[#94a3b8] hidden sm:block">
            <User className="w-3.5 h-3.5 inline mr-1" />
            {currentUser?.name || currentUser?.username} ({currentUser?.role})
          </span>

          <button onClick={handleLogout} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#94a3b8] flex items-center gap-1">
            <LogOut size={16} />
            {t('logout', 'Logout')}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">{children}</main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <CallModal />
    </div>
  )
}
