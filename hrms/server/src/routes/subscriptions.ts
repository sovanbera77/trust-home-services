import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth as authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/api/subscriptions', authenticate, (req, res) => {
  try {
    const db = getDb();
    const subscriptions = db.prepare('SELECT * FROM subscriptions').all();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

router.post('/api/subscriptions', authenticate, (req, res) => {
  try {
    const db = getDb();
    const sub = req.body;
    db.prepare(`
      INSERT INTO subscriptions (id, user, planId, planName, startDate, endDate, status, createdAt) 
      VALUES (@id, @user, @planId, @planName, @startDate, @endDate, @status, @createdAt)
    `).run({
      id: sub.id,
      user: sub.user,
      planId: sub.planId,
      planName: sub.planName,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.status || 'active',
      createdAt: sub.createdAt || new Date().toISOString()
    });
    res.status(201).json(sub);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.get('/api/subscription-plans', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subscription_plans').all();
    const plans = rows.map((r: any) => ({
      ...r,
      perks: r.perks ? JSON.parse(r.perks) : [],
      popular: Boolean(r.popular),
      active: Boolean(r.active)
    }));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

export default router;
