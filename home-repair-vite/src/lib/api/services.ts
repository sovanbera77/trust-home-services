import { api } from './client';
import type { User, Docket, InventoryItem, Complaint, Notification } from '../types';

export const userService = {
  list: () => api.get<User[]>('/users'),
  get: (username: string) => api.get<User>(`/users/${username}`),
  getMe: async () => {
    const data = await api.get<any>('/auth/me');
    if (data) {
      return {
        id: data.id,
        username: data.email.split('@')[0],
        email: data.email,
        name: `${data.first_name} ${data.last_name}`,
        role: data.role,
        password: '',
        mobile: data.phone || '',
        address: '',
        specialty: data.employee?.designation_name || 'General',
        status: 'online',
        manager: data.employee?.manager_name
      } as User;
    }
    throw new Error('User not found');
  },
  updateMe: (data: Partial<User>) => api.patch<User>('/auth/me', { first_name: data.name?.split(' ')[0], last_name: data.name?.split(' ').slice(1).join(' '), phone: data.mobile }),
  create: (user: Partial<User>) => api.post<User>('/users', user),
  update: (username: string, data: Partial<User>) => api.patch<User>(`/users/${username}`, data),
  delete: (username: string) => api.delete<void>(`/users/${username}`),
  setDuty: (status: 'online' | 'offline') => api.patch<void>(`/users/me/duty`, { status }),
  getEmployees: async () => {
    const data = await api.get<any[]>('/employees');
    if (data && Array.isArray(data)) {
      return data.map(e => ({
        id: e.user_id || e.id,
        username: e.email ? e.email.split('@')[0] : e.first_name,
        email: e.email,
        name: `${e.first_name} ${e.last_name}`,
        role: e.role || 'employee',
        password: '',
        mobile: e.phone || '',
        address: '',
        specialty: e.designation_name || 'General',
        status: e.is_active ? 'online' : 'offline',
        manager: e.manager_name
      })) as User[];
    }
    return [];
  },
  getCustomers: () => api.get<User[]>('/users/customers'),
};

export const docketService = {
  list: () => api.get<Docket[]>('/dockets'),
  get: (id: string) => api.get<Docket>(`/dockets/${id}`),
  create: (docket: Partial<Docket>) => api.post<Docket>('/dockets', docket),
  assign: (id: string, employee: string) => api.patch<Docket>(`/dockets/${id}/assign`, { employee }),
  complete: (id: string, data: { serviceFee: number; materialCosts: number; paymentMethod: string; usedPart?: string }) =>
    api.patch<Docket>(`/dockets/${id}/complete`, data),
  reject: (id: string, reason: string) => api.patch<Docket>(`/dockets/${id}/reject`, { reason }),
  setDate: (id: string, expectedDate: string) => api.patch<void>(`/dockets/${id}/date`, { expectedDate }),
  addChat: (id: string, text: string) => api.post<{ sender: string; text: string; time: string }[]>(`/dockets/${id}/chat`, { text }),
  markPaid: (id: string) => api.patch<void>(`/dockets/${id}/pay`, {}),
};

export const inventoryService = {
  list: () => api.get<InventoryItem[]>('/inventory'),
  create: (item: Partial<InventoryItem>) => api.post<InventoryItem>('/inventory', item),
  delete: (id: string) => api.delete<void>(`/inventory/${id}`),
};

export const complaintService = {
  list: () => api.get<Complaint[]>('/complaints'),
  create: (complaint: Partial<Complaint>) => api.post<Complaint>('/complaints', complaint),
  resolve: (id: string) => api.patch<void>(`/complaints/${id}/resolve`, {}),
};

export const attendanceService = {
  list: async () => {
    const data = await api.get<any[]>('/attendance');
    if (data && Array.isArray(data)) return data;
    return [];
  },
  listAll: async () => {
    const data = await api.get<any[]>('/attendance');
    if (data && Array.isArray(data)) return data;
    return [];
  },
  checkin: (data: { lat?: number; lng?: number; docketId?: string }) => api.post<{ id: string; type: string }>('/attendance/clock-in', data),
};

export const notificationService = {
  list: () => api.get<Notification[]>('/notifications'),
  create: (notification: { title: string; body: string; type: string; tag: string; userId: string }) =>
    api.post<{ id: string }>('/notifications', notification),
  markAllRead: () => api.patch<void>('/notifications/read-all', {}),
};

export const authService = {
  login: async (username: string, password: string) => {
    // Map username to email for HRMS
    const email = username.includes('@') ? username : `${username}@hrms.com`;
    // api.post returns the 'data' part of the envelope
    const data = await api.post<{ token: string; user: any }>('/auth/login', { email, password });
    if (!data || !data.user) throw new Error('Login failed');
    const u = data.user;
    const user: User = {
      id: u.id,
      username: u.email.split('@')[0],
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
      password: '',
      mobile: u.phone || '',
      address: '',
      specialty: 'General',
      status: 'online',
    };
    return { token: data.token, user };
  },
  signup: (data: Partial<User>) =>
    api.post<{ token: string; user: User }>('/auth/register', { 
      email: data.email || `${data.username}@hrms.com`, 
      password: data.password, 
      first_name: data.name?.split(' ')[0] || 'User', 
      last_name: data.name?.split(' ').slice(1).join(' ') || '', 
      role: data.role, 
      phone: data.mobile 
    }).then(res => res as any), // Cast temporarily
  refresh: () =>
    api.post<{ token: string }>('/auth/refresh', {}),
};
