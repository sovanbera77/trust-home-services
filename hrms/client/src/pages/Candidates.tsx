import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Search, Plus, Filter, Mail, Phone, Calendar, Star, X, ChevronDown } from 'lucide-react'

interface Candidate {
  id: number; first_name: string; last_name: string; email: string; phone: string
  current_company: string; current_designation: string; total_experience: number
  highest_education: string; current_ctc: number; expected_ctc: number
  notice_period: string; source: string; status: string; rating: number
  job_posting_id: number; job_title?: string; applied_date: string
}

interface Job { id: number; title: string }
interface Interview { id: number; interview_date: string; interview_type: string; status: string; feedback: string; rating: number }

const statusColors: Record<string, string> = {
  new: 'badge-info', screening: 'badge-warning', shortlisted: 'badge-info',
  interviewed: 'badge-warning', selected: 'badge-success', rejected: 'badge-danger',
  offered: 'badge-success', hired: 'badge-success', withdrawn: 'badge-gray'
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [candidateInterviews, setCandidateInterviews] = useState<Interview[]>([])
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', job_posting_id: 0, current_company: '', current_designation: '', total_experience: 0, current_ctc: 0, expected_ctc: 0, notice_period: '', source: '' })
  const [interviewForm, setInterviewForm] = useState({ interviewer_id: 1, interview_date: '', interview_type: 'video', notes: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [cands, js] = await Promise.all([api.getCandidates(), api.getJobs()])
      setCandidates(cands.map((c: any) => ({ ...c, job_title: js.find((j: any) => j.id === c.job_posting_id)?.title || 'N/A' })))
      setJobs(js)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    await api.createCandidate(form)
    setShowAddModal(false)
    setForm({ first_name: '', last_name: '', email: '', phone: '', job_posting_id: 0, current_company: '', current_designation: '', total_experience: 0, current_ctc: 0, expected_ctc: 0, notice_period: '', source: '' })
    loadData()
  }

  async function handleStatusChange(id: number, status: string) {
    await api.updateCandidate(id, { status })
    loadData()
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCandidate) return
    await api.createInterview({ ...interviewForm, candidate_id: selectedCandidate.id, job_posting_id: selectedCandidate.job_posting_id })
    setShowInterviewModal(false)
    setInterviewForm({ interviewer_id: 1, interview_date: '', interview_type: 'video', notes: '' })
  }

  async function viewInterviews(candidate: Candidate) {
    setSelectedCandidate(candidate)
    const interviews = await api.getInterviews(`candidate_id=${candidate.id}`)
    setCandidateInterviews(interviews)
  }

  const filtered = candidates.filter(c => {
    const matchSearch = `${c.first_name} ${c.last_name} ${c.email} ${c.current_company}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.status === statusFilter
    const matchJob = !jobFilter || c.job_posting_id === Number(jobFilter)
    return matchSearch && matchStatus && matchJob
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Add Candidate</button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search candidates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['new','screening','shortlisted','interviewed','selected','rejected','offered','hired','withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select-field w-48" value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
          <option value="">All Jobs</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Candidate</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Job Applied</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Experience</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Applied</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-700">{c.first_name[0]}{c.last_name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{c.job_title}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{c.total_experience}yrs</td>
                <td className="px-6 py-4"><span className={`badge ${statusColors[c.status] || 'badge-gray'}`}>{c.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(c.applied_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => viewInterviews(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="View Interviews"><Calendar className="w-4 h-4" /></button>
                    <select className="text-xs border border-gray-200 rounded px-2 py-1" value={c.status} onChange={e => handleStatusChange(c.id, e.target.value)}>
                      {['new','screening','shortlisted','interviewed','selected','rejected','offered','hired','withdrawn'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Candidate</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input className="input-field" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input className="input-field" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Posting</label>
                <select className="select-field" value={form.job_posting_id} onChange={e => setForm({...form, job_posting_id: Number(e.target.value)})}>
                  <option value={0}>Select Job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label><input className="input-field" value={form.current_company} onChange={e => setForm({...form, current_company: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Experience (yrs)</label><input type="number" step="0.5" className="input-field" value={form.total_experience} onChange={e => setForm({...form, total_experience: Number(e.target.value)})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary text-sm">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCandidate(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedCandidate.first_name} {selectedCandidate.last_name} - Interviews</h2>
              <button onClick={() => setSelectedCandidate(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {candidateInterviews.length === 0 && <p className="text-sm text-gray-400">No interviews yet</p>}
              {candidateInterviews.map(inv => (
                <div key={inv.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">{new Date(inv.interview_date).toLocaleDateString()} - {inv.interview_type}</p>
                  <p className="text-xs text-gray-500">Status: {inv.status} | Rating: {inv.rating || 'N/A'}</p>
                  {inv.feedback && <p className="text-xs text-gray-600 mt-1">{inv.feedback}</p>}
                </div>
              ))}
            </div>
            <button onClick={() => { setShowInterviewModal(true); setShowAddModal(false) }} className="btn-primary text-sm w-full"><Plus className="w-4 h-4" /> Schedule Interview</button>
          </div>
        </div>
      )}

      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInterviewModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Schedule Interview</h2>
              <button onClick={() => setShowInterviewModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label><input type="datetime-local" className="input-field" value={interviewForm.interview_date} onChange={e => setInterviewForm({...interviewForm, interview_date: e.target.value})} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="select-field" value={interviewForm.interview_type} onChange={e => setInterviewForm({...interviewForm, interview_type: e.target.value})}>
                  <option value="telephonic">Telephonic</option><option value="video">Video</option><option value="in-person">In-Person</option><option value="technical">Technical</option><option value="hr">HR</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="input-field" rows={3} value={interviewForm.notes} onChange={e => setInterviewForm({...interviewForm, notes: e.target.value})} /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowInterviewModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary text-sm">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
