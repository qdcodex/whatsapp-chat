// Session token helpers. Edge-safe (only `jose`), so middleware.ts and the
// Socket.IO server can share them with API routes.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'me2_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Role = 'superadmin' | 'admin' | 'user';

export interface Session {
  userId: string;
  role: Role;
  workspaceId?: string; // workspace slug; undefined for superadmin
}

const DEV_SECRET = 'dev-only-session-secret-change-me-in-production';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is not set');
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, ws: session.workspaceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.role !== 'string') return null;
    return {
      userId: payload.sub,
      role: payload.role as Role,
      workspaceId: typeof payload.ws === 'string' ? payload.ws : undefined,
    };
  } catch {
    return null;
  }
}

// For raw `Cookie:` headers (Socket.IO handshake)
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
