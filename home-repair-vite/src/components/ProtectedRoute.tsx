import { Navigate } from 'react-router-dom'
import { useStore } from '../lib/store'

interface ProtectedRouteProps {
  role: 'admin' | 'manager' | 'employee' | 'customer' | ('admin' | 'manager' | 'employee' | 'customer')[]
  children: React.ReactNode
}

export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const currentUser = useStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  const roles = Array.isArray(role) ? role : [role]
  if (!roles.includes(currentUser.role as 'admin' | 'manager' | 'employee' | 'customer'))
    return <Navigate to={`/${currentUser.role === 'manager' ? 'admin' : currentUser.role}`} replace />
  return <>{children}</>
}