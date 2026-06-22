import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hrms-secret-key';
const userSockets = new Map<number, Set<string>>();
let io: Server;

export function initSocket(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as number;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    socket.on('location:update', (data) => {
      // Broadcast this location update to all connected clients
      // In a production app, we would only broadcast to relevant users (e.g. the assigned customer)
      socket.broadcast.emit('location:employee_update', data);
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToUser(userId: number, event: string, data: any): void {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach(sid => io.to(sid).emit(event, data));
  }
}
