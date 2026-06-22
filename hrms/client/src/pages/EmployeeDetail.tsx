import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Mail, Phone, Calendar, MapPin,
  Briefcase, Building2, User, Cake, Globe, Users,
  Clock, CreditCard, Banknote, CheckCircle, XCircle,
  AlertTriangle, FileText, ChevronRight, Shield,
  Droplets
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { FormSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface Employee {
  id: number
  employee_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  gender: string
  date_of_birth: string
  marital_status: string
  blood_group: string
  nationality: string
  department_name: string
  designation_name: string
  manager_name: string
  date_of_joining: string
  employment_type: string
  work_location: string
  base_salary: number
  bank_name: string
  account_number: string
  ifsc_code: string
  pan_number: string
  uan_number: string
  pf_number: string
  esi_number: string
  role: string
  status: string
  documents: Document[]
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
}

interface Document {
  id: number
  name: string
  file_url: string
  uploaded_at: string
}

interface LeaveBalance {
  id: number
  leave_type_name: string
  total_days: number
  used_days: number
  remaining_days: number
}

interface LeaveRequest {
  id: number
  employee_name: string
  employee_id: number
  leave_type_name: string
  start_date: string
  end_date: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  reason: string
}

interface Attendance {
  id: number
  date: string
  clock_in: string
  clock_out: string
  status: string
}

interface PayrollItem {
  id: number
  period_name: string
  gross_pay: number
  deductions: number
  net_pay: number
  status: string
}

type Tab = 'profile' | 'employment' | 'leave' | 'attendance' | 'payroll'

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'employment', label: 'Employment', icon: Briefcase },
  { key: 'leave', label: 'Leave', icon: Calendar },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'payroll', label: 'Payroll', icon: CreditCard },
]

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
        {icon}
        {value}
      </p>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchEmployee = async () => {
      try {
        const data = await api.getEmployee(Number(id))
        setEmployee(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load employee data')
      } finally {
        setLoading(false)
      }
    }
    fetchEmployee()
  }, [id])

  useEffect(() => {
    if (!employee || !id) return
    const fetchTabData = async () => {
      setTabLoading(true)
      try {
        const params = `employee_id=${id}`

        if (activeTab === 'leave') {
          const [balances, requests] = await Promise.all([
            api.getLeaveBalances(Number(id)),
            api.getLeaveRequests(params),
          ])
          setLeaveBalances(balances)
          setLeaveRequests(requests)
        } else if (activeTab === 'attendance') {
          const data = await api.getAttendance(params)
          setAttendance(data)
        } else if (activeTab === 'payroll') {
          const data = await api.getPayrollItems(params)
          setPayrollItems(data)
        }
      } catch {
        // silently handle - some tab data may not be available
      } finally {
        setTabLoading(false)
      }
    }
    fetchTabData()
  }, [activeTab, employee, id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <FormSkeleton fields={4} />
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error loading employee</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error || 'Employee not found'}</p>
          <button
            onClick={() => navigate('/employees')}
            className="text-primary-600 dark:text-primary-400 text-sm font-medium mt-4 inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </button>
        </div>
      </div>
    )
  }

  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase()

  const statusVariant = employee.status === 'active' ? 'success' : 'default'

  return (
    <div>
      <PageHeader
        title="Employee Profile"
        subtitle={`${employee.first_name} ${employee.last_name}`}
        actions={
          <button
            onClick={() => navigate(`/employees/${employee.id}/edit`)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {initials || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {employee.first_name} {employee.last_name}
              </h2>
              <Badge variant={statusVariant} size="sm">
                {employee.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5">{employee.designation_name || 'No Designation'}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {employee.department_name || 'N/A'}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {employee.employee_code}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {employee.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {tabLoading && activeTab !== 'profile' && activeTab !== 'employment' ? (
            <FormSkeleton fields={3} />
          ) : (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <SectionCard title="Personal Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoItem
                        label="Date of Birth"
                        value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'}
                        icon={<Cake className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      <InfoItem
                        label="Gender"
                        value={employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : 'N/A'}
                        icon={<User className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      <InfoItem
                        label="Marital Status"
                        value={employee.marital_status || 'N/A'}
                        icon={<Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      <InfoItem
                        label="Blood Group"
                        value={employee.blood_group || 'N/A'}
                        icon={<Droplets className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      <InfoItem
                        label="Nationality"
                        value={employee.nationality || 'N/A'}
                        icon={<Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                    </div>
                  </SectionCard>

                  <SectionCard title="Contact Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoItem
                        label="Email"
                        value={employee.email}
                        icon={<Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      <InfoItem
                        label="Phone"
                        value={employee.phone || 'N/A'}
                        icon={<Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                      />
                      {employee.address && (
                        <InfoItem
                          label="Address"
                          value={employee.address}
                          icon={<MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                        />
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Emergency Contact">
                    {employee.emergency_contact_name ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem label="Contact Name" value={employee.emergency_contact_name} />
                        <InfoItem label="Relation" value={employee.emergency_contact_relation || 'N/A'} />
                        <InfoItem
                          label="Phone"
                          value={employee.emergency_contact_phone || 'N/A'}
                          icon={<Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">No emergency contact on file</p>
                    )}
                  </SectionCard>
                </div>
              )}

              {activeTab === 'employment' && (
                <SectionCard title="Employment Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem label="Employee Code" value={employee.employee_code} icon={<User className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                    <InfoItem label="Department" value={employee.department_name || 'N/A'} icon={<Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                    <InfoItem label="Designation" value={employee.designation_name || 'N/A'} icon={<Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                    <InfoItem
                      label="Date of Joining"
                      value={employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : 'N/A'}
                      icon={<Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    />
                    <InfoItem
                      label="Employment Type"
                      value={employee.employment_type ? employee.employment_type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'N/A'}
                      icon={<Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    />
                    <InfoItem label="Reports To" value={employee.manager_name || 'N/A'} icon={<Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                    {employee.work_location && (
                      <InfoItem label="Work Location" value={employee.work_location} icon={<MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                    )}
                    <InfoItem label="Role" value={employee.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : 'N/A'} icon={<Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />} />
                  </div>
                </SectionCard>
              )}

              {activeTab === 'leave' && (
                <div className="space-y-6">
                  <SectionCard title="Leave Balances">
                    {leaveBalances.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {leaveBalances.map((lb) => (
                          <div
                            key={lb.id}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-600"
                          >
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{lb.leave_type_name}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">{lb.remaining_days}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">/ {lb.total_days} days</span>
                            </div>
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-primary-500 dark:bg-primary-400 h-2 rounded-full transition-all"
                                style={{ width: `${lb.total_days > 0 ? (lb.used_days / lb.total_days) * 100 : 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{lb.used_days} days used</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">No leave balances available</p>
                    )}
                  </SectionCard>

                  <SectionCard title="Leave Requests">
                    {leaveRequests.length > 0 ? (
                      <div className="space-y-3">
                        {leaveRequests.slice(0, 10).map((lr) => {
                          const statusIcon = lr.status === 'approved' ? CheckCircle : lr.status === 'rejected' ? XCircle : AlertTriangle
                          const statusColor = lr.status === 'approved'
                            ? 'text-green-600 dark:text-green-400'
                            : lr.status === 'rejected'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                          return (
                            <div
                              key={lr.id}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`${statusColor}`}>
                                  {statusIcon === CheckCircle ? <CheckCircle className="w-5 h-5" /> : statusIcon === XCircle ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lr.leave_type_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(lr.start_date).toLocaleDateString()} - {new Date(lr.end_date).toLocaleDateString()} ({lr.days} day{lr.days > 1 ? 's' : ''})
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={lr.status === 'approved' ? 'success' : lr.status === 'rejected' ? 'danger' : 'warning'}
                                size="sm"
                              >
                                {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">No leave requests found</p>
                    )}
                  </SectionCard>
                </div>
              )}

              {activeTab === 'attendance' && (
                <SectionCard title="Recent Attendance">
                  {attendance.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock In</th>
                            <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock Out</th>
                            <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((a) => (
                            <tr key={a.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-2 text-gray-900 dark:text-white">{new Date(a.date).toLocaleDateString()}</td>
                              <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{a.clock_in || '-'}</td>
                              <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{a.clock_out || '-'}</td>
                              <td className="py-3 px-2">
                                <Badge
                                  variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}
                                  size="sm"
                                >
                                  {a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'N/A'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No attendance records found</p>
                  )}
                </SectionCard>
              )}

              {activeTab === 'payroll' && (
                <SectionCard title="Payroll History">
                  {payrollItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gross Pay</th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deductions</th>
                            <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Pay</th>
                            <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollItems.map((pi) => (
                            <tr key={pi.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-2 text-gray-900 dark:text-white">{pi.period_name}</td>
                              <td className="py-3 px-2 text-right text-gray-900 dark:text-white">${(pi.gross_pay || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-right text-red-600 dark:text-red-400">-${(pi.deductions || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">${(pi.net_pay || 0).toLocaleString()}</td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant={pi.status === 'paid' ? 'success' : 'warning'} size="sm">
                                  {pi.status ? pi.status.charAt(0).toUpperCase() + pi.status.slice(1) : 'N/A'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No payroll records found</p>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
