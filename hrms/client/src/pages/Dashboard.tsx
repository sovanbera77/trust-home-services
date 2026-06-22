import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, UserCheck, Building2, CalendarClock, UserPlus, Cake, Briefcase,
  Bell, Clock, CheckCircle, XCircle, BookOpen, TrendingUp, DollarSign,
  Activity, AlertTriangle, Gift, Sun, PlusCircle, ListChecks, ArrowRight,
  Percent, LogIn, LogOut
} from 'lucide-react'
import PageHeader from '../components/shared/PageHeader'
import StatCard from '../components/shared/StatCard'
import Badge from '../components/shared/Badge'
import { CardSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

interface DashboardStats {
  total_employees: number
  active_employees: number
  departments: number
  pending_leaves: number
  today_present: number
  attendance_percentage: number
  on_leave_today: number
  open_positions: number
  new_hires_this_month: number
  total_payroll_this_month: number
}

interface RecentHire {
  id: number
  first_name: string
  last_name: string
  department_name: string
  joining_date: string
}

interface UpcomingEvent {
  id: number
  type: 'birthday' | 'anniversary' | 'holiday'
  employee_name: string
  date: string
  department_name?: string
  holiday_name?: string
}

interface NotificationItem {
  id: number
  message: string
  created_at: string
  is_read: boolean
}

interface LeaveBalance {
  id: number
  leave_type_name: string
  total_days: number
  used_days: number
  remaining_days: number
}

interface AttendanceRecord {
  id: number
  date: string
  status: string
}

function DonutChart({ percentage, size = 80, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(percentage, 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-gray-200 dark:stroke-gray-600" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#3b82f6" strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-gray-900 dark:fill-gray-100">
        {Math.round(percentage)}%
      </text>
    </svg>
  )
}

function ProgressBar({ value, max, color = 'bg-blue-500', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="text-gray-500 dark:text-gray-500">{value}/{max}</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all text-left w-full"
    >
      <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </button>
  )
}

function EventIcon({ type }: { type: string }) {
  if (type === 'birthday') return <Cake className="w-4 h-4 text-pink-500" />
  if (type === 'anniversary') return <Briefcase className="w-4 h-4 text-amber-500" />
  return <Sun className="w-4 h-4 text-emerald-500" />
}

function EventBg({ type }: { type: string }) {
  if (type === 'birthday') return 'bg-pink-50 dark:bg-pink-900/30'
  if (type === 'anniversary') return 'bg-amber-50 dark:bg-amber-900/30'
  return 'bg-emerald-50 dark:bg-emerald-900/30'
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateStr)
}

function AdminDashboard() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentHires, setRecentHires] = useState<RecentHire[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, hiresData, eventsData, holidaysData, notifsData] = await Promise.all([
          api.getDashboardStats(),
          api.getRecentHires(),
          api.getUpcomingEvents(),
          api.getHolidays().catch(() => []),
          api.getNotifications().catch(() => []),
        ])
        setStats(statsData as DashboardStats)
        setRecentHires(Array.isArray(hiresData) ? hiresData as RecentHire[] : [])
        setNotifications(Array.isArray(notifsData) ? notifsData as NotificationItem[] : [])

        const events: UpcomingEvent[] = Array.isArray(eventsData) ? (eventsData as UpcomingEvent[]) : []
        if (Array.isArray(holidaysData)) {
          holidaysData.forEach((h: any, idx: number) => {
            events.push({
              id: 10000 + idx,
              type: 'holiday',
              employee_name: '',
              date: h.date || h.holiday_date || '',
              holiday_name: h.name || h.holiday_name || 'Holiday',
            })
          })
        }
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setUpcomingEvents(events)
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
        addToast('error', 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium mb-1">Error loading dashboard</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of your organization"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/employees/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </button>
            <button
              onClick={() => navigate('/leaves/new')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Leave
            </button>
          </div>
        }
      />

      {loading ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <StatCard
            label="Total Employees"
            value={stats?.total_employees ?? 0}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Active Employees"
            value={stats?.active_employees ?? 0}
            icon={<UserCheck className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Departments"
            value={stats?.departments ?? 0}
            icon={<Building2 className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Pending Leaves"
            value={stats?.pending_leaves ?? 0}
            icon={<CalendarClock className="w-5 h-5" />}
            color="orange"
          />
          <StatCard
            label="Attendance"
            value={`${stats?.attendance_percentage ?? 0}%`}
            icon={<Percent className="w-5 h-5" />}
            color="teal"
          />
          <StatCard
            label="Payroll (Month)"
            value={`$${(stats?.total_payroll_this_month ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="pink"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Hires</h2>
            <UserPlus className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : recentHires.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No recent hires</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHires.slice(0, 6).map((hire) => (
                    <tr key={hire.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">
                        <Link to={`/employees/${hire.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                          {hire.first_name} {hire.last_name}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{hire.department_name || '—'}</td>
                      <td className="py-3 text-gray-600 dark:text-gray-400">{formatDate(hire.joining_date)}</td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/employees/${hire.id}`}
                          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
            <CalendarClock className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : upcomingEvents.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className={`p-2 rounded-lg ${EventBg({ type: event.type })}`}>
                    {EventIcon({ type: event.type })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {event.type === 'holiday' ? event.holiday_name : event.employee_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.type === 'birthday' && 'Birthday'}
                      {event.type === 'anniversary' && 'Work Anniversary'}
                      {event.type === 'holiday' && 'Holiday'}
                      {event.department_name && ` · ${event.department_name}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDate(event.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction icon={<UserPlus className="w-4 h-4" />} label="Add Employee" onClick={() => navigate('/employees/new')} />
            <QuickAction icon={<CalendarClock className="w-4 h-4" />} label="Create Leave" onClick={() => navigate('/leaves/new')} />
            <QuickAction icon={<Building2 className="w-4 h-4" />} label="Manage Departments" onClick={() => navigate('/departments')} />
            <QuickAction icon={<DollarSign className="w-4 h-4" />} label="Payroll" onClick={() => navigate('/payroll')} />
            <QuickAction icon={<TrendingUp className="w-4 h-4" />} label="Reports" onClick={() => navigate('/reports')} />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Overview</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <DonutChart percentage={stats?.attendance_percentage ?? 0} size={100} strokeWidth={10} />
              </div>
              <div className="flex-1 w-full space-y-3">
                <ProgressBar
                  value={stats?.today_present ?? 0}
                  max={stats?.active_employees ?? 1}
                  color="bg-blue-500"
                  label="Present Today"
                />
                <ProgressBar
                  value={stats?.on_leave_today ?? 0}
                  max={stats?.active_employees ?? 1}
                  color="bg-amber-500"
                  label="On Leave"
                />
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                  <span>{stats?.today_present ?? 0} present</span>
                  <span>{stats?.on_leave_today ?? 0} on leave</span>
                  <span>{(stats?.active_employees ?? 0) - (stats?.today_present ?? 0) - (stats?.on_leave_today ?? 0)} absent</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          <Bell className="w-5 h-5 text-gray-400" />
        </div>
        {loading ? (
          <CardSkeleton count={1} />
        ) : notifications.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-1">
            {notifications.slice(0, 8).map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className={`p-1.5 rounded-full ${notif.is_read ? 'bg-gray-100 dark:bg-gray-700' : 'bg-primary-50 dark:bg-primary-900/30'}`}>
                  <Activity className={`w-3.5 h-3.5 ${notif.is_read ? 'text-gray-400' : 'text-primary-600 dark:text-primary-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                    {notif.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{timeAgo(notif.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ManagerDashboard() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [teamLeaves, setTeamLeaves] = useState<any[]>([])
  const [directReports, setDirectReports] = useState<RecentHire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, leavesData, employeesData] = await Promise.all([
          api.getDashboardStats(),
          api.getLeaveRequests('status=pending').catch(() => []),
          api.getEmployees(),
        ])
        setStats(statsData as DashboardStats)
        setTeamLeaves(Array.isArray(leavesData) ? leavesData.slice(0, 5) : [])
        const emps = Array.isArray(employeesData) ? employeesData as any[] : []
        setDirectReports(
          emps.slice(0, 5).map((e: any) => ({
            id: e.id,
            first_name: e.first_name || e.name?.split(' ')[0] || '',
            last_name: e.last_name || e.name?.split(' ').slice(1).join(' ') || '',
            department_name: e.department_name || '',
            joining_date: e.date_of_joining || e.joining_date || '',
          }))
        )
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
        addToast('error', 'Failed to load manager dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const teamSize = stats?.active_employees ? Math.round(stats.active_employees * 0.3) : 0

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium mb-1">Error loading dashboard</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Manager Dashboard"
        subtitle="Your team at a glance"
        actions={
          <button
            onClick={() => navigate('/leaves/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CalendarClock className="w-4 h-4" />
            New Leave Request
          </button>
        }
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Team Size"
            value={teamSize}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Pending Approvals"
            value={stats?.pending_leaves ?? 0}
            icon={<Clock className="w-5 h-5" />}
            color="orange"
          />
          <StatCard
            label="On Leave Today"
            value={stats?.on_leave_today ?? 0}
            icon={<XCircle className="w-5 h-5" />}
            color="pink"
          />
          <StatCard
            label="Attendance Rate"
            value={`${stats?.attendance_percentage ?? 0}%`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Leave Requests</h2>
            <ListChecks className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : teamLeaves.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No pending leave requests</p>
          ) : (
            <div className="space-y-2">
              {teamLeaves.map((leave: any) => (
                <div key={leave.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                      <CalendarClock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {leave.employee_name || `${leave.first_name || ''} ${leave.last_name || ''}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {leave.leave_type_name || 'Leave'} · {formatDate(leave.start_date || leave.from_date)} – {formatDate(leave.end_date || leave.to_date)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning" size="sm">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Direct Reports</h2>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : directReports.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No direct reports</p>
          ) : (
            <div className="space-y-2">
              {directReports.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/employees/${emp.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block">
                        {emp.first_name} {emp.last_name}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.department_name || '—'}</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Attendance Today</h2>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
        {loading ? (
          <CardSkeleton count={1} />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <DonutChart percentage={stats?.attendance_percentage ?? 0} size={100} strokeWidth={10} />
            </div>
            <div className="flex-1 w-full space-y-3">
              <ProgressBar value={stats?.today_present ?? 0} max={stats?.active_employees ?? 1} color="bg-blue-500" label="Present" />
              <ProgressBar value={stats?.on_leave_today ?? 0} max={stats?.active_employees ?? 1} color="bg-amber-500" label="On Leave" />
              <ProgressBar
                value={Math.max(0, (stats?.active_employees ?? 0) - (stats?.today_present ?? 0) - (stats?.on_leave_today ?? 0))}
                max={stats?.active_employees ?? 1}
                color="bg-red-500"
                label="Absent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeeDashboard() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([])
  const [myCourses, setMyCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, balancesData, eventsData, attendanceData, coursesData] = await Promise.all([
          api.getDashboardStats(),
          api.getLeaveBalances().catch(() => []),
          api.getUpcomingEvents(),
          api.getAttendance('limit=10').catch(() => []),
          api.getEmployeeCourses().catch(() => []),
        ])
        setStats(statsData as DashboardStats)
        setLeaveBalances(Array.isArray(balancesData) ? balancesData as LeaveBalance[] : [])
        setUpcomingEvents(Array.isArray(eventsData) ? eventsData as UpcomingEvent[] : [])
        setMyAttendance(Array.isArray(attendanceData) ? attendanceData as AttendanceRecord[] : [])
        setMyCourses(Array.isArray(coursesData) ? coursesData.slice(0, 3) : [])
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
        addToast('error', 'Failed to load your dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const presentDays = myAttendance.filter((a) => a.status === 'present').length
  const totalDays = myAttendance.length || 1
  const attendancePct = Math.round((presentDays / totalDays) * 100)
  const totalRemainingLeaves = leaveBalances.reduce((sum, lb) => sum + (lb.remaining_days || 0), 0)

  if (error && !stats && leaveBalances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium mb-1">Error loading dashboard</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.first_name || 'Employee'}`}
        subtitle="Your personal overview"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                api.clockIn()
                  .then(() => addToast('success', 'Clocked in successfully'))
                  .catch(() => addToast('error', 'Failed to clock in'))
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Clock In
            </button>
            <button
              onClick={() => {
                api.clockOut()
                  .then(() => addToast('success', 'Clocked out successfully'))
                  .catch(() => addToast('error', 'Failed to clock out'))
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Clock Out
            </button>
          </div>
        }
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="My Attendance"
            value={`${attendancePct}%`}
            icon={<Clock className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Leave Balance"
            value={totalRemainingLeaves}
            icon={<CalendarClock className="w-5 h-5" />}
            color="orange"
          />
          <StatCard
            label="Enrolled Courses"
            value={myCourses.length}
            icon={<BookOpen className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Upcoming Reviews"
            value={stats?.pending_leaves ? Math.min(stats.pending_leaves, 3) : 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="teal"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Balances</h2>
            <ListChecks className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : leaveBalances.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No leave balances available</p>
          ) : (
            <div className="space-y-4">
              {leaveBalances.slice(0, 5).map((lb) => (
                <div key={lb.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{lb.leave_type_name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{lb.remaining_days}/{lb.total_days} days left</span>
                  </div>
                  <ProgressBar value={lb.used_days} max={lb.total_days} color={
                    lb.remaining_days <= 0 ? 'bg-red-500' : lb.remaining_days <= 2 ? 'bg-amber-500' : 'bg-blue-500'
                  } />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance</h2>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : myAttendance.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No attendance records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myAttendance.slice(0, 7).map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="py-2.5 text-gray-900 dark:text-gray-100">{formatDate(record.date)}</td>
                      <td className="py-2.5">
                        <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'} size="sm">
                          {record.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
            <Gift className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : upcomingEvents.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className={`p-2 rounded-lg ${EventBg({ type: event.type })}`}>
                    {EventIcon({ type: event.type })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{event.employee_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.type === 'birthday' && 'Birthday'}
                      {event.type === 'anniversary' && 'Work Anniversary'}
                      {event.department_name && ` · ${event.department_name}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDate(event.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Courses</h2>
            <BookOpen className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <CardSkeleton count={1} />
          ) : myCourses.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No enrolled courses</p>
          ) : (
            <div className="space-y-3">
              {myCourses.map((course: any) => (
                <div key={course.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                    <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {course.course_name || course.name || 'Course'}
                    </p>
                    <ProgressBar
                      value={course.progress_percentage || course.completion_percentage || 0}
                      max={100}
                      color="bg-primary-500"
                    />
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {course.progress_percentage || course.completion_percentage || 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const role = user?.role || 'employee'

  return (
    <>
      {role === 'admin' ? (
        <AdminDashboard />
      ) : role === 'manager' ? (
        <ManagerDashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </>
  )
}
