import { AuthRequest } from './auth.js';
import { getDb } from '../db/schema.js';

export interface AccessScope {
  /** SQL condition snippet (with leading ' AND ') or '' for no restriction */
  condition: string;
  /** Parameter values for the condition */
  params: any[];
  /** The employee_id of the requesting user (null if not found) */
  employeeId: number | null;
  /** The department_id the user belongs to (null if not found) */
  departmentId: number | null;
  /** Whether user has unrestricted access */
  isAdmin: boolean;
}

/**
 * Builds an access scope for the current user.
 *
 * - super_admin / hr_manager: unrestricted (condition = '')
 * - manager: sees employees in their own department + those who report to them
 * - employee: sees only themselves
 */
export function getAccessScope(req: AuthRequest): AccessScope {
  const db = getDb();
  const role = req.user!.role;
  const userId = req.user!.id;

  // Admins and HR see everything
  if (['super_admin', 'admin', 'hr_manager'].includes(role)) {
    return { condition: '', params: [], employeeId: null, departmentId: null, isAdmin: true };
  }

  // Look up the employee record for this user
  const emp = db.prepare(
    'SELECT id, department_id, reporting_manager_id FROM employees WHERE user_id = ?'
  ).get(userId) as any;

  const employeeId = emp?.id ?? null;
  const departmentId = emp?.department_id ?? null;

  if (role === 'manager' && employeeId) {
    // Manager sees: their own department + direct reports
    return {
      condition: ' AND (e.department_id = ? OR e.reporting_manager_id = ? OR e.id = ?)',
      params: [departmentId, userId, employeeId],
      employeeId,
      departmentId,
      isAdmin: false,
    };
  }

  // Regular employee sees only themselves
  if (employeeId) {
    return {
      condition: ' AND e.id = ?',
      params: [employeeId],
      employeeId,
      departmentId,
      isAdmin: false,
    };
  }

  return { condition: '', params: [], employeeId: null, departmentId: null, isAdmin: false };
}
