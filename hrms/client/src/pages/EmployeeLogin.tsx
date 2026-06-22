import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Users, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'

export default function EmployeeLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string) => {
    setEmail(email)
    setPassword('admin123')
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Employee Portal</span>
          </Link>

          <h2 className="text-3xl font-bold text-gray-900 mb-1">Employee Login</h2>
          <p className="text-gray-500 mb-8">Sign in with your employee credentials</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-xs text-emerald-600 font-medium mb-2">Demo Employee Accounts (all use password: <code className="bg-emerald-100 px-1 rounded">admin123</code>):</p>
            <div className="space-y-1.5">
              <button onClick={() => fillDemo('employee1@hrms.com')} className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer bg-transparent border-none p-0 hover:underline">
                employee1@hrms.com — Amit Kumar (Engineering)
              </button>
              <button onClick={() => fillDemo('employee2@hrms.com')} className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer bg-transparent border-none p-0 hover:underline">
                employee2@hrms.com — Sneha Patel (Engineering)
              </button>
              <button onClick={() => fillDemo('employee3@hrms.com')} className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer bg-transparent border-none p-0 hover:underline">
                employee3@hrms.com — Vikram Singh (Marketing)
              </button>
              <button onClick={() => fillDemo('employee4@hrms.com')} className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer bg-transparent border-none p-0 hover:underline">
                employee4@hrms.com — Neha Gupta (Finance)
              </button>
              <button onClick={() => fillDemo('employee5@hrms.com')} className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer bg-transparent border-none p-0 hover:underline">
                employee5@hrms.com — Rajesh Khanna (Sales)
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Admin Login
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-white/10 rounded-full" />
        </div>
        <div className="relative text-center max-w-md">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Employee Self-Service</h2>
          <p className="text-emerald-200 text-lg leading-relaxed">
            Access your payslips, apply for leave, track attendance, and manage your profile — all in one place.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-emerald-200 text-sm">Access</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">Self</p>
              <p className="text-emerald-200 text-sm">Service</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">Secure</p>
              <p className="text-emerald-200 text-sm">Portal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
