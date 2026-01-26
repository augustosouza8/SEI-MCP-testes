#!/usr/bin/env node
/**
 * Proxy local para servidor MCP HTTP remoto
 *
 * Este script atua como um servidor MCP local (stdio) que encaminha
 * todas as requisições para um servidor MCP HTTP remoto.
 *
 * Uso: node dist/remote-proxy.js [URL_DO_SERVIDOR]
 *
 * Exemplo:
 *   node dist/remote-proxy.js https://sei-tribunais-licensing-api.onrender.com/mcp
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const REMOTE_URL = process.argv[2] || process.env.SEI_MCP_REMOTE_URL || 'https://sei-tribunais-licensing-api.onrender.com/mcp';
const AUTH_TOKEN = process.env.SEI_MCP_AUTH_TOKEN || '';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

let requestId = 1;

async function sendToRemote(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(REMOTE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json() as JsonRpcResponse;

  if (json.error) {
    throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`);
  }

  return json.result;
}

async function main() {
  console.error(`[Proxy] Conectando ao servidor remoto: ${REMOTE_URL}`);

  // Inicializar conexão com servidor remoto
  try {
    const initResult = await sendToRemote('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'sei-mcp-proxy', version: '1.0.0' },
    });
    console.error('[Proxy] Inicializado:', JSON.stringify(initResult));
  } catch (err) {
    console.error('[Proxy] Erro ao inicializar:', err);
    process.exit(1);
  }

  // Criar servidor MCP local
  const server = new Server(
    { name: 'sei-mcp-remote-proxy', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  // Handler para listar ferramentas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('[Proxy] Listando ferramentas do servidor remoto...');
    const result = await sendToRemote('tools/list', {}) as { tools: unknown[] };
    console.error(`[Proxy] ${result.tools?.length || 0} ferramentas encontradas`);
    return result;
  });

  // Handler para chamar ferramentas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[Proxy] Chamando ferramenta: ${name}`);

    try {
      const result = await sendToRemote('tools/call', { name, arguments: args });
      console.error(`[Proxy] Resultado de ${name}:`, JSON.stringify(result).slice(0, 200));
      return result as { content: Array<{ type: string; text?: string }> };
    } catch (err) {
      console.error(`[Proxy] Erro em ${name}:`, err);
      return {
        content: [{ type: 'text', text: `Erro: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  });

  // Conectar via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Proxy] Servidor proxy iniciado via stdio');
}

main().catch((err) => {
  console.error('[Proxy] Erro fatal:', err);
  process.exit(1);
});
