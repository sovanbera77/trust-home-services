export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'employee' | 'customer';
  name: string;
  mobile: string;
  email: string;
  address: string;
  lat?: number;
  lng?: number;
  specialty: string;
  status: 'online' | 'offline';
  location?: GeoLocation;
  manager?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Docket {
  id: string;
  customer: string;
  type: 'repair' | 'installation';
  title: string;
  desc: string;
  address: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  preferredDate: string;
  status: 'pending' | 'assigned' | 'completed' | 'rejected';
  assignedTo: string | null;
  location?: GeoLocation;
  date: string;
  createdAt?: string;
  completedDate?: string;
  expectedDate?: string;
  serviceFee?: number;
  materialCosts?: number;
  usedPart?: string;
  amountReceived?: number;
  paymentMethod?: string;
  isPaid?: boolean;
  rejectionReason?: string;
  rating?: number;
  review?: string;
  chat: ChatMessage[];
  photoUrls: string[];
  images?: string[];
}

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  createdAt?: string;
}

export interface Complaint {
  id: string;
  customer: string;
  title: string;
  desc: string;
  status: 'pending' | 'resolved';
  date: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  type: 'check-in' | 'check-out';
  lat?: number;
  lng?: number;
  created_at: string;
  user_name?: string;
  user_lat?: number;
  user_lng?: number;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'error' | 'warning';
  tag?: string;
  read: boolean;
  time?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'quarterly' | 'yearly';
  perks: string[];
  popular?: boolean;
  active: boolean;
}

export interface Subscription {
  id: string;
  user: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'cancelled';
  createdAt: string;
}

export interface BackgroundData {
  src: string;
  type: 'photo' | 'video' | 'color';
}

export interface SiteConfig {
  plans: SubscriptionPlan[];
  background: BackgroundData | null;
  bgOpacity: number;
}

export interface OpenWAConfig {
  baseUrl: string;
  apiKey: string;
  sessionId: string;
  enabled: boolean;
}

export interface OtpRecord {
  id: string;
  whatsapp: string;
  otp: string;
  purpose: 'login' | 'signup' | 'reset';
  data: string;
  expiresAt: string;
  createdAt: string;
}

export interface AppConfig {
  appName: string;
  logoUrl: string;
  otpLength: number;
  otpExpiryMinutes: number;
  resendCooldown: number;
}

export interface ActivityLog {
  id: string;
  docketId: string;
  action: 'created' | 'assigned' | 'completed' | 'rejected' | 'updated' | 'chat' | 'payment';
  actor: string;
  detail: string;
  timestamp: string;
}

export interface Referral {
  id: string;
  code: string;
  userId: string;
  earned: number; // Used as Loyalty Points as well
  usedCount: number;
  createdAt: string;
}

export interface LoyaltyCoupon {
  id: string;
  code: string;
  discountAmt: number;
  pointsCost: number;
  isActive: boolean;
}
export interface SOSContact {
  name: string;
  phone: string;
}

export interface AppStore {
  currentUser: User | null;
  users: User[];
  dockets: Docket[];
  inventory: InventoryItem[];
  complaints: Complaint[];
  attendance: Attendance[];
  notifications: Notification[];
  subscriptionPlans: SubscriptionPlan[];
  subscriptions: Subscription[];
  background: BackgroundData | null;
  bgOpacity: number;
  lang: string;
  openwa: OpenWAConfig;
  otpRecords: OtpRecord[];
  activityLogs: ActivityLog[];
  referrals: Referral[];

  init: () => Promise<void>;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  signup: (data: Partial<User>) => Promise<void>;

  addDocket: (docket: Docket) => Promise<void>;
  updateDocket: (id: string, updates: Partial<Docket>) => Promise<void>;

  addInventory: (item: InventoryItem) => Promise<void>;
  deleteInventory: (id: string) => Promise<void>;

  addComplaint: (complaint: Complaint) => Promise<void>;
  resolveComplaint: (id: string) => Promise<void>;

  addAttendance: (record: Attendance) => Promise<void>;

  addNotification: (notification: Notification) => Promise<void>;
  markAllRead: () => Promise<void>;

  setBackground: (bg: BackgroundData | null) => Promise<void>;
  setBgOpacity: (opacity: number) => Promise<void>;
  setLang: (lang: string) => Promise<void>;
  saveBg: (src: string, type: 'photo' | 'video' | 'color') => Promise<void>;

  addSubscriptionPlan: (plan: SubscriptionPlan) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  subscribe: (planId: string, username: string) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;

  addActivityLog: (log: ActivityLog) => Promise<void>;
  addReferral: (referral: Referral) => Promise<void>;
  redeemReferral: (code: string, userId: string) => Promise<boolean>;

  // Loyalty Points
  loyaltyCoupons: LoyaltyCoupon[];
  redeemLoyaltyCoupon: (couponId: string, userId: string) => Promise<boolean>;
}
