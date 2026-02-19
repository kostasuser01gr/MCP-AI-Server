import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3030),
  DB_PATH: z.string().default('./data/app.db'),
  MCP_API_KEY: z.string().default(''),
  AUTH_MODE: z.enum(['api_key', 'no_auth']).default('api_key'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const SERVER_ROOT = path.resolve(__dirname, '..');
export const KNOWLEDGE_DIR = path.resolve(PROJECT_ROOT, 'knowledge');
