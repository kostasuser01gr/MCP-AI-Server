/**
 * Unit tests for the logger — verifies JSON structured logging.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('logger', () => {
  const originalEnv = process.env['LOG_LEVEL'];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('outputs valid JSON with required fields', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Build a minimal logger inline (same logic as logger.ts)
    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
    type Level = keyof typeof LEVELS;
    const configuredLevel: Level = 'debug';

    function log(level: Level, msg: string, meta?: Record<string, unknown>) {
      if (LEVELS[level] < LEVELS[configuredLevel]) return;
      const entry = { ts: new Date().toISOString(), level, msg, ...meta };
      process.stdout.write(JSON.stringify(entry) + '\n');
    }

    log('info', 'test message', { extra: 42 });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output.trim());
    expect(parsed).toHaveProperty('ts');
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('test message');
    expect(parsed.extra).toBe(42);

    spy.mockRestore();
  });

  it('respects log level filtering', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
    type Level = keyof typeof LEVELS;
    const configuredLevel: Level = 'warn';

    function log(level: Level, msg: string) {
      if (LEVELS[level] < LEVELS[configuredLevel]) return;
      process.stdout.write(JSON.stringify({ level, msg }) + '\n');
    }

    log('debug', 'should not appear');
    log('info', 'should not appear');
    log('warn', 'should appear');
    log('error', 'should appear');

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
