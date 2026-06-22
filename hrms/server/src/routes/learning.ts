import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { courseSchema, enrollmentSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/courses', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, category } = req.query;
    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY created_at DESC';
    const courses = db.prepare(sql).all(...params);
    return res.json({ success: true, data: courses });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/courses', requireAuth, requireAdmin, validate(courseSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { title, description, category, duration_hours, instructor, is_mandatory } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Course title is required' });
    }
    const result = db.prepare(
      'INSERT INTO courses (title, description, category, duration_hours, instructor, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, description || null, category || null, duration_hours || null, instructor || null, is_mandatory || 0);
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: course });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/employee-courses', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, course_id, status } = req.query;
    let sql = `
      SELECT ec.*, c.title as course_title, c.category, c.duration_hours, c.instructor,
             e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name
      FROM employee_courses ec
      LEFT JOIN courses c ON ec.course_id = c.id
      LEFT JOIN employees e ON ec.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) { sql += ' AND ec.employee_id = ?'; params.push(employee_id); }
    if (course_id) { sql += ' AND ec.course_id = ?'; params.push(course_id); }
    if (status) { sql += ' AND ec.status = ?'; params.push(status); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'e.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY ec.created_at DESC';
    const enrollments = db.prepare(sql).all(...params);
    return res.json({ success: true, data: enrollments });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/employee-courses', requireAuth, requireAdmin, validate(enrollmentSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { employee_id, course_id } = req.body;
    if (!employee_id || !course_id) {
      return res.status(400).json({ success: false, error: 'Employee and course are required' });
    }
    const existing = db.prepare('SELECT id FROM employee_courses WHERE employee_id = ? AND course_id = ?').get(employee_id, course_id);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Employee already enrolled in this course' });
    }
    const result = db.prepare(
      'INSERT INTO employee_courses (employee_id, course_id) VALUES (?, ?)'
    ).run(employee_id, course_id);
    const enrollment = db.prepare(`
      SELECT ec.*, c.title as course_title FROM employee_courses ec
      LEFT JOIN courses c ON ec.course_id = c.id WHERE ec.id = ?
    `).get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: enrollment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/employee-courses/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM employee_courses WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }
    if (req.user!.role === 'employee') {
      const emp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user!.id) as any;
      if (!emp || existing.employee_id !== emp.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    const { progress_percent, status, score } = req.body;
    let completedAt = null;
    if (status === 'completed' || (progress_percent !== undefined && progress_percent >= 100)) {
      completedAt = new Date().toISOString();
    }
    db.prepare(`
      UPDATE employee_courses SET progress_percent = COALESCE(?, progress_percent),
        status = COALESCE(?, status), score = COALESCE(?, score),
        completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(progress_percent ?? null, status || null, score ?? null, completedAt, req.params.id);
    const enrollment = db.prepare(`
      SELECT ec.*, c.title as course_title FROM employee_courses ec
      LEFT JOIN courses c ON ec.course_id = c.id WHERE ec.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: enrollment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
