/**
 * HTTP Server com Streamable HTTP Transport
 *
 * Expõe o MCP via HTTP para conexão com extensões Chrome (mcp-chrome)
 * e outros clientes que usam Streamable HTTP.
 */

import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SeiWebSocketServer } from './websocket/server.js';
import { allTools, toolCount } from './tools/all-tools.js';
import { handleTool } from './tools/index.js';
import { logger } from './utils/logger.js';
import { SeiPlaywrightManager } from './playwright/manager.js';
import {
  clearCookie,
  createJwt,
  getAuthUser,
  newOauthState,
  parseBearerToken,
  parseCookies,
  requireAuth,
  requireMcpAuth,
  type McpAuthContext,
  recordUsageWithLicensing,
  setCookie,
} from './http/auth.js';
import { createCheckoutSession, createPortalSession, readJsonBody } from './http/stripe.js';
import { renderPricingPage } from './http/pages.js';

const HTTP_PORT = parseInt(process.env.PORT || process.env.SEI_MCP_HTTP_PORT || '3100', 10);
const WS_PORT = parseInt(process.env.SEI_MCP_WS_PORT || '19999', 10);
const DRIVER = ((process.env.SEI_MCP_DRIVER || 'extension').toLowerCase() === 'playwright')
  ? 'playwright'
  : 'extension';

// Allowed origins for CORS (extensões Chrome)
const ALLOWED_ORIGINS = [
  'chrome-extension://', // Qualquer extensão Chrome
  'http://localhost',
  'http://127.0.0.1',
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Requests sem origin (curl, etc)
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function setCorsHeaders(res: ServerResponse, origin?: string): void {
  // Se origin é de uma extensão Chrome ou localhost, permitir
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function getPublicBaseUrl(): string {
  const env = process.env.SEI_MCP_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  return `http://localhost:${HTTP_PORT}`;
}

async function readBodyText(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readFormBody(req: IncomingMessage): Promise<Record<string, string>> {
  const text = await readBodyText(req);
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{ access_token: string }> {
  const clientId = process.env.SEI_MCP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SEI_MCP_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth não configurado (SEI_MCP_GOOGLE_CLIENT_ID/SECRET)');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  return res.json() as Promise<{ access_token: string }>;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<{ id?: string; email?: string; name?: string; picture?: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed (${res.status})`);
  return res.json() as Promise<{ id?: string; email?: string; name?: string; picture?: string }>;
}

export async function runHttpServer(): Promise<void> {
  // Criar servidor WebSocket para comunicação com extensão SEI
  const wsServer = new SeiWebSocketServer(WS_PORT);
  if (DRIVER === 'extension') {
    await wsServer.start();
  } else {
    logger.info('Driver Playwright ativo; WebSocket da extensão não é necessário (não será iniciado).');
  }
  const pwManager = new SeiPlaywrightManager();

  // Map de transports por sessão
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const sessionAuth = new Map<string, McpAuthContext>();

  // Criar servidor HTTP
  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    setCorsHeaders(res, origin);

    // Handle preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${HTTP_PORT}`);
    const publicBaseUrl = getPublicBaseUrl();

    // Simple pages / billing / auth
    if (url.pathname === '/pricing' && req.method === 'GET') {
      const user = getAuthUser(req);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderPricingPage({ baseUrl: publicBaseUrl, user, query: url.searchParams }));
      return;
    }

    if (url.pathname === '/logout' && req.method === 'GET') {
      clearCookie(res, 'sei_mcp_token');
      clearCookie(res, 'sei_mcp_oauth_state');
      res.writeHead(302, { Location: '/pricing' });
      res.end();
      return;
    }

    if (url.pathname === '/auth/google/start' && req.method === 'GET') {
      const clientId = process.env.SEI_MCP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Google OAuth não configurado (SEI_MCP_GOOGLE_CLIENT_ID)' }));
        return;
      }

      const state = newOauthState();
      setCookie(res, 'sei_mcp_oauth_state', state, { httpOnly: true, sameSite: 'Lax' });
      const redirectUri = `${publicBaseUrl}/auth/google/callback`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('prompt', 'select_account');
      authUrl.searchParams.set('state', state);

      res.writeHead(302, { Location: authUrl.toString() });
      res.end();
      return;
    }

    if (url.pathname === '/auth/google/callback' && req.method === 'GET') {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const storedState = cookies.sei_mcp_oauth_state;
        const state = url.searchParams.get('state') || '';
        if (!storedState || storedState !== state) throw new Error('OAuth state inválido');

        const code = url.searchParams.get('code');
        if (!code) throw new Error('Código OAuth ausente');

        const redirectUri = `${publicBaseUrl}/auth/google/callback`;
        const token = await exchangeGoogleCode(code, redirectUri);
        const userInfo = await fetchGoogleUserInfo(token.access_token);
        const email = userInfo.email;
        if (!email) throw new Error('Google não retornou email');

        const jwtSecret = process.env.SEI_MCP_JWT_SECRET;
        if (!jwtSecret) throw new Error('Defina SEI_MCP_JWT_SECRET para usar OAuth no servidor');

        const jwt = createJwt(
          { email, name: userInfo.name, picture: userInfo.picture, sub: userInfo.id },
          jwtSecret,
          60 * 60 * 24 * 30 // 30 dias
        );

        setCookie(res, 'sei_mcp_token', jwt, { httpOnly: true, sameSite: 'Lax' });
        clearCookie(res, 'sei_mcp_oauth_state');
        res.writeHead(302, { Location: '/pricing?success=1' });
        res.end();
        return;
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        return;
      }
    }

    if (url.pathname === '/checkout/create' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user || user.type !== 'google') return;
      const contentType = req.headers['content-type'] || '';
      const body = contentType.includes('application/json')
        ? await readJsonBody(req)
        : await readFormBody(req);
      const plan = (body.plan as 'starter' | 'pro' | undefined) ?? 'starter';
      try {
        const session = await createCheckoutSession({ plan, customerEmail: user.email, baseUrl: publicBaseUrl });
        res.writeHead(303, { Location: session.url });
        res.end();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    if (url.pathname === '/portal/create' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user || user.type !== 'google') return;
      try {
        const session = await createPortalSession({ customerEmail: user.email, returnUrl: `${publicBaseUrl}/pricing` });
        res.writeHead(303, { Location: session.url });
        res.end();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        name: 'sei-mcp',
        version: '1.0.0',
        mode: 'http',
        driver: DRIVER,
        wsPort: WS_PORT,
        tools: toolCount,
        connections: DRIVER === 'extension' ? wsServer.getConnectedCount() : pwManager.getConnectedCount(),
      }));
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp') {
      // Get or create session
      let sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;
      const existingAuth = sessionId ? sessionAuth.get(sessionId) : undefined;

      if (existingAuth?.authToken) {
        const incoming = parseBearerToken(req.headers.authorization);
        if (!incoming || incoming !== existingAuth.authToken) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', hint: 'Envie o mesmo Bearer token em todas as chamadas desta sessão.' }));
          return;
        }
      }

      // Para requisições POST de inicialização, criar novo transport
      if (req.method === 'POST' && !transport) {
        const mcpAuth = await requireMcpAuth(req, res);
        if (!mcpAuth) return;

        sessionId = randomUUID();
        logger.info(`New MCP session: ${sessionId}`);

        sessionAuth.set(sessionId, mcpAuth);

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId!,
        });

        // Criar servidor MCP para esta sessão
        const server = new Server(
          {
            name: 'sei-mcp',
            version: '1.0.0',
          },
          {
            capabilities: {
              tools: {},
            },
          }
        );

        // Handler: Listar ferramentas
        server.setRequestHandler(ListToolsRequestSchema, async () => {
          logger.debug(`ListTools request (session: ${sessionId})`);
          return { tools: allTools };
        });

        // Handler: Executar ferramenta
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          const { name, arguments: args } = request.params;
          logger.debug(`CallTool request: ${name} (session: ${sessionId})`);

          const ctx = sessionAuth.get(sessionId!);
          if (ctx?.kind === 'license') {
            const usage = await recordUsageWithLicensing(ctx.token, name);
            if (!usage.allowed) {
              return {
                content: [{
                  type: 'text',
                  text: usage.reason || 'Limite de uso excedido. Atualize seu plano ou tente amanhã.',
                }],
                isError: true,
              };
            }
          }

          const result = await handleTool(name, args || {}, wsServer, pwManager, DRIVER);
          return {
            content: result.content,
            isError: result.isError,
          };
        });

        // Error handler
        server.onerror = (error) => {
          logger.error(`MCP Server error (session: ${sessionId})`, error);
        };

        // Conectar transport ao servidor
        await server.connect(transport);

        // Guardar transport
        transports.set(sessionId, transport);

        // Cleanup quando fechar
        transport.onclose = () => {
          logger.info(`MCP session closed: ${sessionId}`);
          transports.delete(sessionId!);
          sessionAuth.delete(sessionId!);
        };
      }

      if (!transport) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found. Send a POST to initialize.' }));
        return;
      }

      if (sessionId && !sessionAuth.has(sessionId)) {
        const mcpAuth = await requireMcpAuth(req, res);
        if (!mcpAuth) return;
        sessionAuth.set(sessionId, mcpAuth);
      }

      // Delegar para o transport
      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        logger.error('Error handling MCP request', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
      return;
    }

    // 404 para outras rotas
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down HTTP server...');
    wsServer.stop();

    // Fechar todos os transports
    for (const [sessionId, transport] of transports) {
      logger.debug(`Closing transport: ${sessionId}`);
      transport.close();
    }
    transports.clear();

    httpServer.close(() => {
      logger.info('HTTP server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Iniciar servidor
  httpServer.listen(HTTP_PORT, () => {
    logger.info('='.repeat(50));
    logger.info('SEI-MCP HTTP Server started');
    logger.info('='.repeat(50));
    logger.info(`MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
    logger.info(`Health check: http://localhost:${HTTP_PORT}/health`);
    logger.info(`Driver: ${DRIVER}`);
    if (DRIVER === 'extension') logger.info(`WebSocket for Chrome extension: ws://localhost:${WS_PORT}`);
    logger.info(`Pricing: http://localhost:${HTTP_PORT}/pricing`);
    logger.info(`Available tools: ${toolCount}`);
    logger.info('='.repeat(50));
    logger.info('');
    logger.info('Para conectar a extensão mcp-chrome:');
    logger.info(`  URL: http://localhost:${HTTP_PORT}/mcp`);
    logger.info('');
  });
}
