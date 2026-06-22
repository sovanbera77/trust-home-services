import { useState } from 'react'

type TranslationMap = Record<string, string>

const translations: Record<string, TranslationMap> = {
  en: {
    'nav.home': 'Home',
    'nav.dockets': 'Dockets',
    'nav.users': 'Users',
    'nav.inventory': 'Inventory',
    'nav.analytics': 'Analytics',
    'nav.logout': 'Logout',
    'nav.notifications': 'Notifications',
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.role': 'Role',
    'auth.welcome': 'Welcome',
    'docket.create': 'Create Docket',
    'docket.title': 'Title',
    'docket.desc': 'Description',
    'docket.address': 'Address',
    'docket.date': 'Date',
    'docket.submit': 'Submit',
    'docket.status.pending': 'Pending',
    'docket.status.assigned': 'Assigned',
    'docket.status.completed': 'Completed',
    'docket.status.rejected': 'Rejected',
    'docket.assign': 'Assign',
    'docket.complete': 'Complete',
    'docket.cancel': 'Cancel',
    'docket.chat': 'Chat',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'dashboard.customers': 'Customers',
    'dashboard.employees': 'Employees',
    'dashboard.revenue': 'Revenue',
    'dashboard.jobs': 'Jobs',
    'complaint.title': 'Complaint',
    'complaint.desc': 'Complaint Description',
    'complaint.submit': 'Submit Complaint',
    'complaint.resolve': 'Resolve',
    'attendance.checkin': 'Check In',
    'attendance.history': 'Attendance History',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
  },
  hi: {
    'nav.home': 'होम',
    'nav.dockets': 'डॉकेट',
    'nav.users': 'उपयोगकर्ता',
    'nav.inventory': 'इन्वेंट्री',
    'nav.analytics': 'एनालिटिक्स',
    'nav.logout': 'लॉग आउट',
    'nav.notifications': 'सूचनाएं',
    'auth.login': 'लॉग इन',
    'auth.signup': 'साइन अप',
    'auth.username': 'उपयोगकर्ता नाम',
    'auth.password': 'पासवर्ड',
    'auth.role': 'भूमिका',
    'auth.welcome': 'स्वागत है',
    'docket.create': 'डॉकेट बनाएं',
    'docket.title': 'शीर्षक',
    'docket.desc': 'विवरण',
    'docket.address': 'पता',
    'docket.date': 'तारीख',
    'docket.submit': 'जमा करें',
    'docket.status.pending': 'लंबित',
    'docket.status.assigned': 'निर्धारित',
    'docket.status.completed': 'पूर्ण',
    'docket.status.rejected': 'अस्वीकृत',
    'docket.assign': 'निर्धारित करें',
    'docket.complete': 'पूर्ण करें',
    'docket.cancel': 'रद्द करें',
    'docket.chat': 'चैट',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.export': 'निर्यात',
    'common.loading': 'लोड हो रहा है...',
    'common.noData': 'कोई डेटा उपलब्ध नहीं',
    'dashboard.customers': 'ग्राहक',
    'dashboard.employees': 'कर्मचारी',
    'dashboard.revenue': 'राजस्व',
    'dashboard.jobs': 'कार्य',
    'complaint.title': 'शिकायत',
    'complaint.desc': 'शिकायत विवरण',
    'complaint.submit': 'शिकायत दर्ज करें',
    'complaint.resolve': 'समाधान करें',
    'attendance.checkin': 'चेक इन',
    'attendance.history': 'उपस्थिति इतिहास',
    'settings.language': 'भाषा',
    'settings.theme': 'थीम',
  },
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
] as const

export function t(key: string, lang?: string): string {
  const language = lang ?? 'en'
  return translations[language]?.[key] ?? translations['en']?.[key] ?? key
}

export function useLanguage(): [string, (lang: string) => void] {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem('lang') ?? 'en'
  })

  const setLang = (l: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', l)
    }
    setLangState(l)
  }

  return [lang, setLang]
}
