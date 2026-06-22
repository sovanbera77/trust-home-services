import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/background', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bg = await db.get("SELECT value FROM app_settings WHERE key='homeBackground'") as any;
    const opacity = await db.get("SELECT value FROM app_settings WHERE key='homeBgOpacity'") as any;
    res.json({
      success: true,
      data: {
        background: bg ? JSON.parse(bg.value) : null,
        opacity: opacity ? parseFloat(opacity.value) : 0.4,
      },
    });
  } catch (err) { next(err); }
});

router.put('/background', authenticate, authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { background, opacity } = z.object({
      background: z.object({ src: z.string(), type: z.string() }).nullable(),
      opacity: z.number().min(0).max(1).optional(),
    }).parse(req.body);

    const upsert = `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`;

    if (background) {
      await db.run(upsert, 'homeBackground', JSON.stringify(background));
    } else {
      await db.run("DELETE FROM app_settings WHERE key='homeBackground'");
    }

    if (opacity !== undefined) {
      await db.run(upsert, 'homeBgOpacity', String(opacity));
    }

    res.json({ success: true, data: { background, opacity } });
  } catch (err) { next(err); }
});

export default router;
