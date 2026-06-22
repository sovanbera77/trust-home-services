const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

export const api = {
  // Auth
  login: (data: { username: string; password: string; role: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  signup: (data: any) =>
    request<{ token: string; user: any }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  // Dockets
  getDockets: () => request<any[]>('/dockets'),
  getDocket: (id: string) => request<any>(`/dockets/${id}`),
  createDocket: (data: any) => request<any>('/dockets', { method: 'POST', body: JSON.stringify(data) }),
  assignDocket: (id: string, employee: string) =>
    request<any>(`/dockets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ employee }) }),
  completeDocket: (id: string, data: any) =>
    request<any>(`/dockets/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  rejectDocket: (id: string, reason: string) =>
    request<any>(`/dockets/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  updateDocketDate: (id: string, expectedDate: string) =>
    request<any>(`/dockets/${id}/date`, { method: 'PATCH', body: JSON.stringify({ expectedDate }) }),
  sendChat: (id: string, text: string) =>
    request<any>(`/dockets/${id}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),
  payDocket: (id: string) =>
    request<any>(`/dockets/${id}/pay`, { method: 'PATCH' }),

  // Users
  getUsers: () => request<any[]>('/users'),
  getEmployees: () => request<any[]>('/users/employees'),
  getCustomers: () => request<any[]>('/users/customers'),
  getMe: () => request<any>('/users/me'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (username: string, data: any) =>
    request<any>(`/users/${username}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (username: string) =>
    request<any>(`/users/${username}`, { method: 'DELETE' }),
  updateDuty: (status: string) =>
    request<any>(`/users/${localStorage.getItem('username')}/duty`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Inventory
  getInventory: () => request<any[]>('/inventory'),
  addInventory: (data: any) => request<any>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  deleteInventory: (id: string) => request<any>(`/inventory/${id}`, { method: 'DELETE' }),

  // Complaints
  getComplaints: () => request<any[]>('/complaints'),
  createComplaint: (data: any) => request<any>('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  resolveComplaint: (id: string) => request<any>(`/complaints/${id}/resolve`, { method: 'PATCH' }),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markAllRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),

  // Attendance
  checkIn: (lat?: number, lng?: number) =>
    request<any>('/attendance/checkin', { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  getAttendance: () => request<any[]>('/attendance'),
  getAllAttendance: () => request<any[]>('/attendance/all'),

  // Payments
  createPaymentOrder: (docketId: string, amount: number) =>
    request<any>('/payments/create-order', { method: 'POST', body: JSON.stringify({ docketId, amount }) }),
  verifyPayment: (data: any) =>
    request<any>('/payments/verify', { method: 'POST', body: JSON.stringify(data) }),
  checkPaymentStatus: (docketId: string) =>
    request<{ paid: boolean }>(`/payments/${docketId}`),

  // Upload
  uploadToCloudinary: async (file: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/upload-cloudinary`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Upload failed');
    return json.data;
  },

  // Analytics
  getStats: () => request<any>('/analytics/stats'),
  getReport: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/analytics/report${q}`);
  },
};
