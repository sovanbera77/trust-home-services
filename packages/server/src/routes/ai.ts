import { Router, Response, NextFunction } from 'express';
import { db } from '../db/pg';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.post('/dockets/:id/suggest-assignee', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const docket = await db.get('SELECT * FROM dockets WHERE id = ?', req.params.id) as any;
    if (!docket) {
      res.status(404).json({ success: false, error: 'Docket not found' });
      return;
    }

    const employees = await db.all("SELECT * FROM users WHERE role = 'employee'") as any[];
    const activeCounts = await db.all("SELECT assigned_to, COUNT(*) as cnt FROM dockets WHERE status IN ('assigned','pending') GROUP BY assigned_to") as any[];
    const countMap: Record<string, number> = {};
    for (const row of activeCounts) countMap[row.assigned_to] = row.cnt;

    const ratings = await db.all('SELECT assigned_to, AVG(rating) as avg_rating, COUNT(*) as rating_count FROM dockets WHERE rating IS NOT NULL AND assigned_to IS NOT NULL GROUP BY assigned_to') as any[];
    const ratingMap: Record<string, { avg: number; count: number }> = {};
    for (const row of ratings) ratingMap[row.assigned_to] = { avg: row.avg_rating, count: row.rating_count };

    const scored = employees.map((emp: any) => {
      let score = 0;

      // 1. Specialty match (+40)
      const docketType = docket.title?.toLowerCase() || '';
      const empSpecialty = emp.specialty?.toLowerCase() || '';
      if (empSpecialty && docketType.includes(empSpecialty)) score += 40;
      else if (empSpecialty === 'general' || !empSpecialty) score += 10;

      // 2. Workload (lower is better) up to +20
      const workload = countMap[emp.username] || 0;
      score += Math.max(0, 20 - workload * 5);

      // 3. Geographic proximity (+20)
      if (docket.location_lat != null && docket.location_lng != null && emp.location_lat != null && emp.location_lng != null) {
        const dist = haversineKm(docket.location_lat, docket.location_lng, emp.location_lat, emp.location_lng);
        score += Math.max(0, 20 - dist);
      } else {
        score += 5;
      }

      // 4. Rating (+10)
      const r = ratingMap[emp.username];
      if (r && r.count > 0) score += (r.avg / 5) * 10;

      // 5. Online status (+10)
      if (emp.status === 'online') score += 10;

      return {
        username: emp.username,
        name: emp.name,
        specialty: emp.specialty,
        mobile: emp.mobile,
        status: emp.status,
        workload,
        avgRating: r?.avg ?? null,
        ratingCount: r?.count ?? 0,
        score: Math.round(score * 10) / 10,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: scored });
  } catch (err) { next(err); }
});

// Nearest-neighbour TSP for daily job schedule
router.get('/schedule/:username', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dockets = await db.all(
      "SELECT * FROM dockets WHERE assigned_to = ? AND status = 'assigned' ORDER BY preferred_date ASC",
      req.params.username
    ) as any[];

    if (dockets.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Get employee's current location
    const emp = await db.get('SELECT location_lat, location_lng FROM users WHERE username = ?', req.params.username) as any;
    let currentLat = emp?.location_lat ?? null;
    let currentLng = emp?.location_lng ?? null;

    // Nearest-neighbour TSP
    const unvisited = [...dockets];
    const route: any[] = [];
    let totalDist = 0;

    while (unvisited.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = unvisited[i];
        if (d.location_lat != null && d.location_lng != null && currentLat != null && currentLng != null) {
          const dist = haversineKm(currentLat, currentLng, d.location_lat, d.location_lng);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        } else {
          // No location data — put it at the end
          bestDist = Math.min(bestDist, 999);
        }
      }

      const chosen = unvisited.splice(bestIdx, 1)[0];
      if (bestDist < 999) totalDist += bestDist;
      if (chosen.location_lat != null && chosen.location_lng != null) {
        currentLat = chosen.location_lat;
        currentLng = chosen.location_lng;
      }

      route.push({
        id: chosen.id,
        title: chosen.title,
        customer: chosen.customer,
        address: chosen.address,
        status: chosen.status,
        preferredDate: chosen.preferred_date,
        location: chosen.location_lat ? { lat: chosen.location_lat, lng: chosen.location_lng } : null,
        distanceFromPrev: bestDist < 999 ? Math.round(bestDist * 10) / 10 : null,
        order: route.length + 1,
      });
    }

    res.json({
      success: true,
      data: {
        employee: req.params.username,
        date: today,
        totalDistance: Math.round(totalDist * 10) / 10,
        stops: route,
      },
    });
  } catch (err) { next(err); }
});

export default router;
