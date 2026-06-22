import type { User, SubscriptionPlan } from '../../lib/types';
import { config } from '../../lib/config';
import { hashPassword, uuid } from '../../lib/utils';
import { initDB } from '../../lib/db';
import { setToken, clearTokens, isAuthenticated } from '../../lib/api/auth';
import { authService, userService } from '../../lib/api/services';
import { userRepo } from '../../lib/repos/userRepo';
import { settingsRepo } from '../../lib/repos/settingsRepo';
import { docketRepo } from '../../lib/repos/docketRepo';
import { inventoryRepo } from '../../lib/repos/inventoryRepo';
import { complaintRepo } from '../../lib/repos/complaintRepo';
import { attendanceRepo } from '../../lib/repos/attendanceRepo';
import { notificationRepo } from '../../lib/repos/notificationRepo';
import { subscriptionPlanRepo, subscriptionRepo } from '../../lib/repos/subscriptionRepo';
import { activityLogRepo } from '../../lib/repos/activityLogRepo';
import { referralRepo } from '../../lib/repos/referralRepo';
import { syncEngine } from '../../lib/sync';
import { realtime } from '../../lib/realtime';

let initHasRun = false;
const SEED_FLAG_KEY = 'trusthome_seed_complete';

type SetState = any;
type GetState = any;

export const createAuthSlice = (set: SetState, get: GetState) => ({
  currentUser: null as User | null,
  users: [] as User[],

  init: async () => {
    if (initHasRun) return;
    initHasRun = true;

    await initDB();

    if (config.useBackend && isAuthenticated()) {
      try {
        await authService.refresh();
        const user = await userService.getMe().catch(() => null);
        if (user) set({ currentUser: user });
        realtime.init();
        syncEngine.startAutoSync();
        const employees = await userService.getEmployees();
        await Promise.all(employees.map(e => userRepo.save(e)));
      } catch {
        clearTokens();
      }
    }

    let users = await userRepo.all();
    const [dockets, inventory, complaints, attendance, notifications, subscriptions, subscriptionPlans, activityLogs, referrals] = await Promise.all([
      docketRepo.all(),
      inventoryRepo.all(),
      complaintRepo.all(),
      attendanceRepo.all(),
      notificationRepo.all(),
      subscriptionRepo.all(),
      subscriptionPlanRepo.all(),
      activityLogRepo.all(),
      referralRepo.all(),
    ]);
    const bg = await settingsRepo.getBackground();
    const bgOpacity = (await settingsRepo.getBgOpacity()) ?? 0.4;
    const lang = (await settingsRepo.getLang()) || 'en';

    const seedComplete = localStorage.getItem(SEED_FLAG_KEY) === 'true';
    if (users.length === 0) {
      if (!seedComplete) {
        const rawSeed: User[] = [
          { id: uuid(), username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User', mobile: '', email: 'admin@trusthome.com', address: '', specialty: '', status: 'online' },
          { id: uuid(), username: 'emp1', password: 'emp123', role: 'employee', name: 'Rajesh Kumar', mobile: '9876543210', email: 'rajesh@trusthome.com', address: 'Delhi', specialty: 'Plumbing', status: 'offline' },
          { id: uuid(), username: 'emp2', password: 'emp123', role: 'employee', name: 'Amit Singh', mobile: '9876543211', email: 'amit@trusthome.com', address: 'Mumbai', specialty: 'Electrical', status: 'offline' },
          { id: uuid(), username: 'cust1', password: 'cust123', role: 'customer', name: 'Priya Sharma', mobile: '9876543212', email: 'priya@email.com', address: 'Noida', specialty: '', status: 'offline' },
          { id: uuid(), username: 'cust2', password: 'cust123', role: 'customer', name: 'Rahul Verma', mobile: '9876543213', email: 'rahul@email.com', address: 'Gurgaon', specialty: '', status: 'offline' },
        ];
        const seedUsers = await Promise.all(rawSeed.map(async u => ({ ...u, password: await hashPassword(u.password) })));
        await Promise.all(seedUsers.map(u => userRepo.save(u)));
        users = seedUsers;
        localStorage.setItem(SEED_FLAG_KEY, 'true');
      } else {
        // Seed already ran before but IndexedDB cleared — recreate admin so user isn't locked out
        const admin: User = { id: uuid(), username: 'admin', password: await hashPassword('admin123'), role: 'admin', name: 'Admin User', mobile: '', email: 'admin@trusthome.com', address: '', specialty: '', status: 'online' };
        await userRepo.save(admin);
        users = [admin];
      }
    } else if (!seedComplete) {
      localStorage.setItem(SEED_FLAG_KEY, 'true');
    }

    let plans = subscriptionPlans;
    if (plans.length === 0) {
      const defaultPlans: SubscriptionPlan[] = [
        { id: uuid(), name: 'Basic Care', price: 499, interval: 'quarterly', perks: ['1 free maintenance visit', '10% off all repairs', 'Priority response'], active: true },
        { id: uuid(), name: 'Home Shield', price: 1499, interval: 'yearly', perks: ['4 maintenance visits', '15% off all repairs', 'Emergency SOS priority', 'Free seasonal AC servicing'], popular: true, active: true },
        { id: uuid(), name: 'Total Protection', price: 2999, interval: 'yearly', perks: ['Unlimited maintenance visits', '25% off all repairs', 'Same-day emergency response', 'Dedicated service manager'], active: true },
      ];
      await Promise.all(defaultPlans.map(p => subscriptionPlanRepo.save(p)));
      plans = defaultPlans;
    }

    set({ users, dockets, inventory, complaints, attendance, notifications, subscriptions, subscriptionPlans: plans, background: bg || null, bgOpacity, lang, activityLogs, referrals });
  },

  login: async (username: string, password: string, role: string) => {
    if (config.useBackend) {
      try {
        const result = await authService.login(username, password);
        setToken(result.token);
        set({ currentUser: result.user });
        realtime.init();
        syncEngine.startAutoSync();
        return true;
      } catch {
        // Fall through to offline login if backend unreachable
      }
    }
    const { users } = get();
    const hashedInput = await hashPassword(password);
    const user = users.find((u: User) => u.username === username && u.password === hashedInput && u.role === role);
    if (user) { set({ currentUser: { ...user } }); return true; }
    return false;
  },

  logout: () => {
    clearTokens();
    syncEngine.stopAutoSync();
    realtime.destroy();
    set({ currentUser: null });
  },

  signup: async (data: Partial<User>) => {
    if (config.useBackend) {
      const result = await authService.signup(data);
      setToken(result.token);
      set({ currentUser: result.user });
      realtime.init();
      return;
    }
    const newUser: User = {
      id: uuid(),
      username: data.username || '',
      password: await hashPassword(data.password || ''),
      role: data.role || 'customer',
      name: data.name || '',
      mobile: data.mobile || '',
      email: data.email || '',
      address: data.address || '',
      specialty: data.specialty || '',
      status: 'offline',
    };
    await userRepo.save(newUser);
    set((state: { users: User[] }) => ({ users: [...state.users, newUser], currentUser: newUser }));
  },
});
