import { config } from './config.js';
import { closeDb } from './db/connection.js';
import { logger } from './logger.js';
import { getApp } from './app.js';

// ── Start ──
const app = getApp();
const server = app.listen(config.PORT, () => {
  logger.info(`🚗 MCP Car Rental server on port ${config.PORT}`);
  logger.info(`   Auth mode: ${config.AUTH_MODE}`);
  logger.info(`   MCP endpoint: http://localhost:${config.PORT}/mcp`);
  logger.info(`   API endpoint: http://localhost:${config.PORT}/api/v1`);
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
