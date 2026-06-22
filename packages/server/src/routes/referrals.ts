import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT * FROM referrals ORDER BY created_at DESC') as any[];
    res.json({ success: true, data: rows.map((r: any) => ({
      id: r.id, code: r.code, userId: r.user_id, earned: r.earned, usedCount: r.used_count, createdAt: r.created_at,
    })) });
  } catch (err) { next(err); }
});

router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await db.get('SELECT * FROM referrals WHERE user_id=?', req.user!.username) as any;
    if (!row) { res.json({ success: true, data: null }); return; }
    res.json({ success: true, data: { id: row.id, code: row.code, userId: row.user_id, earned: row.earned, usedCount: row.used_count, createdAt: row.created_at } });
  } catch (err) { next(err); }
});

const createSchema = z.object({
  code: z.string().min(3).max(20),
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = createSchema.parse(req.body);
    const existing = await db.get('SELECT id FROM referrals WHERE code=?', code) as any;
    if (existing) { res.status(409).json({ success: false, error: 'Code already exists' }); return; }
    const id = require('uuid').v4();
    await db.run('INSERT INTO referrals (id, code, user_id) VALUES (?,?,?)', id, code, req.user!.username);
    res.status(201).json({ success: true, data: { id, code, userId: req.user!.username, earned: 0, usedCount: 0, createdAt: new Date().toISOString() } });
  } catch (err) { next(err); }
});

const redeemSchema = z.object({
  code: z.string().min(1),
});

router.post('/redeem', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = redeemSchema.parse(req.body);
    const ref = await db.get('SELECT * FROM referrals WHERE code=?', code) as any;
    if (!ref) { res.status(404).json({ success: false, error: 'Invalid referral code' }); return; }
    if (ref.user_id === req.user!.username) { res.status(400).json({ success: false, error: 'Cannot redeem your own code' }); return; }
    await db.run('UPDATE referrals SET earned=earned+50, used_count=used_count+1 WHERE id=?', ref.id);
    const updated = await db.get('SELECT * FROM referrals WHERE id=?', ref.id) as any;
    res.json({ success: true, data: { id: updated.id, code: updated.code, userId: updated.user_id, earned: updated.earned, usedCount: updated.used_count, createdAt: updated.created_at } });
  } catch (err) { next(err); }
});

export default router;
