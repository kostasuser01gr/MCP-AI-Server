#!/usr/bin/env tsx
/**
 * verify-domain.ts — Test that the verification endpoint behaves exactly
 * as OpenAI expects: HTTP 200, text/plain, token body, no redirects.
 *
 * Usage:
 *   npm run verify:domain:test                          # tests localhost:3030
 *   npm run verify:domain:test -- https://example.com   # tests public URL
 */

const base = process.argv[2] ?? `http://localhost:${process.env['PORT'] ?? 3030}`;
const url = `${base.replace(/\/$/, '')}/.well-known/mcp-verification.txt`;

console.log(`\n🔍 Testing verification endpoint: ${url}\n`);

async function run() {
  let passed = 0;
  let failed = 0;

  // ── Test 1: Status code ──
  const res = await fetch(url, {
    redirect: 'manual', // Do NOT follow redirects — OpenAI doesn't either
    headers: { 'User-Agent': 'verify-domain-test/1.0' },
  });

  if (res.status === 200) {
    console.log('✅ Status: 200 OK');
    passed++;
  } else {
    console.log(`❌ Status: ${res.status} (expected 200)`);
    failed++;
  }

  // ── Test 2: Content-Type ──
  const ct = res.headers.get('content-type') ?? '';
  if (ct.startsWith('text/plain')) {
    console.log(`✅ Content-Type: ${ct}`);
    passed++;
  } else {
    console.log(`❌ Content-Type: ${ct} (expected text/plain)`);
    failed++;
  }

  // ── Test 3: Cache-Control ──
  const cc = res.headers.get('cache-control') ?? '';
  if (cc.includes('no-store') || cc.includes('no-cache')) {
    console.log(`✅ Cache-Control: ${cc}`);
    passed++;
  } else {
    console.log(`⚠️  Cache-Control: ${cc || '(missing)'} — consider adding no-store`);
    // Warning, not failure — OpenAI doesn't strictly require this
    passed++;
  }

  // ── Test 4: Body is non-empty plain text ──
  const body = await res.text();
  const trimmed = body.trim();

  if (!trimmed) {
    console.log('❌ Body: empty (expected verification token)');
    failed++;
  } else if (trimmed === 'REPLACE_WITH_YOUR_VERIFICATION_TOKEN') {
    console.log('❌ Body: still placeholder — set an actual token');
    failed++;
  } else if (trimmed.includes('<') || trimmed.includes('{')) {
    console.log(`❌ Body: looks like HTML/JSON, not plain text → "${trimmed.slice(0, 80)}"`);
    failed++;
  } else {
    console.log(`✅ Body: "${trimmed.slice(0, 64)}${trimmed.length > 64 ? '…' : ''}"`);
    passed++;
  }

  // ── Test 5: No redirect ──
  if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
    console.log(`❌ Redirect detected (status ${res.status}) — OpenAI will fail`);
    failed++;
  } else {
    console.log('✅ No redirect');
    passed++;
  }

  // ── Test 6: ETag protection (send conditional request) ──
  const etag = res.headers.get('etag');
  if (etag) {
    const conditionalRes = await fetch(url, {
      headers: { 'If-None-Match': etag, 'User-Agent': 'verify-domain-test/1.0' },
      redirect: 'manual',
    });
    if (conditionalRes.status === 304) {
      console.log('❌ ETag: Returns 304 on conditional request — OpenAI expects 200');
      failed++;
    } else {
      console.log(`✅ ETag: Conditional request still returns ${conditionalRes.status}`);
      passed++;
    }
  } else {
    console.log('✅ ETag: Not set (no 304 risk)');
    passed++;
  }

  // ── Summary ──
  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('🛑 Fix the issues above before attempting OpenAI domain verification.\n');
    process.exit(1);
  } else {
    console.log('🎉 Verification endpoint is OpenAI-ready.\n');
  }
}

run().catch((err) => {
  console.error(`\n❌ Could not reach ${url}\n`);
  console.error(`   ${err instanceof Error ? err.message : String(err)}`);
  console.error('\n   Is the server running? Is the URL correct?\n');
  process.exit(1);
});
