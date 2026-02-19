import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const current = LEVELS[config.LOG_LEVEL];

function fmt(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  return JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta });
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) { if (current <= 0) console.debug(fmt('debug', msg, meta)); },
  info(msg: string, meta?: Record<string, unknown>)  { if (current <= 1) console.info(fmt('info', msg, meta)); },
  warn(msg: string, meta?: Record<string, unknown>)  { if (current <= 2) console.warn(fmt('warn', msg, meta)); },
  error(msg: string, meta?: Record<string, unknown>) { console.error(fmt('error', msg, meta)); },
};
