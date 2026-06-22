import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin, requireManager } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { expenseSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/expenses', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, status, from_date, to_date } = req.query;
    let sql = `
      SELECT e.*, u.first_name || ' ' || u.last_name as employee_name,
             au.first_name || ' ' || au.last_name as approved_by_name
      FROM expenses e
      LEFT JOIN employees emp ON e.employee_id = emp.id
      LEFT JOIN users u ON emp.user_id = u.id
      LEFT JOIN users au ON e.approved_by = au.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) { sql += ' AND e.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (from_date) { sql += ' AND e.expense_date >= ?'; params.push(from_date); }
    if (to_date) { sql += ' AND e.expense_date <= ?'; params.push(to_date); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'emp.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY e.created_at DESC';
    const expenses = db.prepare(sql).all(...params);
    return res.json({ success: true, data: expenses });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/expenses', requireAuth, validate(expenseSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, category, amount, description, receipt_url, expense_date } = req.body;
    let empId = employee_id;
    if (!empId) {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (emp) empId = emp.id;
    }
    if (!empId) return res.status(400).json({ success: false, error: 'Employee ID is required' });
    const result = db.prepare(
      'INSERT INTO expenses (employee_id, category, amount, description, receipt_url, expense_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(empId, category, amount, description || null, receipt_url || null, expense_date);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: expense });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/expenses/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ success: false, error: 'Expense not found' });
    if (req.user!.role === 'employee' && existing.employee_id) {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (!emp || emp.id !== existing.employee_id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Can only edit pending expenses' });
    }
    const { category, amount, description, receipt_url, expense_date } = req.body;
    db.prepare(`
      UPDATE expenses SET category = COALESCE(?, category), amount = COALESCE(?, amount),
        description = COALESCE(?, description), receipt_url = COALESCE(?, receipt_url),
        expense_date = COALESCE(?, expense_date)
      WHERE id = ?
    `).run(category ?? null, amount ?? null, description ?? null, receipt_url ?? null, expense_date ?? null, req.params.id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: expense });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/expenses/:id/approve', requireAuth, requireManager, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status } = req.body;
    if (!status || !['approved', 'rejected', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be approved, rejected, or paid' });
    }
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id) as any;
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });
    db.prepare(
      "UPDATE expenses SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?"
    ).run(status, req.user!.id, req.params.id);
    const updated = db.prepare(`
      SELECT e.*, u.first_name || ' ' || u.last_name as approved_by_name
      FROM expenses e LEFT JOIN users u ON e.approved_by = u.id WHERE e.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/expenses/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id) as any;
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });
    if (req.user!.role === 'employee' && expense.employee_id) {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (!emp || emp.id !== expense.employee_id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
    }
    if (expense.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Can only delete pending expenses' });
    }
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    return res.json({ success: true, data: { id: parseInt(req.params.id) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
