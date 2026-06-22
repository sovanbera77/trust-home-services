import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT id,username,role,name,mobile,email,address,specialty,status,location_lat,location_lng FROM users ORDER BY role, name');
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        ...r,
        location: r.location_lat ? { lat: r.location_lat, lng: r.location_lng } : undefined,
      })),
    });
  } catch (err) { next(err); }
});

router.get('/employees', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all("SELECT id,username,name,mobile,specialty,status,location_lat,location_lng FROM users WHERE role='employee'");
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.get('/customers', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all("SELECT id,username,name,mobile,email,address FROM users WHERE role='customer'");
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await db.get('SELECT id,username,role,name,mobile,email,address,specialty,status FROM users WHERE username = ?', req.user!.username);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.patch('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      mobile: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      specialty: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        if (key === 'email') { fields.push('email=?'); values.push(val); }
        else { fields.push(`${key}=?`); values.push(val); }
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at=datetime('now')");
      values.push(req.user!.username);
      await db.run(`UPDATE users SET ${fields.join(',')} WHERE username=?`, ...values);
    }

    const user = await db.get('SELECT id,username,role,name,mobile,email,address,specialty,status FROM users WHERE username = ?', req.user!.username);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      username: z.string().min(3),
      password: z.string().min(4),
      role: z.enum(['customer', 'employee']),
      name: z.string().min(1),
      mobile: z.string().min(7),
      email: z.string().optional().or(z.literal('')),
      address: z.string().optional().or(z.literal('')),
      specialty: z.string().optional().or(z.literal('')),
    });
    const data = schema.parse(req.body);

    const existing = await db.get('SELECT id FROM users WHERE username = ?', data.username);
    if (existing) { res.status(409).json({ success: false, error: 'Username exists' }); return; }

    const hashed = bcrypt.hashSync(data.password, 10);
    const id = uuid();
    await db.run(`INSERT INTO users (id,username,password,role,name,mobile,email,address,specialty) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, data.username, hashed, data.role, data.name, data.mobile,
      data.email || '', data.address || '', data.specialty || '');

    res.status(201).json({ success: true, data: { id, username: data.username, role: data.role, name: data.name } });
  } catch (err) { next(err); }
});

router.patch('/:username', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    const allowed = ['name', 'mobile', 'email', 'address', 'specialty'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key}=?`); values.push(data[key]); }
    }
    if (data.password) {
      fields.push('password=?');
      values.push(bcrypt.hashSync(data.password, 10));
    }
    if (fields.length > 0) {
      fields.push("updated_at=datetime('now')");
      values.push(req.params.username);
      await db.run(`UPDATE users SET ${fields.join(',')} WHERE username=?`, ...values);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:username', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run('DELETE FROM users WHERE username=?', req.params.username);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/me/duty', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({ status: z.enum(['online', 'offline']) }).parse(req.body);
    await db.run("UPDATE users SET status=?, updated_at=NOW() WHERE username=?", status, req.user!.username);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/locations', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all(
      "SELECT username, name, role, status, location_lat, location_lng FROM users WHERE role='employee' AND status='online' AND location_lat IS NOT NULL AND location_lng IS NOT NULL"
    );
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        username: r.username,
        name: r.name,
        status: r.status,
        lat: r.location_lat,
        lng: r.location_lng,
      })),
    });
  } catch (err) { next(err); }
});

export default router;
