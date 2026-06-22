import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';

const router = Router();

router.get('/api/attendance', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { from_date, to_date, employee_id, status } = req.query;
    let sql = `
      SELECT a.*, e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name,
             d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (from_date) { sql += ' AND a.date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND a.date <= ?'; params.push(to_date); }
    if (employee_id) { sql += ' AND a.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'a.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY a.date DESC, a.clock_in DESC';
    const records = db.prepare(sql).all(...params);
    return res.json({ success: true, data: records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/attendance/clock-in', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
    if (!emp) {
      return res.status(400).json({ success: false, error: 'Employee profile not found' });
    }
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];
    const existing = db.prepare('SELECT id, clock_in, clock_out FROM attendance WHERE employee_id = ? AND date = ?').get(emp.id, today) as any;
    if (existing) {
      if (existing.clock_in && !existing.clock_out) {
        return res.status(400).json({ success: false, error: 'Already clocked in. Please clock out first.' });
      }
      return res.status(400).json({ success: false, error: 'Attendance already recorded for today' });
    }
    const result = db.prepare(
      'INSERT INTO attendance (employee_id, date, clock_in, status) VALUES (?, ?, ?, ?)'
    ).run(emp.id, today, now, 'present');
    const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/attendance/clock-out', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
    if (!emp) {
      return res.status(400).json({ success: false, error: 'Employee profile not found' });
    }
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];
    const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(emp.id, today) as any;
    if (!record) {
      return res.status(400).json({ success: false, error: 'No clock-in record found for today' });
    }
    if (record.clock_out) {
      return res.status(400).json({ success: false, error: 'Already clocked out for today' });
    }
    const clockIn = new Date(`1970-01-01T${record.clock_in}`);
    const clockOut = new Date(`1970-01-01T${now}`);
    const hoursWorked = Math.round((clockOut.getTime() - clockIn.getTime()) / 3600000 * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((hoursWorked - 9) * 100) / 100);
    db.prepare(
      'UPDATE attendance SET clock_out = ?, hours_worked = ?, overtime_hours = ? WHERE id = ?'
    ).run(now, hoursWorked, overtimeHours, record.id);
    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(record.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/attendance/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM attendance WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }
    const { clock_in, clock_out, hours_worked, overtime_hours, status, remarks } = req.body;
    db.prepare(
      'UPDATE attendance SET clock_in = COALESCE(?, clock_in), clock_out = COALESCE(?, clock_out), hours_worked = COALESCE(?, hours_worked), overtime_hours = COALESCE(?, overtime_hours), status = COALESCE(?, status), remarks = COALESCE(?, remarks) WHERE id = ?'
    ).run(clock_in || null, clock_out || null, hours_worked ?? null, overtime_hours ?? null, status || null, remarks ?? null, req.params.id);
    const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
