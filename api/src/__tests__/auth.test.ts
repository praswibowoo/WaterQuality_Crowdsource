import { describe, it, expect } from '@jest/globals';
import { loginSchema, registerSchema, changePasswordSchema, createUserSchema, updateUserSchema, resetPasswordSchema } from '../validators/schemas';

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

describe('Register Schema', () => {
  it('should validate valid registration input', () => {
    const result = registerSchema.safeParse({
      name: 'Prasetya Wibowo',
      username: 'praswibowoo',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject short name', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      username: 'testuser',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short username', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      username: 'ab',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject username with special characters', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      username: 'user name!',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password (<8 chars)', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      username: 'testuser',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password exceeding 128 characters', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      username: 'testuser',
      password: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('should accept username with underscores', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      username: 'test_user_1',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = registerSchema.safeParse({
      name: '',
      username: 'testuser',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });
});

describe('Create User Schema (admin)', () => {
  it('should validate with required fields only', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'testuser' });
    expect(result.success).toBe(true);
  });

  it('should validate with password', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'testuser', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('should reject short password', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'testuser', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('should reject long password', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'testuser', password: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('should reject short name', () => {
    const result = createUserSchema.safeParse({ name: 'A', username: 'testuser' });
    expect(result.success).toBe(false);
  });

  it('should reject short username', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('should reject username with special chars', () => {
    const result = createUserSchema.safeParse({ name: 'Test User', username: 'user name!' });
    expect(result.success).toBe(false);
  });

  it('should accept admin role override', () => {
    const result = createUserSchema.safeParse({ name: 'Admin User', username: 'admin2', role: 'admin' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe('admin');
  });
});

describe('Update User Schema', () => {
  it('should validate with name only', () => {
    const result = updateUserSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('should validate with active only', () => {
    const result = updateUserSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
  });

  it('should validate with both fields', () => {
    const result = updateUserSchema.safeParse({ name: 'Updated', active: true });
    expect(result.success).toBe(true);
  });

  it('should reject short name', () => {
    const result = updateUserSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean active', () => {
    const result = updateUserSchema.safeParse({ active: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('Reset Password Schema', () => {
  it('should validate valid password', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'newPass123' });
    expect(result.success).toBe(true);
  });

  it('should reject short password', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'short' });
    expect(result.success).toBe(false);
  });

  it('should reject long password', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 128 chars', () => {
    const result = resetPasswordSchema.safeParse({ newPassword: 'a'.repeat(128) });
    expect(result.success).toBe(true);
  });
});
