import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin, requireManager } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { travelRequestSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/travel', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, status, from_date, to_date } = req.query;
    let sql = `
      SELECT t.*, u.first_name || ' ' || u.last_name as employee_name,
             au.first_name || ' ' || au.last_name as approved_by_name
      FROM travel_requests t
      LEFT JOIN employees emp ON t.employee_id = emp.id
      LEFT JOIN users u ON emp.user_id = u.id
      LEFT JOIN users au ON t.approved_by = au.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) { sql += ' AND t.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (from_date) { sql += ' AND t.start_date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND t.end_date <= ?'; params.push(to_date); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'emp.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY t.created_at DESC';
    const requests = db.prepare(sql).all(...params);
    return res.json({ success: true, data: requests });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/travel', requireAuth, validate(travelRequestSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, from_location, to_location, start_date, end_date, travel_mode, purpose, estimated_cost, accommodation_required } = req.body;
    let empId = employee_id;
    if (!empId) {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (emp) empId = emp.id;
    }
    if (!empId) return res.status(400).json({ success: false, error: 'Employee ID is required' });
    const result = db.prepare(
      'INSERT INTO travel_requests (employee_id, from_location, to_location, start_date, end_date, travel_mode, purpose, estimated_cost, accommodation_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(empId, from_location, to_location, start_date, end_date, travel_mode, purpose, estimated_cost || 0, accommodation_required ? 1 : 0);
    const request = db.prepare('SELECT * FROM travel_requests WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: request });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/travel/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM travel_requests WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ success: false, error: 'Travel request not found' });
    if (req.user!.role === 'employee' && existing.employee_id) {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (!emp || emp.id !== existing.employee_id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Can only edit pending requests' });
    }
    const { from_location, to_location, start_date, end_date, travel_mode, purpose, estimated_cost, accommodation_required } = req.body;
    db.prepare(`
      UPDATE travel_requests SET from_location = COALESCE(?, from_location),
        to_location = COALESCE(?, to_location), start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date), travel_mode = COALESCE(?, travel_mode),
        purpose = COALESCE(?, purpose), estimated_cost = COALESCE(?, estimated_cost),
        accommodation_required = COALESCE(?, accommodation_required)
      WHERE id = ?
    `).run(from_location ?? null, to_location ?? null, start_date ?? null, end_date ?? null, travel_mode ?? null, purpose ?? null, estimated_cost ?? null, accommodation_required !== undefined ? (accommodation_required ? 1 : 0) : null, req.params.id);
    const updated = db.prepare('SELECT * FROM travel_requests WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/travel/:id/approve', requireAuth, requireManager, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status } = req.body;
    if (!status || !['approved', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const request = db.prepare('SELECT * FROM travel_requests WHERE id = ?').get(req.params.id) as any;
    if (!request) return res.status(404).json({ success: false, error: 'Travel request not found' });
    db.prepare(
      "UPDATE travel_requests SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?"
    ).run(status, req.user!.id, req.params.id);
    const updated = db.prepare(`
      SELECT t.*, u.first_name || ' ' || u.last_name as approved_by_name
      FROM travel_requests t LEFT JOIN users u ON t.approved_by = u.id WHERE t.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
