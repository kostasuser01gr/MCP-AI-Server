import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { config } from './config.js';
import { initSchema } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { closeDb } from './db/connection.js';
import { apiKeyAuth } from './auth/middleware.js';
import { mcpRouter } from './mcp/routes.js';
import { logger } from './logger.js';

// Register all tools (side-effect imports)
import './tools/fleet.js';
import './tools/wash.js';
import './tools/sales.js';
import './tools/reports.js';
import './tools/knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Database ──
initSchema();
seedDatabase();

// ── Express ──
const app = express();

// Behind Cloudflare Tunnel — trust proxy so req.protocol, req.hostname,
// req.ip resolve correctly through the tunnel.
app.set('trust proxy', true);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logging (skip /health)
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

// ── Domain verification (hardened for OpenAI fetch behaviour) ──────────────
// OpenAI's verifier expects EXACTLY: HTTP 200, text/plain body, no redirects.
// We bypass Express's send() pipeline (which can produce 304 via ETag) and
// write the response manually to guarantee a 200 every time.
const publicDir = path.resolve(__dirname, '../../public');
app.get('/.well-known/mcp-verification.txt', (req, res) => {
  logger.info('Verification request received', {
    ip: req.ip,
    host: req.hostname,
    protocol: req.protocol,
    userAgent: req.headers['user-agent'] ?? 'unknown',
    ifNoneMatch: req.headers['if-none-match'] ?? 'none',
  });

  let token: string | undefined;

  // Priority 1 — file on disk
  const filePath = path.join(publicDir, '.well-known', 'mcp-verification.txt');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (raw && raw !== 'REPLACE_WITH_YOUR_VERIFICATION_TOKEN') {
        token = raw;
      }
    }
  } catch { /* fall through */ }

  // Priority 2 — environment variable
  if (!token) {
    token = process.env['MCP_VERIFICATION_TOKEN']?.trim();
  }

  if (!token) {
    logger.warn('Verification token not configured');
    res.status(404).type('text/plain').send('Verification token not configured');
    return;
  }

  // Bypass Express ETag / conditional-request pipeline entirely.
  // Write raw response to guarantee HTTP 200 + plain text body every time.
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(token, 'utf-8'),
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(token);
});

// ── Static files ──
app.use(express.static(publicDir));

// ── Health check (no auth) ──
app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'mcp-car-rental', version: '1.0.0' });
});

// ── MCP endpoint (auth-protected) ──
app.use('/mcp', apiKeyAuth, mcpRouter);

// ── Fallback 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
const server = app.listen(config.PORT, () => {
  logger.info(`🚗 MCP Car Rental server on port ${config.PORT}`);
  logger.info(`   Auth mode: ${config.AUTH_MODE}`);
  logger.info(`   MCP endpoint: http://localhost:${config.PORT}/mcp`);
  logger.info(`   Health check: http://localhost:${config.PORT}/health`);
});

// ── Graceful shutdown ──
function shutdown(signal: string) {
  logger.info(`${signal} — shutting down`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
