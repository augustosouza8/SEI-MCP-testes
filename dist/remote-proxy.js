#!/usr/bin/env node

// src/remote-proxy.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
var REMOTE_URL = process.argv[2] || process.env.SEI_MCP_REMOTE_URL || "https://sei-tribunais-licensing-api.onrender.com/mcp";
var AUTH_TOKEN = process.env.SEI_MCP_AUTH_TOKEN || "";
var requestId = 1;
async function sendToRemote(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: requestId++,
    method,
    params
  };
  const headers = {
    "Content-Type": "application/json"
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  const response = await fetch(REMOTE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`);
  }
  return json.result;
}
async function main() {
  console.error(`[Proxy] Conectando ao servidor remoto: ${REMOTE_URL}`);
  try {
    const initResult = await sendToRemote("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "sei-mcp-proxy", version: "1.0.0" }
    });
    console.error("[Proxy] Inicializado:", JSON.stringify(initResult));
  } catch (err) {
    console.error("[Proxy] Erro ao inicializar:", err);
    process.exit(1);
  }
  const server = new Server(
    { name: "sei-mcp-remote-proxy", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("[Proxy] Listando ferramentas do servidor remoto...");
    const result = await sendToRemote("tools/list", {});
    console.error(`[Proxy] ${result.tools?.length || 0} ferramentas encontradas`);
    return result;
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[Proxy] Chamando ferramenta: ${name}`);
    try {
      const result = await sendToRemote("tools/call", { name, arguments: args });
      console.error(`[Proxy] Resultado de ${name}:`, JSON.stringify(result).slice(0, 200));
      return result;
    } catch (err) {
      console.error(`[Proxy] Erro em ${name}:`, err);
      return {
        content: [{ type: "text", text: `Erro: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true
      };
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Proxy] Servidor proxy iniciado via stdio");
}
main().catch((err) => {
  console.error("[Proxy] Erro fatal:", err);
  process.exit(1);
});
