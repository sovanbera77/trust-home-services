import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getDb } from '../db/connection';
import { v4 as uuid } from 'uuid';

export function auditLog(action: string, resource: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode < 400) {
        try {
          const db = getDb();
          db.prepare(`INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, ip) VALUES (?,?,?,?,?,?,?)`).run(
            uuid(),
            req.user?.username || 'anonymous',
            action,
            resource,
            req.params?.id || body?.data?.id || null,
            JSON.stringify({ method: req.method, path: req.path }),
            req.ip
          );
        } catch {}
      }
      return originalJson(body);
    };
    next();
  };
}
