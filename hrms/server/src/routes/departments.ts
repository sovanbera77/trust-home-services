import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { departmentSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/departments', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const departments = db.prepare(`
      SELECT d.*, u.first_name || ' ' || u.last_name as manager_name,
             (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.name ASC
    `).all();
    return res.json({ success: true, data: departments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/departments', requireAuth, requireAdmin, validate(departmentSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { name, code, description, manager_id } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }
    const result = db.prepare(
      'INSERT INTO departments (name, code, description, manager_id) VALUES (?, ?, ?, ?)'
    ).run(name, code, description || null, manager_id || null);
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: dept });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Department name or code already exists' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/departments/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    const { name, code, description, manager_id, is_active } = req.body;
    db.prepare(
      'UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code), description = COALESCE(?, description), manager_id = COALESCE(?, manager_id), is_active = COALESCE(?, is_active) WHERE id = ?'
    ).run(name || null, code || null, description ?? null, manager_id ?? null, is_active ?? null, req.params.id);
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: dept });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/departments/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM departments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }
    db.prepare('UPDATE departments SET is_active = 0 WHERE id = ?').run(req.params.id);
    return res.json({ success: true, data: { message: 'Department deactivated' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
