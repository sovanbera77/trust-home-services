import { io, Socket } from 'socket.io-client';
import { config } from './config';
import { getToken } from './api/auth';
import { useStore } from '../store/useStore';

const CHANNEL_NAME = 'trusthome-sync';

export type RealtimeEvent =
  | { type: 'store:update'; payload: Record<string, unknown> }
  | { type: 'notification'; payload: { title: string; body: string; type: string; tag: string } }
  | { type: 'docket:assigned'; payload: { docketId: string; assignedTo: string } }
  | { type: 'docket:status'; payload: { docketId: string; status: string } }
  | { type: 'location:employee_update'; payload: { username: string; name: string; lat: number; lng: number; timestamp: string } };

type EventListener = (event: RealtimeEvent) => void;

class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private socket: Socket | null = null;
  private listeners = new Set<EventListener>();

  init() {
    if (this.channel) return;
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent<RealtimeEvent>) => {
        this.listeners.forEach(l => l(e.data));
      };
    } catch {
      console.warn('[realtime] BroadcastChannel not supported, falling back to socket-only mode');
    }

    if (config.useBackend) {
      this.connectSocketIO();
    }
  }

  private connectSocketIO() {
    if (this.socket?.connected) return;
    const token = getToken();
    if (!token) return;

    const serverUrl = config.apiUrl.replace(/\/api$/, '');
    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[realtime] Socket.IO connected');
    });

    this.socket.on('notification', (data: { title: string; body: string; type: string; tag: string }) => {
      const event: RealtimeEvent = { type: 'notification', payload: data };
      this.listeners.forEach(l => l(event));
      // Auto-add to notification store
      const store = useStore.getState();
      store.addNotification({
        id: data.tag || crypto.randomUUID(),
        title: data.title,
        body: data.body,
        type: data.type as 'info' | 'success' | 'error' | 'warning',
        tag: data.tag,
        read: false,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    });

    this.socket.on('location:employee_update', (data: { username: string; name: string; lat: number; lng: number; timestamp: string }) => {
      const event: RealtimeEvent = { type: 'location:employee_update', payload: data };
      this.listeners.forEach(l => l(event));
    });

    this.socket.on('disconnect', () => {
      console.log('[realtime] Socket.IO disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[realtime] Connection error:', err.message);
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  sendLocation(data: { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number }) {
    if (this.socket?.connected) {
      const store = useStore.getState();
      const currentUser = store.currentUser;
      const payload = {
        ...data,
        username: currentUser?.username || 'unknown',
        name: currentUser?.name || 'Unknown',
        timestamp: new Date().toISOString(),
      };
      this.socket.emit('location:update', payload);
    }
  }

  broadcast(event: RealtimeEvent) {
    this.channel?.postMessage(event);
    if (this.socket?.connected) {
      this.socket.emit('broadcast', event);
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  destroy() {
    this.socket?.disconnect();
    this.socket = null;
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }
}

export const realtime = new RealtimeService();
