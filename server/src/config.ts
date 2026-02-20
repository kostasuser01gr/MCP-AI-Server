import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const defaultDbPath = process.env['VERCEL'] ? '/tmp/app.db' : './data/app.db';
const trimIfString = (value: unknown) => typeof value === 'string' ? value.trim() : value;

export const DEFAULT_JWT_SECRET = 'dev-secret-change-in-production';
const placeholderRegex = /^(change-me|your-|replace-|example-)/i;

function looksLikePlaceholder(value: string): boolean {
  return placeholderRegex.test(value);
}

export const envSchema = z.object({
  NODE_ENV: z.preprocess(trimIfString, z.enum(['development', 'production', 'test']).default('development')),
  PORT: z.coerce.number().min(1).max(65535).default(3030),
  DB_PATH: z.preprocess(trimIfString, z.string().default(defaultDbPath)),
  MCP_API_KEY: z.preprocess(trimIfString, z.string().default('')),
  AUTH_MODE: z.preprocess(trimIfString, z.enum(['api_key', 'no_auth']).default('api_key')),
  JWT_SECRET: z.preprocess(trimIfString, z.string().default(DEFAULT_JWT_SECRET)),
  CLIENT_ORIGIN: z.preprocess(trimIfString, z.string().default('http://localhost:3001')),
  MCP_VERIFICATION_TOKEN: z.preprocess(trimIfString, z.string().default('')),
  LOG_LEVEL: z.preprocess(trimIfString, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
});

export type AppConfig = z.infer<typeof envSchema>;

function formatZodErrors(errors: Record<string, string[] | undefined>): string {
  return Object.entries(errors)
    .flatMap(([key, messages]) => (messages || []).map((message) => `- ${key}: ${message}`))
    .join('\n');
}

export function validateEnv(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${formatZodErrors(parsed.error.flatten().fieldErrors)}`);
  }

  const cfg = parsed.data;
  const errors: string[] = [];

  if (cfg.NODE_ENV === 'production') {
    if (cfg.AUTH_MODE === 'api_key') {
      if (!cfg.MCP_API_KEY) {
        errors.push('MCP_API_KEY is required when AUTH_MODE=api_key in production');
      } else if (looksLikePlaceholder(cfg.MCP_API_KEY)) {
        errors.push('MCP_API_KEY must not use placeholder/example values in production');
      }
    }

    if (!cfg.JWT_SECRET || cfg.JWT_SECRET === DEFAULT_JWT_SECRET) {
      errors.push('JWT_SECRET must be set to a strong value in production');
    } else if (looksLikePlaceholder(cfg.JWT_SECRET)) {
      errors.push('JWT_SECRET must not use placeholder/example values in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.map((err) => `- ${err}`).join('\n')}`);
  }

  return cfg;
}

let config: AppConfig;
try {
  config = validateEnv(process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${message}`);
  process.exit(1);
}

export { config };

export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const KNOWLEDGE_DIR = path.resolve(PROJECT_ROOT, 'knowledge');
