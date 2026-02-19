import { Router } from 'express';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';
import { logger } from '../logger.js';

const router = Router();

// ── POST /mcp — JSON-RPC MCP endpoint (tools/list, tools/call, etc.) ────────
router.post('/', async (req: Request, res: Response) => {
  logger.info('MCP POST', { method: req.body?.method ?? 'batch' });

  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no session tracking
    });

    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('MCP POST failed', { error: String(error) });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// ── GET /mcp — Not supported in stateless mode ──────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Use POST for MCP JSON-RPC requests.' },
    id: null,
  });
});

// ── DELETE /mcp — Not applicable ─────────────────────────────────────────────
router.delete('/', (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Session management not supported in stateless mode.' },
    id: null,
  });
});

export { router as mcpRouter };
