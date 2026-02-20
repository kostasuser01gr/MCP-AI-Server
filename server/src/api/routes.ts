/* ── REST API Routes ── */

import { Router, type Request, type Response } from 'express';
import { signup, login, getUserById, type UserRow } from '../auth/jwt.js';
import { jwtAuth, requireAdmin } from '../auth/middleware.js';
import { chatRouter } from '../chat/routes.js';
import { aiRouter } from '../llm/router.js';
import { getUsageStats } from '../chat/service.js';
import { getDb } from '../db/connection.js';
import { v4 as uuid } from 'uuid';
import { logger } from '../logger.js';

export const apiRouter = Router();

/* ═══════ Auth (public) ═══════ */

apiRouter.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password, and name are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const result = await signup(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

/* ═══════ Protected routes below ═══════ */
apiRouter.use(jwtAuth);

/* ── Me ── */
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

apiRouter.patch('/auth/me', (req: Request, res: Response) => {
  const { name, preferred_model, theme } = req.body;
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { sets.push('name = ?'); values.push(name); }
  if (preferred_model !== undefined) { sets.push('preferred_model = ?'); values.push(preferred_model); }
  if (theme !== undefined) { sets.push('theme = ?'); values.push(theme); }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(req.user!.userId);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  const user = getUserById(req.user!.userId);
  res.json(user);
});

/* ═══════ Chat routes ═══════ */
apiRouter.use('/chat', chatRouter);

/* ═══════ Models ═══════ */
apiRouter.get('/models', (_req: Request, res: Response) => {
  res.json(aiRouter.getAvailableModels());
});

/* ═══════ Providers ═══════ */
apiRouter.get('/providers/health', (_req: Request, res: Response) => {
  res.json(aiRouter.getProviderHealth());
});

/* ═══════ Stats ═══════ */
apiRouter.get('/stats', (req: Request, res: Response) => {
  const stats = getUsageStats(req.user!.userId);
  res.json(stats);
});

apiRouter.get('/stats/global', requireAdmin, (_req: Request, res: Response) => {
  const stats = getUsageStats();
  res.json(stats);
});

/* ═══════ Admin routes ═══════ */
apiRouter.use('/admin', requireAdmin);

/* ── Admin: Users ── */
apiRouter.get('/admin/users', (_req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

apiRouter.patch('/admin/users/:id/role', (req: Request, res: Response) => {
  const { role } = req.body;
  if (!['user', 'admin', 'owner'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  const db = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

/* ── Admin: API Keys ── */
apiRouter.get('/admin/keys', (_req: Request, res: Response) => {
  const db = getDb();
  const keys = db.prepare(
    'SELECT id, provider, key_preview, is_active, added_by, created_at FROM api_keys ORDER BY created_at DESC'
  ).all();
  res.json(keys);
});

apiRouter.post('/admin/keys', (req: Request, res: Response) => {
  const { provider, key } = req.body;
  if (!provider || !key) {
    res.status(400).json({ error: 'provider and key are required' });
    return;
  }

  const db = getDb();
  const id = uuid();
  const preview = key.slice(0, 4) + '...' + key.slice(-4);

  db.prepare(`
    INSERT INTO api_keys (id, provider, encrypted_key, key_preview, added_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, provider, key, preview, req.user!.userId);

  // Register in the AI router
  aiRouter.addProvider(provider, key);

  logger.info(`API key added for ${provider} by ${req.user!.email}`);
  res.status(201).json({ id, provider, key_preview: preview });
});

apiRouter.delete('/admin/keys/:id', (req: Request, res: Response) => {
  const db = getDb();
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(req.params.id) as { provider: string } | undefined;
  if (key) {
    db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
    aiRouter.removeProvider(key.provider);
  }
  res.json({ ok: true });
});

/* ── Admin: Audit Log ── */
apiRouter.get('/admin/audit', (_req: Request, res: Response) => {
  const db = getDb();
  const entries = db.prepare(
    'SELECT * FROM audit_log ORDER BY ts DESC LIMIT 100'
  ).all();
  res.json(entries);
});

/* ── Prompt Templates ── */
apiRouter.get('/prompts', (req: Request, res: Response) => {
  const db = getDb();
  const prompts = db.prepare(
    'SELECT * FROM prompt_templates WHERE user_id = ? OR is_shared = 1 ORDER BY usage_count DESC'
  ).all(req.user!.userId);
  res.json(prompts);
});

apiRouter.post('/prompts', (req: Request, res: Response) => {
  const { title, content, category, tags, is_shared } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'title and content are required' });
    return;
  }

  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO prompt_templates (id, title, content, category, tags, is_shared, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content, category || 'general', JSON.stringify(tags || []), is_shared ? 1 : 0, req.user!.userId);

  res.status(201).json({ id, title });
});
