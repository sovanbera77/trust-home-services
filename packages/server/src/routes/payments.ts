import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { v4 as uuid } from 'uuid';
import { db } from '../db/pg';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateInvoicePdf } from '../services/invoice';
import { sendWhatsApp } from '../services/whatsapp';

const router = Router();
router.use(authenticate);

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

const createOrderSchema = z.object({
  docketId: z.string(),
  amount: z.number(),
});

router.post('/create-order', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { docketId, amount } = createOrderSchema.parse(req.body);
    const docket = await db.get('SELECT id FROM dockets WHERE id = ?', docketId) as any;
    if (!docket) {
      res.status(404).json({ success: false, error: 'Docket not found' });
      return;
    }

    const razorpay = getRazorpay();
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: 'docket-' + docketId,
    };

    razorpay.orders.create(options, (err: any, order: any) => {
      if (err) {
        res.status(500).json({ success: false, error: 'Failed to create order' });
        return;
      }
      res.json({ success: true, data: { id: order.id, amount: order.amount, currency: order.currency } });
    });
  } catch (err) { next(err); }
});

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  docketId: z.string(),
});

router.post('/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, docketId } = verifySchema.parse(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, error: 'Invalid signature' });
      return;
    }

    await db.run(`UPDATE dockets SET is_paid=1, payment_method='Online', payment_id=?, updated_at=datetime('now') WHERE id=?`,
      razorpay_payment_id, docketId);

    const docket = await db.get(`SELECT d.*, u.name as cname, u.mobile as cmobile, u.address as caddress FROM dockets d LEFT JOIN users u ON u.username=d.customer WHERE d.id=?`,
      docketId) as any;

    if (docket) {
      const invoiceNo = `INV-${new Date().getFullYear()}-${docketId.slice(0, 8).toUpperCase()}`;
      const items = [
        { description: docket.title + (docket.desc ? ` - ${docket.desc}` : ''), amount: docket.amount_received || docket.service_fee || 0 },
      ];
      if (docket.material_costs) {
        items.push({ description: 'Material Costs', amount: docket.material_costs });
      }
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const tax = Math.round(subtotal * 0.18 * 100) / 100;
      const total = subtotal + tax;

      const invId = uuid();
      await db.run(`INSERT INTO invoices (id, docket_id, invoice_no, customer_name, customer_mobile, customer_address, items, subtotal, tax, total, payment_method, payment_id, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        invId, docketId, invoiceNo, docket.cname || '', docket.cmobile || '', docket.caddress || '',
        JSON.stringify(items), subtotal, tax, total, 'Online', razorpay_payment_id, 'paid');

      try {
        const pdfPath = await generateInvoicePdf({
          invoiceNo,
          customerName: docket.cname || 'Customer',
          customerMobile: docket.cmobile || '',
          customerAddress: docket.caddress || '',
          items,
          subtotal,
          tax,
          total,
          date: new Date().toISOString().slice(0, 10),
        });
        await db.run('UPDATE invoices SET pdf_path=? WHERE invoice_no=?', pdfPath, invoiceNo);
      } catch (err) {
        console.error('Invoice PDF generation failed:', err);
      }
      if (docket.customer) {
        sendWhatsApp(docket.customer, `Payment received! Invoice ${invoiceNo}: ₹${total.toFixed(2)}. Thank you for choosing Trust Home Services.`).catch(() => {});
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// Razorpay webhook (no auth — verified via webhook secret)
router.post('/webhook', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-razorpay-signature'] as string;
      const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      if (signature !== expected) {
        res.status(400).json({ success: false, error: 'Invalid signature' });
        return;
      }
    }
    const event = req.body.event;
    const payload = req.body.payload;
    if (event === 'payment.captured' && payload?.payment?.entity) {
      const paymentId = payload.payment.entity.id;
      const orderId = payload.payment.entity.order_id;
      const docket = await db.get(`SELECT id FROM dockets WHERE payment_id=? OR id LIKE ?`, paymentId, `%${orderId}%`) as any;
      if (docket) {
        await db.run(`UPDATE dockets SET is_paid=1, payment_method='Online', payment_id=?, updated_at=datetime('now') WHERE id=?`,
          paymentId, docket.id);
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/invoices', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
    res.json({ success: true, data: rows.map((r: any) => ({
      id: r.id, docketId: r.docket_id, invoiceNo: r.invoice_no,
      customerName: r.customer_name, total: r.total, status: r.status,
      paymentMethod: r.payment_method, date: r.created_at,
    })) });
  } catch (err) { next(err); }
});

router.get('/:docketId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await db.get('SELECT is_paid FROM dockets WHERE id = ?', req.params.docketId) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Docket not found' });
      return;
    }
    res.json({ success: true, data: { paid: !!row.is_paid } });
  } catch (err) { next(err); }
});

export default router;
