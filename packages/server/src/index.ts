import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth';
import docketRoutes from './routes/dockets';
import userRoutes from './routes/users';
import inventoryRoutes from './routes/inventory';
import complaintRoutes from './routes/complaints';
import notificationRoutes from './routes/notifications';
import attendanceRoutes from './routes/attendance';
import uploadRoutes from './routes/upload';
import analyticsRoutes from './routes/analytics';
import paymentRoutes from './routes/payments';
import cloudinaryRoutes from './routes/uploadCloudinary';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';
import chatRoutes, { setupChatSocket } from './routes/chat';
import whatsappConfigRoutes from './routes/whatsapp-config';
import referralRoutes from './routes/referrals';
import { startReminderScheduler } from './services/reminders';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'trust-home-secret-change-in-production';

// Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'], credentials: true }
});

// Track connected users: Map<username, socketId>
const connectedUsers = new Map<string, string[]>();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) { next(new Error('No token')); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).user = decoded;
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  if (!user) return;

  const sockets = connectedUsers.get(user.username) || [];
  sockets.push(socket.id);
  connectedUsers.set(user.username, sockets);
  console.log(`Socket connected: ${user.username} (${user.role})`);

  socket.join(user.role);     // room by role (admin, employee, customer)
  socket.join(user.username); // room by username

  // GPS location tracking
  socket.on('location:update', async (data: { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number }) => {
    if (!data || typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    try {
      const { db } = await import('./db/pg');
      const { v4: uuid } = await import('uuid');
      await db.run(
        "UPDATE users SET location_lat=?, location_lng=?, updated_at=NOW() WHERE username=?",
        data.lat, data.lng, user.username
      );
      await db.run(
        "INSERT INTO location_history (id, username, lat, lng, accuracy, heading, speed) VALUES (?,?,?,?,?,?,?)",
        uuid(), user.username, data.lat, data.lng, data.accuracy || null, data.heading || null, data.speed || null
      );
      // Broadcast to admin room
      io.to('admin').emit('location:employee_update', {
        username: user.username,
        name: user.name,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString(),
      });
    } catch { /* silently fail location update */ }
  });

  // WebRTC call signaling
  socket.on('call:offer', (data: { target: string; sdp: string; type: 'audio' | 'video' }) => {
    if (!data.target || !data.sdp) return;
    // Forward offer to target user
    io.to(data.target).emit('call:incoming', {
      from: user.username,
      callerName: user.name,
      sdp: data.sdp,
      type: data.type,
    });
  });

  socket.on('call:answer', (data: { target: string; sdp: string }) => {
    if (!data.target || !data.sdp) return;
    io.to(data.target).emit('call:answered', {
      from: user.username,
      sdp: data.sdp,
    });
  });

  socket.on('call:ice-candidate', (data: { target: string; candidate: string }) => {
    if (!data.target || !data.candidate) return;
    io.to(data.target).emit('call:ice-candidate', {
      from: user.username,
      candidate: data.candidate,
    });
  });

  socket.on('call:end', (data: { target?: string }) => {
    if (data?.target) {
      io.to(data.target).emit('call:ended', { from: user.username });
    }
  });

  socket.on('call:mute', (data: { target: string; muted: boolean }) => {
    if (data?.target) {
      io.to(data.target).emit('call:muted', { from: user.username, muted: data.muted });
    }
  });

  socket.on('disconnect', () => {
    const list = connectedUsers.get(user.username) || [];
    const idx = list.indexOf(socket.id);
    if (idx > -1) list.splice(idx, 1);
    if (list.length === 0) connectedUsers.delete(user.username);
  });
});

// Helper: emit notification to a specific user or role
function emitNotification(targetUser: string | null, targetRole: string | null, notification: any) {
  if (targetUser) io.to(targetUser).emit('notification', notification);
  if (targetRole) io.to(targetRole).emit('notification', notification);
}

// Wire in chat Socket.IO handlers
setupChatSocket(io, connectedUsers);

export { io, emitNotification, connectedUsers };

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200, message: { success: false, error: 'Too many requests' } }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dockets', docketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload-cloudinary', cloudinaryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappConfigRoutes);
app.use('/api/referrals', referralRoutes);

// Serve SPA — try frontend dist (Docker/production), then monorepo root (dev)
const frontendDist = path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist');
const spaRoot = fs.existsSync(frontendDist) ? frontendDist : path.resolve(__dirname, '..', '..', '..');
app.use(express.static(spaRoot));

// Health check
app.get('/api/health', (_, res) => res.json({ success: true, message: 'Trust Home API running' }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Auto-migrate on startup
  try {
    const { migrate } = await import('./db/pg');
    await migrate();
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  // Start background schedulers
  startReminderScheduler();
});
