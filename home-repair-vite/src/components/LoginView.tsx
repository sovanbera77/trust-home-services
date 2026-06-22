import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { t } from '../lib/i18n'
import { useStore } from '../lib/store'
import { getAll } from '../lib/db'
import { loadAppConfig } from '../lib/otpService'
import OtpLoginFlow from './OtpLoginFlow'
import type { User } from '../lib/types'

export default function LoginView() {
  const login = useStore((s) => s.login)
  const signup = useStore((s) => s.signup)
  const [searchParams] = useSearchParams()

  const [tab, setTab] = useState<'login' | 'signup'>(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [role, setRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>(searchParams.get('mode') === 'signup' ? 'employee' : 'customer')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
const [error, setError] = useState('')
const [employeeList, setEmployeeList] = useState<User[]>([])
const [useOtp, setUseOtp] = useState(false)

  useEffect(() => { loadAppConfig() }, [])

  const displayUsername = role === 'admin' ? 'admin' : username;

  useEffect(() => {
    if (role === 'employee') {
      getAll<User>('users').then((all) => {
        setEmployeeList(all.filter((u) => u.role === 'employee'))
      })
    }
  }, [role])

  const handleSubmit = async () => {
    setError('')
    const loginUsername = role === 'admin' ? 'admin' : username
    if (tab === 'login') {
      if (!loginUsername || !password) {
        setError(t('auth.fillAllFields'))
        return
      }
      const ok = await login(loginUsername, password, role)
      if (!ok) setError(t('auth.invalidCredentials'))
    } else {
      if (!username || !password || !name || !mobile || !email || !address) {
        setError(t('auth.fillAllFields'))
        return
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        username,
        password,
        role: role,
        name,
        mobile,
        email,
        address,
        specialty: '',
        status: 'offline',
      }
      await signup(newUser)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="Trust Home Services" className="w-16 h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
            Trust Home Services
          </h1>
          <p className="text-sm text-[#94a3b8]">{t('auth.premiumManagement')}</p>
        </div>

        {/* Contact Info */}
        <div className="glass p-4 flex items-center justify-center gap-6 text-sm">
          <a href="https://wa.me/917501257731" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            +91-7501257731
          </a>
          <a href="mailto:sovan@engineer.com"
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
            sovan@engineer.com
          </a>
        </div>

        {/* Login / Signup Card */}
        <div className="glass w-full p-6">
          {useOtp ? (
            <>
              <OtpLoginFlow
                onBack={() => setUseOtp(false)}
                onComplete={(user) => {
                  if (user) {
                    useStore.setState({ currentUser: user })
                  }
                }}
              />
            </>
          ) : (
            <>
              <div className="flex mb-6 border border-white/10 rounded-lg overflow-hidden">
                <button
                  className={`flex-1 py-2 text-center font-semibold text-sm transition ${tab === 'login' ? 'bg-primary text-white' : 'text-[#94a3b8] hover:bg-white/5'}`}
                  onClick={() => setTab('login')}
                >
                  {t('auth.login')}
                </button>
                <button
                  className={`flex-1 py-2 text-center font-semibold text-sm transition ${tab === 'signup' ? 'bg-primary text-white' : 'text-[#94a3b8] hover:bg-white/5'}`}
                  onClick={() => { setTab('signup'); setError(''); setRole(searchParams.get('mode') === 'signup' ? 'employee' : 'customer') }}
                >
                  {t('auth.signup')}
                </button>
              </div>

              <div className="space-y-3">
                {(tab === 'login') && (
                  <div>
                    <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.selectRole')}</label>
                    <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'employee' | 'customer')}>
                      <option value="admin">{t('auth.admin')}</option>
                      <option value="manager">{t('auth.manager')}</option>
                      <option value="employee">{t('auth.employee')}</option>
                      <option value="customer">{t('auth.customer')}</option>
                    </select>
                  </div>
                )}

                {role === 'employee' && tab === 'login' ? (
                  <div>
                    <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.username')}</label>
                    <select value={username} onChange={(e) => setUsername(e.target.value)}>
                      <option value="">{t('auth.selectEmployee')}</option>
                      {employeeList.map((emp) => (
                        <option key={emp.username} value={emp.username}>
                          {emp.name} ({emp.username})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.username')}</label>
                    <input
                      value={displayUsername}
                      onChange={(e) => { if (role !== 'admin') setUsername(e.target.value); }}
                      readOnly={role === 'admin'}
                      placeholder={role === 'admin' ? 'admin' : t('auth.enterUsername')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={role === 'admin' ? t('auth.adminPassword') : t('auth.enterPassword')}
                  />
                </div>

                {tab === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.name')}</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.enterFullName')} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.address')}</label>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('auth.enterAddress')} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.mobile')}</label>
                      <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('auth.enterMobile')} />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">{t('auth.email')}</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.enterEmail')} />
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button className="btn btn-primary w-full" onClick={handleSubmit}>
                  {tab === 'login' ? t('auth.login') : t('auth.signup')}
                </button>
              </div>
            </>
          )}

          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <button
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              onClick={() => setUseOtp(!useOtp)}
            >
              {useOtp ? t('auth.passwordLogin') : t('auth.otpLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
