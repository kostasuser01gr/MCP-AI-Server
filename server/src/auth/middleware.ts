import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { verifyToken, type JWTPayload } from './jwt.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

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

/**
 * JWT Bearer token auth for web app users.
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require admin or owner role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
