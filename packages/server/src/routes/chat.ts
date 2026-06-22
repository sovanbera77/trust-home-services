import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { db } from '../db/pg';
import { authenticate, AuthRequest } from '../middleware/auth';
import { io, connectedUsers } from '../index';

const router = Router();
router.use(authenticate);

const upload = multer({
  dest: path.resolve(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q || '';
    const users = await db.all(
      "SELECT id, username, name as displayName, role, specialty, status FROM users WHERE username != ? AND (username LIKE ? OR name LIKE ?) LIMIT 20",
      req.user!.username, `%${q}%`, `%${q}%`);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

router.get('/contacts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contacts = await db.all(`
      SELECT u.id, u.username, u.name as displayName, u.role, u.specialty, u.status
      FROM contacts c JOIN users u ON u.username = c.contact_id
      WHERE c.user_id = ?
      ORDER BY u.name
    `, req.user!.username);
    res.json({ success: true, data: contacts });
  } catch (err) { next(err); }
});

router.post('/contacts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contactId } = z.object({ contactId: z.string().min(1) }).parse(req.body);
    if (contactId === req.user!.username) {
      res.status(400).json({ success: false, error: 'Cannot add yourself' });
      return;
    }
    const target = await db.get('SELECT username FROM users WHERE username = ?', contactId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    try {
      await db.run('INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)', req.user!.username, contactId);
      res.json({ success: true, data: { contactId } });
    } catch {
      res.status(409).json({ success: false, error: 'Already in contacts' });
    }
  } catch (err) { next(err); }
});

router.delete('/contacts/:contactId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.run('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?', req.user!.username, req.params.contactId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/messages/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messages = await db.all(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC LIMIT 100
    `, req.user!.username, req.params.userId, req.params.userId, req.user!.username);

    await db.run(
      "UPDATE messages SET read_at = datetime('now') WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL",
      req.params.userId, req.user!.username);

    res.json({ success: true, data: messages.map((m: any) => ({
      id: m.id, senderId: m.sender_id, receiverId: m.receiver_id,
      text: m.text, type: m.type, fileUrl: m.file_url, fileName: m.file_name, fileSize: m.file_size,
      createdAt: m.created_at, readAt: m.read_at,
    })) });
  } catch (err) { next(err); }
});

router.post('/upload', upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file' });
    return;
  }
  res.json({ success: true, data: { fileUrl: `/uploads/${req.file.filename}`, fileName: req.file.originalname, fileSize: req.file.size } });
});

// Socket.IO handlers are exported for setup in index.ts
export function setupChatSocket(io: any, onlineUsers: Map<string, string[]>) {
  io.on('connection', (socket: any) => {
    const user = socket.user;
    if (!user) return;

    socket.on('chat:send', (data: any) => {
      const { receiverId, text, type = 'text', fileUrl = '', fileName = '', fileSize = 0 } = data;
      if (!receiverId || !text) return;

      const id = uuid();
      db.run(
        'INSERT INTO messages (id, sender_id, receiver_id, text, type, file_url, file_name, file_size) VALUES (?,?,?,?,?,?,?,?)',
        id, user.username, receiverId, text, type, fileUrl, fileName, fileSize
      );

      const msg = { id, senderId: user.username, receiverId, text, type, fileUrl, fileName, fileSize, createdAt: new Date().toISOString(), readAt: null, sender: { id: user.id, username: user.username, name: user.name } };

      io.to(receiverId).emit('chat:new_message', msg);
      socket.emit('chat:sent', msg);
    });

    socket.on('chat:typing', ({ receiverId, isTyping }: { receiverId: string; isTyping: boolean }) => {
      io.to(receiverId).emit('chat:user_typing', { userId: user.username, isTyping });
    });

    socket.on('chat:mark_read', ({ senderId }: { senderId: string }) => {
      db.run(
        "UPDATE messages SET read_at = datetime('now') WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL",
        senderId, user.username
      );
      io.to(senderId).emit('chat:messages_read', { readBy: user.username });
    });
  });
}

export default router;
