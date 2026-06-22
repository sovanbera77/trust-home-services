import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/api/dashboard/stats', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees e JOIN users u ON e.user_id = u.id WHERE u.is_active = 1').get() as any;
    const activeEmployees = db.prepare("SELECT COUNT(*) as count FROM employees e JOIN users u ON e.user_id = u.id WHERE u.is_active = 1 AND e.employment_type IN ('permanent','probation','contract')").get() as any;
    const departmentCount = db.prepare('SELECT COUNT(*) as count FROM departments WHERE is_active = 1').get() as any;
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = db.prepare(
      "SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present'"
    ).get(today) as any;
    const attendancePercent = totalEmployees.count > 0
      ? Math.round((todayAttendance.count / totalEmployees.count) * 100)
      : 0;
    const pendingLeaves = db.prepare(
      "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'"
    ).get() as any;
    const onLeaveToday = db.prepare(
      "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'approved' AND ? BETWEEN start_date AND end_date"
    ).get(today) as any;
    const openPositions = db.prepare(
      "SELECT COUNT(*) as count FROM job_postings WHERE status = 'published'"
    ).get() as any;
    const newHiresThisMonth = db.prepare(
      "SELECT COUNT(*) as count FROM employees WHERE date_of_joining LIKE ?"
    ).get(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}%`) as any;
    const payrollMonth = db.prepare(
      "SELECT COALESCE(SUM(net_pay), 0) as total FROM payroll_items pi JOIN payroll_periods pp ON pi.payroll_period_id = pp.id WHERE pp.month = ? AND pp.year = ? AND pi.status IN ('processed','approved','paid')"
    ).get(new Date().getMonth() + 1, new Date().getFullYear()) as any;
    return res.json({
      success: true,
      data: {
        total_employees: totalEmployees.count,
        active_employees: activeEmployees.count,
        total_departments: departmentCount.count,
        today_present: todayAttendance.count,
        attendance_percentage: attendancePercent,
        pending_leave_requests: pendingLeaves.count,
        on_leave_today: onLeaveToday.count,
        open_positions: openPositions.count,
        new_hires_this_month: newHiresThisMonth.count,
        total_payroll_this_month: payrollMonth.total,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/dashboard/recent-hires', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit as string) || 5;
    const hires = db.prepare(`
      SELECT e.id, e.employee_code, e.date_of_joining, e.employment_type,
             u.first_name || ' ' || u.last_name as name, u.email,
             d.name as department_name, des.title as designation_title
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE u.is_active = 1 AND e.date_of_joining IS NOT NULL
      ORDER BY e.date_of_joining DESC
      LIMIT ?
    `).all(limit);
    return res.json({ success: true, data: hires });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/dashboard/upcoming-events', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    const todayStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');
    const upcomingBirthdays = db.prepare(`
      SELECT e.id, e.date_of_birth, u.first_name || ' ' || u.last_name as name,
             d.name as department_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE u.is_active = 1 AND e.date_of_birth IS NOT NULL
        AND substr(e.date_of_birth, 6) BETWEEN ? AND ?
      ORDER BY substr(e.date_of_birth, 6) ASC
      LIMIT 10
    `).all(`${currentMonth}-${currentDay}`, `${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`);
    const upcomingAnniversaries = db.prepare(`
      SELECT e.id, e.date_of_joining, u.first_name || ' ' || u.last_name as name,
             d.name as department_name,
             cast(strftime('%Y','now') as integer) - cast(strftime('%Y', e.date_of_joining) as integer) as years_completed
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE u.is_active = 1 AND e.date_of_joining IS NOT NULL
        AND substr(e.date_of_joining, 6) BETWEEN ? AND ?
      ORDER BY substr(e.date_of_joining, 6) ASC
      LIMIT 10
    `).all(`${currentMonth}-${currentDay}`, `${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`);
    const upcomingHolidays = db.prepare(`
      SELECT * FROM holidays
      WHERE is_active = 1 AND date BETWEEN ? AND ?
      ORDER BY date ASC
    `).all(todayStr, endStr);
    return res.json({
      success: true,
      data: {
        birthdays: upcomingBirthdays,
        anniversaries: upcomingAnniversaries,
        holidays: upcomingHolidays,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
