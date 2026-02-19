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
  `);

  logger.info('Database schema initialized');
}
