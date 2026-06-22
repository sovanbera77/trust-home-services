import { useState, useEffect, useCallback } from 'react'
import { CalendarCheck, Clock, Plus, FileText, CheckCircle, XCircle, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { TableSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

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
  comments?: string
}

interface ApplyForm {
  leave_type_id: string
  start_date: string
  end_date: string
  reason: string
  half_day: boolean
}

const initialApplyForm: ApplyForm = {
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
  half_day: false,
}

const statusTabs = ['All', 'Pending', 'Approved', 'Rejected'] as const

const statusBadgeVariant: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export default function Leave() {
  const { user, hasRole } = useAuth()
  const { addToast } = useToast()
  const isManagerOrAdmin = hasRole('admin', 'hr', 'manager')

  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [tab, setTab] = useState<'my' | 'team'>('my')
  const [applyModal, setApplyModal] = useState(false)
  const [applyForm, setApplyForm] = useState<ApplyForm>(initialApplyForm)
  const [applyErrors, setApplyErrors] = useState<Partial<Record<keyof ApplyForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: 'approved' | 'rejected' } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)

  const fetchBalances = useCallback(async () => {
    try {
      const bal = await api.getLeaveBalances()
      setBalances(bal)
    } catch {
      addToast('error', 'Failed to load leave balances')
    }
  }, [addToast])

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const types = await api.getLeaveTypes()
      setLeaveTypes(types)
    } catch {
      addToast('error', 'Failed to load leave types')
    }
  }, [addToast])

  const fetchRequests = useCallback(async () => {
    setTableLoading(true)
    try {
      const params = tab === 'my' ? `employee_id=${user?.id}` : ''
      const data = await api.getLeaveRequests(params)
      setLeaveRequests(data)
    } catch {
      addToast('error', 'Failed to load leave requests')
    } finally {
      setTableLoading(false)
    }
  }, [tab, user?.id, addToast])

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true)
      await Promise.all([fetchBalances(), fetchLeaveTypes()])
      setLoading(false)
    }
    fetchInitial()
  }, [fetchBalances, fetchLeaveTypes])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    if (applyModal && leaveTypes.length === 0) {
      fetchLeaveTypes()
    }
  }, [applyModal, leaveTypes.length, fetchLeaveTypes])

  const filteredRequests = leaveRequests.filter((r) => {
    if (statusFilter === 'All') return true
    return r.status === statusFilter.toLowerCase()
  })

  const validateApply = () => {
    const errs: Partial<Record<keyof ApplyForm, string>> = {}
    if (!applyForm.leave_type_id) errs.leave_type_id = 'Leave type is required'
    if (!applyForm.start_date) errs.start_date = 'Start date is required'
    if (!applyForm.end_date) errs.end_date = 'End date is required'
    if (applyForm.start_date && applyForm.end_date && applyForm.start_date > applyForm.end_date) {
      errs.end_date = 'End date must be after start date'
    }
    if (!applyForm.reason.trim()) errs.reason = 'Reason is required'
    setApplyErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateApply()) return
    setSaving(true)
    try {
      await api.createLeaveRequest({
        leave_type_id: Number(applyForm.leave_type_id),
        start_date: applyForm.start_date,
        end_date: applyForm.end_date,
        reason: applyForm.reason,
        half_day: applyForm.half_day,
      })
      addToast('success', 'Leave request submitted successfully')
      setApplyModal(false)
      setApplyForm(initialApplyForm)
      await Promise.all([fetchRequests(), fetchBalances()])
    } catch (err: any) {
      addToast('error', err.message || 'Failed to apply leave')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      await api.approveLeaveRequest(confirmAction.id, { status: confirmAction.action, comments: '' })
      addToast('success', `Leave request ${confirmAction.action} successfully`)
      setLeaveRequests((prev) =>
        prev.map((r) => (r.id === confirmAction.id ? { ...r, status: confirmAction.action } : r))
      )
    } catch (err: any) {
      addToast('error', err.message || `Failed to ${confirmAction.action} request`)
    } finally {
      setConfirmLoading(false)
      setConfirmAction(null)
    }
  }

  const resetApplyForm = () => {
    setApplyForm(initialApplyForm)
    setApplyErrors({})
  }

  const openApplyModal = () => {
    resetApplyForm()
    setApplyModal(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle={tab === 'my' ? 'View and manage your leave requests' : 'Manage team leave requests'}
        actions={
          <button
            onClick={openApplyModal}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((bal) => {
            const pct = bal.total_days > 0 ? (bal.used_days / bal.total_days) * 100 : 0
            return (
              <div key={bal.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{bal.leave_type_name}</span>
                  <div className="w-9 h-9 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bal.remaining_days}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500">/{bal.total_days}</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{bal.used_days} day{bal.used_days !== 1 ? 's' : ''} used</p>
                <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg">
            <button
              onClick={() => { setTab('my'); setStatusFilter('All') }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'my'
                  ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              My Leave
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => { setTab('team'); setStatusFilter('All') }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'team'
                    ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                All Leave
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 p-0.5 rounded-lg">
              {statusTabs.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={isManagerOrAdmin && tab === 'team' ? 7 : 6} />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <CalendarCheck className="w-8 h-8 text-gray-300 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No leave requests found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} requests` : 'Apply for leave to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                  {isManagerOrAdmin && tab === 'team' && (
                    <th className="px-6 py-4 font-medium">Employee</th>
                  )}
                  <th className="px-6 py-4 font-medium">Leave Type</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium">Days</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="border-t border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {isManagerOrAdmin && tab === 'team' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                              {req.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{req.employee_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{req.leave_type_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 dark:text-white">{req.days}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs"> day{req.days !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-gray-600 dark:text-gray-300 truncate" title={req.reason}>
                        {req.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadgeVariant[req.status]}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {tab === 'team' && isManagerOrAdmin && req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setConfirmAction({ id: req.id, action: 'approved' })}
                              className="p-1.5 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmAction({ id: req.id, action: 'rejected' })}
                              className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={applyModal} onClose={() => setApplyModal(false)} title="Apply for Leave" wide>
        <form onSubmit={handleApply} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Leave Type *</label>
            <select
              value={applyForm.leave_type_id}
              onChange={(e) => setApplyForm((p) => ({ ...p, leave_type_id: e.target.value }))}
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                applyErrors.leave_type_id ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            {applyErrors.leave_type_id && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{applyErrors.leave_type_id}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
              <input
                type="date"
                value={applyForm.start_date}
                onChange={(e) => setApplyForm((p) => ({ ...p, start_date: e.target.value }))}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                  applyErrors.start_date ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {applyErrors.start_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{applyErrors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
              <input
                type="date"
                value={applyForm.end_date}
                onChange={(e) => setApplyForm((p) => ({ ...p, end_date: e.target.value }))}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                  applyErrors.end_date ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {applyErrors.end_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{applyErrors.end_date}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="half_day"
              checked={applyForm.half_day}
              onChange={(e) => setApplyForm((p) => ({ ...p, half_day: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="half_day" className="text-sm text-gray-700 dark:text-gray-300">Half day</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason *</label>
            <textarea
              value={applyForm.reason}
              onChange={(e) => setApplyForm((p) => ({ ...p, reason: e.target.value }))}
              rows={3}
              placeholder="Please provide a reason for your leave request..."
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 resize-none ${
                applyErrors.reason ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {applyErrors.reason && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{applyErrors.reason}</p>}
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setApplyModal(false); resetApplyForm() }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Leave Request Details">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Employee</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedRequest.employee_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Leave Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedRequest.leave_type_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(selectedRequest.start_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">End Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(selectedRequest.end_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Duration</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedRequest.days} day{selectedRequest.days !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant[selectedRequest.status]}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Reason</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{selectedRequest.reason}</p>
            </div>
            {selectedRequest.comments && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Comments</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{selectedRequest.comments}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.action === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
        message={`Are you sure you want to ${confirmAction?.action} this leave request?`}
        confirmText={confirmAction?.action === 'approved' ? 'Approve' : 'Reject'}
        variant={confirmAction?.action === 'approved' ? 'info' : 'danger'}
        loading={confirmLoading}
      />
    </div>
  )
}
