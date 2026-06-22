import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT * FROM inventory ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, price, stock, sku } = z.object({
      name: z.string().min(1),
      price: z.number().min(0),
      stock: z.number().int().min(0).optional().default(0),
      sku: z.string().optional().default(''),
    }).parse(req.body);

    const id = uuid();
    await db.run('INSERT INTO inventory (id, name, price, stock, sku) VALUES (?,?,?,?,?)',
      id, name, price, stock, sku);
    res.status(201).json({ success: true, data: { id, name, price, stock, sku } });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run('DELETE FROM inventory WHERE id=?', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
