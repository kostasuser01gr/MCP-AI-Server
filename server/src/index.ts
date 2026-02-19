import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logging (skip /health)
app.use((req, _res, next) => {
  if (req.path !== '/health') {
    logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

// ── Static: .well-known for domain verification ──
const publicDir = path.resolve(__dirname, '../../public');
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
