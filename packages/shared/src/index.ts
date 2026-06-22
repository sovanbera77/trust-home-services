// ===== Enums =====
export type UserRole = 'customer' | 'employee' | 'admin';
export type DocketStatus = 'pending' | 'assigned' | 'completed' | 'rejected';
export type DocketType = 'repair' | 'installation';
export type PaymentMethod = 'Cash' | 'PhonePe' | 'Due' | 'Online';
export type ComplaintStatus = 'pending' | 'resolved';
export type DutyStatus = 'online' | 'offline';
export type AttendanceType = 'check-in' | 'check-out';

// ===== User =====
export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  mobile: string;
  email: string;
  address: string;
  specialty: string;
  status: DutyStatus;
  location?: GeoLocation;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  mobile: string;
  email: string;
  address: string;
  specialty: string;
  status: DutyStatus;
}

export interface CreateUserDto {
  username: string;
  password: string;
  role: UserRole;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  specialty?: string;
}

export interface LoginDto {
  username: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

// ===== Docket =====
export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export interface Docket {
  id: string;
  customer: string;
  type: DocketType;
  title: string;
  desc: string;
  address: string;
  preferredDate: string;
  status: DocketStatus;
  assignedTo: string | null;
  location?: GeoLocation;
  date: string;
  completedDate?: string;
  expectedDate?: string;
  serviceFee?: number;
  materialCosts?: number;
  usedPart?: string;
  amountReceived?: number;
  paymentMethod?: PaymentMethod;
  isPaid?: boolean;
  rejectionReason?: string;
  rating?: number;
  review?: string;
  chat?: ChatMessage[];
  photoUrls?: string[];
}

export interface CreateDocketDto {
  type: DocketType;
  title: string;
  desc: string;
  address: string;
  preferredDate: string;
  location?: GeoLocation;
}

// ===== Inventory =====
export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  createdAt: string;
}

export interface CreateInventoryItemDto {
  name: string;
  price: number;
  stock?: number;
  sku?: string;
}

// ===== Complaint =====
export interface Complaint {
  id: string;
  customer: string;
  title: string;
  desc: string;
  status: ComplaintStatus;
  date: string;
}

// ===== Notification =====
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'error' | 'warning';
  tag: string;
  read: boolean;
  time: string;
  userId: string;
}

// ===== Attendance =====
export interface AttendanceRecord {
  id: string;
  userId: string;
  type: AttendanceType;
  time: string;
  lat: number | null;
  lng: number | null;
}

// ===== API Response =====
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ===== Analytics =====
export interface EmployeeStats {
  username: string;
  jobs: number;
  revenue: number;
  avgRating: number;
  ratingCount: number;
}

export interface ReportFilter {
  employee?: string;
  dateFrom?: string;
  dateTo?: string;
}
