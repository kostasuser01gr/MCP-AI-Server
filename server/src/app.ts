import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { initSchema } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { apiKeyAuth } from './auth/middleware.js';
import { mcpRouter } from './mcp/routes.js';
import { apiRouter } from './api/routes.js';
import { aiRouter } from './llm/router.js';
import { logger } from './logger.js';
import { getDb } from './db/connection.js';

// Register all tools (side-effect imports)
import './tools/fleet.js';
import './tools/wash.js';
import './tools/sales.js';
import './tools/reports.js';
import './tools/knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../public');
const clientOrigin = (process.env['CLIENT_ORIGIN'] || 'http://localhost:3001').trim();

let bootstrapped = false;
let cachedApp: express.Express | null = null;

function bootstrap(): void {
  if (bootstrapped) return;

  // ── Database ──
  initSchema();
  seedDatabase();

  // ── AI Router ──
  aiRouter.init();

  // Load API keys from database
  try {
    const keys = getDb().prepare('SELECT provider, encrypted_key FROM api_keys WHERE is_active = 1').all() as {
      provider: string;
      encrypted_key: string;
    }[];

    for (const k of keys) {
      try {
        aiRouter.addProvider(k.provider, k.encrypted_key);
      } catch {
        // already registered via env var
      }
    }
  } catch {
    // api_keys table may not exist yet on first run
  }

  bootstrapped = true;
}

export function getApp(): express.Express {
  if (cachedApp) return cachedApp;

  bootstrap();

  const app = express();

  app.use(cors({
    origin: clientOrigin,
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));

  // Request logging (skip /health)
  app.use((req, _res, next) => {
    if (req.path !== '/health') {
      logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
    }
    next();
  });

  // ── Domain verification (file first, then env fallback) ──
  app.get('/.well-known/mcp-verification.txt', (_req, res) => {
    const filePath = path.join(publicDir, '.well-known', 'mcp-verification.txt');
    try {
      if (fs.existsSync(filePath)) {
        const token = fs.readFileSync(filePath, 'utf-8').trim();
        if (token && token !== 'REPLACE_WITH_YOUR_VERIFICATION_TOKEN') {
          res.type('text/plain').send(token);
          return;
        }
      }
    } catch {
      // fall through
    }

    const envToken = process.env['MCP_VERIFICATION_TOKEN']?.trim();
    if (envToken) {
      res.type('text/plain').send(envToken);
      return;
    }

    res.status(404).json({ error: 'Verification token not configured' });
  });

  // ── Static files ──
  app.use(express.static(publicDir));

  // ── Health check (no auth) ──
  app.get('/health', (_req, res) => {
    res.json({ ok: true, name: 'mcp-car-rental', version: '1.0.0' });
  });

  // ── MCP endpoint (auth-protected) ──
  app.use('/mcp', apiKeyAuth, mcpRouter);

  // ── REST API (JWT-protected internally) ──
  app.use('/api/v1', apiRouter);

  // ── Fallback 404 ──
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Error handler ──
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  cachedApp = app;
  return app;
}
