import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prepareMock } = vi.hoisted(() => ({
  prepareMock: vi.fn(),
}));

vi.mock('../db/connection.js', () => ({
  getDb: () => ({ prepare: prepareMock }),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { login, normalizeEmail, signup } from './jwt.js';

describe('normalizeEmail', () => {
  it('trims and lowercases email values', () => {
    expect(normalizeEmail('  User.Name+tag@Example.COM\t')).toBe('user.name+tag@example.com');
  });
});

describe('auth email normalization', () => {
  beforeEach(() => {
    prepareMock.mockReset();
  });

  it('checks signup duplicates using normalized email', async () => {
    const existsGet = vi.fn().mockReturnValue({ id: 'existing-user' });
    prepareMock.mockReturnValue({ get: existsGet });

    await expect(signup('  User@Example.COM  ', 'password-123', 'User')).rejects.toThrow('Email already registered');

    expect(prepareMock).toHaveBeenCalledWith('SELECT id FROM users WHERE email = ?');
    expect(existsGet).toHaveBeenCalledWith('user@example.com');
  });

  it('queries login by normalized email', async () => {
    const userGet = vi.fn().mockReturnValue(undefined);
    prepareMock.mockReturnValue({ get: userGet });

    await expect(login('\tUSER@Example.COM ', 'password-123')).rejects.toThrow('Invalid email or password');

    expect(prepareMock).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?');
    expect(userGet).toHaveBeenCalledWith('user@example.com');
  });
});
