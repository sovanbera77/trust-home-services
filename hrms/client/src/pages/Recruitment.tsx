import { useState, useEffect } from 'react'
import { Briefcase, Plus, MapPin, Clock, DollarSign, Eye, EyeOff, Trash2, Users, Mail, Phone, User, FileText } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { TableSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'

interface JobPosting {
  id: number
  title: string
  department_name: string
  location: string
  employment_type: string
  experience_min: number
  experience_max: number
  salary_min: number
  salary_max: number
  description: string
  status: 'draft' | 'published' | 'active' | 'closed'
  closing_date: string
  posted_date: string
}

interface JobForm {
  title: string
  department_id: string
  location: string
  employment_type: string
  experience_min: string
  experience_max: string
  salary_min: string
  salary_max: string
  description: string
  closing_date: string
}

interface Candidate {
  id: number
  name: string
  email: string
  phone: string
  job_id: number
  job_title: string
  status: string
  resume_text: string
  created_at: string
}

interface CandidateForm {
  name: string
  email: string
  phone: string
  job_id: string
  resume_text: string
}

const initialJobForm: JobForm = {
  title: '',
  department_id: '',
  location: '',
  employment_type: 'full-time',
  experience_min: '',
  experience_max: '',
  salary_min: '',
  salary_max: '',
  description: '',
  closing_date: '',
}

const initialCandidateForm: CandidateForm = {
  name: '',
  email: '',
  phone: '',
  job_id: '',
  resume_text: '',
}

const jobBadgeVariant: Record<string, 'success' | 'danger' | 'info' | 'default'> = {
  draft: 'default',
  published: 'info',
  active: 'success',
  closed: 'danger',
}

const candidateStatusVariant: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  applied: 'info',
  screening: 'warning',
  interview: 'info',
  offered: 'success',
  hired: 'success',
  rejected: 'danger',
}

type Tab = 'jobs' | 'candidates'

export default function Recruitment() {
  const { hasRole } = useAuth()
  const { addToast } = useToast()
  const isAdmin = hasRole('admin', 'hr')

  const [tab, setTab] = useState<Tab>('jobs')

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [jobModal, setJobModal] = useState(false)
  const [candidateModal, setCandidateModal] = useState(false)

  const [jobForm, setJobForm] = useState<JobForm>(initialJobForm)
  const [jobFormErrors, setJobFormErrors] = useState<Partial<Record<keyof JobForm, string>>>({})
  const [candidateForm, setCandidateForm] = useState<CandidateForm>(initialCandidateForm)
  const [candidateFormErrors, setCandidateFormErrors] = useState<Partial<Record<keyof CandidateForm, string>>>({})

  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [j, deps, c] = await Promise.all([
          api.getJobs(),
          api.getDepartments(),
          api.getCandidates(),
        ])
        setJobs(j)
        setDepartments(deps)
        setCandidates(c)
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        addToast('error', err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const validateJobForm = () => {
    const errs: Partial<Record<keyof JobForm, string>> = {}
    if (!jobForm.title.trim()) errs.title = 'Title is required'
    if (!jobForm.department_id) errs.department_id = 'Department is required'
    if (!jobForm.location.trim()) errs.location = 'Location is required'
    if (!jobForm.closing_date) errs.closing_date = 'Closing date is required'
    setJobFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateCandidateForm = () => {
    const errs: Partial<Record<keyof CandidateForm, string>> = {}
    if (!candidateForm.name.trim()) errs.name = 'Name is required'
    if (!candidateForm.email.trim()) errs.email = 'Email is required'
    if (!candidateForm.job_id) errs.job_id = 'Job is required'
    setCandidateFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateJobForm()) return
    setSaving(true)
    try {
      await api.createJob({
        title: jobForm.title,
        department_id: Number(jobForm.department_id),
        location: jobForm.location,
        employment_type: jobForm.employment_type,
        experience_min: jobForm.experience_min ? Number(jobForm.experience_min) : undefined,
        experience_max: jobForm.experience_max ? Number(jobForm.experience_max) : undefined,
        salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : undefined,
        salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : undefined,
        description: jobForm.description,
        closing_date: jobForm.closing_date,
      })
      setJobModal(false)
      setJobForm(initialJobForm)
      const data = await api.getJobs()
      setJobs(data)
      addToast('success', 'Job posting created successfully')
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create job')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateJobStatus = async (id: number, status: string) => {
    try {
      await api.updateJob(id, { status })
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: status as JobPosting['status'] } : j)))
      addToast('success', `Job status updated to ${status}`)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update job')
    }
  }

  const handleDeleteJob = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/jobs/${deleteTarget.id}`)
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id))
      addToast('success', 'Job posting deleted successfully')
      setDeleteTarget(null)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete job')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateCandidateForm()) return
    setSaving(true)
    try {
      await api.createCandidate({
        name: candidateForm.name,
        email: candidateForm.email,
        phone: candidateForm.phone,
        job_id: Number(candidateForm.job_id),
        resume_text: candidateForm.resume_text,
      })
      setCandidateModal(false)
      setCandidateForm(initialCandidateForm)
      const data = await api.getCandidates()
      setCandidates(data)
      addToast('success', 'Candidate added successfully')
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add candidate')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCandidateStatus = async (id: number, status: string) => {
    try {
      await api.updateCandidate(id, { status })
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
      addToast('success', `Candidate status updated to ${status}`)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update candidate')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Error loading data</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Manage job postings and candidates"
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              {tab === 'jobs' && (
                <button
                  onClick={() => setJobModal(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Post New Job
                </button>
              )}
              {tab === 'candidates' && (
                <button
                  onClick={() => setCandidateModal(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Candidate
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'jobs'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setTab('candidates')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'candidates'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Candidates ({candidates.length})
        </button>
      </div>

      {loading ? (
        tab === 'jobs' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        )
      ) : tab === 'jobs' ? (
        jobs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No job postings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Create your first job posting</p>
            {isAdmin && (
              <button
                onClick={() => setJobModal(true)}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post New Job
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{job.department_name}</p>
                      </div>
                    </div>
                    <Badge variant={jobBadgeVariant[job.status] || 'default'} size="sm">
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.employment_type}</span>
                    {job.experience_min != null && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.experience_min}-{job.experience_max} yrs</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {job.salary_min != null && (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><DollarSign className="w-3 h-3" /> {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}</span>
                    )}
                    <span className="text-gray-400 dark:text-gray-500">Posted {new Date(job.posted_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {expandedId === job.id && (
                  <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{job.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-2">
                      {isAdmin && (job.status === 'draft' || job.status === 'active') && (
                        <button
                          onClick={() => handleUpdateJobStatus(job.id, 'published')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Publish
                        </button>
                      )}
                      {isAdmin && job.status === 'published' && (
                        <button
                          onClick={() => handleUpdateJobStatus(job.id, 'closed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                        >
                          <EyeOff className="w-3 h-3" /> Close
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(job)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {candidates.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No candidates yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Add your first candidate</p>
              {isAdmin && (
                <button
                  onClick={() => setCandidateModal(true)}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Candidate
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Applied</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{candidate.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {candidate.email}
                          </span>
                          {candidate.phone && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {candidate.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{candidate.job_title || `Job #${candidate.job_id}`}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={candidateStatusVariant[candidate.status] || 'default'} size="sm">
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {candidate.status === 'applied' && (
                            <button
                              onClick={() => handleUpdateCandidateStatus(candidate.id, 'screening')}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                              Screen
                            </button>
                          )}
                          {candidate.status === 'screening' && (
                            <button
                              onClick={() => handleUpdateCandidateStatus(candidate.id, 'interview')}
                              className="px-2.5 py-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                            >
                              Interview
                            </button>
                          )}
                          {candidate.status === 'interview' && (
                            <button
                              onClick={() => handleUpdateCandidateStatus(candidate.id, 'offered')}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                            >
                              Offer
                            </button>
                          )}
                          {candidate.status === 'offered' && (
                            <button
                              onClick={() => handleUpdateCandidateStatus(candidate.id, 'hired')}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                            >
                              Hire
                            </button>
                          )}
                          {(candidate.status === 'applied' || candidate.status === 'screening' || candidate.status === 'interview') && (
                            <button
                              onClick={() => handleUpdateCandidateStatus(candidate.id, 'rejected')}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={jobModal} onClose={() => { setJobModal(false); setJobForm(initialJobForm) }} title="Create Job Posting" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateJob} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job Title *</label>
              <input
                type="text"
                value={jobForm.title}
                onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Senior Software Engineer"
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                  jobFormErrors.title
                    ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                }`}
              />
              {jobFormErrors.title && <p className="text-xs text-red-500 mt-1">{jobFormErrors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Department *</label>
              <select
                value={jobForm.department_id}
                onChange={(e) => setJobForm((p) => ({ ...p, department_id: e.target.value }))}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                  jobFormErrors.department_id
                    ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {jobFormErrors.department_id && <p className="text-xs text-red-500 mt-1">{jobFormErrors.department_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location *</label>
              <input
                type="text"
                value={jobForm.location}
                onChange={(e) => setJobForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="New York, NY"
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                  jobFormErrors.location
                    ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                }`}
              />
              {jobFormErrors.location && <p className="text-xs text-red-500 mt-1">{jobFormErrors.location}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Employment Type</label>
              <select
                value={jobForm.employment_type}
                onChange={(e) => setJobForm((p) => ({ ...p, employment_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Closing Date *</label>
              <input
                type="date"
                value={jobForm.closing_date}
                onChange={(e) => setJobForm((p) => ({ ...p, closing_date: e.target.value }))}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                  jobFormErrors.closing_date
                    ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {jobFormErrors.closing_date && <p className="text-xs text-red-500 mt-1">{jobFormErrors.closing_date}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Experience (yrs)</label>
                <input
                  type="number"
                  value={jobForm.experience_min}
                  onChange={(e) => setJobForm((p) => ({ ...p, experience_min: e.target.value }))}
                  placeholder="3"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Experience (yrs)</label>
                <input
                  type="number"
                  value={jobForm.experience_max}
                  onChange={(e) => setJobForm((p) => ({ ...p, experience_max: e.target.value }))}
                  placeholder="7"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Salary</label>
              <input
                type="number"
                value={jobForm.salary_min}
                onChange={(e) => setJobForm((p) => ({ ...p, salary_min: e.target.value }))}
                placeholder="80000"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Salary</label>
              <input
                type="number"
                value={jobForm.salary_max}
                onChange={(e) => setJobForm((p) => ({ ...p, salary_max: e.target.value }))}
                placeholder="120000"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={jobForm.description}
              onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Job description, requirements, benefits..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setJobModal(false); setJobForm(initialJobForm) }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={candidateModal} onClose={() => { setCandidateModal(false); setCandidateForm(initialCandidateForm) }} title="Add Candidate" maxWidth="max-w-lg">
        <form onSubmit={handleCreateCandidate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Candidate Name *</label>
            <input
              type="text"
              value={candidateForm.name}
              onChange={(e) => setCandidateForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="John Doe"
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                candidateFormErrors.name
                  ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            />
            {candidateFormErrors.name && <p className="text-xs text-red-500 mt-1">{candidateFormErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
            <input
              type="email"
              value={candidateForm.email}
              onChange={(e) => setCandidateForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="john@example.com"
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                candidateFormErrors.email
                  ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            />
            {candidateFormErrors.email && <p className="text-xs text-red-500 mt-1">{candidateFormErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
            <input
              type="text"
              value={candidateForm.phone}
              onChange={(e) => setCandidateForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Job *</label>
            <select
              value={candidateForm.job_id}
              onChange={(e) => setCandidateForm((p) => ({ ...p, job_id: e.target.value }))}
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                candidateFormErrors.job_id
                  ? 'border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            {candidateFormErrors.job_id && <p className="text-xs text-red-500 mt-1">{candidateFormErrors.job_id}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Resume / Notes</label>
            <textarea
              value={candidateForm.resume_text}
              onChange={(e) => setCandidateForm((p) => ({ ...p, resume_text: e.target.value }))}
              rows={4}
              placeholder="Paste resume text or add notes about the candidate..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { setCandidateModal(false); setCandidateForm(initialCandidateForm) }}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteJob}
        title="Delete Job Posting"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
