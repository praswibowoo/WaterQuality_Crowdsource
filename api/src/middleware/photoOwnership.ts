import { Request } from 'express';
import { AppError } from './errorHandler.js';
import { type AuthenticatedRequest } from './auth.js';

/**
 * Check that the current user owns the entity or is an admin.
 * Throws 403 if the check fails.
 */
export function requireOwnershipOrAdmin(
  entityUserId: string | null,
  req: Request,
  errorMessage: string = 'Forbidden: you can only modify your own resources'
) {
  const currentUser = (req as AuthenticatedRequest).auth!;
  if (entityUserId !== currentUser.userId && currentUser.role !== 'admin') {
    throw new AppError(errorMessage, 403);
  }
}
