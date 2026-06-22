import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { performanceReviewSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/performance-reviews', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, status } = req.query;
    let sql = `
      SELECT pr.*, e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name,
             rv.first_name || ' ' || rv.last_name as reviewer_name,
             d.name as department_name
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users rv ON pr.reviewer_id = rv.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) { sql += ' AND pr.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND pr.status = ?'; params.push(status); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'e.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY pr.created_at DESC';
    const reviews = db.prepare(sql).all(...params);
    return res.json({ success: true, data: reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/performance-reviews', requireAuth, requireAdmin, validate(performanceReviewSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, review_period, overall_rating, summary, status } = req.body;
    if (!employee_id || !review_period) {
      return res.status(400).json({ success: false, error: 'Employee and review period are required' });
    }
    const result = db.prepare(
      'INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, overall_rating, summary, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(employee_id, req.user!.id, review_period, overall_rating || null, summary || null, status || 'draft');
    const review = db.prepare(`
      SELECT pr.*, u.first_name || ' ' || u.last_name as employee_name,
             rv.first_name || ' ' || rv.last_name as reviewer_name
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users rv ON pr.reviewer_id = rv.id
      WHERE pr.id = ?
    `).get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/performance-reviews/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM performance_reviews WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }
    const { overall_rating, summary, status, review_period, review_date } = req.body;
    db.prepare(`
      UPDATE performance_reviews SET overall_rating = COALESCE(?, overall_rating),
        summary = COALESCE(?, summary), status = COALESCE(?, status),
        review_period = COALESCE(?, review_period), review_date = COALESCE(?, review_date),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(overall_rating ?? null, summary || null, status || null, review_period || null, review_date || null, req.params.id);
    const review = db.prepare(`
      SELECT pr.*, u.first_name || ' ' || u.last_name as employee_name,
             rv.first_name || ' ' || rv.last_name as reviewer_name
      FROM performance_reviews pr
      LEFT JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users rv ON pr.reviewer_id = rv.id
      WHERE pr.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: review });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/performance-goals', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { review_id } = req.query;
    let sql = 'SELECT * FROM performance_goals WHERE 1=1';
    const params: any[] = [];
    if (review_id) { sql += ' AND review_id = ?'; params.push(review_id); }
    sql += ' ORDER BY created_at DESC';
    const goals = db.prepare(sql).all(...params);
    return res.json({ success: true, data: goals });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/performance-goals', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { review_id, goal, category, target_date, rating, comments } = req.body;
    if (!review_id || !goal) {
      return res.status(400).json({ success: false, error: 'Review ID and goal text are required' });
    }
    const result = db.prepare(
      'INSERT INTO performance_goals (review_id, goal, category, target_date, rating, comments) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(review_id, goal, category || null, target_date || null, rating || null, comments || null);
    const perfGoal = db.prepare('SELECT * FROM performance_goals WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: perfGoal });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
