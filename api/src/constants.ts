// Shared constants across the API codebase

/**
 * bcrypt cost factor for password hashing.
 * OWASP 2024 recommends ≥12. Existing hashes carry their own cost in the
 * hash string, so bcrypt.compare works regardless of which cost generated
 * the original hash — no backfill needed when changing this value.
 */
export const BCRYPT_COST = 12;
