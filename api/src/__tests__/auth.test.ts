import { describe, it, expect } from '@jest/globals';
import { loginSchema, changePasswordSchema } from '../validators/schemas';

describe('Login Schema', () => {
  it('should validate valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'admin123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'admin123' });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' });
    expect(result.success).toBe(false);
  });

  it('should reject password exceeding 128 characters', () => {
    const longPassword = 'a'.repeat(129);
    const result = loginSchema.safeParse({ username: 'admin', password: longPassword });
    expect(result.success).toBe(false);
  });

  it('should accept password at exactly 128 characters', () => {
    const maxPassword = 'a'.repeat(128);
    const result = loginSchema.safeParse({ username: 'admin', password: maxPassword });
    expect(result.success).toBe(true);
  });
});

describe('Change Password Schema', () => {
  it('should validate valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newPass456',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject new password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should accept new password at exactly 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('should reject new password exceeding 128 characters', () => {
    const longPassword = 'a'.repeat(129);
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: longPassword,
    });
    expect(result.success).toBe(false);
  });

  it('should reject current password exceeding 128 characters', () => {
    const longPassword = 'a'.repeat(129);
    const result = changePasswordSchema.safeParse({
      currentPassword: longPassword,
      newPassword: 'newPass456',
    });
    expect(result.success).toBe(false);
  });

  it('should accept both passwords at 128 characters', () => {
    const maxPassword = 'a'.repeat(128);
    const result = changePasswordSchema.safeParse({
      currentPassword: maxPassword,
      newPassword: maxPassword,
    });
    expect(result.success).toBe(true);
  });
});
