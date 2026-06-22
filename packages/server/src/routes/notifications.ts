import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      req.user!.username);
    res.json({ success: true, data: rows.map((r: any) => ({
      id: r.id, title: r.title, body: r.body, type: r.type, tag: r.tag,
      read: !!r.is_read, time: r.created_at,
    })) });
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, body, type, tag, userId } = z.object({
      title: z.string().min(1), body: z.string(), type: z.enum(['info','success','error','warning']),
      tag: z.string(), userId: z.string(),
    }).parse(req.body);
    const id = uuid();
    await db.run('INSERT INTO notifications (id,user_id,title,body,type,tag) VALUES (?,?,?,?,?,?)',
      id, userId, title, body, type, tag);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run('UPDATE notifications SET is_read=1 WHERE user_id=?', req.user!.username);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
