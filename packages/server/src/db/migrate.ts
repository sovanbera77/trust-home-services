import { getDb } from './connection';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

function migrate() {
  const db = getDb();
  const hash = (s: string) => bcrypt.hashSync(s, 10);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','employee','admin')),
      name TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      specialty TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online','offline')),
      location_lat REAL,
      location_lng REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dockets (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL REFERENCES users(username),
      type TEXT NOT NULL CHECK(type IN ('repair','installation')),
      title TEXT NOT NULL,
      desc TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      preferred_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','assigned','completed','rejected')),
      assigned_to TEXT REFERENCES users(username),
      location_lat REAL,
      location_lng REAL,
      date TEXT NOT NULL DEFAULT (date('now')),
      completed_date TEXT,
      expected_date TEXT,
      service_fee REAL DEFAULT 0,
      material_costs REAL DEFAULT 0,
      used_part TEXT,
      amount_received REAL DEFAULT 0,
      payment_method TEXT CHECK(payment_method IN ('Cash','PhonePe','Due','Online')),
      is_paid INTEGER DEFAULT 0,
      rejection_reason TEXT,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      review TEXT,
      chat TEXT DEFAULT '[]',
      photo_urls TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL REFERENCES users(username),
      title TEXT NOT NULL,
      desc TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
      date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(username),
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','error','warning')),
      tag TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(username),
      type TEXT NOT NULL CHECK(type IN ('check-in','check-out')),
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT DEFAULT '{}',
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_dockets_customer ON dockets(customer);
    CREATE INDEX IF NOT EXISTS idx_dockets_assigned_to ON dockets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_dockets_status ON dockets(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(username),
      contact_id TEXT NOT NULL REFERENCES users(username),
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(username),
      receiver_id TEXT NOT NULL REFERENCES users(username),
      text TEXT DEFAULT '',
      type TEXT DEFAULT 'text',
      file_url TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(username),
      earned REAL NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      docket_id TEXT NOT NULL REFERENCES dockets(id),
      invoice_no TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_mobile TEXT NOT NULL DEFAULT '',
      customer_address TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
      pdf_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('Migration complete.');

  // Auto-seed if database is empty
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (existing.cnt === 0) {
    console.log('Seeding demo data...');
    db.prepare(`INSERT INTO users (id, username, password, role, name, status) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), 'admin', hash('admin123'), 'admin', 'Admin User', 'online');
    db.prepare(`INSERT INTO users (id, username, password, role, name, specialty, status, location_lat, location_lng) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(uuid(), 'emp1', hash('emp123'), 'employee', 'Rajesh Kumar', 'Plumbing', 'online', 22.58, 88.37);
    db.prepare(`INSERT INTO users (id, username, password, role, name, specialty, status, location_lat, location_lng) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(uuid(), 'emp2', hash('emp123'), 'employee', 'Amit Singh', 'Electrical', 'online', 22.56, 88.35);
    db.prepare(`INSERT INTO users (id, username, password, role, name, mobile, address) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), 'cust1', hash('cust123'), 'customer', 'Priya Sharma', '9876543212', 'Noida');
    db.prepare(`INSERT INTO users (id, username, password, role, name, mobile, address) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), 'cust2', hash('cust123'), 'customer', 'Rahul Verma', '9876543213', 'Gurgaon');
    console.log('Seed complete: admin/admin123, emp1/emp123, cust1/cust123');
  }
}

migrate();
