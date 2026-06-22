import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth as authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/api/complaints', authenticate, (req, res) => {
  try {
    const db = getDb();
    const complaints = db.prepare('SELECT * FROM complaints').all();
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

router.post('/api/complaints', authenticate, (req, res) => {
  try {
    const db = getDb();
    const complaint = req.body;
    db.prepare(`
      INSERT INTO complaints (id, customer, title, desc, status, date) 
      VALUES (@id, @customer, @title, @desc, @status, @date)
    `).run({
      id: complaint.id,
      customer: complaint.customer || '',
      title: complaint.title || '',
      desc: complaint.desc || '',
      status: complaint.status || 'pending',
      date: complaint.date || new Date().toISOString()
    });
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

router.patch('/api/complaints/:id/resolve', authenticate, (req, res) => {
  try {
    const db = getDb();
    db.prepare("UPDATE complaints SET status = 'resolved' WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve complaint' });
  }
});

export default router;
