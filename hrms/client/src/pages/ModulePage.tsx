import { useParams } from 'react-router-dom'
import { Construction, Clock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const moduleDescriptions: Record<string, { title: string; desc: string }> = {
  'human-capital-management': {
    title: 'Human Capital Management',
    desc: 'Comprehensive employee lifecycle management from onboarding to offboarding with self-service portals and organizational hierarchy.'
  },
  payroll: {
    title: 'Payroll & Workforce Management',
    desc: 'Automated payroll processing with tax compliance, time tracking, and shift scheduling for your entire workforce.'
  },
  'talent-acquisition': {
    title: 'Talent Acquisition',
    desc: 'AI-powered recruitment platform with candidate matching, job distribution, and collaborative hiring workflows.'
  },
  'talent-management': {
    title: 'Talent Management',
    desc: 'Performance reviews, learning management, succession planning, and goal tracking to nurture employee growth.'
  },
  attendance: {
    title: 'Attendance Management',
    desc: 'Real-time attendance tracking with biometric integration, geo-fencing, and automated timesheet generation.'
  },
  leave: {
    title: 'Leave Management',
    desc: 'Configurable leave policies with automated accruals, approval workflows, and balance tracking.'
  },
  performance: {
    title: 'Performance Management',
    desc: 'Continuous performance feedback with customizable review cycles, 360-degree assessments, and OKR tracking.'
  },
  learning: {
    title: 'Learning & Development',
    desc: 'Built-in LMS with course authoring, skill gap analysis, and personalized learning paths.'
  },
  analytics: {
    title: 'HR Analytics',
    desc: 'Real-time dashboards and predictive analytics for data-driven workforce decisions.'
  }
}

export default function ModulePage() {
  const { '*': path } = useParams()
  const moduleKey = path?.split('/')[0] || ''
  const module = moduleDescriptions[moduleKey] || {
    title: moduleKey.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    desc: 'This module is under development and will be available soon.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Construction className="w-10 h-10 text-primary-600" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
            <Clock className="w-4 h-4" />
            Coming Soon
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{module.title}</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">{module.desc}</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
