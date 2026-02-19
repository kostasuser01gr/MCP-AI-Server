/**
 * Smoke test — verifies the server is running and MCP endpoint works.
 * Usage: npm run smoke  (server must be running on PORT)
 *
 * MCP SDK returns SSE-formatted responses (event: message / data: {...}).
 * In stateless mode, tools/* requests work directly (no init handshake needed).
 */

const PORT = process.env['PORT'] ?? '3030';
const API_KEY = process.env['MCP_API_KEY'] ?? '';
const BASE = `http://localhost:${PORT}`;

type Json = Record<string, unknown>;

/** Parse SSE text into JSON objects from `data:` lines */
function parseSse(raw: string): Json[] {
  const results: Json[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('data: ')) {
      results.push(JSON.parse(line.slice(6)) as Json);
    }
  }
  return results;
}

/** Send a single MCP JSON-RPC request, abort after timeout to handle SSE keep-alive */
async function mcpPost(
  method: string,
  params: unknown,
  id: number,
  authed = true,
): Promise<{ status: number; events: Json[] }> {
  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (authed && API_KEY) hdrs['x-api-key'] = API_KEY;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 3000);

  try {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: ac.signal,
    });
    if (!res.ok) return { status: res.status, events: [] };
    const text = await res.text();
    return { status: res.status, events: parseSse(text) };
  } catch (e: unknown) {
    // AbortError means we got the SSE data but stream didn't close — that's OK
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { status: 200, events: [] };
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\n🔍 Smoke test against ${BASE}\n`);

  // 1) Health
  await test('GET /health returns { ok: true }', async () => {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as Json;
    if (body['ok'] !== true) throw new Error(`Expected ok:true, got ${JSON.stringify(body)}`);
  });

  // 2) tools/list
  await test('POST /mcp tools/list returns ≥6 tools', async () => {
    const { events, status } = await mcpPost('tools/list', {}, 2);
    if (status !== 200) throw new Error(`HTTP ${status}`);
    let count = 0;
    for (const ev of events) {
      const r = ev['result'] as Json | undefined;
      if (r && Array.isArray(r['tools'])) count = (r['tools'] as unknown[]).length;
    }
    if (count < 6) throw new Error(`Expected ≥6 tools, got ${count}`);
    console.log(`       → ${count} tools discovered`);
  });

  // 3) tools/call fleet_list_vehicles
  await test('POST /mcp tools/call fleet_list_vehicles', async () => {
    const { events, status } = await mcpPost('tools/call', { name: 'fleet_list_vehicles', arguments: {} }, 3);
    if (status !== 200) throw new Error(`HTTP ${status}`);
    let ok = false;
    for (const ev of events) {
      const r = ev['result'] as Json | undefined;
      if (r && Array.isArray(r['content'])) ok = true;
    }
    if (!ok) throw new Error('No tool result content');
    console.log('       → vehicles returned');
  });

  // 4) Auth enforcement
  await test('POST /mcp without key → 401 (if auth enabled)', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    });
    if (API_KEY && res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    if (!API_KEY) console.log('       → auth disabled, skipped');
  });

  // 5) Verification file
  await test('GET /.well-known/mcp-verification.txt', async () => {
    const res = await fetch(`${BASE}/.well-known/mcp-verification.txt`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trim()) throw new Error('Empty');
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
