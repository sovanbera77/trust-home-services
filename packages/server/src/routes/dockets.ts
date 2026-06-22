import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { emitNotification } from '../index';
import { sendWhatsApp } from '../services/whatsapp';
import { sendSms } from '../services/sms';
import { sendNotificationEmail } from '../services/email';

const router = Router();

async function addNotif(userId: string, title: string, body: string, type: string, tag: string) {
  try {
    const id = uuid();
    await db.run('INSERT INTO notifications (id,user_id,title,body,type,tag) VALUES (?,?,?,?,?,?)',
      id, userId, title, body, type, tag);
    const user = await db.get('SELECT email FROM users WHERE username=?', userId) as any;
    if (user?.email) {
      sendNotificationEmail(user.email, title, body).catch(() => {});
    }
  } catch {}
}

router.use(authenticate);

const createSchema = z.object({
  type: z.enum(['repair', 'installation']),
  title: z.string().min(1),
  desc: z.string().min(1),
  address: z.string().min(1),
  preferredDate: z.string().min(1),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let rows: any[];

    if (user.role === 'admin') {
      rows = await db.all('SELECT * FROM dockets ORDER BY created_at DESC') as any[];
    } else if (user.role === 'employee') {
      rows = await db.all('SELECT * FROM dockets WHERE assigned_to = ? ORDER BY created_at DESC', user.username) as any[];
    } else {
      rows = await db.all('SELECT * FROM dockets WHERE customer = ? ORDER BY created_at DESC', user.username) as any[];
    }

    res.json({ success: true, data: rows.map(mapDocket) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await db.get('SELECT * FROM dockets WHERE id = ?', req.params.id) as any;
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: mapDocket(row) });
  } catch (err) { next(err); }
});

router.post('/', authorize('customer'), auditLog('create', 'docket'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const id = uuid();
    const loc = data.location;

    await db.run(`INSERT INTO dockets (id, customer, type, title, desc, address, preferred_date, location_lat, location_lng)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      id, req.user!.username, data.type, data.title, data.desc, data.address, data.preferredDate,
      loc?.lat ?? null, loc?.lng ?? null
    );

    const row = await db.get('SELECT * FROM dockets WHERE id = ?', id) as any;
    const mapped = mapDocket(row);
    const msg = `${req.user!.username} submitted "${mapped.title}"`;
    await addNotif('admin', 'New Service Request', msg, 'info', 'docket-' + id);
    emitNotification('admin', 'admin', { title: 'New Service Request', body: msg, type: 'info', tag: 'docket-' + id });
    sendWhatsApp('admin', msg).catch(() => {});
    sendSms('admin', msg).catch(() => {});
    res.status(201).json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.patch('/:id/assign', authorize('admin'), auditLog('assign', 'docket'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employee } = z.object({ employee: z.string().min(1) }).parse(req.body);
    await db.run(`UPDATE dockets SET status = 'assigned', assigned_to = ?, updated_at = datetime('now') WHERE id = ?`,
      employee, req.params.id);
    const row = await db.get('SELECT * FROM dockets WHERE id = ?', req.params.id) as any;
    const mapped = mapDocket(row);
    const empMsg = `"${mapped.title}" has been assigned to you`;
    await addNotif(employee, 'New Job Assigned', empMsg, 'success', 'docket-' + req.params.id);
    emitNotification(employee, null, { title: 'New Job Assigned', body: empMsg, type: 'success', tag: 'docket-' + req.params.id });
    sendWhatsApp(employee, empMsg).catch(() => {});
    if (mapped.customer) {
      const custMsg = `"${mapped.title}" has been assigned to ${employee}`;
      await addNotif(mapped.customer, 'Job Assigned', custMsg, 'info', 'docket-' + req.params.id);
      emitNotification(mapped.customer, null, { title: 'Job Assigned', body: custMsg, type: 'info', tag: 'docket-' + req.params.id });
      sendWhatsApp(mapped.customer, custMsg).catch(() => {});
    }
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.patch('/:id/complete', authorize('employee'), auditLog('complete', 'docket'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      serviceFee: z.number().min(0),
      materialCosts: z.number().min(0),
      paymentMethod: z.enum(['Cash', 'PhonePe', 'Due', 'Online']),
      usedPart: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const amount = data.serviceFee + data.materialCosts;

    await db.run(`UPDATE dockets SET status='completed', completed_date=date('now'), service_fee=?, material_costs=?,
      used_part=?, amount_received=?, payment_method=?, updated_at=datetime('now') WHERE id=?`,
      data.serviceFee, data.materialCosts, data.usedPart || null, amount, data.paymentMethod, req.params.id);

    const row = await db.get('SELECT * FROM dockets WHERE id = ?', req.params.id) as any;
    const mapped = mapDocket(row);
    const adminMsg = `${req.user!.username} completed "${mapped.title}". Amount: ₹${amount} (${data.paymentMethod})`;
    await addNotif('admin', 'Job Completed', adminMsg, 'success', 'docket-' + req.params.id);
    emitNotification('admin', 'admin', { title: 'Job Completed', body: adminMsg, type: 'success', tag: 'docket-' + req.params.id });
    if (mapped.customer) {
      const custMsg = `"${mapped.title}" has been completed. Amount: ₹${amount}`;
      await addNotif(mapped.customer, 'Service Completed', custMsg, 'success', 'docket-' + req.params.id);
      emitNotification(mapped.customer, null, { title: 'Service Completed', body: custMsg, type: 'success', tag: 'docket-' + req.params.id });
      sendWhatsApp(mapped.customer, custMsg).catch(() => {});
    }
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.patch('/:id/reject', authorize('admin', 'customer'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = z.object({ reason: z.string() }).parse(req.body);
    await db.run(`UPDATE dockets SET status='rejected', rejection_reason=?, updated_at=datetime('now') WHERE id=?`,
      reason, req.params.id);
    const row = await db.get('SELECT * FROM dockets WHERE id = ?', req.params.id) as any;
    const mapped = mapDocket(row);
    const isCustomerReject = req.user!.role === 'customer';
    const target = isCustomerReject ? 'admin' : mapped.customer;
    const action = isCustomerReject ? 'Cancelled' : 'Rejected';
    const msg = `"${mapped.title}" - ${reason}`;
    await addNotif(target, 'Docket ' + action, msg, 'error', 'docket-' + req.params.id);
    emitNotification(target, null, { title: 'Docket ' + action, body: msg, type: 'error', tag: 'docket-' + req.params.id });
    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

router.patch('/:id/date', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { expectedDate } = z.object({ expectedDate: z.string() }).parse(req.body);
    await db.run(`UPDATE dockets SET expected_date=?, updated_at=datetime('now') WHERE id=?`,
      expectedDate, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/chat', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    const row = await db.get('SELECT chat FROM dockets WHERE id = ?', req.params.id) as any;
    if (!row) { res.status(404).json({ success: false, error: 'Not found' }); return; }

    const chat = JSON.parse(row.chat || '[]');
    chat.push({ sender: req.user!.username, text, time: new Date().toLocaleTimeString() });
    await db.run('UPDATE dockets SET chat = ?, updated_at = datetime(\'now\') WHERE id = ?',
      JSON.stringify(chat), req.params.id);
    res.json({ success: true, data: chat });
  } catch (err) { next(err); }
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(500).optional(),
});

router.get('/reviews/:username', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT id, title, rating, review, customer, completed_date FROM dockets WHERE assigned_to=? AND rating IS NOT NULL ORDER BY completed_date DESC LIMIT 50',
      req.params.username) as any[];
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.patch('/:id/review', authorize('customer'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = reviewSchema.parse(req.body);
    const row = await db.get('SELECT * FROM dockets WHERE id=? AND customer=?', req.params.id, req.user!.username) as any;
    if (!row) { res.status(404).json({ success: false, error: 'Docket not found or not yours' }); return; }
    await db.run('UPDATE dockets SET rating=?, review=?, updated_at=datetime(\'now\') WHERE id=?', data.rating, data.review || null, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/pay', authorize('customer'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run(`UPDATE dockets SET is_paid=1, payment_method='Online', updated_at=datetime('now') WHERE id=?`,
      req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

function mapDocket(row: any) {
  return {
    id: row.id,
    customer: row.customer,
    type: row.type,
    title: row.title,
    desc: row.desc,
    address: row.address,
    preferredDate: row.preferred_date,
    status: row.status,
    assignedTo: row.assigned_to,
    location: row.location_lat ? { lat: row.location_lat, lng: row.location_lng } : undefined,
    date: row.date,
    completedDate: row.completed_date,
    expectedDate: row.expected_date,
    serviceFee: row.service_fee,
    materialCosts: row.material_costs,
    usedPart: row.used_part,
    amountReceived: row.amount_received,
    paymentMethod: row.payment_method,
    isPaid: !!row.is_paid,
    rejectionReason: row.rejection_reason,
    rating: row.rating,
    review: row.review,
    chat: JSON.parse(row.chat || '[]'),
    photoUrls: JSON.parse(row.photo_urls || '[]'),
  };
}

export default router;
