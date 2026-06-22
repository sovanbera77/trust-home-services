import { useState, useEffect } from 'react'
import { Wallet, Banknote, Receipt, Download, Plus, CalendarDays, DollarSign, Users, BadgeDollarSign, TrendingUp, Play, FileText } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Link } from 'react-router-dom'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { TableSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface PayrollPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  payment_date?: string
  status: string
  total_gross?: number
  total_deductions?: number
  total_net_pay?: number
  employee_count?: number
}

interface PayrollItem {
  id: number
  employee_code: string
  employee_name: string
  period_name?: string
  gross_salary: number
  total_deductions: number
  net_pay: number
  status: 'pending' | 'processed' | 'approved' | 'paid'
  earnings?: { name: string; amount: number }[]
  deductions?: { name: string; amount: number }[]
}

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  pending: 'warning',
  processed: 'info',
  approved: 'success',
  paid: 'default',
}

export default function Payroll() {
  const { hasRole } = useAuth()
  const { addToast } = useToast()
  const isAdmin = hasRole('admin', 'hr')

  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [items, setItems] = useState<PayrollItem[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState('')

  const [periodModal, setPeriodModal] = useState(false)
  const [itemModal, setItemModal] = useState(false)
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null)

  const [periodForm, setPeriodForm] = useState({ name: '', start_date: '', end_date: '', payment_date: '' })
  const [itemForm, setItemForm] = useState({ employee_code: '', period_id: '', gross_salary: '', deductions: '' })
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('hrms_token')

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const data = await api.getPayrollPeriods()
        setPeriods(data)
        if (data.length > 0) {
          setSelectedPeriod(String(data[0].id))
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load periods')
        addToast('error', 'Failed to load payroll periods')
      } finally {
        setLoadingPeriods(false)
      }
    }
    fetchPeriods()
  }, [])

  useEffect(() => {
    if (!selectedPeriod) return
    const fetchItems = async () => {
      setLoadingItems(true)
      try {
        const data = await api.getPayrollItems(`period_id=${selectedPeriod}`)
        setItems(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load payroll items')
        addToast('error', 'Failed to load payroll items')
      } finally {
        setLoadingItems(false)
      }
    }
    fetchItems()
  }, [selectedPeriod])

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodForm.name || !periodForm.start_date || !periodForm.end_date) {
      addToast('error', 'Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      await api.createPayrollPeriod({
        name: periodForm.name,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        payment_date: periodForm.payment_date || undefined,
      })
      addToast('success', 'Payroll period created')
      setPeriodModal(false)
      setPeriodForm({ name: '', start_date: '', end_date: '', payment_date: '' })
      const data = await api.getPayrollPeriods()
      setPeriods(data)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create period')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.employee_code || !itemForm.period_id || !itemForm.gross_salary) {
      addToast('error', 'Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      await api.createPayrollItem({
        employee_code: itemForm.employee_code,
        period_id: Number(itemForm.period_id),
        gross_salary: Number(itemForm.gross_salary),
        total_deductions: Number(itemForm.deductions) || 0,
      })
      addToast('success', 'Payroll item created')
      setItemModal(false)
      setItemForm({ employee_code: '', period_id: '', gross_salary: '', deductions: '' })
      const data = await api.getPayrollItems(`period_id=${selectedPeriod}`)
      setItems(data)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create payroll item')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updatePayrollItem(id, { status })
      addToast('success', `Item marked as ${status}`)
      const data = await api.getPayrollItems(`period_id=${selectedPeriod}`)
      setItems(data)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update item')
    }
  }

  const totals = items.reduce(
    (acc, item) => ({
      gross: acc.gross + item.gross_salary,
      deductions: acc.deductions + item.total_deductions,
      net: acc.net + item.net_pay,
    }),
    { gross: 0, deductions: 0, net: 0 }
  )

  const averageGross = items.length > 0 ? totals.gross / items.length : 0
  const selectedPeriodData = periods.find((p) => String(p.id) === selectedPeriod)

  if (error && periods.length === 0 && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error loading payroll data</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const selectedPeriodName = selectedPeriodData?.name || ''
  const periodActions = isAdmin ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setItemModal(true)}
        className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Item
      </button>
      <button
        onClick={() => setPeriodModal(true)}
        className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <CalendarDays className="w-4 h-4" />
        New Period
      </button>
    </div>
  ) : undefined

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={selectedPeriodName ? `Period: ${selectedPeriodName}` : 'Manage employee compensation'}
        actions={periodActions}
      />

      {loadingPeriods ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          ))}
        </div>
      ) : items.length > 0 || selectedPeriodData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payroll</span>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.net)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{items.length} employee(s)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Salary</span>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(averageGross)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gross average per employee</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Deductions</span>
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.deductions)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{items.length > 0 ? `${Math.round((totals.deductions / totals.gross) * 100)}% deduction rate` : '—'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Gross</span>
              <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.gross)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Before deductions</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {isAdmin && selectedPeriod && (
          <button
            onClick={async () => {
              try {
                await api.post(`/payroll/process/${selectedPeriod}`)
                addToast('success', 'Payroll processed successfully')
                const data = await api.getPayrollItems(`period_id=${selectedPeriod}`)
                setItems(data)
              } catch (err: any) {
                addToast('error', err.message || 'Failed to process payroll')
              }
            }}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Process Payroll
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            Payroll Periods
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium">Start Date</th>
                <th className="px-6 py-4 font-medium">End Date</th>
                <th className="px-6 py-4 font-medium">Payment Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Employees</th>
              </tr>
            </thead>
            <tbody>
              {loadingPeriods ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4"><TableSkeleton rows={3} cols={6} /></td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">No payroll periods found</td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${String(p.id) === selectedPeriod ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                    onClick={() => setSelectedPeriod(String(p.id))}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(p.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(p.end_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={p.status === 'closed' ? 'default' : 'info'} size="sm">
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">{p.employee_count ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-400" />
            Payroll Items
            {items.length > 0 && (
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{items.length}</span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4 font-medium">Employee Code</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium text-right">Gross</th>
                <th className="px-6 py-4 font-medium text-right">Deductions</th>
                <th className="px-6 py-4 font-medium text-right">Net Pay</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4"><TableSkeleton rows={5} cols={7} /></td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                    {selectedPeriod ? 'No payroll items for this period' : 'Select a period to view items'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{item.employee_code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <Link to={`/employees?search=${item.employee_code}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                        {item.employee_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.gross_salary)}</td>
                    <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{formatCurrency(item.total_deductions)}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.net_pay)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant[item.status] || 'default'} size="sm">
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPayslipItem(item)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                          title="View Payslip"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <a
                          href={`/api/payroll/payslip/${item.id}?token=${encodeURIComponent(token || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                          title="Download Payslip"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {isAdmin && item.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'processed')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Mark Processed"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && item.status === 'processed' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && item.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'paid')}
                            className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                            title="Mark Paid"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loadingItems && items.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <tr className="font-semibold text-gray-900 dark:text-white">
                  <td colSpan={2} className="px-6 py-4 text-sm">Total</td>
                  <td className="px-6 py-4 text-right text-sm">{formatCurrency(totals.gross)}</td>
                  <td className="px-6 py-4 text-right text-sm text-red-600 dark:text-red-400">{formatCurrency(totals.deductions)}</td>
                  <td className="px-6 py-4 text-right text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.net)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal open={!!payslipItem} onClose={() => setPayslipItem(null)} title="Payslip" maxWidth="max-w-2xl">
        {payslipItem && (
          <div>
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{payslipItem.employee_name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{payslipItem.employee_code}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Earnings
                </h4>
                <div className="space-y-2">
                  {(payslipItem.earnings ?? []).length > 0 ? (
                    payslipItem.earnings!.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{e.name}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(e.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Basic Salary</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslipItem.gross_salary)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-red-500" />
                  Deductions
                </h4>
                <div className="space-y-2">
                  {(payslipItem.deductions ?? []).length > 0 ? (
                    payslipItem.deductions!.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                        <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(d.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Deductions</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(payslipItem.total_deductions)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Net Pay</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(payslipItem.net_pay)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <a
                href={`/api/payroll/payslip/${payslipItem.id}?token=${encodeURIComponent(token || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                <Download className="w-4 h-4" />
                Download Payslip
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={periodModal} onClose={() => setPeriodModal(false)} title="Create Payroll Period">
        <form onSubmit={handleCreatePeriod} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Period Name *</label>
            <input
              type="text"
              value={periodForm.name}
              onChange={(e) => setPeriodForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. January 2026"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
              <input
                type="date"
                value={periodForm.start_date}
                onChange={(e) => setPeriodForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
              <input
                type="date"
                value={periodForm.end_date}
                onChange={(e) => setPeriodForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Date</label>
            <input
              type="date"
              value={periodForm.payment_date}
              onChange={(e) => setPeriodForm((p) => ({ ...p, payment_date: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setPeriodModal(false); setPeriodForm({ name: '', start_date: '', end_date: '', payment_date: '' }) }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Period'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Add Payroll Item">
        <form onSubmit={handleCreateItem} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Employee Code *</label>
            <input
              type="text"
              value={itemForm.employee_code}
              onChange={(e) => setItemForm((p) => ({ ...p, employee_code: e.target.value }))}
              placeholder="e.g. EMP001"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Period *</label>
            <select
              value={itemForm.period_id}
              onChange={(e) => setItemForm((p) => ({ ...p, period_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              <option value="">Select period</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gross Salary *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.gross_salary}
                onChange={(e) => setItemForm((p) => ({ ...p, gross_salary: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Deductions</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.deductions}
                onChange={(e) => setItemForm((p) => ({ ...p, deductions: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setItemModal(false); setItemForm({ employee_code: '', period_id: '', gross_salary: '', deductions: '' }) }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
