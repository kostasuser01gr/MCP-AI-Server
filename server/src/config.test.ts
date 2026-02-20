/**
 * Unit tests for config.ts — env validation logic.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-create the exact Zod schema from config.ts to test validation logic
const trimIfString = (value: unknown) => typeof value === 'string' ? value.trim() : value;
const envSchema = z.object({
  NODE_ENV: z.preprocess(trimIfString, z.enum(['development', 'production', 'test']).default('development')),
  PORT: z.coerce.number().min(1).max(65535).default(3030),
  DB_PATH: z.preprocess(trimIfString, z.string().default('./data/app.db')),
  MCP_API_KEY: z.preprocess(trimIfString, z.string().default('')),
  AUTH_MODE: z.preprocess(trimIfString, z.enum(['api_key', 'no_auth']).default('api_key')),
  LOG_LEVEL: z.preprocess(trimIfString, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
});

describe('envSchema validation', () => {
  it('applies defaults for empty env', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3030);
      expect(result.data.AUTH_MODE).toBe('api_key');
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.DB_PATH).toBe('./data/app.db');
      expect(result.data.MCP_API_KEY).toBe('');
    }
  });

  it('coerces string PORT to number', () => {
    const result = envSchema.safeParse({ PORT: '8080' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(8080);
  });

  it('rejects PORT out of range', () => {
    const result = envSchema.safeParse({ PORT: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects PORT > 65535', () => {
    const result = envSchema.safeParse({ PORT: '70000' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid AUTH_MODE', () => {
    const result = envSchema.safeParse({ AUTH_MODE: 'bearer' });
    expect(result.success).toBe(false);
  });

  it('accepts valid AUTH_MODE values', () => {
    expect(envSchema.safeParse({ AUTH_MODE: 'api_key' }).success).toBe(true);
    expect(envSchema.safeParse({ AUTH_MODE: 'no_auth' }).success).toBe(true);
  });

  it('rejects invalid LOG_LEVEL', () => {
    const result = envSchema.safeParse({ LOG_LEVEL: 'verbose' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'staging' });
    expect(result.success).toBe(false);
  });

  it('accepts full valid config', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      PORT: '3030',
      DB_PATH: '/var/data/app.db',
      MCP_API_KEY: 'my-secret-key',
      AUTH_MODE: 'api_key',
      LOG_LEVEL: 'warn',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('production');
      expect(result.data.MCP_API_KEY).toBe('my-secret-key');
    }
  });

  it('trims whitespace around enum/string env values', () => {
    const result = envSchema.safeParse({
      AUTH_MODE: 'api_key\n',
      LOG_LEVEL: 'info\n',
      MCP_API_KEY: '  key-123  ',
      DB_PATH: '  /tmp/app.db  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.AUTH_MODE).toBe('api_key');
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.MCP_API_KEY).toBe('key-123');
      expect(result.data.DB_PATH).toBe('/tmp/app.db');
    }
  });
});
