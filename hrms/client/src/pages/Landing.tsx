import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { createElement } from 'react'
import {
  Briefcase, Menu, X, ChevronDown, ArrowRight, Star,
  Shield, Smartphone, Cpu, Layers, Building2, Users,
  FileText, Clock, Award, ChevronLeft, ChevronRight,
  BarChart3, BookOpen, Globe, Mail, Phone, MapPin,
  Linkedin, Twitter, Youtube, Facebook, ExternalLink,
  Play, CheckCircle, TrendingUp, Zap, Target, Sparkles,
  MessageCircle,
  Wallet
} from 'lucide-react'

const navLinks = [
  {
    label: 'Products',
    dropdown: [
      { title: 'Human Capital Management', desc: 'Comprehensive HR suite' },
      { title: 'Payroll & Workforce', desc: 'Simplified payroll management' },
      { title: 'Talent Acquisition', desc: 'AI-powered recruitment' },
      { title: 'Talent Management', desc: 'Employee growth & retention' },
    ],
  },
  {
    label: 'Solutions',
    dropdown: [
      { title: 'For Enterprises', desc: 'Scalable for large organizations' },
      { title: 'For Mid-Market', desc: 'Growing businesses' },
      { title: 'For Small Business', desc: 'Start with smart HR' },
      { title: 'By Industry', desc: 'BFSI, Retail, Manufacturing & more' },
    ],
  },
  {
    label: 'Resources',
    dropdown: [
      { title: 'Blog', desc: 'HR insights & trends' },
      { title: 'eBooks & Reports', desc: 'In-depth guides' },
      { title: 'Case Studies', desc: 'Customer success stories' },
      { title: 'Webinars', desc: 'Live & on-demand sessions' },
    ],
  },
  { label: 'Company', dropdown: [
    { title: 'About Us', desc: 'Our story & mission' },
    { title: 'Careers', desc: 'Join our team' },
    { title: 'Press', desc: 'News & announcements' },
    { title: 'Contact', desc: 'Get in touch' },
  ]},
]

const features = [
  { icon: Layers, title: 'Scalable & Agile Architecture', desc: 'Built on modern microservices architecture that grows with your organization, handling millions of transactions seamlessly.' },
  { icon: Shield, title: 'Enterprise-grade Security', desc: 'SOC 2 Type II certified with end-to-end encryption, role-based access control, and compliance with global standards.' },
  { icon: Smartphone, title: 'Mobile-first Experience', desc: 'Full-featured mobile apps for iOS and Android enabling HR tasks on the go with offline capabilities.' },
  { icon: Cpu, title: 'AI & ML Powered Innovation', desc: 'Leverage artificial intelligence for smarter hiring, predictive analytics, and automated HR workflows.' },
]

const products = [
  {
    icon: Users, title: 'Human Capital Management', color: 'bg-blue-500',
    features: ['Employee life-cycle management', 'Organization charts & hierarchies', 'Document management', 'Self-service portal'],
  },
  {
    icon: Wallet, title: 'Payroll & Workforce Management', color: 'bg-emerald-500',
    features: ['Automated payroll processing', 'Tax compliance & filings', 'Time & attendance tracking', 'Shift scheduling'],
  },
  {
    icon: Briefcase, title: 'Talent Acquisition', color: 'bg-purple-500',
    features: ['AI-powered candidate matching', 'Job board distribution', 'Interview scheduling', 'Offer letter management'],
  },
  {
    icon: Award, title: 'Talent Management', color: 'bg-rose-500',
    features: ['Performance reviews', 'Learning management', 'Succession planning', 'Goal setting & tracking'],
  },
]

const solutions = [
  { title: 'BFSI', desc: 'Compliant HR solutions for banking, financial services and insurance with regulatory adherence.' },
  { title: 'Retail', desc: 'Manage distributed workforce across locations with centralized HR operations.' },
  { title: 'Manufacturing', desc: 'Handle shift workers, compliance, and industrial workforce efficiently.' },
  { title: 'Pharma', desc: 'Specialized HR for pharmaceutical companies with regulatory compliance.' },
  { title: 'IT/ITeS', desc: 'Agile HR solutions for fast-paced technology and IT services companies.' },
]

const testimonials = [
  { quote: 'HRMS has transformed our HR operations. We\'ve reduced processing time by 70% and improved employee satisfaction significantly.', author: 'Priya Sharma', role: 'CHRO, Tata Group', result: '70% faster processing', logo: 'Tata' },
  { quote: 'The AI-powered recruitment module helped us hire top talent 3x faster. The candidate matching is incredibly accurate.', author: 'Rajesh Mehta', role: 'VP HR, Infosys', result: '3x faster hiring', logo: 'Infosys' },
  { quote: 'Implementation was smooth and the support team is exceptional. Best HRMS investment we\'ve made.', author: 'Anita Desai', role: 'HR Director, Reliance', result: '99.9% uptime', logo: 'Reliance' },
]

const innovations = [
  { icon: Sparkles, title: 'AI Co-Recruiter', desc: 'Intelligent assistant that screens, ranks, and engages candidates automatically.' },
  { icon: Zap, title: 'Gen AI for HR', desc: 'Generative AI for job descriptions, policy documents, and employee communications.' },
  { icon: MessageCircle, title: 'Jinie Chatbot', desc: '24/7 HR assistant handling queries, requests, and approvals via chat.' },
  { icon: Smartphone, title: 'Mobile App', desc: 'Complete HR functionality in your pocket with biometric authentication.' },
  { icon: Layers, title: 'Extensibility Suite', desc: 'Custom workflows, integrations, and APIs for limitless possibilities.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Real-time HR analytics and customizable dashboards with predictive insights.' },
]

const resources = [
  { type: 'eBook', title: 'The Future of HR: AI-Powered Workforce Management', image: 'bg-gradient-to-br from-primary-500 to-primary-700' },
  { type: 'Case Study', title: 'How Tata Group Scaled HR Operations with HRMS', image: 'bg-gradient-to-br from-emerald-500 to-teal-700' },
  { type: 'Webinar', title: 'Mastering Remote Workforce Management', image: 'bg-gradient-to-br from-purple-500 to-pink-700' },
]

const companyLogos = ['Tata', 'Reliance', 'Infosys', 'Aditya Birla', 'Mahindra', 'Godrej', 'Wipro', 'HCL']

function useCountUp(end: number, duration: number, startCounting: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!startCounting) return
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration, startCounting])
  return count
}

function CounterSection() {
  const [ref, setRef] = useState<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref])

  const customers = useCountUp(2000, 2000, visible)
  const users = useCountUp(1500000, 2000, visible)
  const uptime = useCountUp(999, 2000, visible)
  const integrations = useCountUp(4000, 2000, visible)

  return (
    <div ref={setRef} className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl md:text-5xl font-bold text-white">{customers.toLocaleString()}+</p>
            <p className="text-primary-200 mt-1">Customers</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-bold text-white">{users.toLocaleString()}+</p>
            <p className="text-primary-200 mt-1">Users</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-bold text-white">{uptime / 10}%</p>
            <p className="text-primary-200 mt-1">Uptime</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-bold text-white">{integrations.toLocaleString()}+</p>
            <p className="text-primary-200 mt-1">Integrations</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeProduct, setActiveProduct] = useState(0)
  const [activeSolution, setActiveSolution] = useState(0)
  const [solutionTab, setSolutionTab] = useState<'industry' | 'size'>('industry')
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold ${scrolled ? 'text-gray-900' : 'text-white'}`}>HRMS</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(link.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                    {link.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openDropdown === link.label && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-3">
                      {link.dropdown.map((item) => (
                        <button key={item.title} className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>Sign In</Link>
              <Link to="/login" className="bg-primary-600 text-white px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">Get Started</Link>
            </div>

            <button onClick={() => setMobileMenu(!mobileMenu)} className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-gray-700' : 'text-white'}`}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <div key={link.label}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {link.label}
                    <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === link.label && (
                    <div className="ml-4 space-y-1 pb-2">
                      {link.dropdown.map((item) => (
                        <button key={item.title} className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg text-left">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <Link to="/login" className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Sign In</Link>
                <Link to="/login" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg mt-2">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(99,102,241,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-6">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-primary-300">AI-Powered HR Platform</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Simplify Worklife.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-300">Empower Your Workforce.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg">
                Transform your HR operations with the industry's most comprehensive and intelligent human capital management platform. From hiring to retirement, we power your people journey.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all inline-flex items-center gap-2 shadow-lg shadow-primary-600/25">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="border-2 border-gray-500 text-gray-300 hover:border-gray-400 hover:text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all inline-flex items-center gap-2">
                  <Play className="w-4 h-4" /> Schedule Demo
                </button>
              </div>
              <div className="flex items-center gap-4 mt-10 pt-8 border-t border-gray-800">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-xs font-medium text-white">T</div>
                  ))}
                </div>
                <p className="text-sm text-gray-400">Trusted by <span className="font-semibold text-gray-300">2000+</span> leading companies</p>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 ml-2">HRMS Dashboard</span>
                </div>
                <div className="p-6">
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Total Employees</p>
                      <p className="text-2xl font-bold text-white">2,847</p>
                      <p className="text-xs text-green-400 mt-1">+12% this month</p>
                    </div>
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Attendance</p>
                      <p className="text-2xl font-bold text-white">96.3%</p>
                      <p className="text-xs text-green-400 mt-1">+2.1% vs last week</p>
                    </div>
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Open Positions</p>
                      <p className="text-2xl font-bold text-white">24</p>
                      <p className="text-xs text-primary-400 mt-1">12 new this week</p>
                    </div>
                  </div>
                  <div className="h-32 bg-gray-800/30 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 mb-8 uppercase tracking-wider">Trusted by industry leaders worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center">
            {companyLogos.map((name) => (
              <div key={name} className="flex items-center justify-center">
                <div className="h-10 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400">{name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Leading Enterprises Choose HRMS</h2>
            <p className="text-lg text-gray-600">Our platform is built on a foundation of innovation, security, and scalability to meet the demands of modern workforce management.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group p-8 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50 transition-all duration-300">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Experience the Power of One</h2>
            <p className="text-lg text-gray-600">A unified platform with seamlessly integrated modules covering every aspect of human capital management.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {products.map((product, idx) => (
              <button
                key={product.title}
                onClick={() => setActiveProduct(idx)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeProduct === idx ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                {product.title}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <div className={`w-12 h-12 ${products[activeProduct].color} rounded-xl flex items-center justify-center mb-5`}>
                {createElement(products[activeProduct].icon, { className: 'w-6 h-6 text-white' })}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{products[activeProduct].title}</h3>
              <ul className="space-y-3">
                {products[activeProduct].features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="mt-6 text-primary-600 hover:text-primary-700 font-semibold text-sm inline-flex items-center gap-1">
                Learn More <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl h-80 flex items-center justify-center border border-gray-700">
              <BarChart3 className="w-16 h-16 text-gray-600" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Solutions Tailored for You</h2>
            <p className="text-lg text-gray-600">Whether by industry or company size, our platform adapts to your unique requirements.</p>
          </div>

          <div className="flex justify-center gap-2 mb-10">
            <button
              onClick={() => setSolutionTab('industry')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${solutionTab === 'industry' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              By Industry
            </button>
            <button
              onClick={() => setSolutionTab('size')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${solutionTab === 'size' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
            >
              By Company Size
            </button>
          </div>

          {solutionTab === 'industry' ? (
            <div>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {solutions.map((sol, idx) => (
                  <button
                    key={sol.title}
                    onClick={() => setActiveSolution(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSolution === idx ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                  >
                    {sol.title}
                  </button>
                ))}
              </div>
              <div className="max-w-3xl mx-auto text-center bg-gray-50 rounded-2xl p-10 border border-gray-100">
                <Building2 className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{solutions[activeSolution].title}</h3>
                <p className="text-gray-600 mb-6">{solutions[activeSolution].desc}</p>
                <Link to="/login" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                  Explore Solution <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                { title: 'Fast-growing Companies', desc: 'Scale your HR operations as you grow. Flexible, modular solutions that adapt to your evolving needs.' },
                { title: 'Large Enterprises', desc: 'Comprehensive enterprise-grade HR platform with advanced security, compliance, and global capabilities.' },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 mb-6">{item.desc}</p>
                  <button className="text-primary-600 font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                    Learn More <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Trusted by Industry Leaders</h2>
            <p className="text-lg text-gray-600">See how organizations transform their HR operations with our platform.</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 shadow-sm">
              <Star className="w-8 h-8 text-yellow-400 mb-4" />
              <p className="text-lg md:text-xl text-gray-800 leading-relaxed mb-6 italic">"{testimonials[testimonialIdx].quote}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{testimonials[testimonialIdx].author}</p>
                  <p className="text-sm text-gray-500">{testimonials[testimonialIdx].role}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary-600 font-bold">{testimonials[testimonialIdx].result}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestimonialIdx(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === testimonialIdx ? 'bg-primary-600 w-8' : 'bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length)} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setTestimonialIdx((prev) => (prev + 1) % testimonials.length)} className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="text-center mt-6">
              <button className="text-primary-600 font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                View all testimonials <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Redefining What's Possible in HR Tech</h2>
            <p className="text-lg text-gray-600">Innovation is at our core. We continuously push the boundaries of what HR technology can do.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {innovations.map((item) => (
              <div key={item.title} className="group p-6 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-lg transition-all duration-300">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  {createElement(item.icon, { className: 'w-5 h-5 text-primary-600' })}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CounterSection />

      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Resources & Insights</h2>
            <p className="text-lg text-gray-600">Stay ahead with the latest HR trends, research, and best practices.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {resources.map((res) => (
              <div key={res.title} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                <div className={`h-48 ${res.image} flex items-center justify-center`}>
                  <FileText className="w-12 h-12 text-white/50" />
                </div>
                <div className="p-6">
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">{res.type}</span>
                  <h3 className="text-base font-semibold text-gray-900 mt-3 group-hover:text-primary-600 transition-colors">{res.title}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button className="text-primary-600 font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
              View all resources <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your HR Operations?</h2>
          <p className="text-lg text-primary-200 mb-8 max-w-2xl mx-auto">Join thousands of leading companies that trust HRMS to manage their most valuable asset — their people.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login" className="bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2 shadow-lg">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="border-2 border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
              <Play className="w-4 h-4" /> Schedule Demo
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HRMS</span>
              </Link>
              <p className="text-sm text-gray-400 mb-6 max-w-xs">The complete HR platform for modern workforce management. Empowering people, simplifying work.</p>
              <div className="flex gap-3">
                {[Linkedin, Twitter, Youtube, Facebook].map((Icon, idx) => (
                  <button key={`social-${idx}`} className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                    {createElement(Icon, { className: 'w-4 h-4 text-gray-400' })}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Products</h4>
              <ul className="space-y-3 text-sm">
                {['HCM', 'Payroll', 'Talent Acquisition', 'Talent Management', 'Workforce Management', 'Analytics'].map((item) => (
                  <li key={item}><button className="hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Solutions</h4>
              <ul className="space-y-3 text-sm">
                {['Enterprise', 'Mid-Market', 'Small Business', 'BFSI', 'Retail', 'Manufacturing'].map((item) => (
                  <li key={item}><button className="hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                {['About Us', 'Careers', 'Press', 'Partners', 'Contact Us'].map((item) => (
                  <li key={item}><button className="hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-3 text-sm">
                {['Blog', 'eBooks', 'Case Studies', 'Webinars', 'Help Center', 'API Docs'].map((item) => (
                  <li key={item}><button className="hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} HRMS. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <button className="hover:text-white transition-colors">Privacy Policy</button>
              <button className="hover:text-white transition-colors">Terms of Service</button>
              <button className="hover:text-white transition-colors">Cookie Policy</button>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <select className="bg-transparent border-none text-sm text-gray-500 focus:outline-none cursor-pointer hover:text-white">
                  <option>India</option>
                  <option>MEA</option>
                  <option>Singapore</option>
                  <option>UK</option>
                  <option>USA</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

