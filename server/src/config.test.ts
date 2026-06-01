import { describe, expect, it } from 'vitest';
import { DEFAULT_JWT_SECRET, validateEnv } from './config.js';

describe('validateEnv', () => {
  it('applies defaults for empty env', () => {
    const result = validateEnv({});
    expect(result.PORT).toBe(3030);
    expect(result.AUTH_MODE).toBe('api_key');
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.NODE_ENV).toBe('development');
    expect(result.DB_PATH).toBe('./data/app.db');
    expect(result.MCP_API_KEY).toBe('');
    expect(result.JWT_SECRET).toBe(DEFAULT_JWT_SECRET);
    expect(result.CLIENT_ORIGIN).toBe('http://localhost:3001');
    expect(result.MCP_VERIFICATION_TOKEN).toBe('');
  });

  it('coerces and trims env values', () => {
    const result = validateEnv({
      PORT: '8080',
      AUTH_MODE: 'api_key\n',
      LOG_LEVEL: 'warn\n',
      MCP_API_KEY: '  secret-key  ',
      DB_PATH: '  /tmp/app.db  ',
      JWT_SECRET: '  strong-secret  ',
      CLIENT_ORIGIN: ' https://app.example.com ',
      MCP_VERIFICATION_TOKEN: ' token-123 ',
    });
    expect(result.PORT).toBe(8080);
    expect(result.AUTH_MODE).toBe('api_key');
    expect(result.LOG_LEVEL).toBe('warn');
    expect(result.MCP_API_KEY).toBe('secret-key');
    expect(result.DB_PATH).toBe('/tmp/app.db');
    expect(result.JWT_SECRET).toBe('strong-secret');
    expect(result.CLIENT_ORIGIN).toBe('https://app.example.com');
    expect(result.MCP_VERIFICATION_TOKEN).toBe('token-123');
  });

  it('rejects invalid PORT and enum values', () => {
    expect(() => validateEnv({ PORT: '0' })).toThrow('Invalid environment variables');
    expect(() => validateEnv({ PORT: '70000' })).toThrow('Invalid environment variables');
    expect(() => validateEnv({ AUTH_MODE: 'bearer' })).toThrow('Invalid environment variables');
    expect(() => validateEnv({ LOG_LEVEL: 'verbose' })).toThrow('Invalid environment variables');
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow('Invalid environment variables');
  });

  it('fails fast in production when AUTH_MODE=api_key and MCP_API_KEY is missing', () => {
    expect(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_MODE: 'api_key',
      JWT_SECRET: 'super-secret',
      MCP_API_KEY: '',
    })).toThrow('MCP_API_KEY is required when AUTH_MODE=api_key in production');
  });

  it('fails fast in production when API key is placeholder-like', () => {
    expect(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_MODE: 'api_key',
      JWT_SECRET: 'super-secret',
      MCP_API_KEY: 'change-me-now',
    })).toThrow('MCP_API_KEY must not use placeholder/example values in production');
  });

  it('fails fast in production when JWT secret is default or placeholder', () => {
    expect(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_MODE: 'no_auth',
      JWT_SECRET: DEFAULT_JWT_SECRET,
    })).toThrow('JWT_SECRET must be set to a strong value in production');

    expect(() => validateEnv({
      NODE_ENV: 'production',
      AUTH_MODE: 'no_auth',
      JWT_SECRET: 'change-me-secret',
    })).toThrow('JWT_SECRET must not use placeholder/example values in production');
  });

  it('accepts valid production config', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      PORT: '3030',
      DB_PATH: '/tmp/app.db',
      AUTH_MODE: 'api_key',
      MCP_API_KEY: '<MCP_API_KEY>',
      JWT_SECRET: '<MCP_API_KEY>',
      CLIENT_ORIGIN: 'https://mcp-ai-server.example.com',
      LOG_LEVEL: 'info',
    });

    expect(result.NODE_ENV).toBe('production');
    expect(result.AUTH_MODE).toBe('api_key');
    expect(result.MCP_API_KEY).toBe('<MCP_API_KEY>');
    expect(result.JWT_SECRET).toBe('<MCP_API_KEY>');
  });
});
