import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import {
  LayoutDashboard, Users, Building2, CalendarCheck, ClipboardCheck,
  Wallet, Briefcase, UserCheck, TrendingUp, GraduationCap, UserCircle,
  Bell, ChevronDown, LogOut, Menu, MessageCircle, Briefcase as BriefcaseIcon,
  X
} from 'lucide-react'
import { ThemeToggle } from './components/shared/ThemeToggle'
import { LanguageSwitcher } from './components/shared/LanguageSwitcher'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { api } from './lib/api'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/employees': 'Employees',
    '/departments': 'Departments',
    '/leave': 'Leave Management',
    '/attendance': 'Attendance',
    '/payroll': 'Payroll',
    '/recruitment': 'Recruitment',
    '/candidates': 'Candidates',
    '/performance': 'Performance',
    '/learning': 'Learning',
    '/profile': 'Profile',
  }
  const base = '/' + pathname.split('/')[1]
  return map[base] || 'HRMS'
}

function SharedLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  const title = getPageTitle(location.pathname)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications()
      setNotifications(data || [])
      setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: number) => {
    try {
      await api.markNotificationRead(id)
      fetchNotifications()
    } catch { /* ignore */ }
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Employees', path: '/employees' },
    { icon: Building2, label: 'Departments', path: '/departments' },
    { icon: CalendarCheck, label: 'Leave', path: '/leave' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: Wallet, label: 'Payroll', path: '/payroll' },
    { icon: Briefcase, label: 'Recruitment', path: '/recruitment' },
    { icon: UserCheck, label: 'Candidates', path: '/candidates' },
    { icon: TrendingUp, label: 'Performance', path: '/performance' },
    { icon: GraduationCap, label: 'Learning', path: '/learning' },
    { icon: MessageCircle, label: 'Jinie', path: '/chatbot' },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <BriefcaseIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">HRMS</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path) ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}`}
              >
                <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-100 dark:border-gray-700 p-4">
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${isActive('/profile') ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <UserCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              Profile
            </Link>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">No notifications</p>
                  ) : (
                    notifications.map((n: any) => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                  {user?.first_name} {user?.last_name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2">
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setUserMenuOpen(false)}>
                    <UserCircle className="w-4 h-4" /> Profile
                  </Link>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ErrorBoundary>
            <Routes>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/new" element={<EmployeeForm />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="employees/:id/edit" element={<EmployeeForm />} />
              <Route path="departments" element={<Departments />} />
              <Route path="leave" element={<Leave />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="recruitment" element={<Recruitment />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="performance" element={<Performance />} />
              <Route path="learning" element={<Learning />} />
              <Route path="profile" element={<Profile />} />
              <Route path="chatbot" element={<Chatbot />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/employee-login" element={<EmployeeLoginPage />} />
        <Route path="/modules/*" element={<ModulePage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <SharedLayout />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

function LandingPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Landing />
}

function LoginPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Login />
}

function EmployeeLoginPage() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <EmployeeLogin />
}

import Landing from './pages/Landing'
import Login from './pages/Login'
import EmployeeLogin from './pages/EmployeeLogin'
import ModulePage from './pages/ModulePage'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeForm from './pages/EmployeeForm'
import EmployeeDetail from './pages/EmployeeDetail'
import Departments from './pages/Departments'
import Leave from './pages/Leave'
import Attendance from './pages/Attendance'
import Payroll from './pages/Payroll'
import Recruitment from './pages/Recruitment'
import Candidates from './pages/Candidates'
import Performance from './pages/Performance'
import Learning from './pages/Learning'
import Profile from './pages/Profile'
import Chatbot from './pages/Chatbot'
