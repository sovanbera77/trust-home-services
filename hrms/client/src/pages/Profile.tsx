import { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, MapPin, Shield, Briefcase, Building2, Lock, Save, Edit3, Key, ChevronRight, Fingerprint, Globe, Heart, Droplets, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { FormSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

type Tab = 'personal' | 'employment' | 'account'

interface LeaveBalance {
  id: number
  leave_type_name: string
  total_days: number
  used_days: number
  remaining_days: number
}

const roleVariant: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  super_admin: 'danger',
  admin: 'danger',
  hr_manager: 'info',
  manager: 'warning',
  employee: 'success',
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return 'N/A'
  }
}

function formatEmploymentType(type: string | null | undefined) {
  if (!type) return 'N/A'
  return type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Profile() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    blood_group: '',
    nationality: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [me, balances] = await Promise.all([
          api.getMe(),
          api.getLeaveBalances(),
        ])
        setProfile(me)
        setLeaveBalances(Array.isArray(balances) ? balances : [])
        setEditForm({
          first_name: me.first_name || '',
          last_name: me.last_name || '',
          phone: me.phone || '',
          address: me.address || '',
          date_of_birth: me.date_of_birth ? me.date_of_birth.split('T')[0] : '',
          gender: me.gender || '',
          marital_status: me.marital_status || '',
          blood_group: me.blood_group || '',
          nationality: me.nationality || '',
        })
      } catch (err: any) {
        addToast('error', err.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated: Record<string, any> = await api.put('/auth/me', editForm)
      setProfile((prev: any) => ({ ...(prev || {}), ...(updated || {}) }))
      localStorage.setItem('hrms_user', JSON.stringify({ ...(user || {}), ...(updated || {}) }))
      addToast('success', 'Profile updated successfully')
      setEditModalOpen(false)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      addToast('error', 'New passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 6) {
      addToast('error', 'Password must be at least 6 characters')
      return
    }
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      addToast('success', 'Password changed successfully')
    } catch (err: any) {
      addToast('error', err.message || 'Failed to change password')
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="My Profile" subtitle="Manage your personal information" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <FormSkeleton fields={4} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <FormSkeleton fields={6} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const p = profile || user
  const initials = `${p?.first_name?.[0] || ''}${p?.last_name?.[0] || ''}`.toUpperCase()

  const personalFields = [
    { label: 'Phone', value: p?.phone, icon: Phone },
    { label: 'Email', value: p?.email, icon: Mail },
    { label: 'Date of Birth', value: formatDate(p?.date_of_birth), icon: Calendar },
    { label: 'Gender', value: p?.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'N/A', icon: Heart },
    { label: 'Marital Status', value: p?.marital_status || 'N/A', icon: Users },
    { label: 'Blood Group', value: p?.blood_group || 'N/A', icon: Droplets },
    { label: 'Nationality', value: p?.nationality || 'N/A', icon: Globe },
    { label: 'Address', value: p?.address || 'N/A', icon: MapPin },
  ]

  const employmentFields = [
    { label: 'Employee Code', value: p?.employee_code || 'N/A', icon: Fingerprint },
    { label: 'Department', value: p?.department_name || 'N/A', icon: Building2 },
    { label: 'Designation', value: p?.designation_name || 'N/A', icon: Briefcase },
    { label: 'Manager', value: p?.manager_name || 'N/A', icon: User },
    { label: 'Date of Joining', value: formatDate(p?.date_of_joining), icon: Calendar },
    { label: 'Employment Type', value: formatEmploymentType(p?.employment_type), icon: Briefcase },
    { label: 'Work Location', value: p?.work_location || 'N/A', icon: MapPin },
    { label: 'Status', value: p?.status === 'active' ? 'Active' : p?.is_active ? 'Active' : 'Inactive', icon: Shield },
  ]

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'employment', label: 'Employment', icon: Briefcase },
    { key: 'account', label: 'Account Settings', icon: Lock },
  ]

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information and settings"
        actions={
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card & Leave Balances */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-primary-700 dark:text-primary-400">
                  {initials || '?'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {p?.first_name} {p?.last_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{p?.email}</p>
              <div className="mt-3">
                <Badge variant={roleVariant[p?.role] || 'default'}>
                  {p?.role?.replace(/_/g, ' ') || 'Employee'}
                </Badge>
              </div>
              <div className="w-full border-t border-gray-100 dark:border-gray-700 mt-5 pt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">{p?.department_name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">{p?.designation_name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Fingerprint className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-300">{p?.employee_code || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balances */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              Leave Balances
            </h3>
            {leaveBalances.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No leave data available</p>
            ) : (
              <div className="space-y-3">
                {leaveBalances.map((lb) => (
                  <div key={lb.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{lb.leave_type_name}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{lb.remaining_days} / {lb.total_days} days</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-500 dark:bg-primary-400 transition-all"
                        style={{ width: `${lb.total_days > 0 ? (lb.remaining_days / lb.total_days) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-100 dark:border-gray-700">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'personal' && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {personalFields.map((field) => (
                      <InfoItem
                        key={field.label}
                        label={field.label}
                        value={field.value}
                        icon={<field.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'employment' && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {employmentFields.map((field) => (
                      <InfoItem
                        key={field.label}
                        label={field.label}
                        value={field.value}
                        icon={<field.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Account Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Update your password and security settings</p>

                  <div className="max-w-md">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                        <input
                          type="password"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                          value={passwordForm.current_password}
                          onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                          <input
                            type="password"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                            value={passwordForm.new_password}
                            onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                          <input
                            type="password"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                            value={passwordForm.confirm_password}
                            onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          Change Password
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Profile" wide>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.first_name}
                onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.last_name}
                onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.date_of_birth}
                onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.gender}
                onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marital Status</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.marital_status}
                onChange={e => setEditForm({ ...editForm, marital_status: e.target.value })}
              >
                <option value="">Select Status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Blood Group</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.blood_group}
                onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nationality</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
                value={editForm.nationality}
                onChange={e => setEditForm({ ...editForm, nationality: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
            <textarea
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors resize-none"
              value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 mt-0.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
