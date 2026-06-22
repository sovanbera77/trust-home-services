import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, AlertTriangle, Calendar, Search, Filter, ChevronLeft, ChevronRight, Play, Square } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { TableSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface AttendanceRecord {
  id: number
  date: string
  clock_in: string
  clock_out: string
  hours_worked: number
  status: 'present' | 'absent' | 'late' | 'half-day'
  employee_name?: string
  employee_id?: number
}

interface Employee {
  id: number
  first_name: string
  last_name: string
}

const statusBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  'half-day': 'info',
}

const statusIcons: Record<string, typeof CheckCircle> = {
  present: CheckCircle,
  absent: XCircle,
  late: AlertTriangle,
  'half-day': Clock,
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function Attendance() {
  const { user, hasRole } = useAuth()
  const { addToast } = useToast()
  const isAdminOrHr = hasRole('admin', 'hr')

  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | string>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null)
  const [editForm, setEditForm] = useState({ clock_in: '', clock_out: '', status: '' })

  useEffect(() => {
    if (isAdminOrHr) {
      api.getEmployees().then(setEmployees).catch(() => {})
    }
  }, [isAdminOrHr])

  useEffect(() => {
    fetchAttendance()
  }, [currentMonth, currentYear, selectedEmployeeId])

  useEffect(() => {
    checkTodayStatus()
  }, [records])

  const buildParams = () => {
    const params = new URLSearchParams()
    params.set('month', String(currentMonth + 1))
    params.set('year', String(currentYear))
    if (selectedEmployeeId) params.set('employee_id', String(selectedEmployeeId))
    return params.toString()
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const data = await api.getAttendance(buildParams())
      setRecords(data)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  const checkTodayStatus = () => {
    const todayStr = now.toISOString().split('T')[0]
    const todaysRecord = records.find(r => r.date?.startsWith(todayStr))
    setTodayRecord(todaysRecord || null)
    if (todaysRecord?.clock_in && !todaysRecord?.clock_out) {
      setIsClockedIn(true)
    } else {
      setIsClockedIn(false)
    }
  }

  const handleClockIn = async () => {
    setClocking(true)
    try {
      await api.clockIn()
      addToast('success', 'Clocked in successfully')
      await fetchAttendance()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to clock in')
    } finally {
      setClocking(false)
    }
  }

  const handleClockOut = async () => {
    setClocking(true)
    try {
      await api.clockOut()
      addToast('success', 'Clocked out successfully')
      await fetchAttendance()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to clock out')
    } finally {
      setClocking(false)
    }
  }

  const handleEditOpen = (rec: AttendanceRecord) => {
    setEditRecord(rec)
    setEditForm({
      clock_in: rec.clock_in || '',
      clock_out: rec.clock_out || '',
      status: rec.status,
    })
    setEditModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!editRecord) return
    try {
      await api.updateAttendance(editRecord.id, editForm)
      addToast('success', 'Attendance updated successfully')
      setEditModalOpen(false)
      setEditRecord(null)
      await fetchAttendance()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update attendance')
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  const todayStatus = todayRecord?.status || 'absent'
  const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const summary = records.reduce((acc, r) => {
    if (r.status === 'present') acc.present++
    else if (r.status === 'absent') acc.absent++
    else if (r.status === 'late') acc.late++
    else if (r.status === 'half-day') acc.half_day++
    return acc
  }, { present: 0, absent: 0, late: 0, half_day: 0 })

  const summaryCards = [
    { label: 'Present', value: summary.present, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Absent', value: summary.absent, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
    { label: 'Late', value: summary.late, icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    { label: 'Half Day', value: summary.half_day, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
  ]

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Manage employee attendance records"
        actions={
          <div className="flex items-center gap-3">
            {isAdminOrHr && (
              <div className="relative">
                <button
                  onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  {selectedEmployeeId ? employees.find(e => e.id === Number(selectedEmployeeId))?.first_name + ' ' + employees.find(e => e.id === Number(selectedEmployeeId))?.last_name : 'All Employees'}
                </button>
                {showEmployeeDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowEmployeeDropdown(false)} />
                    <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg z-20 max-h-72 overflow-y-auto">
                      <button
                        onClick={() => { setSelectedEmployeeId(''); setShowEmployeeDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!selectedEmployeeId ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        All Employees
                      </button>
                      {employees.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => { setSelectedEmployeeId(emp.id); setShowEmployeeDropdown(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${Number(selectedEmployeeId) === emp.id ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          {emp.first_name} {emp.last_name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {isClockedIn ? (
              <button
                onClick={handleClockOut}
                disabled={clocking}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-4 h-4" />
                {clocking ? 'Clocking out...' : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={clocking}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {clocking ? 'Clocking in...' : 'Clock In'}
              </button>
            )}
          </div>
        }
      />

      {isAdminOrHr && (
        <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-sm text-blue-700 dark:text-blue-400">
          <Filter className="w-4 h-4" />
          {selectedEmployeeId ? `Viewing attendance for ${employees.find(e => e.id === Number(selectedEmployeeId))?.first_name || ''} ${employees.find(e => e.id === Number(selectedEmployeeId))?.last_name || ''}` : 'Viewing attendance for all employees'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              <div className={`${card.bg} p-2.5 rounded-lg`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">out of {records.length} records</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${todayStatus === 'present' ? 'bg-emerald-50 dark:bg-emerald-900/30' : todayStatus === 'late' ? 'bg-orange-50 dark:bg-orange-900/30' : todayStatus === 'half-day' ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              {React.createElement(statusIcons[todayStatus], {
                className: `w-5 h-5 ${todayStatus === 'present' ? 'text-emerald-600 dark:text-emerald-400' : todayStatus === 'late' ? 'text-orange-600 dark:text-orange-400' : todayStatus === 'half-day' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`
              })}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Status</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {todayStatus === 'half-day' ? 'Half Day' : todayStatus}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">{todayStr}</p>
          {todayRecord && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              {todayRecord.clock_in && (
                <span className="text-gray-600 dark:text-gray-300">
                  In: <strong className="text-gray-900 dark:text-white">{todayRecord.clock_in}</strong>
                </span>
              )}
              {todayRecord.clock_out && (
                <span className="text-gray-600 dark:text-gray-300">
                  Out: <strong className="text-gray-900 dark:text-white">{todayRecord.clock_out}</strong>
                </span>
              )}
              {todayRecord.hours_worked > 0 && (
                <span className="text-gray-600 dark:text-gray-300">
                  Total: <strong className="text-gray-900 dark:text-white">{todayRecord.hours_worked.toFixed(1)}h</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {MONTHS[currentMonth]} {currentYear}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()) }}
                className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 font-medium">Date</th>
                {(isAdminOrHr && !selectedEmployeeId) && <th className="px-6 py-4 font-medium">Employee</th>}
                <th className="px-6 py-4 font-medium">Clock In</th>
                <th className="px-6 py-4 font-medium">Clock Out</th>
                <th className="px-6 py-4 font-medium">Hours Worked</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdminOrHr && !selectedEmployeeId ? 7 : 6} className="px-6 py-6">
                    <TableSkeleton rows={6} cols={isAdminOrHr && !selectedEmployeeId ? 6 : 5} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrHr && !selectedEmployeeId ? 7 : 6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-400 dark:text-gray-500 font-medium">No attendance records found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">No records for {MONTHS[currentMonth]} {currentYear}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const Icon = statusIcons[rec.status]
                  return (
                    <tr key={rec.id} className="border-t border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                      {(isAdminOrHr && !selectedEmployeeId) && (
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{rec.employee_name || '-'}</td>
                      )}
                      <td className="px-6 py-4">
                        {rec.clock_in ? (
                          <span className="text-gray-700 dark:text-gray-300 font-mono">{rec.clock_in}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {rec.clock_out ? (
                          <span className="text-gray-700 dark:text-gray-300 font-mono">{rec.clock_out}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {rec.hours_worked > 0 ? (
                          <span className="font-medium text-gray-900 dark:text-white">{rec.hours_worked.toFixed(1)}h</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadgeVariant[rec.status] || 'default'} size="sm">
                          <span className="flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {rec.status === 'half-day' ? 'Half Day' : rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdminOrHr && (
                          <button
                            onClick={() => handleEditOpen(rec)}
                            className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Attendance Record">
        <div className="space-y-5">
          {editRecord && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Editing record for <span className="font-medium text-gray-900 dark:text-white">{new Date(editRecord.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clock In</label>
            <input
              type="time"
              value={editForm.clock_in}
              onChange={e => setEditForm(p => ({ ...p, clock_in: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Clock Out</label>
            <input
              type="time"
              value={editForm.clock_out}
              onChange={e => setEditForm(p => ({ ...p, clock_out: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
