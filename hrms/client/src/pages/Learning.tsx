import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/shared/PageHeader'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { TableSkeleton, CardSkeleton } from '../components/shared/Skeleton'
import { useToast } from '../lib/toast'
import { Plus, Clock, Users, BookOpen, CheckCircle, Play, BarChart3 } from 'lucide-react'

interface Course {
  id: number; title: string; description: string; category: string
  duration_hours: number; instructor: string; is_mandatory: number; status: string
}

interface EmployeeCourse {
  id: number; employee_id: number; course_id: number
  progress_percent: number; status: string; completed_at: string; score: number
  course_title?: string; course_category?: string
}

function statusBadgeVariant(status: string) {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'default'
  if (status === 'draft') return 'warning'
  return 'default'
}

function enrollmentBadgeVariant(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress' || status === 'in-progress') return 'warning'
  if (status === 'enrolled') return 'info'
  return 'default'
}

export default function Learning() {
  const [courses, setCourses] = useState<Course[]>([])
  const [myCourses, setMyCourses] = useState<EmployeeCourse[]>([])
  const [activeTab, setActiveTab] = useState<'courses' | 'mylearning'>('courses')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: '', duration_hours: 0, instructor: '' })
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('hrms_user')
    if (stored) setCurrentUser(JSON.parse(stored))
    loadData()
  }, [])

  async function loadData() {
    try {
      const [cs, ec] = await Promise.all([api.getCourses(), api.getEmployeeCourses()])
      setCourses(cs)
      setMyCourses(ec.map((e: any) => ({
        ...e,
        course_title: cs.find((c: any) => c.id === e.course_id)?.title,
        course_category: cs.find((c: any) => c.id === e.course_id)?.category,
      })))
    } catch (e) {
      addToast('error', 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingCourse(null)
    setForm({ title: '', description: '', category: '', duration_hours: 0, instructor: '' })
    setShowModal(true)
  }

  function openEditModal(course: Course) {
    setEditingCourse(course)
    setForm({
      title: course.title,
      description: course.description,
      category: course.category,
      duration_hours: course.duration_hours,
      instructor: course.instructor,
    })
    setShowModal(true)
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingCourse) {
        await api.createCourse({ ...form, id: editingCourse.id })
        addToast('success', 'Course updated')
      } else {
        await api.createCourse(form)
        addToast('success', 'Course created')
      }
      setShowModal(false)
      setForm({ title: '', description: '', category: '', duration_hours: 0, instructor: '' })
      await loadData()
    } catch {
      addToast('error', 'Failed to save course')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEnroll(courseId: number) {
    if (!currentUser) return
    try {
      await api.enrollCourse({ employee_id: currentUser.id, course_id: courseId })
      addToast('success', 'Enrolled in course')
      await loadData()
    } catch {
      addToast('error', 'Failed to enroll')
    }
  }

  async function handleUpdateProgress(id: number, progress: number) {
    const status = progress >= 100 ? 'completed' : 'in_progress'
    try {
      await api.updateCourseProgress(id, { progress_percent: progress, status })
      addToast('success', progress >= 100 ? 'Course completed!' : 'Progress updated')
      await loadData()
    } catch {
      addToast('error', 'Failed to update progress')
    }
  }

  const isEnrolled = (courseId: number) => myCourses.some(ec => ec.course_id === courseId)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'Admin'

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <CardSkeleton count={6} />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning & Development"
        subtitle="Manage courses and track employee learning progress"
        actions={isAdmin && (
          <button onClick={openCreateModal} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        )}
      />

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'courses'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />Courses
        </button>
        <button
          onClick={() => setActiveTab('mylearning')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'mylearning'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Play className="w-4 h-4 inline mr-1.5" />My Learning
        </button>
      </div>

      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                {course.status && (
                  <Badge variant={statusBadgeVariant(course.status)} size="sm">
                    {course.status}
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{course.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{course.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration_hours}h</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.instructor}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {course.category && <Badge variant="info" size="sm">{course.category}</Badge>}
                {course.is_mandatory === 1 && <Badge variant="warning" size="sm">Mandatory</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {isEnrolled(course.id) ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" /> Enrolled
                  </span>
                ) : (
                  <button onClick={() => handleEnroll(course.id)} className="btn-primary text-xs py-2 px-4 flex-1">
                    Enroll Now
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => openEditModal(course)} className="btn-outline text-xs py-2 px-3">
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'mylearning' && (
        <div className="space-y-4">
          {myCourses.length === 0 && (
            <div className="card text-center py-12 text-gray-400 dark:text-gray-500">
              No courses enrolled yet. Browse courses to get started.
            </div>
          )}
          {myCourses.map(ec => (
            <div key={ec.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {ec.course_title || `Course #${ec.course_id}`}
                  </h3>
                  {ec.course_category && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ec.course_category}</p>
                  )}
                </div>
                <Badge variant={enrollmentBadgeVariant(ec.status)} size="sm">
                  {ec.status === 'in_progress' ? 'In Progress' : ec.status.charAt(0).toUpperCase() + ec.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-primary-600 dark:bg-primary-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${ec.progress_percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
                  {ec.progress_percent}%
                </span>
                {ec.status !== 'completed' && (
                  <div className="flex gap-1">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => handleUpdateProgress(ec.id, pct)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          ec.progress_percent === pct
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {ec.score != null && <span>Score: {ec.score}</span>}
                {ec.completed_at && <span>Completed: {new Date(ec.completed_at).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingCourse ? 'Edit Course' : 'Add Course'}
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <input
                className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="e.g. Technical, Soft Skills"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (hours)</label>
              <input
                type="number"
                className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={form.duration_hours}
                onChange={e => setForm({ ...form, duration_hours: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructor</label>
            <input
              className="input-field dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={form.instructor}
              onChange={e => setForm({ ...form, instructor: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-outline" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm" disabled={submitting}>
              {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Add Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
