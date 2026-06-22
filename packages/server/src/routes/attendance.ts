import { Router, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const GEOFENCE_RADIUS_KM = parseFloat(process.env.GEOFENCE_RADIUS_KM || '0.5');

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/', authorize('employee'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT * FROM attendance WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      req.user!.username);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/checkin', authorize('employee'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lat, lng, docketId } = z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      docketId: z.string().optional(),
    }).parse(req.body);

    // If checking in for a specific job, verify employee is within geofence
    if (docketId && lat !== undefined && lng !== undefined) {
      const docket = await db.get('SELECT * FROM dockets WHERE id = ? AND assigned_to = ?', docketId, req.user!.username) as any;
      if (docket && docket.location_lat != null && docket.location_lng != null) {
        const dist = haversineKm(lat, lng, docket.location_lat, docket.location_lng);
        if (dist > GEOFENCE_RADIUS_KM) {
          res.status(400).json({
            success: false,
            error: `You are ${dist.toFixed(2)}km from the job location (max ${GEOFENCE_RADIUS_KM}km allowed)`,
          });
          return;
        }
      }
    }

    const id = uuid();
    await db.run('INSERT INTO attendance (id, user_id, type, lat, lng) VALUES (?,?,?,?,?)',
      id, req.user!.username, 'check-in', lat ?? null, lng ?? null);
    res.status(201).json({ success: true, data: { id, type: 'check-in' } });
  } catch (err) { next(err); }
});

router.get('/all', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.all('SELECT a.*, u.name as user_name, u.location_lat as user_lat, u.location_lng as user_lng FROM attendance a JOIN users u ON a.user_id = u.username ORDER BY a.created_at DESC LIMIT 200');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

export default router;
