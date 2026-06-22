import { Component, lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import NotFound from './components/NotFound'
import { initGlobalErrorHandler } from './lib/logger'
import { initWebVitals } from './lib/monitor'
import CallScreen from './components/chat/CallScreen'

const PublicSite = lazy(() => import('./components/PublicSite'))
const LoginView = lazy(() => import('./components/LoginView'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'))
const CustomerDashboard = lazy(() => import('./components/CustomerDashboard'))
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'))

initGlobalErrorHandler()
initWebVitals()

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#94a3b8] text-sm">Loading…</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0b1120', color: '#f8fafc' }}>
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
            <p className="text-[#94a3b8] text-sm">An unexpected error occurred. Please try reloading.</p>
            <pre className="text-sm text-left bg-black/40 p-4 rounded-lg overflow-auto max-h-60 text-red-300 whitespace-pre-wrap">{this.state.error.stack || this.state.error.message}</pre>
            <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); window.location.reload() }}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppShell({ children }: { children: React.ReactNode }) {
  const background = useStore((s) => s.background)
  return (
    <div className="min-h-screen">
      {background?.src && (
        <>
          {background.type === 'video' ? (
            <video className="hero-bg" src={background.src} autoPlay muted loop playsInline />
          ) : background.type === 'color' ? (
            <div className="hero-bg" style={{ background: background.src }} />
          ) : (
            <img className="hero-bg" src={background.src} alt="" />
          )}
          <div className="hero-overlay" />
        </>
      )}
      {children}
      <CallScreen />
    </div>
  )
}

export default function App() {
  const currentUser = useStore((s) => s.currentUser)
  const bgOpacity = useStore((s) => s.bgOpacity)

  useEffect(() => {
    const store = useStore
    store.getState().init().catch(console.error)
    const savedLang = localStorage.getItem('lang') || 'en'
    store.getState().setLang(savedLang).catch(console.error)
    import('./lib/realtime').then(({ realtime }) => realtime.init()).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--hero-overlay-opacity', String(bgOpacity))
  }, [bgOpacity])

  return (
    <ErrorBoundary>
      <AppShell>
        <SuspenseWrapper>
          <Routes>
            <Route path="/" element={<ErrorBoundary><PublicSite /></ErrorBoundary>} />
            <Route path="/login" element={!currentUser ? <ErrorBoundary><LoginView /></ErrorBoundary> : <Navigate to={`/${currentUser.role === 'manager' ? 'manager' : currentUser.role}`} replace />} />
            <Route path="/admin" element={<ErrorBoundary><ProtectedRoute role="admin"><Layout><AdminDashboard /></Layout></ProtectedRoute></ErrorBoundary>} />
            <Route path="/manager" element={<ErrorBoundary><ProtectedRoute role="manager"><Layout><ManagerDashboard /></Layout></ProtectedRoute></ErrorBoundary>} />
            <Route path="/customer" element={<ErrorBoundary><ProtectedRoute role="customer"><Layout><CustomerDashboard /></Layout></ProtectedRoute></ErrorBoundary>} />
            <Route path="/employee" element={<ErrorBoundary><ProtectedRoute role="employee"><Layout><EmployeeDashboard /></Layout></ProtectedRoute></ErrorBoundary>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SuspenseWrapper>
      </AppShell>
    </ErrorBoundary>
  )
}
