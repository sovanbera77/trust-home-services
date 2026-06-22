import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

const WA_SERVER = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3099';

function proxy(path: string, method: string, body?: any) {
  return fetch(`${WA_SERVER}${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json().catch(() => ({ error: 'Invalid response from WhatsApp server' })));
}

router.get('/config', async (_req: AuthRequest, res: Response) => {
  const data = await proxy('/api/config', 'GET');
  res.json({ success: true, data });
});

router.post('/config', async (req: AuthRequest, res: Response) => {
  const data = await proxy('/api/config', 'POST', req.body);
  res.json({ success: true, data });
});

router.get('/verify', async (_req: AuthRequest, res: Response) => {
  const data = await proxy('/api/verify', 'GET');
  res.json({ success: true, data });
});

router.get('/log', async (_req: AuthRequest, res: Response) => {
  const data = await proxy('/api/log', 'GET');
  res.json({ success: true, data });
});

router.post('/send', async (req: AuthRequest, res: Response) => {
  const data = await proxy('/api/send', 'POST', req.body);
  res.json({ success: true, data });
});

router.post('/notify', async (req: AuthRequest, res: Response) => {
  const data = await proxy('/api/notify', 'POST', req.body);
  res.json({ success: true, data });
});

export default router;
