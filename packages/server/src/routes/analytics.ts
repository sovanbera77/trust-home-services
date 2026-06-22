import { Router, Response, NextFunction } from 'express';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalDockets = (await db.get('SELECT COUNT(*) as cnt FROM dockets')).cnt;
    const pendingDockets = (await db.get("SELECT COUNT(*) as cnt FROM dockets WHERE status='pending'")).cnt;
    const completedDockets = (await db.get("SELECT COUNT(*) as cnt FROM dockets WHERE status='completed'")).cnt;
    const totalRevenue = (await db.get('SELECT COALESCE(SUM(amount_received),0) as cnt FROM dockets')).cnt;
    const totalEmployees = (await db.get("SELECT COUNT(*) as cnt FROM users WHERE role='employee'")).cnt;
    const totalCustomers = (await db.get("SELECT COUNT(*) as cnt FROM users WHERE role='customer'")).cnt;

    const typeStats = await db.all('SELECT type, COUNT(*) as count FROM dockets GROUP BY type');

    const empRevenue = await db.all(`
      SELECT assigned_to, COUNT(*) as jobs, COALESCE(SUM(amount_received),0) as revenue,
        COALESCE(AVG(rating),0) as avg_rating
      FROM dockets WHERE status='completed' GROUP BY assigned_to ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      data: {
        totalDockets, pendingDockets, completedDockets, totalRevenue, totalEmployees, totalCustomers,
        typeStats, empRevenue,
      },
    });
  } catch (err) { next(err); }
});

router.get('/report', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employee, dateFrom, dateTo } = req.query;

    let sql = "SELECT d.*, u1.name as emp_name, u2.name as cust_name FROM dockets d LEFT JOIN users u1 ON d.assigned_to=u1.username LEFT JOIN users u2 ON d.customer=u2.username WHERE d.status='completed'";
    const params: any[] = [];

    if (employee && employee !== 'all') { sql += ' AND d.assigned_to=?'; params.push(employee); }
    if (dateFrom) { sql += ' AND d.completed_date >= ?'; params.push(dateFrom); }
    if (dateTo) { sql += ' AND d.completed_date <= ?'; params.push(dateTo); }
    sql += ' ORDER BY d.completed_date DESC';

    const rows = await db.all(sql, ...params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

export default router;
