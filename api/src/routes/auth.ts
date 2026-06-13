import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authMiddleware, adminMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { loginSchema, changePasswordSchema, registerSchema, forgotPasswordSchema, rejectResetRequestSchema, resetRequestsQuerySchema, uuidParam } from '../validators/schemas';
import { BCRYPT_COST, generateTempPassword } from '../constants';

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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

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
  const ipAddress = req.ip || null;
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
          mustChangePassword: user.mustChangePassword,
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
      select: { id: true, username: true, name: true, role: true, active: true, mustChangePassword: true },
    });

    if (!user || !user.active) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      throw new AppError('Not authenticated', 401);
    }

    res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword } });
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
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);

    // Update password + clear mustChangePassword
    await prisma.userAccount.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
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

// WQ-196v2: POST /api/v1/auth/forgot-password (public, rate-limited)
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }

    const { username, reason } = result.data;

    // Always return the same response to prevent username enumeration
    const genericMessage = { message: 'If an account exists for that username, an admin has been notified.' };

    const user = await prisma.userAccount.findUnique({
      where: { username },
      select: { id: true },
    });

    if (user) {
      try {
        // Invalidate any existing pending requests for this user
        await prisma.passwordResetRequest.updateMany({
          where: { userId: user.id, status: 'pending' },
          data: { status: 'expired' },
        });

        // Create new request
        await prisma.passwordResetRequest.create({
          data: { userId: user.id, reason: reason || null },
        });

        // Warn if user has many pending requests (potential abuse)
        const pendingCount = await prisma.passwordResetRequest.count({
          where: { userId: user.id, status: 'pending' },
        });
        if (pendingCount >= 3) {
          console.warn(`User ${username} has ${pendingCount} pending reset requests — possible abuse`);
        }
      } catch (err) {
        console.error('Failed to create password reset request (non-critical):', err);
      }
    }

    res.json(genericMessage);
  })
);

// WQ-196v2: GET /api/v1/auth/reset-requests (admin only, paginated)
router.get(
  '/reset-requests',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = resetRequestsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { status, cursor, limit: zodLimit } = queryResult.data;
    const limit = Math.min(zodLimit || 20, 100);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.passwordResetRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        reason: true,
        status: true,
        rejectionReason: true,
        generatedPassword: true,
        resolvedAt: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, name: true },
        },
        resolvedBy: {
          select: { id: true, username: true },
        },
      },
    });

    const hasNextPage = requests.length > limit;
    const data = hasNextPage ? requests.slice(0, limit) : requests;
    const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

    const totalCount = await prisma.passwordResetRequest.count({ where });

    res.json({ data, nextCursor, totalCount });
  })
);

// WQ-196v2: POST /api/v1/auth/reset-requests/:id/fulfill (admin only)
router.post(
  '/reset-requests/:id/fulfill',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid request ID format', 400);
    }
    const id = idResult.data;

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });

    if (!resetRequest) {
      throw new AppError('Reset request not found', 404);
    }

    if (resetRequest.status !== 'pending') {
      throw new AppError(`Request is already ${resetRequest.status}`, 400);
    }

    const authReq = req as AuthenticatedRequest;
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_COST);

    // Update user password + mustChangePassword, mark request fulfilled, kill sessions
    await prisma.$transaction(async (tx) => {
      await tx.userAccount.update({
        where: { id: resetRequest.userId },
        data: { password: hashedPassword, mustChangePassword: true },
      });

      await tx.passwordResetRequest.update({
        where: { id },
        data: {
          status: 'fulfilled',
          generatedPassword: tempPassword,
          resolvedAt: new Date(),
          resolvedById: authReq.auth?.userId || null,
        },
      });
    });

    // Kill all sessions for this user
    try {
      await prisma.$executeRaw`
        DELETE FROM session
        WHERE sess->>'userId' = ${resetRequest.userId}
      `;
    } catch (err) {
      console.warn('Failed to kill sessions for user on password reset:', err);
    }

    // Audit log
    try {
      await prisma.loginLog.create({
        data: {
          userId: resetRequest.userId,
          action: 'password_change',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        },
      });
    } catch (err) {
      console.error('Failed to log password reset (non-critical):', err);
    }

    // Return the temp password (admin must communicate to user out-of-band)
    res.json({
      userId: resetRequest.userId,
      tempPassword,
      message: 'Password reset. Communicate the new password to the user securely. Never email it in plaintext.',
    });
  })
);

// WQ-196v2: POST /api/v1/auth/reset-requests/:id/reject (admin only)
router.post(
  '/reset-requests/:id/reject',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid request ID format', 400);
    }
    const id = idResult.data;

    const bodyResult = rejectResetRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!resetRequest) {
      throw new AppError('Reset request not found', 404);
    }

    if (resetRequest.status !== 'pending') {
      throw new AppError(`Request is already ${resetRequest.status}`, 400);
    }

    const authReq = req as AuthenticatedRequest;

    await prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: bodyResult.data.rejectionReason || null,
        resolvedAt: new Date(),
        resolvedById: authReq.auth?.userId || null,
      },
    });

    res.json({ message: 'Request rejected' });
  })
);

export default router;
