import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { loginSchema, changePasswordSchema, registerSchema } from '../validators/schemas';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }

    const { name, username, password } = result.data;

    // Check if username already exists
    const existing = await prisma.userAccount.findUnique({
      where: { username },
    });

    if (existing) {
      throw new AppError('Username already taken', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.userAccount.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: 'user',
      },
    });

    // Auto-login after registration (C5) — regenerate session to prevent fixation
    let responded = false;
    const safetyTimeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.error('Session regenerate on registration timed out');
        res.status(500).json({ error: 'Internal server error', message: 'Failed to create session' });
      }
    }, 10000);

    req.session.regenerate(async (err) => {
      clearTimeout(safetyTimeout);
      if (responded) return;
      if (err) {
        responded = true;
        console.error('Session regenerate error on registration:', err);
        res.status(500).json({ error: 'Internal server error', message: 'Failed to create session' });
        return;
      }

      try {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        await logLoginEvent(user.id, 'registration', req);
      } catch (logErr) {
        console.error('Registration log failed (non-critical):', logErr);
      }

      responded = true;
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    });
  })
);

// Helper: log login event
async function logLoginEvent(
  userId: string,
  action: 'login' | 'logout' | 'password_change' | 'registration',
  req: Request
) {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || null;
  const userAgent = req.headers['user-agent'] || null;

  await prisma.loginLog.create({
    data: { userId, action, ipAddress, userAgent },
  });
}

// Helper: kill all other sessions for this user (single session enforcement)
// NOTE: This SQL depends on connect-pg-simple's JSON column format (sess->>'userId').
// If the session store schema changes, this query will silently fail (caught by try/catch).
async function killOtherSessions(currentSessionId: string, userId: string) {
  try {
    await prisma.$executeRaw`
      DELETE FROM session
      WHERE sess->>'userId' = ${userId}
      AND sid != ${currentSessionId}
    `;
  } catch (err) {
    console.warn('Failed to kill other sessions:', err);
  }
}

// POST /api/v1/auth/login
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }

    const { username, password } = result.data;

    const user = await prisma.userAccount.findUnique({
      where: { username },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.active) {
      throw new AppError('Account deactivated. Contact admin.', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Kill any other existing sessions (single session enforcement)
    if (req.sessionID) {
      await killOtherSessions(req.sessionID, user.id);
    }

    // Regenerate session ID to prevent session fixation (H5)
    let responded = false;
    const safetyTimeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.error('Session regenerate on login timed out');
        res.status(500).json({ error: 'Internal server error', message: 'Failed to create session' });
      }
    }, 10000);

    req.session.regenerate(async (err) => {
      clearTimeout(safetyTimeout);
      if (responded) return;
      if (err) {
        responded = true;
        console.error('Session regenerate error:', err);
        res.status(500).json({ error: 'Internal server error', message: 'Failed to create session' });
        return;
      }

      try {
        // Set session data after regeneration
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Log the login event (non-critical — don't let failure block response)
        await logLoginEvent(user.id, 'login', req);
      } catch (logErr) {
        console.error('Login event log failed (non-critical):', logErr);
      }

      responded = true;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    });
  })
);

// GET /api/v1/auth/me
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.userId) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await prisma.userAccount.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      throw new AppError('Not authenticated', 401);
    }

    res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  })
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth?.userId;

    // Log the logout event
    if (userId) {
      await logLoginEvent(userId, 'logout', req);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Failed to logout', message: 'Could not destroy session' });
        return;
      }
      res.clearCookie('wq.sid', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      res.json({ message: 'Logged out successfully' });
    });
  })
);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }

    const { currentPassword, newPassword } = result.data;
    const userId = authReq.auth?.userId;

    if (!userId) {
      throw new AppError('Not authenticated', 401);
    }

    // Prevent setting the same password
    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    // Fetch user
    const user = await prisma.userAccount.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.userAccount.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Kill all other sessions (single session enforcement)
    if (req.sessionID) {
      await killOtherSessions(req.sessionID, userId);
    }

    // Log the password change event
    await logLoginEvent(userId, 'password_change', req);

    res.json({ message: 'Password changed successfully' });
  })
);

// GET /api/v1/auth/login-history — recent login events
router.get(
  '/login-history',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.auth?.userId;
    if (!userId) {
      throw new AppError('Not authenticated', 401);
    }

    const logs = await prisma.loginLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    res.json({ logs });
  })
);

export default router;
