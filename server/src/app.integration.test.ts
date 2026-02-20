import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const verificationDir = path.resolve(__dirname, '../../public/.well-known');
const verificationPath = path.join(verificationDir, 'mcp-verification.txt');
const originalVerificationContent = fs.existsSync(verificationPath)
  ? fs.readFileSync(verificationPath, 'utf-8')
  : null;

function cleanupVerificationFile(): void {
  if (originalVerificationContent !== null) {
    fs.mkdirSync(verificationDir, { recursive: true });
    fs.writeFileSync(verificationPath, originalVerificationContent, 'utf-8');
    return;
  }
  fs.rmSync(verificationPath, { force: true });
}

describe('HTTP integration', () => {
  afterEach(() => {
    cleanupVerificationFile();
  });

  it('GET /health returns OK payload', async () => {
    const res = await request(getApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, name: 'mcp-car-rental', version: '1.0.0' });
  });

  it('GET / returns endpoint metadata', async () => {
    const res = await request(getApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      name: 'mcp-car-rental',
      endpoints: {
        health: '/health',
        mcp: '/mcp',
        api: '/api/v1',
      },
    });
  });

  it('GET /.well-known/mcp-verification.txt serves token from file fallback', async () => {
    const token = `token-${Date.now()}`;
    fs.mkdirSync(verificationDir, { recursive: true });
    fs.writeFileSync(verificationPath, token, 'utf-8');

    const res = await request(getApp()).get('/.well-known/mcp-verification.txt');
    expect(res.status).toBe(200);
    expect(res.text.trim()).toBe(token);
  });

  it('POST /mcp without x-api-key is denied', async () => {
    const res = await request(getApp())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

    expect([401, 500]).toContain(res.status);
    if (res.status === 401) {
      expect(res.body?.error).toMatch(/Unauthorized/i);
    }
    if (res.status === 500) {
      expect(res.body?.error).toMatch(/misconfiguration/i);
    }
  });
});
