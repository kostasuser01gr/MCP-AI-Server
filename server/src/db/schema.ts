import { getDb } from './connection.js';
import { logger } from '../logger.js';

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id            TEXT PRIMARY KEY,
      plate         TEXT NOT NULL UNIQUE,
      make          TEXT NOT NULL,
      model         TEXT NOT NULL,
      year          INTEGER NOT NULL,
      category      TEXT NOT NULL DEFAULT 'economy',
      color         TEXT,
      status        TEXT NOT NULL DEFAULT 'available',
      location      TEXT NOT NULL DEFAULT 'HQ',
      odometer      INTEGER NOT NULL DEFAULT 0,
      daily_rate    REAL NOT NULL DEFAULT 0,
      notes         TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS washes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id    TEXT NOT NULL REFERENCES vehicles(id),
      employee_id   TEXT NOT NULL,
      timestamp     TEXT NOT NULL,
      notes         TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id    TEXT NOT NULL REFERENCES vehicles(id),
      seller_id     TEXT NOT NULL,
      amount        REAL NOT NULL,
      extras        TEXT,
      timestamp     TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tool          TEXT NOT NULL,
      action        TEXT NOT NULL,
      entity_type   TEXT,
      entity_id     TEXT,
      before_state  TEXT,
      after_state   TEXT,
      ts            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ══════════ MCP AI Server tables ══════════

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      avatar        TEXT,
      role          TEXT NOT NULL DEFAULT 'user',
      preferred_model TEXT,
      theme         TEXT DEFAULT 'system',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT NOT NULL DEFAULT 'New Chat',
      model_id      TEXT,
      system_prompt TEXT,
      starred       INTEGER NOT NULL DEFAULT 0,
      tags          TEXT DEFAULT '[]',
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL,
      content         TEXT NOT NULL,
      model           TEXT,
      provider        TEXT,
      prompt_tokens   INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      latency_ms      INTEGER DEFAULT 0,
      parent_id       TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id            TEXT PRIMARY KEY,
      provider      TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      key_preview   TEXT NOT NULL,
      is_active     INTEGER NOT NULL DEFAULT 1,
      added_by      TEXT NOT NULL REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      content       TEXT NOT NULL,
      category      TEXT DEFAULT 'general',
      tags          TEXT DEFAULT '[]',
      is_shared     INTEGER NOT NULL DEFAULT 0,
      user_id       TEXT NOT NULL REFERENCES users(id),
      usage_count   INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT NOT NULL REFERENCES users(id),
      model         TEXT NOT NULL,
      provider      TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_usage_log_user ON usage_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at);
  `);

  logger.info('Database schema initialized');
}
