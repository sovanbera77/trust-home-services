import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth as authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/api/referrals', authenticate, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM referrals').all();
    const referrals = rows.map((r: any) => ({
      ...r,
      history: r.history ? JSON.parse(r.history) : []
    }));
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

router.post('/api/referrals', authenticate, (req, res) => {
  try {
    const db = getDb();
    const referral = req.body;
    db.prepare(`
      INSERT INTO referrals (id, userId, code, points, history, createdAt) 
      VALUES (@id, @userId, @code, @points, @history, @createdAt)
    `).run({
      id: referral.id,
      userId: referral.userId,
      code: referral.code,
      points: referral.points || 0,
      history: JSON.stringify(referral.history || []),
      createdAt: referral.createdAt || new Date().toISOString()
    });
    res.status(201).json(referral);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

router.post('/api/referrals/:id/points', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { points, action } = req.body;
    
    const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    
    const history = row.history ? JSON.parse(row.history) : [];
    history.push({
      date: new Date().toISOString(),
      action,
      points
    });
    
    db.prepare('UPDATE referrals SET points = points + ?, history = ? WHERE id = ?').run(
      points, JSON.stringify(history), req.params.id
    );
    
    res.json({ success: true, newPoints: row.points + points });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add points' });
  }
});

export default router;
