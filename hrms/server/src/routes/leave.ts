import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin, requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAccessScope } from '../middleware/rbac.js';
import { leaveTypeSchema, leaveRequestSchema, leaveApproveSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/leave-types', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const types = db.prepare('SELECT * FROM leave_types WHERE is_active = 1 ORDER BY name ASC').all();
    return res.json({ success: true, data: types });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/leave-types', requireAuth, requireAdmin, validate(leaveTypeSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { name, code, description, days_per_year, is_carry_forward, max_carry_forward, requires_approval, color } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }
    const result = db.prepare(
      'INSERT INTO leave_types (name, code, description, days_per_year, is_carry_forward, max_carry_forward, requires_approval, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, code, description || null, days_per_year || 0, is_carry_forward || 0, max_carry_forward || 0, requires_approval ?? 1, color || '#6366f1');
    const leaveType = db.prepare('SELECT * FROM leave_types WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: leaveType });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Leave type name or code already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/leave-requests', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, employee_id, from_date, to_date } = req.query;
    const scope = getAccessScope(req);
    let sql = `
      SELECT lr.*, lt.name as leave_type_name, lt.color as leave_type_color,
             e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name,
             au.first_name || ' ' || au.last_name as approved_by_name
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users au ON lr.approved_by = au.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { sql += ' AND lr.status = ?'; params.push(status); }
    if (employee_id) { sql += ' AND lr.employee_id = ?'; params.push(employee_id); }
    if (from_date) { sql += ' AND lr.start_date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND lr.end_date <= ?'; params.push(to_date); }
    if (!scope.isAdmin) {
      // For employees: only their own leaves. For managers: their dept + reports
      let scopeSql = scope.condition.replace(/e\./g, 'e.');
      sql += scopeSql;
      params.push(...scope.params);
    }
    sql += ' ORDER BY lr.created_at DESC';
    const requests = db.prepare(sql).all(...params);
    return res.json({ success: true, data: requests });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/leave-requests', requireAuth, validate(leaveRequestSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { leave_type_id, start_date, end_date, total_days, reason } = req.body;
    if (!leave_type_id || !start_date || !end_date || !total_days) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
    if (!emp) {
      return res.status(400).json({ success: false, error: 'Employee profile not found' });
    }
    const balance = db.prepare(
      'SELECT remaining_days FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = cast(strftime(\'%Y\',\'now\') as integer)'
    ).get(emp.id, leave_type_id) as any;
    if (balance && balance.remaining_days < total_days) {
      return res.status(400).json({ success: false, error: 'Insufficient leave balance' });
    }
    const result = db.prepare(
      'INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(emp.id, leave_type_id, start_date, end_date, total_days, reason || null);
    if (balance) {
      db.prepare(
        'UPDATE leave_balances SET pending_days = pending_days + ?, remaining_days = remaining_days - ? WHERE employee_id = ? AND leave_type_id = ? AND year = cast(strftime(\'%Y\',\'now\') as integer)'
      ).run(total_days, total_days, emp.id, leave_type_id);
    }
    const leaveReq = db.prepare(`
      SELECT lr.*, lt.name as leave_type_name FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id WHERE lr.id = ?
    `).get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: leaveReq });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/leave-requests/:id/approve', requireAuth, requireManager, validate(leaveApproveSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, comments } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be approved or rejected' });
    }
    const leaveReq = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id) as any;
    if (!leaveReq) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }
    if (leaveReq.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Leave request is already ' + leaveReq.status });
    }
    db.prepare(
      "UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = datetime('now'), comments = COALESCE(?, comments) WHERE id = ?"
    ).run(status, req.user!.id, comments || null, req.params.id);
    if (status === 'rejected') {
      const bal = db.prepare(
        'SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = cast(strftime(\'%Y\',\'now\') as integer)'
      ).get(leaveReq.employee_id, leaveReq.leave_type_id) as any;
      if (bal) {
        db.prepare(
          'UPDATE leave_balances SET pending_days = pending_days - ?, remaining_days = remaining_days + ? WHERE employee_id = ? AND leave_type_id = ? AND year = cast(strftime(\'%Y\',\'now\') as integer)'
        ).run(leaveReq.total_days, leaveReq.total_days, leaveReq.employee_id, leaveReq.leave_type_id);
      }
    }
    const updated = db.prepare(`
      SELECT lr.*, lt.name as leave_type_name, u.first_name || ' ' || u.last_name as approved_by_name
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN users u ON lr.approved_by = u.id
      WHERE lr.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/leave-balances', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, year } = req.query;
    let empId = employee_id;
    if (!empId && req.user!.role === 'employee') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (emp) empId = emp.id;
    }
    if (!empId) {
      return res.status(400).json({ success: false, error: 'Employee ID required' });
    }
    const currentYear = year || new Date().getFullYear();
    const balances = db.prepare(`
      SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.color
      FROM leave_balances lb
      LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ?
      ORDER BY lt.name ASC
    `).all(empId, currentYear);
    return res.json({ success: true, data: balances });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
