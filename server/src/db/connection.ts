import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const requestedPath = path.resolve(config.DB_PATH);
  // Vercel serverless filesystem is read-only under /var/task; keep SQLite in /tmp.
  const dbPath = requestedPath.startsWith('/var/task/') ? '/tmp/app.db' : requestedPath;
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Created data directory', { path: dir });
  }

  if (dbPath !== requestedPath) {
    logger.warn('Adjusted DB path for serverless runtime', { requestedPath, dbPath });
  }

  db = new Database(dbPath, { timeout: 5000 });
  db.pragma('busy_timeout = 5000');
  if (!process.env['VERCEL']) {
    try {
      db.pragma('journal_mode = WAL');
    } catch (error) {
      logger.warn('Failed to enable WAL journal mode; continuing with default mode', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  db.pragma('foreign_keys = ON');
  logger.info('Database connected', { path: dbPath });
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}
