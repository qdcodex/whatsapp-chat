// Server-only auth helpers for API routes: password hashing, session cookies,
// and role checks.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySessionToken,
  type Role, type Session,
} from '@/lib/session';

export type { Role, Session };

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function isHashed(stored: string): boolean {
  return stored.startsWith('scrypt$');
}

// Accepts legacy plaintext passwords so existing accounts keep working; the
// login route re-saves them hashed after a successful match.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isHashed(stored)) {
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export function randomPassword(): string {
  return randomBytes(18).toString('base64url');
}

export function newId(): string {
  return randomBytes(9).toString('base64url');
}

// Never send the password (hashed or not) to the browser
export function publicUser<T extends Record<string, any>>(user: T): Omit<T, 'password' | '_id' | '__v'> {
  if (!user) return user;
  const { password: _p, _id, __v, ...rest } = user;
  return rest;
}

export async function setSessionCookie(res: NextResponse, user: { id: string; role: Role; workspaceId?: string }) {
  const token = await signSession({ userId: user.id, role: user.role, workspaceId: user.workspaceId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession(req: NextRequest): Promise<Session | null> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

// Usage: const auth = await requireSession(req, ['admin']); if (auth instanceof NextResponse) return auth;
export async function requireSession(req: NextRequest, roles?: Role[]): Promise<Session | NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  if (roles && !roles.includes(session.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  return session;
}

export function forbidden(message = 'Not allowed') {
  return NextResponse.json({ error: message }, { status: 403 });
}

// Admins and users may only touch data in their own workspace
export function canAccessWorkspace(session: Session, workspaceId: string | undefined | null): boolean {
  return session.role === 'superadmin' || (!!workspaceId && session.workspaceId === workspaceId);
}

// Copy only whitelisted keys from an untrusted body
export function pick<T extends Record<string, any>>(body: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, any> = {};
  for (const k of keys) if (body && body[k] !== undefined) out[k] = body[k];
  return out as Partial<T>;
}
