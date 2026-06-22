const API_BASE = '/api';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hrms_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  if (res.status === 401) {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    window.location.href = '/login';
  }

  return data.data;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: any) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<any>('/auth/me'),

  // Dashboard
  getDashboardStats: async () => {
    const data = await request<any>('/dashboard/stats');
    // Normalize field names from server format
    return {
      total_employees: data.total_employees || 0,
      active_employees: data.active_employees || 0,
      departments: data.total_departments || 0,
      pending_leaves: data.pending_leave_requests || 0,
      today_present: data.today_present || 0,
      attendance_percentage: data.attendance_percentage || 0,
      on_leave_today: data.on_leave_today || 0,
      open_positions: data.open_positions || 0,
      new_hires_this_month: data.new_hires_this_month || 0,
      total_payroll_this_month: data.total_payroll_this_month || 0,
    };
  },
  getRecentHires: async () => {
    const data = await request<any[]>('/dashboard/recent-hires');
    return data.map((h: any) => ({
      id: h.id,
      first_name: h.name?.split(' ')[0] || '',
      last_name: h.name?.split(' ').slice(1).join(' ') || '',
      department_name: h.department_name || '',
      joining_date: h.date_of_joining || '',
    }));
  },
  getUpcomingEvents: async () => {
    const data = await request<any>('/dashboard/upcoming-events');
    const events: any[] = [];
    if (data.birthdays) {
      data.birthdays.forEach((b: any) => {
        events.push({ id: b.id, type: 'birthday', employee_name: b.name, date: b.date_of_birth, department_name: b.department_name });
      });
    }
    if (data.anniversaries) {
      data.anniversaries.forEach((a: any) => {
        events.push({ id: a.id, type: 'anniversary', employee_name: a.name, date: a.date_of_joining, department_name: a.department_name });
      });
    }
    return events;
  },

  // Employees
  getEmployees: async () => {
    const data = await request<any[]>('/employees');
    return data.map((e: any) => ({
      ...e,
      status: e.is_active ? 'active' : 'inactive',
      designation_name: e.designation_name || e.designation_title,
    }));
  },
  getEmployee: async (id: number) => {
    const e = await request<any>(`/employees/${id}`);
    return {
      ...e,
      status: e.is_active ? 'active' : 'inactive',
      designation_name: e.designation_name || e.designation_title,
      account_number: e.bank_account_no,
      documents: e.documents || [],
    };
  },
  createEmployee: (data: any) =>
    request('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEmployee: (id: number, data: any) =>
    request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: number) =>
    request(`/employees/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => request<any[]>('/departments'),
  createDepartment: (data: any) =>
    request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDepartment: (id: number, data: any) =>
    request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDepartment: (id: number) =>
    request(`/departments/${id}`, { method: 'DELETE' }),

  // Leave Management
  getLeaveTypes: () => request<any[]>('/leave-types'),
  createLeaveType: (data: any) =>
    request('/leave-types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLeaveRequests: (params?: string) =>
    request<any[]>(`/leave-requests${params ? `?${params}` : ''}`),
  createLeaveRequest: (data: any) =>
    request('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveLeaveRequest: (id: number, data: any) =>
    request(`/leave-requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getLeaveBalances: (employeeId?: number) =>
    request<any[]>(`/leave-balances${employeeId ? `?employee_id=${employeeId}` : ''}`),

  // Attendance
  getAttendance: (params?: string) =>
    request<any[]>(`/attendance${params ? `?${params}` : ''}`),
  clockIn: () =>
    request('/attendance/clock-in', { method: 'POST' }),
  clockOut: () =>
    request('/attendance/clock-out', { method: 'POST' }),
  updateAttendance: (id: number, data: any) =>
    request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Payroll
  getPayrollPeriods: () => request<any[]>('/payroll/periods'),
  createPayrollPeriod: (data: any) =>
    request('/payroll/periods', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPayrollItems: (params?: string) =>
    request<any[]>(`/payroll/items${params ? `?${params}` : ''}`),
  createPayrollItem: (data: any) =>
    request('/payroll/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePayrollItem: (id: number, data: any) =>
    request(`/payroll/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Recruitment
  getJobs: () => request<any[]>('/jobs'),
  createJob: (data: any) =>
    request('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateJob: (id: number, data: any) =>
    request(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCandidates: (params?: string) =>
    request<any[]>(`/candidates${params ? `?${params}` : ''}`),
  createCandidate: (data: any) =>
    request('/candidates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCandidate: (id: number, data: any) =>
    request(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getInterviews: (params?: string) =>
    request<any[]>(`/interviews${params ? `?${params}` : ''}`),
  createInterview: (data: any) =>
    request('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Performance
  getPerformanceReviews: (params?: string) =>
    request<any[]>(`/performance-reviews${params ? `?${params}` : ''}`),
  createPerformanceReview: (data: any) =>
    request('/performance-reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePerformanceReview: (id: number, data: any) =>
    request(`/performance-reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Learning
  getCourses: () => request<any[]>('/courses'),
  createCourse: (data: any) =>
    request('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEmployeeCourses: (params?: string) =>
    request<any[]>(`/employee-courses${params ? `?${params}` : ''}`),
  enrollCourse: (data: any) =>
    request('/employee-courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCourseProgress: (id: number, data: any) =>
    request(`/employee-courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationRead: (id: number) =>
    request(`/notifications/${id}/read`, { method: 'PUT' }),
  createNotification: (data: any) =>
    request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Chatbot
  sendChatMessage: (message: string) =>
    request<{ reply: string }>('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Resume Parser
  parseResume: (text: string) =>
    request<any>('/candidates/parse-resume', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  getMatchScore: (candidateId: number) =>
    request<any>(`/candidates/${candidateId}/match-score`, {
      method: 'POST',
    }),

  // Holidays
  getHolidays: () => request<any[]>('/holidays'),

  // Override for direct fetch (to keep token)
  get: async <T>(endpoint: string): Promise<T> => request<T>(endpoint),
  post: async <T>(endpoint: string, data?: any): Promise<T> =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: async <T>(endpoint: string, data?: any): Promise<T> =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async <T>(endpoint: string): Promise<T> =>
    request<T>(endpoint, { method: 'DELETE' }),
};
