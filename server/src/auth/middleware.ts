import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Require `x-api-key` header matching MCP_API_KEY env var.
 * When AUTH_MODE=no_auth, skip check entirely (local dev only).
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (config.AUTH_MODE === 'no_auth') {
    next();
    return;
  }

  if (!config.MCP_API_KEY) {
    logger.error('MCP_API_KEY is not set but AUTH_MODE=api_key — all requests rejected');
    res.status(500).json({ error: 'Server misconfiguration: API key not set' });
    return;
  }

  const key = req.headers['x-api-key'];

  if (!key || key !== config.MCP_API_KEY) {
    logger.warn('Unauthorized request', { ip: req.ip, path: req.path });
    res.status(401).json({ error: 'Unauthorized — missing or invalid x-api-key header' });
    return;
  }

  next();
}
