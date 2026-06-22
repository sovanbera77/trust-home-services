import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { payrollPeriodSchema, payrollItemSchema } from '../validation/schemas.js';
import { generatePayslip, generateBulkPayslips } from '../services/pdf.js';

const router = Router();

router.get('/api/payroll/periods', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const periods = db.prepare('SELECT * FROM payroll_periods ORDER BY year DESC, month DESC').all();
    return res.json({ success: true, data: periods });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/payroll/periods', requireAuth, requireAdmin, validate(payrollPeriodSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { month, year, start_date, end_date, payment_date } = req.body;
    if (!month || !year || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Month, year, start_date, end_date are required' });
    }
    const result = db.prepare(
      'INSERT INTO payroll_periods (month, year, start_date, end_date, payment_date) VALUES (?, ?, ?, ?, ?)'
    ).run(month, year, start_date, end_date, payment_date || null);
    const period = db.prepare('SELECT * FROM payroll_periods WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: period });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Payroll period already exists for this month/year' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/payroll/items', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { period_id, employee_id, status } = req.query;
    let sql = `
      SELECT pi.*, pp.month, pp.year,
             e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name,
             d.name as department_name
      FROM payroll_items pi
      LEFT JOIN payroll_periods pp ON pi.payroll_period_id = pp.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (period_id) { sql += ' AND pi.payroll_period_id = ?'; params.push(period_id); }
    if (employee_id) { sql += ' AND pi.employee_id = ?'; params.push(employee_id); }
    if (status) { sql += ' AND pi.status = ?'; params.push(status); }
    const scope = getAccessScope(req);
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'e.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY pp.year DESC, pp.month DESC, e.employee_code ASC';
    const items = db.prepare(sql).all(...params);
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/payroll/items', requireAuth, requireAdmin, validate(payrollItemSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { payroll_period_id, employee_id, gross_salary, deductions, net_pay, bonus, commission, reimbursement, tds, provident_fund, professional_tax, other_deductions, earnings, total_days, paid_days, lop_days, notes } = req.body;
    if (!payroll_period_id || !employee_id) {
      return res.status(400).json({ success: false, error: 'Payroll period and employee are required' });
    }
    const existing = db.prepare('SELECT id FROM payroll_items WHERE payroll_period_id = ? AND employee_id = ?').get(payroll_period_id, employee_id);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Payroll item already exists for this employee in this period' });
    }
    const result = db.prepare(`
      INSERT INTO payroll_items (payroll_period_id, employee_id, gross_salary, deductions, net_pay, bonus, commission, reimbursement, tds, provident_fund, professional_tax, other_deductions, earnings, total_days, paid_days, lop_days, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(payroll_period_id, employee_id, gross_salary || 0, deductions || 0, net_pay || 0, bonus || 0, commission || 0, reimbursement || 0, tds || 0, provident_fund || 0, professional_tax || 0, other_deductions || 0, earnings || 0, total_days || 0, paid_days || 0, lop_days || 0, notes || null);
    const item = db.prepare(`
      SELECT pi.*, pp.month, pp.year, e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name
      FROM payroll_items pi
      LEFT JOIN payroll_periods pp ON pi.payroll_period_id = pp.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE pi.id = ?
    `).get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/payroll/items/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM payroll_items WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payroll item not found' });
    }
    const { status, gross_salary, deductions, net_pay, bonus, commission, reimbursement, tds, provident_fund, professional_tax, other_deductions, earnings, total_days, paid_days, lop_days, payment_date, notes } = req.body;
    db.prepare(`
      UPDATE payroll_items SET
        gross_salary = COALESCE(?, gross_salary), deductions = COALESCE(?, deductions),
        net_pay = COALESCE(?, net_pay), bonus = COALESCE(?, bonus),
        commission = COALESCE(?, commission), reimbursement = COALESCE(?, reimbursement),
        tds = COALESCE(?, tds), provident_fund = COALESCE(?, provident_fund),
        professional_tax = COALESCE(?, professional_tax), other_deductions = COALESCE(?, other_deductions),
        earnings = COALESCE(?, earnings), total_days = COALESCE(?, total_days),
        paid_days = COALESCE(?, paid_days), lop_days = COALESCE(?, lop_days),
        status = COALESCE(?, status), payment_date = COALESCE(?, payment_date),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      gross_salary ?? null, deductions ?? null, net_pay ?? null, bonus ?? null,
      commission ?? null, reimbursement ?? null, tds ?? null, provident_fund ?? null,
      professional_tax ?? null, other_deductions ?? null, earnings ?? null, total_days ?? null,
      paid_days ?? null, lop_days ?? null, status || null, payment_date || null,
      notes ?? null, req.params.id
    );
    const item = db.prepare(`
      SELECT pi.*, pp.month, pp.year, e.employee_code,
             u.first_name || ' ' || u.last_name as employee_name
      FROM payroll_items pi
      LEFT JOIN payroll_periods pp ON pi.payroll_period_id = pp.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE pi.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/payroll/payslip/:itemId', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const item = db.prepare(`
      SELECT pi.*, pp.month, pp.year, e.employee_code, e.pan_number, e.bank_name,
             e.bank_account_no, e.ifsc_code, e.uan_number, e.pf_number,
             u.first_name || ' ' || u.last_name as employee_name,
             d.name as department_name
      FROM payroll_items pi
      LEFT JOIN payroll_periods pp ON pi.payroll_period_id = pp.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE pi.id = ?
    `).get(req.params.itemId) as any;
    if (!item) return res.status(404).json({ success: false, error: 'Payroll item not found' });
    const pdf = generatePayslip(item);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip_${item.employee_code}_${item.month}_${item.year}.pdf"`);
    return res.send(pdf);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/payroll/payslips/bulk', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { period_id } = req.query;
    if (!period_id) return res.status(400).json({ success: false, error: 'period_id is required' });
    const db = getDb();
    const items = db.prepare(`
      SELECT pi.*, pp.month, pp.year, e.employee_code, e.pan_number, e.bank_name,
             e.bank_account_no, e.ifsc_code, e.uan_number, e.pf_number,
             u.first_name || ' ' || u.last_name as employee_name,
             d.name as department_name
      FROM payroll_items pi
      LEFT JOIN payroll_periods pp ON pi.payroll_period_id = pp.id
      LEFT JOIN employees e ON pi.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE pi.payroll_period_id = ?
      ORDER BY e.employee_code ASC
    `).all(period_id) as any[];
    if (items.length === 0) return res.status(404).json({ success: false, error: 'No payroll items found for this period' });
    const zip = generateBulkPayslips(items);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="payslips_period_${period_id}.zip"`);
    return res.send(zip);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
