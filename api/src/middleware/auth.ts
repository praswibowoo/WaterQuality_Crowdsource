import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  if (!req.session.role) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid session: missing role' });
    return;
  }

  (req as AuthenticatedRequest).auth = {
    userId: req.session.userId,
    username: req.session.username || '',
    role: req.session.role,
  };

  next();
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  authMiddleware(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.auth?.role !== 'admin') {
      return void res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    }
    next();
  });
};