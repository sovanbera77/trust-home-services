import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth as authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/api/dockets', authenticate, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM dockets').all();
    
    // Parse JSON fields
    const dockets = rows.map((r: any) => ({
      ...r,
      chat: r.chat ? JSON.parse(r.chat) : [],
      photoUrls: r.photoUrls ? JSON.parse(r.photoUrls) : [],
      images: r.images ? JSON.parse(r.images) : [],
      isPaid: Boolean(r.isPaid)
    }));
    
    res.json(dockets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dockets' });
  }
});

router.get('/api/dockets/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const docket = db.prepare('SELECT * FROM dockets WHERE id = ?').get(req.params.id) as any;
    if (!docket) return res.status(404).json({ error: 'Not found' });
    
    res.json({
      ...docket,
      chat: docket.chat ? JSON.parse(docket.chat) : [],
      photoUrls: docket.photoUrls ? JSON.parse(docket.photoUrls) : [],
      images: docket.images ? JSON.parse(docket.images) : [],
      isPaid: Boolean(docket.isPaid)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch docket' });
  }
});

router.post('/api/dockets', authenticate, (req, res) => {
  try {
    const db = getDb();
    const docket = req.body;
    
    db.prepare(`
      INSERT INTO dockets (
        id, customer, type, title, desc, address, pincode, lat, lng, preferredDate, 
        status, assignedTo, date, createdAt, expectedDate, serviceFee, materialCosts, 
        usedPart, amountReceived, paymentMethod, isPaid, rejectionReason, rating, 
        review, chat, photoUrls, images
      ) VALUES (
        @id, @customer, @type, @title, @desc, @address, @pincode, @lat, @lng, @preferredDate,
        @status, @assignedTo, @date, @createdAt, @expectedDate, @serviceFee, @materialCosts,
        @usedPart, @amountReceived, @paymentMethod, @isPaid, @rejectionReason, @rating,
        @review, @chat, @photoUrls, @images
      )
    `).run({
      id: docket.id,
      customer: docket.customer || '',
      type: docket.type || 'repair',
      title: docket.title || '',
      desc: docket.desc || '',
      address: docket.address || '',
      pincode: docket.pincode || '',
      lat: docket.lat || null,
      lng: docket.lng || null,
      preferredDate: docket.preferredDate || '',
      status: docket.status || 'pending',
      assignedTo: docket.assignedTo || null,
      date: docket.date || new Date().toISOString(),
      createdAt: docket.createdAt || new Date().toISOString(),
      expectedDate: docket.expectedDate || null,
      serviceFee: docket.serviceFee || 0,
      materialCosts: docket.materialCosts || 0,
      usedPart: docket.usedPart || '',
      amountReceived: docket.amountReceived || 0,
      paymentMethod: docket.paymentMethod || '',
      isPaid: docket.isPaid ? 1 : 0,
      rejectionReason: docket.rejectionReason || '',
      rating: docket.rating || 0,
      review: docket.review || '',
      chat: JSON.stringify(docket.chat || []),
      photoUrls: JSON.stringify(docket.photoUrls || []),
      images: JSON.stringify(docket.images || [])
    });
    
    res.status(201).json(docket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create docket' });
  }
});

router.patch('/api/dockets/:id/assign', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { employee } = req.body;
    db.prepare("UPDATE dockets SET assignedTo = ?, status = 'assigned' WHERE id = ?").run(employee, req.params.id);
    const updated = db.prepare('SELECT * FROM dockets WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign docket' });
  }
});

router.patch('/api/dockets/:id/complete', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { serviceFee, materialCosts, paymentMethod, usedPart } = req.body;
    db.prepare(`
      UPDATE dockets 
      SET status = 'completed', serviceFee = ?, materialCosts = ?, paymentMethod = ?, usedPart = ?, completedDate = ?
      WHERE id = ?
    `).run(serviceFee, materialCosts, paymentMethod, usedPart, new Date().toISOString(), req.params.id);
    const updated = db.prepare('SELECT * FROM dockets WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete docket' });
  }
});

router.patch('/api/dockets/:id/reject', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { reason } = req.body;
    db.prepare("UPDATE dockets SET status = 'rejected', rejectionReason = ? WHERE id = ?").run(reason, req.params.id);
    const updated = db.prepare('SELECT * FROM dockets WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject docket' });
  }
});

router.post('/api/dockets/:id/chat', authenticate, (req, res) => {
  try {
    const db = getDb();
    const message = req.body;
    const docket = db.prepare('SELECT chat FROM dockets WHERE id = ?').get(req.params.id) as any;
    if (!docket) return res.status(404).json({ error: 'Not found' });
    
    const chat = docket.chat ? JSON.parse(docket.chat) : [];
    chat.push(message);
    
    db.prepare('UPDATE dockets SET chat = ? WHERE id = ?').run(JSON.stringify(chat), req.params.id);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add chat message' });
  }
});

export default router;
