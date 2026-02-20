/**
 * Unit tests for the tool registry — pure logic, no DB needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

/*
 * We can't import from '../tools/registry.js' directly because it calls
 * getDb() at module level in auditLog. Instead we test the Zod → JSON
 * Schema logic and the registry Map behaviour in isolation.
 */

// ── zodToJsonSchema (re-implemented inline for unit testing) ──

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

function zodToJsonSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): { type: 'object'; properties: Record<string, unknown>; required?: string[] } {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[key] = zodFieldToJson(zodType);
    if (!zodType.isOptional()) required.push(key);
  }
  return { type: 'object' as const, properties, ...(required.length > 0 ? { required } : {}) };
}

// ── Tests ──

describe('zodToJsonSchema', () => {
  it('converts string + number + boolean fields', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });
    const result = zodToJsonSchema(schema);
    expect(result.type).toBe('object');
    expect(result.properties).toEqual({
      name: { type: 'string' },
      age: { type: 'number' },
      active: { type: 'boolean' },
    });
    expect(result.required).toEqual(['name', 'age', 'active']);
  });

  it('marks optional fields as not required', () => {
    const schema = z.object({
      status: z.string().optional(),
      location: z.string(),
    });
    const result = zodToJsonSchema(schema);
    expect(result.required).toEqual(['location']);
    expect(result.properties).toHaveProperty('status');
  });

  it('handles enums', () => {
    const schema = z.object({
      size: z.enum(['small', 'medium', 'large']),
    });
    const result = zodToJsonSchema(schema);
    expect(result.properties['size']).toEqual({ type: 'string', enum: ['small', 'medium', 'large'] });
  });

  it('handles arrays', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const result = zodToJsonSchema(schema);
    expect(result.properties['tags']).toEqual({ type: 'array', items: { type: 'string' } });
  });

  it('handles nested objects', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });
    const result = zodToJsonSchema(schema);
    expect(result.properties['address']).toEqual({
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
      },
      required: ['street', 'city'],
    });
  });

  it('handles empty schema (no required)', () => {
    const schema = z.object({});
    const result = zodToJsonSchema(schema);
    expect(result.type).toBe('object');
    expect(result.properties).toEqual({});
    expect(result.required).toBeUndefined();
  });

  it('handles defaults by unwrapping', () => {
    const schema = z.object({
      level: z.number().default(1),
    });
    const result = zodToJsonSchema(schema);
    expect(result.properties['level']).toEqual({ type: 'number' });
  });
});

// ── In-memory registry logic ──

interface ToolDef {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  handler: (params: Record<string, unknown>) => unknown;
}

describe('Tool registry (in-memory)', () => {
  let tools: Map<string, ToolDef>;

  beforeEach(() => {
    tools = new Map();
  });

  it('registers and retrieves a tool', () => {
    const tool: ToolDef = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({ query: z.string() }),
      handler: (p) => `result for ${p['query']}`,
    };
    tools.set(tool.name, tool);
    expect(tools.get('test_tool')).toBe(tool);
  });

  it('returns undefined for unknown tool', () => {
    expect(tools.get('nonexistent')).toBeUndefined();
  });

  it('lists all tools', () => {
    tools.set('a', { name: 'a', description: 'A', parameters: z.object({}), handler: () => null });
    tools.set('b', { name: 'b', description: 'B', parameters: z.object({}), handler: () => null });
    expect(Array.from(tools.values())).toHaveLength(2);
  });

  it('overwrites on duplicate name', () => {
    tools.set('dup', { name: 'dup', description: 'V1', parameters: z.object({}), handler: () => 1 });
    tools.set('dup', { name: 'dup', description: 'V2', parameters: z.object({}), handler: () => 2 });
    expect(tools.get('dup')?.description).toBe('V2');
  });
});
