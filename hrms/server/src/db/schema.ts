import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'hrms.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('super_admin','admin','hr_manager','manager','employee')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      manager_id INTEGER REFERENCES users(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS designations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      level INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      employee_code TEXT UNIQUE NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      designation_id INTEGER REFERENCES designations(id),
      reporting_manager_id INTEGER REFERENCES users(id),
      date_of_birth TEXT,
      gender TEXT CHECK(gender IN ('male','female','other')),
      marital_status TEXT,
      blood_group TEXT,
      nationality TEXT DEFAULT 'Indian',
      date_of_joining TEXT,
      date_of_confirmation TEXT,
      employment_type TEXT CHECK(employment_type IN ('permanent','contract','probation','intern','trainee')),
      work_location TEXT,
      weekly_off_pattern TEXT DEFAULT 'sun',
      bank_name TEXT,
      bank_account_no TEXT,
      ifsc_code TEXT,
      pan_number TEXT,
      uan_number TEXT,
      pf_number TEXT,
      esi_number TEXT,
      salary_type TEXT CHECK(salary_type IN ('monthly','weekly','hourly')),
      base_salary REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      days_per_year INTEGER DEFAULT 0,
      is_carry_forward INTEGER DEFAULT 0,
      max_carry_forward INTEGER DEFAULT 0,
      requires_approval INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      leave_type_id INTEGER REFERENCES leave_types(id),
      total_days REAL DEFAULT 0,
      used_days REAL DEFAULT 0,
      pending_days REAL DEFAULT 0,
      remaining_days REAL DEFAULT 0,
      year INTEGER DEFAULT (cast(strftime('%Y','now') as integer)),
      UNIQUE(employee_id, leave_type_id, year)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      leave_type_id INTEGER REFERENCES leave_types(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      comments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      date TEXT NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      hours_worked REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'present' CHECK(status IN ('present','absent','late','half-day','holiday','weekend','on-leave')),
      remarks TEXT,
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS payroll_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      payment_date TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','processing','completed','cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(month, year)
    );

    CREATE TABLE IF NOT EXISTS payroll_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_period_id INTEGER REFERENCES payroll_periods(id),
      employee_id INTEGER REFERENCES employees(id),
      gross_salary REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      commission REAL DEFAULT 0,
      reimbursement REAL DEFAULT 0,
      tds REAL DEFAULT 0,
      provident_fund REAL DEFAULT 0,
      professional_tax REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      earnings REAL DEFAULT 0,
      total_days INTEGER DEFAULT 0,
      paid_days INTEGER DEFAULT 0,
      lop_days INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processed','approved','paid')),
      payment_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS performance_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      reviewer_id INTEGER REFERENCES users(id),
      review_period TEXT NOT NULL,
      review_date TEXT,
      overall_rating REAL CHECK(overall_rating BETWEEN 1 AND 5),
      summary TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','acknowledged','completed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS performance_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER REFERENCES performance_reviews(id),
      goal TEXT NOT NULL,
      category TEXT,
      target_date TEXT,
      rating REAL CHECK(rating BETWEEN 1 AND 5),
      comments TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_postings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      location TEXT,
      employment_type TEXT,
      min_experience INTEGER,
      max_experience INTEGER,
      salary_min REAL,
      salary_max REAL,
      description TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','closed','cancelled')),
      posted_by INTEGER REFERENCES users(id),
      posted_date TEXT,
      closing_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_posting_id INTEGER REFERENCES job_postings(id),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      resume_url TEXT,
      current_company TEXT,
      current_designation TEXT,
      total_experience REAL,
      highest_education TEXT,
      current_ctc REAL,
      expected_ctc REAL,
      notice_period TEXT,
      source TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new','screening','shortlisted','interviewed','selected','rejected','offered','hired','withdrawn')),
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      applied_date TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER REFERENCES candidates(id),
      job_posting_id INTEGER REFERENCES job_postings(id),
      interviewer_id INTEGER REFERENCES users(id),
      interview_date TEXT NOT NULL,
      interview_type TEXT CHECK(interview_type IN ('telephonic','video','in-person','technical','hr')),
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','rescheduled')),
      feedback TEXT,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      department_id INTEGER REFERENCES departments(id),
      days_before_joining INTEGER DEFAULT 0,
      is_mandatory INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employee_onboarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      task_id INTEGER REFERENCES onboarding_tasks(id),
      assigned_to INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue')),
      completed_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      duration_hours REAL,
      instructor TEXT,
      is_mandatory INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employee_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      course_id INTEGER REFERENCES courses(id),
      progress_percent INTEGER DEFAULT 0,
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
      completed_at TEXT,
      score REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      title TEXT NOT NULL,
      document_type TEXT,
      file_url TEXT,
      file_size INTEGER,
      is_verified INTEGER DEFAULT 0,
      expiry_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      asset_type TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      serial_number TEXT,
      value REAL,
      assigned_date TEXT,
      return_date TEXT,
      status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned','returned','lost','damaged')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','success','error')),
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'public' CHECK(type IN ('public','optional','restricted')),
      year INTEGER DEFAULT (cast(strftime('%Y','now') as integer)),
      is_active INTEGER DEFAULT 1,
      UNIQUE(name, date)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      receipt_url TEXT,
      expense_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS travel_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      travel_mode TEXT CHECK(travel_mode IN ('flight','train','bus','car','other')),
      purpose TEXT NOT NULL,
      estimated_cost REAL,
      accommodation_required INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled','completed')),
      approved_by INTEGER REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dockets (
      id TEXT PRIMARY KEY,
      customer TEXT,
      type TEXT,
      title TEXT,
      desc TEXT,
      address TEXT,
      pincode TEXT,
      lat REAL,
      lng REAL,
      preferredDate TEXT,
      status TEXT DEFAULT 'pending',
      assignedTo TEXT,
      date TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      completedDate TEXT,
      expectedDate TEXT,
      serviceFee REAL,
      materialCosts REAL,
      usedPart TEXT,
      amountReceived REAL,
      paymentMethod TEXT,
      isPaid INTEGER DEFAULT 0,
      rejectionReason TEXT,
      rating REAL,
      review TEXT,
      chat TEXT,
      photoUrls TEXT,
      images TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      sku TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      customer TEXT,
      title TEXT,
      desc TEXT,
      status TEXT DEFAULT 'pending',
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      interval TEXT,
      perks TEXT,
      popular INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user TEXT,
      planId TEXT,
      planName TEXT,
      startDate TEXT,
      endDate TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      userId TEXT,
      code TEXT,
      points INTEGER DEFAULT 0,
      history TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_activity_logs (
      id TEXT PRIMARY KEY,
      docketId TEXT,
      action TEXT,
      actor TEXT,
      detail TEXT,
      timestamp TEXT
    );
  `);
}

export default getDb;
