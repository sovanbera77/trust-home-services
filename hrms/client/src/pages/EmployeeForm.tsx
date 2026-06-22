import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '../lib/api'

interface Department {
  id: number
  name: string
}

interface Designation {
  id: number
  title: string
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  employee_code: string
  department_id: number | ''
  designation_id: number | ''
  date_of_joining: string
  employment_type: string
  gender: string
  work_location: string
  base_salary: string
  role: string
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  employee_code: '',
  department_id: '',
  designation_id: '',
  date_of_joining: '',
  employment_type: 'full-time',
  gender: '',
  work_location: '',
  base_salary: '',
  role: 'employee',
}

export default function EmployeeForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const deps = await api.getDepartments()
        setDepartments(deps)
      } catch {
        /* ignore dropdown failure */
      }
    }
    const fetchDesignations = async () => {
      try {
        const des = await api.get<Designation[]>('/designations')
        setDesignations(des)
      } catch {
        /* ignore */
      }
    }
    fetchDeps()
    fetchDesignations()
  }, [])

  useEffect(() => {
    if (!id) return
    const fetchEmployee = async () => {
      try {
        const emp = await api.getEmployee(Number(id))
        setFormData({
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          employee_code: emp.employee_code || '',
          department_id: emp.department_id || '',
          designation_id: emp.designation_id || '',
          date_of_joining: emp.date_of_joining ? emp.date_of_joining.split('T')[0] : '',
          employment_type: emp.employment_type || 'full-time',
          gender: emp.gender || '',
          work_location: emp.work_location || '',
          base_salary: emp.base_salary?.toString() || '',
          role: emp.role || 'employee',
        })
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to load employee data')
      } finally {
        setFetchLoading(false)
      }
    }
    fetchEmployee()
  }, [id])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!formData.first_name.trim()) errs.first_name = 'First name is required'
    if (!formData.last_name.trim()) errs.last_name = 'Last name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format'
    if (!formData.employee_code.trim()) errs.employee_code = 'Employee code is required'
    if (formData.department_id === '') errs.department_id = 'Department is required'
    if (formData.designation_id === '') errs.designation_id = 'Designation is required'
    if (!formData.date_of_joining) errs.date_of_joining = 'Date of joining is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError('')

    const payload = {
      ...formData,
      department_id: Number(formData.department_id),
      designation_id: Number(formData.designation_id),
      base_salary: formData.base_salary ? Number(formData.base_salary) : undefined,
    }

    try {
      if (isEdit) {
        await api.updateEmployee(Number(id), payload)
      } else {
        await api.createEmployee(payload)
      }
      navigate('/employees')
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const inputClass = (field: keyof FormData) =>
    `w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 placeholder-gray-400 ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`

  const selectClass = (field: keyof FormData) =>
    `w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 bg-white ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/employees" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">{submitError}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              className={inputClass('first_name')}
            />
            {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              className={inputClass('last_name')}
            />
            {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@company.com"
              className={inputClass('email')}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 234 567 890"
              className={inputClass('phone')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Code *</label>
            <input
              type="text"
              name="employee_code"
              value={formData.employee_code}
              onChange={handleChange}
              placeholder="EMP001"
              className={inputClass('employee_code')}
            />
            {errors.employee_code && <p className="text-xs text-red-500 mt-1">{errors.employee_code}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department *</label>
            <select
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              className={selectClass('department_id')}
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            {errors.department_id && <p className="text-xs text-red-500 mt-1">{errors.department_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation *</label>
            <select
              name="designation_id"
              value={formData.designation_id}
              onChange={handleChange}
              className={selectClass('designation_id')}
            >
              <option value="">Select designation</option>
              {designations.map((des) => (
                <option key={des.id} value={des.id}>{des.title}</option>
              ))}
            </select>
            {errors.designation_id && <p className="text-xs text-red-500 mt-1">{errors.designation_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Joining *</label>
            <input
              type="date"
              name="date_of_joining"
              value={formData.date_of_joining}
              onChange={handleChange}
              className={inputClass('date_of_joining')}
            />
            {errors.date_of_joining && <p className="text-xs text-red-500 mt-1">{errors.date_of_joining}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
            <select
              name="employment_type"
              value={formData.employment_type}
              onChange={handleChange}
              className={selectClass('employment_type')}
            >
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={selectClass('gender')}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Location</label>
            <input
              type="text"
              name="work_location"
              value={formData.work_location}
              onChange={handleChange}
              placeholder="New York"
              className={inputClass('work_location')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Salary</label>
            <input
              type="number"
              name="base_salary"
              value={formData.base_salary}
              onChange={handleChange}
              placeholder="75000"
              className={inputClass('base_salary')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={selectClass('role')}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
          <Link
            to="/employees"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Save Employee'}
          </button>
        </div>
      </form>
    </div>
  )
}
