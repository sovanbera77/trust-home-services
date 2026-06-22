import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth as authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/api/inventory', authenticate, (req, res) => {
  try {
    const db = getDb();
    const inventory = db.prepare('SELECT * FROM inventory').all();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.post('/api/inventory', authenticate, (req, res) => {
  try {
    const db = getDb();
    const item = req.body;
    db.prepare(`
      INSERT INTO inventory (id, name, price, stock, sku, createdAt) 
      VALUES (@id, @name, @price, @stock, @sku, @createdAt)
    `).run({
      id: item.id,
      name: item.name,
      price: item.price || 0,
      stock: item.stock || 0,
      sku: item.sku || '',
      createdAt: item.createdAt || new Date().toISOString()
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

router.patch('/api/inventory/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { name, price, stock, sku } = req.body;
    
    // Dynamically build update query based on provided fields
    const updates: string[] = [];
    const params: any = { id: req.params.id };
    
    if (name !== undefined) { updates.push('name = @name'); params.name = name; }
    if (price !== undefined) { updates.push('price = @price'); params.price = price; }
    if (stock !== undefined) { updates.push('stock = @stock'); params.stock = stock; }
    if (sku !== undefined) { updates.push('sku = @sku'); params.sku = sku; }
    
    if (updates.length > 0) {
      db.prepare(`UPDATE inventory SET ${updates.join(', ')} WHERE id = @id`).run(params);
    }
    
    const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

router.delete('/api/inventory/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

export default router;
