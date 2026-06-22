import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notificationSchema } from '../validation/schemas.js';

const router = Router();

router.get('/api/notifications', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { unread_only } = req.query;
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [req.user!.id];
    if (unread_only === 'true') {
      sql += ' AND is_read = 0';
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const notifications = db.prepare(sql).all(...params);
    return res.json({ success: true, data: notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    return res.json({ success: true, data: { ...notification, is_read: 1 } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/notifications', requireAuth, requireAdmin, validate(notificationSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { user_id, title, message, type, link } = req.body;
    if (!user_id || !title) {
      return res.status(400).json({ success: false, error: 'User ID and title are required' });
    }
    const result = db.prepare(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)'
    ).run(user_id, title, message || null, type || 'info', link || null);
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: notification });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
