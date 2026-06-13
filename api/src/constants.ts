import crypto from 'crypto';

// Shared constants across the API codebase

/**
 * bcrypt cost factor for password hashing.
 * OWASP 2024 recommends ≥12. Existing hashes carry their own cost in the
 * hash string, so bcrypt.compare works regardless of which cost generated
 * the original hash — no backfill needed when changing this value.
 */
export const BCRYPT_COST = 12;

/**
 * Generate a cryptographically secure temporary password (WQ-160, WQ-196v2).
 * 12 characters from lowercase + digits = ~62 bits entropy.
 */
export function generateTempPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }
  return result;
}

/** Password reset request TTL in milliseconds (7 days) */
export const PASSWORD_RESET_TTL_MS = 7 * 24 * 60 * 60 * 1000;
