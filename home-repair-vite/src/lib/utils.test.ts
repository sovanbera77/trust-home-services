import { hashPassword, uuid } from './utils';

describe('hashPassword', () => {
  it('returns a hex string', async () => {
    const hash = await hashPassword('admin123');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces deterministic output', async () => {
    const a = await hashPassword('test123');
    const b = await hashPassword('test123');
    expect(a).toBe(b);
  });

  it('different inputs produce different hashes', async () => {
    const a = await hashPassword('abc');
    const b = await hashPassword('xyz');
    expect(a).not.toBe(b);
  });
});

describe('uuid', () => {
  it('returns a UUID v4 string', () => {
    const id = uuid();
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
  });
});

describe('normalizePhone (from otpService)', () => {
  it('strips non-digit characters', async () => {
    const { normalizePhone } = await import('./otpService');
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('abc123def')).toBe('123');
  });
});
