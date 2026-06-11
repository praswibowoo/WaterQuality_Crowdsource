import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../db/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { adminMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { createUserSchema, updateUserSchema, resetPasswordSchema, uuidParam, getUsersQuerySchema } from '../validators/schemas';

// Allowed sort fields for user queries (WQ-137)
const ALLOWED_SORT_FIELDS = ['name', 'username', 'role', 'createdAt'] as const;

const router = Router();

// Helper: generate cryptographically secure temporary password (WQ-160)
function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

// Helper: kill all sessions for a given user (used when admin resets password)
async function killUserSessions(userId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM session
      WHERE sess->>'userId' = ${userId}
    `;
  } catch (err) {
    console.warn('Failed to kill user sessions:', err);
  }
}

// GET /api/v1/users - List all users with pagination (admin only)
router.get(
  '/',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const queryResult = getUsersQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw queryResult.error;
    }

    const { cursor, limit: zodLimit, sortBy, sortOrder, search } = queryResult.data;

    const limit = Math.min(zodLimit || 20, 200);

    // Build where clause for search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Prisma where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy with allowlist
    const orderBy = sortBy && ALLOWED_SORT_FIELDS.includes(sortBy as typeof ALLOWED_SORT_FIELDS[number])
      ? { [sortBy]: sortOrder }
      : { username: 'asc' as const };

    const users = await prisma.userAccount.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            samples: true,
            loginLogs: true,
          },
        },
      },
    });

    const hasNextPage = users.length > limit;
    const data = hasNextPage ? users.slice(0, limit) : users;
    const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

    const totalCount = await prisma.userAccount.count({ where });

    res.json({ data, nextCursor, totalCount });
  })
);

// GET /api/v1/users/:id - Get single user (admin only)
router.get(
  '/:id',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid user ID format', 400);
    }
    const id = idResult.data;

    const user = await prisma.userAccount.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            samples: true,
            loginLogs: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  })
);

// POST /api/v1/users - Create new user (admin only)
router.post(
  '/',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }

    const { name, username, password, role } = result.data;

    // Check if username already exists
    const existing = await prisma.userAccount.findUnique({
      where: { username },
    });

    if (existing) {
      throw new AppError('Username already taken', 409);
    }

    // Generate temp password if not provided (WQ-140)
    const finalPassword = password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(finalPassword, 12);
    const isTempPassword = !password;

    const user = await prisma.userAccount.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role as 'user' | 'admin',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    const response: Record<string, unknown> = { user };
    if (isTempPassword) {
      response.tempPassword = finalPassword;
    }

    res.status(201).json(response);
  })
);

// PUT /api/v1/users/:id - Update user (admin only)
router.put(
  '/:id',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid user ID format', 400);
    }
    const id = idResult.data;
    const authReq = req as AuthenticatedRequest;

    const bodyResult = updateUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { name, active } = bodyResult.data;

    // Check user exists
    const user = await prisma.userAccount.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admin from deactivating themselves
    if (active === false && id === authReq.auth?.userId) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    // Atomic check + update in transaction to prevent race condition
    const updated = await prisma.$transaction(async (tx) => {
      // Prevent deactivating the last admin
      if (active === false && user.role === 'admin') {
        const adminCount = await tx.userAccount.count({
          where: { role: 'admin', active: true },
        });
        if (adminCount <= 1) {
          throw new AppError('Cannot deactivate the last admin account', 400);
        }
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (active !== undefined) updateData.active = active;

      return tx.userAccount.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });
    });

    // Kill sessions if user was deactivated (H7)
    if (active === false) {
      await killUserSessions(id);
    }

    res.json({ user: updated });
  })
);

// PUT /api/v1/users/:id/reset-password - Reset user password (admin only)
router.put(
  '/:id/reset-password',
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const idResult = uuidParam.safeParse(req.params.id);
    if (!idResult.success) {
      throw new AppError('Invalid user ID format', 400);
    }
    const id = idResult.data;

    const bodyResult = resetPasswordSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw bodyResult.error;
    }

    const { newPassword } = bodyResult.data;

    // Check user exists
    const user = await prisma.userAccount.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.userAccount.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Kill all active sessions for this user (WQ-138)
    await killUserSessions(id);

    // M1: Log the password reset event
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || null;
    const userAgent = req.headers['user-agent'] || null;
    await prisma.loginLog.create({
      data: { userId: id, action: 'password_change', ipAddress, userAgent },
    }).catch((err) => console.warn('Failed to log password reset:', err));

    res.json({
      message: 'Password reset successfully',
    });
  })
);

export default router;
