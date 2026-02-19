import { z } from 'zod';
import { getDb } from '../db/connection.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  handler: (params: Record<string, unknown>) => unknown;
}

// ── Registry ───────────────────────────────────────────────────────────────

const tools = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

// ── Audit helper ───────────────────────────────────────────────────────────

export function auditLog(
  tool: string,
  action: string,
  entityType?: string,
  entityId?: string,
  beforeState?: unknown,
  afterState?: unknown,
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (tool, action, entity_type, entity_id, before_state, after_state)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tool,
    action,
    entityType ?? null,
    entityId ?? null,
    beforeState != null ? JSON.stringify(beforeState) : null,
    afterState != null ? JSON.stringify(afterState) : null,
  );
}

// ── Zod → JSON Schema ─────────────────────────────────────────────────────

function zodFieldToJson(field: z.ZodTypeAny): Record<string, unknown> {
  if (field instanceof z.ZodString) return { type: 'string' };
  if (field instanceof z.ZodNumber) return { type: 'number' };
  if (field instanceof z.ZodBoolean) return { type: 'boolean' };
  if (field instanceof z.ZodEnum) return { type: 'string', enum: (field as z.ZodEnum<[string, ...string[]]>).options };
  if (field instanceof z.ZodOptional) return zodFieldToJson(field.unwrap());
  if (field instanceof z.ZodDefault) return zodFieldToJson(field.removeDefault());
  if (field instanceof z.ZodArray) return { type: 'array', items: zodFieldToJson(field.element) };
  if (field instanceof z.ZodObject) return zodToJsonSchema(field as z.ZodObject<z.ZodRawShape>);
  return { type: 'string' };
}

export function zodToJsonSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): { type: 'object'; properties: Record<string, unknown>; required?: string[] } {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[key] = zodFieldToJson(zodType);
    if (!zodType.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: 'object' as const,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
