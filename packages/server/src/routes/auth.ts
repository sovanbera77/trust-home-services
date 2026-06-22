import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { generateToken } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'trust-home-secret-change-in-production';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['customer', 'employee', 'admin']),
});

const signupSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(4),
  role: z.enum(['customer', 'employee']),
  name: z.string().min(1),
  mobile: z.string().min(7).max(15),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  specialty: z.string().optional().or(z.literal('')),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, role } = loginSchema.parse(req.body);
    const user = await db.get('SELECT * FROM users WHERE username = ?', username) as any;

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }
    if (user.role !== role) {
      res.status(401).json({ success: false, error: 'Invalid role for this user' });
      return;
    }
    if (!bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ success: false, error: 'Incorrect password' });
      return;
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          address: user.address,
          specialty: user.specialty,
          status: user.status,
        },
      },
    });
  } catch (err: any) {
    next(err);
  }
});

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await db.get('SELECT id FROM users WHERE username = ?', data.username);
    if (existing) {
      res.status(409).json({ success: false, error: 'Username already exists' });
      return;
    }

    const hashed = bcrypt.hashSync(data.password, 10);
    const id = uuid();
    await db.run(`INSERT INTO users (id, username, password, role, name, mobile, email, address, specialty, status)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, data.username, hashed, data.role, data.name, data.mobile,
      data.email || '', data.address || '', data.specialty || '', 'offline'
    );

    const token = generateToken({ id, username: data.username, role: data.role });
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id,
          username: data.username,
          role: data.role,
          name: data.name,
          mobile: data.mobile,
          email: data.email || '',
          address: data.address || '',
          specialty: data.specialty || '',
          status: 'offline',
        },
      },
    });
  } catch (err: any) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const newToken = generateToken({ id: decoded.id, username: decoded.username, role: decoded.role });
    res.json({ success: true, data: { token: newToken } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

export default router;
