import { logger } from './logger';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline-queue';
const MAX_RETRIES = 3;

export function getOfflineQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

export function addToQueue(req: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) {
  const queue = getOfflineQueue();
  queue.push({ ...req, id: `q-${Date.now()}`, timestamp: Date.now(), retries: 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  logger.info('Added to offline queue', { url: req.url });
}

export async function processQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining: QueuedRequest[] = [];
  for (const req of queue) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.body ? JSON.stringify(req.body) : undefined,
      });
      if (res.ok) {
        logger.info('Processed queued request', { url: req.url });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      if (req.retries < MAX_RETRIES) {
        remaining.push({ ...req, retries: req.retries + 1 });
      } else {
        logger.error('Failed queued request after max retries', req);
      }
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export function initOfflineQueue() {
  window.addEventListener('online', () => {
    logger.info('Back online — processing queue');
    processQueue();
  });
}
