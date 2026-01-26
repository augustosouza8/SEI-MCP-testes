import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

export type AuthUser =
  | { type: 'token' }
  | { type: 'google'; email: string; name?: string; picture?: string; sub?: string };

export type McpAuthContext =
  | { kind: 'admin'; authToken: string | null }
  | { kind: 'license'; authToken: string; token: string; email: string; userId?: string };

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

export function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token ? token : null;
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

// ============================================
// Licensing API Integration
// ============================================

const LICENSING_API_URL = process.env.SEI_MCP_LICENSING_API_URL || 'https://sei-tribunais-licensing-api.onrender.com/api/v1';

export interface LicensingUser {
  email: string;
  userId?: string;
}

export interface UsageResult {
  allowed: boolean;
  remaining: number;
  usedToday: number;
  limit?: number;
  unlimited: boolean;
  reason?: string;
}

/**
 * Validate an API token against the licensing server.
 * Returns user info if valid, null otherwise.
 */
export async function validateTokenWithLicensing(token: string): Promise<LicensingUser | null> {
  try {
    const response = await fetch(`${LICENSING_API_URL}/auth/api-token/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { valid: boolean; email?: string; user_id?: string };
    if (!data.valid || !data.email) return null;

    return { email: data.email, userId: data.user_id };
  } catch {
    return null;
  }
}

/**
 * Record usage against the licensing server.
 * Returns whether the operation is allowed and remaining quota.
 */
export async function recordUsageWithLicensing(
  token: string,
  operationType?: string,
): Promise<UsageResult> {
  try {
    const response = await fetch(`${LICENSING_API_URL}/usage/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        product: 'sei-mcp',
        operation_type: operationType,
        count: 1,
      }),
    });

    if (!response.ok) {
      return {
        allowed: false,
        remaining: 0,
        usedToday: 0,
        unlimited: false,
        reason: 'Erro ao verificar licença',
      };
    }

    const data = await response.json() as {
      allowed: boolean;
      remaining: number;
      used_today: number;
      limit?: number;
      unlimited: boolean;
      reason?: string;
    };

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      usedToday: data.used_today,
      limit: data.limit,
      unlimited: data.unlimited,
      reason: data.reason,
    };
  } catch {
    return {
      allowed: false,
      remaining: 0,
      usedToday: 0,
      unlimited: false,
      reason: 'Erro de conexão com servidor de licenciamento',
    };
  }
}

/**
 * Check usage without recording.
 */
export async function checkUsageWithLicensing(token: string): Promise<UsageResult> {
  try {
    const response = await fetch(`${LICENSING_API_URL}/usage/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ product: 'sei-mcp' }),
    });

    if (!response.ok) {
      return {
        allowed: false,
        remaining: 0,
        usedToday: 0,
        unlimited: false,
        reason: 'Erro ao verificar licença',
      };
    }

    const data = await response.json() as {
      allowed: boolean;
      remaining: number;
      used_today: number;
      limit?: number;
      unlimited: boolean;
      reason?: string;
    };

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      usedToday: data.used_today,
      limit: data.limit,
      unlimited: data.unlimited,
      reason: data.reason,
    };
  } catch {
    return {
      allowed: false,
      remaining: 0,
      usedToday: 0,
      unlimited: false,
      reason: 'Erro de conexão com servidor de licenciamento',
    };
  }
}

export async function requireMcpAuth(req: IncomingMessage, res: ServerResponse): Promise<McpAuthContext | null> {
  const require = (process.env.SEI_MCP_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
  if (!require) return { kind: 'admin', authToken: null };

  const incomingToken = parseBearerToken(req.headers.authorization);
  if (!incomingToken) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      hint: 'Use Authorization: Bearer <api_token> (gerado no licensing / extensão) ou um token admin (SEI_MCP_BEARER_TOKEN).',
    }));
    return null;
  }

  const expectedToken = process.env.SEI_MCP_BEARER_TOKEN;
  if (expectedToken && incomingToken === expectedToken) {
    return { kind: 'admin', authToken: incomingToken };
  }

  const user = await validateTokenWithLicensing(incomingToken);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      hint: 'API token inválido/expirado. Gere um novo token na extensão (ou no licensing) e tente novamente.',
    }));
    return null;
  }

  return {
    kind: 'license',
    authToken: incomingToken,
    token: incomingToken,
    email: user.email,
    userId: user.userId,
  };
}
