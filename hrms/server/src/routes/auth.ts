import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hrms-secret-key';

router.post('/api/auth/login', validate(loginSchema), (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      success: true,
      data: { token, user: payload },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/auth/register', requireAuth, requireAdmin, validate(registerSchema), (req: AuthRequest, res: Response) => {
  try {
    const { email, password, first_name, last_name, role, phone } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }
    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(email, password_hash, first_name, last_name, role || 'employee', phone || null);
    const user = db.prepare('SELECT id, email, role, first_name, last_name, phone, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, email, role, first_name, last_name, phone, avatar_url, created_at FROM users WHERE id = ?').get(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Also get employee data if exists
    const emp = db.prepare(`
      SELECT e.*, d.name as department_name, des.title as designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE e.user_id = ?
    `).get(req.user!.id);
    return res.json({ success: true, data: { ...(user as any), employee: emp || null } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { first_name, last_name, phone } = req.body;
    db.prepare('UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone = COALESCE(?, phone) WHERE id = ?')
      .run(first_name || null, last_name || null, phone || null, req.user!.id);
    const user = db.prepare('SELECT id, email, role, first_name, last_name, phone, avatar_url, created_at FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ success: true, data: user });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/auth/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    const password_hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user!.id);
    return res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
