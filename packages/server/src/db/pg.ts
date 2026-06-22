import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/trust-home',
});

function c(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/\bexcluded\./gi, 'EXCLUDED.');
}

export const db = {
  get: async (sql: string, ...params: any[]) => {
    const r = await pool.query(c(sql), params);
    return r.rows[0] || null;
  },
  all: async (sql: string, ...params: any[]) => {
    const r = await pool.query(c(sql), params);
    return r.rows;
  },
  run: async (sql: string, ...params: any[]) => {
    await pool.query(c(sql), params);
  },
  exec: async (sql: string) => {
    await pool.query(sql);
  },
  transaction: <T>(fn: () => T): T => {
    return fn();
  },
};

export async function migrate() {
  await pool.query(`
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      date TEXT NOT NULL DEFAULT CURRENT_DATE,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      sku TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL REFERENCES users(username),
      title TEXT NOT NULL,
      desc TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved')),
      date TEXT NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(username),
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','error','warning')),
      tag TEXT NOT NULL DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(username),
      type TEXT NOT NULL CHECK(type IN ('check-in','check-out')),
      lat REAL,
      lng REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT DEFAULT '{}',
      ip TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dockets_customer ON dockets(customer);
    CREATE INDEX IF NOT EXISTS idx_dockets_assigned_to ON dockets(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_dockets_status ON dockets(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(username),
      contact_id TEXT NOT NULL REFERENCES users(username),
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(username),
      earned REAL NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS location_history (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL REFERENCES users(username),
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      heading REAL,
      speed REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(username);
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM users');
  if (parseInt(rows[0].cnt) === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuid } = require('uuid');
    const hash = (s: string) => bcrypt.hashSync(s, 10);
    const ins = 'INSERT INTO users (id, username, password, role, name, status) VALUES ($1,$2,$3,$4,$5,$6)';
    await pool.query(ins, [uuid(), 'admin', hash('admin123'), 'admin', 'Admin User', 'online']);
    await pool.query(ins, [uuid(), 'emp1', hash('emp123'), 'employee', 'Rajesh Kumar', 'online']);
    await pool.query(ins, [uuid(), 'emp2', hash('emp123'), 'employee', 'Amit Singh', 'online']);
    await pool.query('INSERT INTO users (id, username, password, role, name, mobile, address) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuid(), 'cust1', hash('cust123'), 'customer', 'Priya Sharma', '9876543212', 'Noida']);
    await pool.query('INSERT INTO users (id, username, password, role, name, mobile, address) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [uuid(), 'cust2', hash('cust123'), 'customer', 'Rahul Verma', '9876543213', 'Gurgaon']);
  }
}
