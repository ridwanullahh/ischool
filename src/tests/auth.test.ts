import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../lib/auth.js';

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('Test123!@#');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('Test123!@#');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('should verify correct password', async () => {
    const hash = await hashPassword('MySecurePass123!');
    const valid = await verifyPassword('MySecurePass123!', hash);
    expect(valid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('CorrectPass123!');
    const valid = await verifyPassword('WrongPass456!', hash);
    expect(valid).toBe(false);
  });

  it('should produce different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('SamePass123!');
    const hash2 = await hashPassword('SamePass123!');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Password Policy Validation', () => {
  function validatePassword(password: string, name: string = '', email: string = ''): string[] {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least 1 uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least 1 lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least 1 digit');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least 1 special character');
    if (name && password.toLowerCase().includes(name.toLowerCase())) errors.push('Password cannot contain your name');
    if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) errors.push('Password cannot contain your email');
    return errors;
  }

  it('should reject short password', () => {
    expect(validatePassword('Ab1!')).toContain('Password must be at least 8 characters');
  });

  it('should reject missing uppercase', () => {
    expect(validatePassword('abcdef1!')).toContain('Password must contain at least 1 uppercase letter');
  });

  it('should reject missing lowercase', () => {
    expect(validatePassword('ABCDEF1!')).toContain('Password must contain at least 1 lowercase letter');
  });

  it('should reject missing digit', () => {
    expect(validatePassword('Abcdefg!')).toContain('Password must contain at least 1 digit');
  });

  it('should reject missing special char', () => {
    expect(validatePassword('Abcdefg1')).toContain('Password must contain at least 1 special character');
  });

  it('should reject password containing name', () => {
    expect(validatePassword('Ahmad123!', 'Ahmad', 'ahmad@test.com')).toContain('Password cannot contain your name');
  });

  it('should accept valid password', () => {
    expect(validatePassword('SecurePass123!', 'John', 'john@test.com')).toHaveLength(0);
  });
});
