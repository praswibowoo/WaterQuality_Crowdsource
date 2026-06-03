import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  try {
    const user = await prisma.userAccount.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error on auth check:', err);
      });
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Sync role from DB to handle promotions/demotions (C4, H1)
    if (user.role !== req.session.role) {
      req.session.role = user.role;
    }

    (req as AuthenticatedRequest).auth = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error('Auth middleware DB error:', err);
    res.status(500).json({ error: 'Internal server error', message: 'Authentication service unavailable' });
  }
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
