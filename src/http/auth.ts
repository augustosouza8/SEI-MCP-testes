import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

export type AuthUser =
  | { type: 'token' }
  | { type: 'google'; email: string; name?: string; picture?: string; sub?: string };

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function signHmacSha256(data: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(data).digest());
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function setCookie(res: ServerResponse, name: string, value: string, opts?: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
  maxAgeSeconds?: number;
}): void {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Path=${opts?.path ?? '/'}`);
  if (opts?.httpOnly !== false) parts.push('HttpOnly');
  if (opts?.secure) parts.push('Secure');
  parts.push(`SameSite=${opts?.sameSite ?? 'Lax'}`);
  if (typeof opts?.maxAgeSeconds === 'number') parts.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', parts.join('; '));
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, parts.join('; ')]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), parts.join('; ')]);
  }
}

export function clearCookie(res: ServerResponse, name: string): void {
  setCookie(res, name, '', { maxAgeSeconds: 0 });
}

export function createJwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(body));
  const sig = signHmacSha256(`${h}.${p}`, secret);
  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = signHmacSha256(`${h}.${p}`, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(p).toString('utf8')) as Record<string, unknown>;
    const exp = payload.exp;
    if (typeof exp === 'number' && Math.floor(Date.now() / 1000) > exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: IncomingMessage): AuthUser | null {
  // 1) Static bearer token (server-to-server)
  const expectedToken = process.env.SEI_MCP_BEARER_TOKEN;
  const auth = req.headers.authorization;
  if (expectedToken && auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    if (token && token === expectedToken) return { type: 'token' };
  }

  // 2) OAuth cookie JWT
  const jwtSecret = process.env.SEI_MCP_JWT_SECRET;
  if (!jwtSecret) return null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.sei_mcp_token;
  if (!token) return null;
  const payload = verifyJwt(token, jwtSecret);
  if (!payload) return null;
  const email = payload.email;
  if (typeof email !== 'string' || !email) return null;
  return {
    type: 'google',
    email,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    sub: typeof payload.sub === 'string' ? payload.sub : undefined,
  };
}

export function requireAuth(req: IncomingMessage, res: ServerResponse): AuthUser | null {
  const require = (process.env.SEI_MCP_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
  if (!require) return { type: 'token' };

  const user = getAuthUser(req);
  if (user) return user;

  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Unauthorized',
    hint: 'Use Authorization: Bearer <token> (SEI_MCP_BEARER_TOKEN) or login via /auth/google/start',
  }));
  return null;
}

export function newOauthState(): string {
  return base64url(randomBytes(24));
}

