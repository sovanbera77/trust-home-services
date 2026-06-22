import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Star, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { TableSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface PerformanceReview {
  id: number; employee_id: number; reviewer_id: number; review_period: string
  review_date: string; overall_rating: number; summary: string; status: string
  employee_name?: string; reviewer_name?: string; goals?: PerformanceGoal[]
}

interface PerformanceGoal {
  id: number; review_id: number; goal: string; category: string
  target_date: string; rating: number; comments: string
}

interface Employee { id: number; first_name: string; last_name: string; user_id: number }

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' | 'default' {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
    completed: 'success',
    approved: 'success',
    draft: 'default',
    archived: 'default',
    submitted: 'info',
    pending: 'warning',
    acknowledged: 'warning',
  }
  return map[status] || 'default'
}

export default function Performance() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null)
  const [form, setForm] = useState({ employee_id: 0, reviewer_id: 1, review_period: '', summary: '', goals: [{ goal: '', category: '', target_date: '' }] })
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [revs, emps] = await Promise.all([api.getPerformanceReviews(), api.getEmployees()])
      const empList = emps as Employee[]
      setReviews(revs.map((r: any) => ({
        ...r,
        employee_name: empList.find((e: any) => e.user_id === r.employee_id)
          ? `${(empList.find((e: any) => e.user_id === r.employee_id) as Employee).first_name} ${(empList.find((e: any) => e.user_id === r.employee_id) as Employee).last_name}`
          : `Employee #${r.employee_id}`,
        reviewer_name: empList.find((e: any) => e.user_id === r.reviewer_id)
          ? `${(empList.find((e: any) => e.user_id === r.reviewer_id) as Employee).first_name} ${(empList.find((e: any) => e.user_id === r.reviewer_id) as Employee).last_name}`
          : `Reviewer #${r.reviewer_id}`,
      })))
      setEmployees(empList)
    } catch {
      addToast('error', 'Failed to load performance reviews')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingReview(null)
    setForm({ employee_id: 0, reviewer_id: 1, review_period: '', summary: '', goals: [{ goal: '', category: '', target_date: '' }] })
    setShowModal(true)
  }

  function openEditModal(review: PerformanceReview) {
    setEditingReview(review)
    setForm({
      employee_id: review.employee_id,
      reviewer_id: review.reviewer_id,
      review_period: review.review_period,
      summary: review.summary,
      goals: review.goals && review.goals.length > 0
        ? review.goals.map(g => ({ goal: g.goal, category: g.category, target_date: g.target_date }))
        : [{ goal: '', category: '', target_date: '' }],
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingReview) {
        await api.updatePerformanceReview(editingReview.id, form)
        addToast('success', 'Performance review updated')
      } else {
        await api.createPerformanceReview(form)
        addToast('success', 'Performance review created')
      }
      setShowModal(false)
      loadData()
    } catch {
      addToast('error', 'Failed to save performance review')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusUpdate(id: number, status: string) {
    try {
      await api.updatePerformanceReview(id, { status })
      addToast('success', `Review status updated to ${status}`)
      loadData()
    } catch {
      addToast('error', 'Failed to update status')
    }
  }

  function addGoal() {
    setForm({ ...form, goals: [...form.goals, { goal: '', category: '', target_date: '' }] })
  }

  function updateGoal(index: number, field: string, value: string) {
    const goals = [...form.goals]
    ;(goals[index] as any)[field] = value
    setForm({ ...form, goals })
  }

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
    ))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Performance Reviews" />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <TableSkeleton rows={5} cols={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reviews"
        subtitle="Manage employee performance evaluations"
        actions={
          <button onClick={openCreateModal} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Review
          </button>
        }
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Employee</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reviewer</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <>
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{r.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.reviewer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.review_period}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-0.5">{renderStars(Math.round(r.overall_rating || 0))}</div></td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(r.status)} size="sm">{r.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.review_date ? new Date(r.review_date).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === 'draft' && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(r) }} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(r.id, 'submitted') }} className="btn-primary text-xs py-1 px-3">Submit</button>
                        </>
                      )}
                      {r.status === 'submitted' && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(r.id, 'completed') }} className="btn-success text-xs py-1 px-3">Complete</button>
                      )}
                      {expandedId === r.id ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr key={`${r.id}-goals`}>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary: {r.summary || 'No summary'}</p>
                      {r.goals && r.goals.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goals:</p>
                          {r.goals.map((g, i) => (
                            <div key={g.id || i} className="flex items-center gap-4 mb-2 text-sm">
                              <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-medium">{i + 1}</span>
                              <span className="text-gray-700 dark:text-gray-300">{g.goal}</span>
                              <span className="text-gray-400 dark:text-gray-500 text-xs">{g.category}</span>
                              <div className="flex items-center gap-0.5">{g.rating ? renderStars(g.rating) : null}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                  No performance reviews yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingReview ? 'Edit Performance Review' : 'New Performance Review'}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
              <select
                className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.employee_id}
                onChange={e => setForm({...form, employee_id: Number(e.target.value)})}
                required
              >
                <option value={0}>Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.user_id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Period</label>
              <input
                className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Q1 2026"
                value={form.review_period}
                onChange={e => setForm({...form, review_period: e.target.value})}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
            <textarea
              className="input-field dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              value={form.summary}
              onChange={e => setForm({...form, summary: e.target.value})}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Goals</label>
              <button type="button" onClick={addGoal} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700">+ Add Goal</button>
            </div>
            {form.goals.map((g, i) => (
              <div key={i} className="flex gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <input
                  className="input-field flex-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Goal"
                  value={g.goal}
                  onChange={e => updateGoal(i, 'goal', e.target.value)}
                />
                <input
                  className="input-field w-32 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Category"
                  value={g.category}
                  onChange={e => updateGoal(i, 'category', e.target.value)}
                />
                <input
                  type="date"
                  className="input-field w-36 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={g.target_date}
                  onChange={e => updateGoal(i, 'target_date', e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-outline dark:text-gray-300 dark:border-gray-600" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? (editingReview ? 'Updating...' : 'Creating...') : (editingReview ? 'Update Review' : 'Create Review')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
