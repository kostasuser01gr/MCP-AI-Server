/* ── JWT Auth Service ── */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar: string | null;
  role: string;
  preferred_model: string | null;
  theme: string;
  created_at: string;
  updated_at: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signup(email: string, password: string, name: string): Promise<{ token: string; user: Omit<UserRow, 'password_hash'> }> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) throw new Error('Email already registered');

  const id = uuid();
  const password_hash = await hashPassword(password);

  // First user is owner, second+ are regular users
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const role = userCount === 0 ? 'owner' : 'user';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, password_hash, name, role);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  const token = signToken({ userId: id, email: user.email, role: user.role });

  const { password_hash: _, ...safeUser } = user;
  logger.info('User signed up', { role });
  return { token, user: safeUser };
}

export async function login(email: string, password: string): Promise<{ token: string; user: Omit<UserRow, 'password_hash'> }> {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as UserRow | undefined;
  if (!user) throw new Error('Invalid email or password');

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new Error('Invalid email or password');

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const { password_hash: _, ...safeUser } = user;

  logger.info('User logged in');
  return { token, user: safeUser };
}

export function getUserById(id: string): Omit<UserRow, 'password_hash'> | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) return null;
  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}
