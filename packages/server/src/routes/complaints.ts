import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = req.user!.role === 'admin'
      ? await db.all('SELECT * FROM complaints ORDER BY created_at DESC')
      : await db.all('SELECT * FROM complaints WHERE customer=? ORDER BY created_at DESC', req.user!.username);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/', authorize('customer'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, desc } = z.object({ title: z.string().min(1), desc: z.string().min(1) }).parse(req.body);
    const id = uuid();
    await db.run('INSERT INTO complaints (id, customer, title, desc) VALUES (?,?,?,?)',
      id, req.user!.username, title, desc);
    res.status(201).json({ success: true, data: { id, title, desc, status: 'pending' } });
  } catch (err) { next(err); }
});

router.patch('/:id/resolve', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run("UPDATE complaints SET status='resolved' WHERE id=?", req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
