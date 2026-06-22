export type Resource = 'users' | 'dockets' | 'inventory' | 'complaints' | 'analytics' | 'settings' | 'plans' | 'background';
export type Action = 'read' | 'write' | 'delete';

type PermissionMap = Record<string, Partial<Record<Resource, Action[]>>>;

const PERMISSIONS: PermissionMap = {
  admin: {
    users: ['read', 'write', 'delete'],
    dockets: ['read', 'write', 'delete'],
    inventory: ['read', 'write', 'delete'],
    complaints: ['read', 'write', 'delete'],
    analytics: ['read'],
    settings: ['read', 'write'],
    plans: ['read', 'write', 'delete'],
    background: ['read', 'write'],
  },
  manager: {
    users: ['read'],
    dockets: ['read', 'write'],
    inventory: ['read', 'write'],
    complaints: ['read', 'write'],
    analytics: ['read'],
    settings: ['read'],
    plans: ['read'],
    background: ['read'],
  },
  employee: {
    dockets: ['read', 'write'],
    inventory: ['read'],
    complaints: ['read'],
  },
  customer: {
    dockets: ['read', 'write'],
    complaints: ['read', 'write'],
  },
};

export function can(role: string, resource: Resource, action: Action): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}