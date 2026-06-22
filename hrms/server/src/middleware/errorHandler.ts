import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message || err);

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ success: false, error: 'Resource already exists', details: err.message });
  }

  if (err.code === 'SQLITE_NOT_FOUND') {
    return res.status(404).json({ success: false, error: 'Resource not found' });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}
