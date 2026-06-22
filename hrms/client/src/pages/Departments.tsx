import { useState, useEffect } from 'react'
import { Building2, Plus, Edit2, Trash2, Users, ChevronDown, ChevronUp, UserCircle, Mail, Briefcase } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { CardSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface Department {
  id: number
  name: string
  code: string
  description: string
  manager_name: string
  employee_count: number
  status: 'active' | 'inactive'
  manager_id?: number
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  email: string
  employee_code: string
  designation_name?: string
  department_name?: string
  status: string
}

interface DepartmentForm {
  name: string
  description: string
  manager_id: number | ''
  status: 'active' | 'inactive'
}

const initialForm: DepartmentForm = {
  name: '',
  description: '',
  manager_id: '',
  status: 'active',
}

export default function Departments() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [form, setForm] = useState<DepartmentForm>(initialForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DepartmentForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedDept, setExpandedDept] = useState<number | null>(null)
  const [deptEmployees, setDeptEmployees] = useState<Record<number, Employee[]>>({})
  const [loadingDeptEmployees, setLoadingDeptEmployees] = useState<Record<number, boolean>>({})

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchEmployees()])
  }, [])

  const fetchDepartments = async () => {
    try {
      const data = await api.getDepartments()
      setDepartments(data)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await api.getEmployees()
      setEmployees(data)
    } catch {
      // employees are non-critical for form select
    }
  }

  const toggleDeptEmployees = async (dept: Department) => {
    if (expandedDept === dept.id) {
      setExpandedDept(null)
      return
    }
    if (deptEmployees[dept.id]) {
      setExpandedDept(dept.id)
      return
    }
    setLoadingDeptEmployees((prev) => ({ ...prev, [dept.id]: true }))
    setExpandedDept(dept.id)
    try {
      const all = await api.getEmployees()
      const filtered = all.filter((e: any) => e.department_name === dept.name)
      setDeptEmployees((prev) => ({ ...prev, [dept.id]: filtered }))
    } catch {
      addToast('error', 'Failed to load department employees')
    } finally {
      setLoadingDeptEmployees((prev) => ({ ...prev, [dept.id]: false }))
    }
  }

  const openAddModal = () => {
    setEditingDept(null)
    setForm(initialForm)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (dept: Department) => {
    setEditingDept(dept)
    setForm({
      name: dept.name,
      description: dept.description || '',
      manager_id: dept.manager_id ?? '',
      status: dept.status || 'active',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof DepartmentForm, string>> = {}
    if (!form.name.trim()) errs.name = 'Department name is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
      }
      if (form.manager_id !== '') payload.manager_id = Number(form.manager_id)

      if (editingDept) {
        await api.updateDepartment(editingDept.id, payload)
        addToast('success', 'Department updated successfully')
      } else {
        await api.createDepartment(payload)
        addToast('success', 'Department created successfully')
      }
      setModalOpen(false)
      await fetchDepartments()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteDepartment(deleteTarget.id)
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      addToast('success', 'Department deleted successfully')
      setDeleteTarget(null)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete department')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Departments" subtitle="Manage your organization departments" />
        <CardSkeleton count={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage your organization departments"
        actions={
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        }
      />

      {departments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No departments yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Get started by creating your first department</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div
                className="p-5 cursor-pointer"
                onClick={() => toggleDeptEmployees(dept)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{dept.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{dept.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(dept)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {dept.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{dept.description}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {dept.manager_name ? (
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <UserCircle className="w-4 h-4" />
                        <span className="truncate max-w-[120px]">{dept.manager_name}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">No head assigned</span>
                    )}
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      {dept.employee_count ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={dept.status === 'active' ? 'success' : 'danger'} size="sm">
                      {dept.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                    {expandedDept === dept.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedDept === dept.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="px-5 py-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Team Members ({deptEmployees[dept.id]?.length ?? dept.employee_count ?? 0})
                    </h4>
                    {loadingDeptEmployees[dept.id] ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                            <div className="flex-1 space-y-1">
                              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                              <div className="h-2 w-20 bg-gray-100 dark:bg-gray-700/50 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : deptEmployees[dept.id]?.length ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {deptEmployees[dept.id].map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                {emp.first_name[0]}{emp.last_name[0]}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {emp.first_name} {emp.last_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {emp.designation_name || 'No designation'}
                              </p>
                            </div>
                            <a
                              href={`mailto:${emp.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
                              title={emp.email}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No employees in this department</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingDept ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Department Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Engineering"
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                formErrors.name
                  ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Department description..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Head of Department</label>
            <select
              value={form.manager_id}
              onChange={(e) => setForm((prev) => ({ ...prev, manager_id: e.target.value ? Number(e.target.value) : '' }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              <option value="">-- Select employee --</option>
              {employees
                .filter((e) => e.status === 'active')
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} {emp.designation_name ? `- ${emp.designation_name}` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
