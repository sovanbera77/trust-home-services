import { db } from './pg';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

async function seed() {
  const hash = (s: string) => bcrypt.hashSync(s, 10);

  const existing = await db.get('SELECT COUNT(*) as cnt FROM users');
  if (existing && parseInt(existing.cnt as string) > 0) {
    console.log('Database already seeded.');
    return;
  }

  // Admin
  await db.run(`INSERT INTO users (id, username, password, role, name, status) VALUES (?,?,?,?,?,?)`,
    uuid(), 'admin', hash('admin123'), 'admin', 'Admin User', 'online'
  );

  // Demo employees
  await db.run(`INSERT INTO users (id, username, password, role, name, specialty, status, location_lat, location_lng) VALUES (?,?,?,?,?,?,?,?,?)`,
    uuid(), 'emp1', hash('emp123'), 'employee', 'Demo Emp 1', 'Electrician', 'online', 22.58, 88.37
  );
  await db.run(`INSERT INTO users (id, username, password, role, name, specialty, status, location_lat, location_lng) VALUES (?,?,?,?,?,?,?,?,?)`,
    uuid(), 'emp2', hash('emp123'), 'employee', 'Demo Emp 2', 'Plumber', 'online', 22.56, 88.35
  );

  // Demo customers
  await db.run(`INSERT INTO users (id, username, password, role, name, mobile, address) VALUES (?,?,?,?,?,?,?)`,
    uuid(), 'cust1', hash('cust123'), 'customer', 'Demo Customer 1', '9876543210', '123 Park Street, Kolkata'
  );
  await db.run(`INSERT INTO users (id, username, password, role, name, mobile, address) VALUES (?,?,?,?,?,?,?)`,
    uuid(), 'cust2', hash('cust123'), 'customer', 'Demo Customer 2', '9876543211', '456 MG Road, Kolkata'
  );

  // Inventory
  const invItems = [
    { name: 'Copper Wire (10m)', price: 450, stock: 50, sku: 'WIR-001' },
    { name: 'PVC Pipe', price: 120, stock: 100, sku: 'PIP-001' },
    { name: 'MCB Switch', price: 300, stock: 30, sku: 'SWI-001' },
    { name: 'Light Bulb', price: 150, stock: 200, sku: 'BUL-001' },
    { name: 'Ceiling Fan', price: 1200, stock: 20, sku: 'FAN-001' },
  ];
  for (const item of invItems) {
    await db.run(`INSERT INTO inventory (id, name, price, stock, sku) VALUES (?,?,?,?,?)`,
      uuid(), item.name, item.price, item.stock, item.sku
    );
  }

  console.log('Seed complete: admin (admin123), emp1/emp2 (emp123), cust1/cust2 (cust123)');
}

seed().catch(err => console.error('Seed failed:', err));
