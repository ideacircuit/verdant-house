import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { generateId, getDb, mutateDb, type StoredUser } from './store.ts';
import type { PublicUser } from '../src/types/store.ts';

export interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  authRole?: 'customer' | 'admin';
  authTokenHash?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function hasEnvAdminPasscode(): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  return Boolean(envPass && envPass.length > 0);
}

export function verifyEnvAdminPasscode(input: string): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (!envPass) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(envPass);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createSession(userId: string, role: 'customer' | 'admin'): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await mutateDb((db) => {
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    db.sessions.push({ tokenHash, userId, role, expiresAt });
  });
  return rawToken;
}

export async function revokeSession(tokenHash: string): Promise<void> {
  await mutateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.tokenHash !== tokenHash);
  });
}

export async function ensureAdminAccount(): Promise<StoredUser> {
  return mutateDb((db) => {
    const existing = db.users.find((u) => u.role === 'admin');
    if (existing) return existing;
    const adminUser: StoredUser = {
      id: generateId('usr_admin'),
      email: 'admin@verdantliving.ng',
      name: 'Store Administrator',
      phone: '',
      passwordHash: '',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    db.users.push(adminUser);
    return adminUser;
  });
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const rawToken = header.slice('Bearer '.length).trim();
  if (!rawToken) return next();

  const tokenHash = hashToken(rawToken);
  const db = await getDb();
  const session = db.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return next();
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (user) {
    req.authUser = user;
    req.authRole = session.role;
    req.authTokenHash = tokenHash;
  }
  return next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    }
    return next();
  });
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {
    if (!req.authUser || req.authRole !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required.' });
    }
    return next();
  });
}
