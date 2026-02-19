import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllTools, getTool, zodToJsonSchema } from '../tools/registry.js';
import { logger } from '../logger.js';

/**
 * Create a fresh MCP server with all registered tools.
 * Stateless — one instance per HTTP request.
 */
export function createMcpServer(): Server {
  const server = new Server(
    { name: 'mcp-car-rental', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // ── tools/list ──
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getAllTools();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.parameters),
      })),
    };
  });

  // ── tools/call ──
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = getTool(toolName);

    if (!tool) {
      logger.warn('MCP: unknown tool', { tool: toolName });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
        isError: true,
      };
    }

    try {
      const args = request.params.arguments ?? {};
      const parsed = tool.parameters.parse(args);
      const result = await tool.handler(parsed as Record<string, unknown>);

      logger.info('MCP: tool executed', { tool: toolName });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('MCP: tool failed', { tool: toolName, error: msg });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }],
        isError: true,
      };
    }
  });

  return server;
}
