/* ── Chat Service: conversation & message CRUD ── */

import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  system_prompt: string | null;
  starred: number;
  tags: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  model: string | null;
  provider: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  parent_id: string | null;
  created_at: string;
}

/* ── Conversations ── */

export function createConversation(userId: string, title?: string, modelId?: string, systemPrompt?: string): ConversationRow {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO conversations (id, user_id, title, model_id, system_prompt)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, title || 'New Chat', modelId ?? null, systemPrompt ?? null);
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRow;
}

export function getConversations(userId: string): ConversationRow[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(userId) as ConversationRow[];
}

export function getConversation(id: string, userId: string): ConversationRow | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId) as ConversationRow) ?? null;
}

export function updateConversation(id: string, userId: string, updates: Partial<Pick<ConversationRow, 'title' | 'starred' | 'model_id' | 'system_prompt'>>) {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
  if (updates.starred !== undefined) { sets.push('starred = ?'); values.push(updates.starred); }
  if (updates.model_id !== undefined) { sets.push('model_id = ?'); values.push(updates.model_id); }
  if (updates.system_prompt !== undefined) { sets.push('system_prompt = ?'); values.push(updates.system_prompt); }

  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(id, userId);

  db.prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteConversation(id: string, userId: string) {
  const db = getDb();
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId);
}

/* ── Messages ── */

export function addMessage(
  conversationId: string,
  role: string,
  content: string,
  meta?: { model?: string; provider?: string; promptTokens?: number; completionTokens?: number; latencyMs?: number; parentId?: string }
): MessageRow {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model, provider, prompt_tokens, completion_tokens, latency_ms, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, conversationId, role, content,
    meta?.model ?? null, meta?.provider ?? null,
    meta?.promptTokens ?? 0, meta?.completionTokens ?? 0,
    meta?.latencyMs ?? 0, meta?.parentId ?? null
  );

  // Update message count & timestamp
  db.prepare(`
    UPDATE conversations
    SET message_count = message_count + 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(conversationId);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow;
}

export function getMessages(conversationId: string): MessageRow[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(conversationId) as MessageRow[];
}

/* ── Usage Logging ── */

export function logUsage(userId: string, model: string, provider: string, promptTokens: number, completionTokens: number, latencyMs: number) {
  const db = getDb();
  db.prepare(`
    INSERT INTO usage_log (user_id, model, provider, prompt_tokens, completion_tokens, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, model, provider, promptTokens, completionTokens, latencyMs);
}

/* ── Stats ── */

export function getUsageStats(userId?: string) {
  const db = getDb();
  const where = userId ? 'WHERE user_id = ?' : '';
  const params = userId ? [userId] : [];

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_messages,
      COALESCE(SUM(prompt_tokens + completion_tokens), 0) as total_tokens,
      COALESCE(AVG(latency_ms), 0) as avg_latency
    FROM usage_log ${where}
  `).get(...params) as { total_messages: number; total_tokens: number; avg_latency: number };

  const byModel = db.prepare(`
    SELECT model, provider, COUNT(*) as count, SUM(prompt_tokens + completion_tokens) as tokens
    FROM usage_log ${where}
    GROUP BY model ORDER BY count DESC LIMIT 10
  `).all(...params);

  const daily = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM usage_log ${where}
    GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30
  `).all(...params);

  return { totals, byModel, daily };
}

/* ── Auto-title ── */

export function autoTitleConversation(conversationId: string, firstMessage: string) {
  const title = firstMessage.length > 50
    ? firstMessage.slice(0, 50) + '…'
    : firstMessage;
  const db = getDb();
  db.prepare("UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, conversationId);
}
