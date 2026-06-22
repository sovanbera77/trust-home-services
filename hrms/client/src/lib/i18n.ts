const translations: Record<string, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Employees',
    'nav.departments': 'Departments',
    'nav.leave': 'Leave',
    'nav.attendance': 'Attendance',
    'nav.payroll': 'Payroll',
    'nav.recruitment': 'Recruitment',
    'nav.candidates': 'Candidates',
    'nav.performance': 'Performance',
    'nav.learning': 'Learning',
    'nav.chatbot': 'Jinie',
    'nav.profile': 'Profile',
    'common.search': 'Search',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.no_data': 'No data available',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.pending': 'Pending',
    'common.approved': 'Approved',
    'common.rejected': 'Rejected',
    'leave.apply': 'Apply Leave',
    'leave.balance': 'Leave Balance',
    'attendance.clock_in': 'Clock In',
    'attendance.clock_out': 'Clock Out',
    'employee.add': 'Add Employee',
    'employee.list': 'Employees',
    'payroll.payslip': 'Payslip',
    'payroll.generate': 'Generate Payroll',
    'dashboard.title': 'Dashboard',
    'dashboard.total_employees': 'Total Employees',
    'dashboard.active_employees': 'Active Employees',
    'dashboard.pending_leaves': 'Pending Leaves',
    'dashboard.departments': 'Departments',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.employees': 'कर्मचारी',
    'nav.departments': 'विभाग',
    'nav.leave': 'छुट्टी',
    'nav.attendance': 'उपस्थिति',
    'nav.payroll': 'पेरोल',
    'nav.recruitment': 'भर्ती',
    'nav.candidates': 'उम्मीदवार',
    'nav.performance': 'प्रदर्शन',
    'nav.learning': 'सीखना',
    'nav.chatbot': 'जिनी',
    'nav.profile': 'प्रोफ़ाइल',
    'common.search': 'खोज',
    'common.add': 'जोड़ें',
    'common.edit': 'संपादित करें',
    'common.delete': 'हटाएं',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.loading': 'लोड हो रहा है...',
    'common.no_data': 'कोई डेटा उपलब्ध नहीं',
    'common.status': 'स्थिति',
    'common.actions': 'कार्रवाई',
    'common.active': 'सक्रिय',
    'common.inactive': 'निष्क्रिय',
    'common.pending': 'लंबित',
    'common.approved': 'स्वीकृत',
    'common.rejected': 'अस्वीकृत',
    'leave.apply': 'छुट्टी के लिए आवेदन करें',
    'leave.balance': 'छुट्टी शेष',
    'attendance.clock_in': 'क्लॉक इन',
    'attendance.clock_out': 'क्लॉक आउट',
    'employee.add': 'कर्मचारी जोड़ें',
    'employee.list': 'कर्मचारी',
    'payroll.payslip': 'वेतन पर्ची',
    'payroll.generate': 'पेरोल जनरेट करें',
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.total_employees': 'कुल कर्मचारी',
    'dashboard.active_employees': 'सक्रिय कर्मचारी',
    'dashboard.pending_leaves': 'लंबित छुट्टियां',
    'dashboard.departments': 'विभाग',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.employees': 'Employés',
    'nav.departments': 'Départements',
    'nav.leave': 'Congés',
    'nav.attendance': 'Présence',
    'nav.payroll': 'Paie',
    'nav.recruitment': 'Recrutement',
    'nav.candidates': 'Candidats',
    'nav.performance': 'Performance',
    'nav.learning': 'Formation',
    'nav.chatbot': 'Jinie',
    'nav.profile': 'Profil',
    'common.search': 'Rechercher',
    'common.add': 'Ajouter',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.no_data': 'Aucune donnée',
    'common.status': 'Statut',
    'common.actions': 'Actions',
    'common.active': 'Actif',
    'common.inactive': 'Inactif',
    'common.pending': 'En attente',
    'common.approved': 'Approuvé',
    'common.rejected': 'Rejeté',
    'leave.apply': 'Demander un congé',
    'leave.balance': 'Solde de congés',
    'attendance.clock_in': 'Pointer',
    'attendance.clock_out': 'Dépointer',
    'employee.add': 'Ajouter employé',
    'payroll.payslip': 'Fiche de paie',
    'dashboard.title': 'Tableau de bord',
    'dashboard.total_employees': 'Employés totaux',
    'dashboard.active_employees': 'Employés actifs',
    'dashboard.pending_leaves': 'Congés en attente',
    'dashboard.departments': 'Départements',
  },
}

type Locale = 'en' | 'hi' | 'fr'

class I18n {
  private locale: Locale = 'en'
  private listeners: Set<() => void> = new Set()

  getLocale(): Locale { return this.locale }
  
  setLocale(locale: Locale) {
    this.locale = locale
    localStorage.setItem('hrms_locale', locale)
    this.listeners.forEach(fn => fn())
  }

  t(key: string, fallback?: string): string {
    return translations[this.locale]?.[key] || translations['en']?.[key] || fallback || key
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  getAvailableLocales(): { code: Locale; name: string }[] {
    return [{ code: 'en', name: 'English' }, { code: 'hi', name: 'हिन्दी' }, { code: 'fr', name: 'Français' }]
  }
}

export const i18n = new I18n()

const saved = localStorage.getItem('hrms_locale')
if (saved === 'en' || saved === 'hi' || saved === 'fr') i18n.setLocale(saved)
