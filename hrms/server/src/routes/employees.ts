import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAccessScope } from '../middleware/rbac.js';
import { employeeCreateSchema, employeeUpdateSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/employees', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const scope = getAccessScope(req);
    let sql = `
      SELECT e.*, d.name as department_name, des.title as designation_name,
             u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active,
             rm.first_name || ' ' || rm.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users rm ON e.reporting_manager_id = rm.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (!scope.isAdmin) {
      // For employees/managers, use the same table alias 'e'
      let scopeSql = scope.condition.replace(/e\./g, 'e.');
      sql += scopeSql;
      params.push(...scope.params);
    }
    sql += ' ORDER BY e.created_at DESC';
    const employees = db.prepare(sql).all(...params);
    return res.json({ success: true, data: employees });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/employees/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const scope = getAccessScope(req);
    let sql = `
      SELECT e.*, d.name as department_name, des.title as designation_name,
             u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active,
             rm.first_name || ' ' || rm.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users rm ON e.reporting_manager_id = rm.id
      WHERE e.id = ?
    `;
    const params: any[] = [req.params.id];
    if (!scope.isAdmin) {
      let scopeSql = scope.condition.replace(/e\./g, 'e.');
      sql += scopeSql;
      params.push(...scope.params);
    }
    const employee = db.prepare(sql).get(...params);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    return res.json({ success: true, data: employee });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/employees', requireAuth, requireAdmin, validate(employeeCreateSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { email, password, first_name, last_name, role, ...empFields } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Missing required user fields' });
    }
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    const password_hash = bcrypt.hashSync(password, 10);
    const userResult = db.prepare(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(email, password_hash, first_name, last_name, role || 'employee');
    const userId = userResult.lastInsertRowid;
    const employeeCode = req.body.employee_code || `EMP${String(userId).padStart(4, '0')}`;
    const empResult = db.prepare(`
      INSERT INTO employees (user_id, employee_code, department_id, designation_id, reporting_manager_id,
        date_of_birth, gender, marital_status, blood_group, nationality, date_of_joining,
        employment_type, work_location, weekly_off_pattern, bank_name, bank_account_no, ifsc_code,
        pan_number, uan_number, pf_number, esi_number, salary_type, base_salary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, employeeCode, empFields.department_id || null, empFields.designation_id || null,
      empFields.reporting_manager_id || null, empFields.date_of_birth || null,
      empFields.gender || null, empFields.marital_status || null, empFields.blood_group || null,
      empFields.nationality || 'Indian', empFields.date_of_joining || null,
      empFields.employment_type || null, empFields.work_location || null, empFields.weekly_off_pattern || 'sun',
      empFields.bank_name || null, empFields.bank_account_no || null, empFields.ifsc_code || null,
      empFields.pan_number || null, empFields.uan_number || null, empFields.pf_number || null,
      empFields.esi_number || null, empFields.salary_type || null, empFields.base_salary || 0
    );
    const employee = db.prepare(`
      SELECT e.*, d.name as department_name, des.title as designation_name,
             u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(empResult.lastInsertRowid);
    return res.status(201).json({ success: true, data: employee });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/employees/:id', requireAuth, requireAdmin, validate(employeeUpdateSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const fields = [
      'department_id', 'designation_id', 'reporting_manager_id', 'date_of_birth', 'gender',
      'marital_status', 'blood_group', 'nationality', 'date_of_joining', 'date_of_confirmation',
      'employment_type', 'work_location', 'weekly_off_pattern', 'bank_name', 'bank_account_no',
      'ifsc_code', 'pan_number', 'uan_number', 'pf_number', 'esi_number', 'salary_type', 'base_salary',
    ];
    const updates: string[] = [];
    const values: any[] = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(req.params.id);
      db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    const employee = db.prepare(`
      SELECT e.*, d.name as department_name, des.title as designation_name,
             u.first_name, u.last_name, u.email, u.phone, u.role, u.is_active
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: employee });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/employees/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const employee = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(req.params.id) as any;
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    db.prepare("UPDATE employees SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(employee.user_id);
    return res.json({ success: true, data: { message: 'Employee deactivated' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
