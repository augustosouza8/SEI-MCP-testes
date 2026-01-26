#!/usr/bin/env node
import {
  SeiPlaywrightManager,
  SeiWebSocketServer,
  allTools,
  handleTool,
  logger,
  runHttpServer,
  toolCount
} from "./chunk-E3WGCQQA.js";

// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
var WS_PORT = parseInt(process.env.SEI_MCP_WS_PORT || "19999", 10);
var DRIVER = (process.env.SEI_MCP_DRIVER || "extension").toLowerCase() === "playwright" ? "playwright" : "extension";
async function createServer() {
  const wsServer = new SeiWebSocketServer(WS_PORT);
  const pwManager = new SeiPlaywrightManager();
  const server = new Server(
    {
      name: "sei-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug(`ListTools request received (${toolCount} tools)`);
    return { tools: allTools };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args2 } = request.params;
    logger.debug(`CallTool request: ${name}`, args2);
    const result = await handleTool(name, args2 || {}, wsServer, pwManager, DRIVER);
    return {
      content: result.content,
      isError: result.isError
    };
  });
  server.onerror = (error) => {
    logger.error("MCP Server error", error);
  };
  return { server, wsServer };
}
async function runServer() {
  const { server, wsServer } = await createServer();
  if (DRIVER === "extension") {
    await wsServer.start();
  } else {
    logger.info("Driver Playwright ativo; WebSocket da extens\xE3o n\xE3o \xE9 necess\xE1rio (n\xE3o ser\xE1 iniciado).");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("SEI-MCP server started");
  logger.info(`Driver: ${DRIVER}`);
  if (DRIVER === "extension") logger.info(`WebSocket server listening on port ${WS_PORT}`);
  logger.info(`Available tools: ${toolCount} (including session and window control)`);
  const shutdown = async () => {
    logger.info("Shutting down...");
    wsServer.stop();
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// src/utils/dotenv.ts
import * as fs from "fs";
import * as path from "path";
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return null;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if (!key) return null;
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }
  return { key, value };
}
function loadDotEnv(cwd = process.cwd()) {
  try {
    const filePath = path.join(cwd, ".env");
    if (!fs.existsSync(filePath)) return;
    const contents = fs.readFileSync(filePath, "utf8");
    let loaded = 0;
    for (const line of contents.split(/\r?\n/)) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const { key, value } = parsed;
      if (process.env[key] !== void 0) continue;
      process.env[key] = value;
      loaded++;
    }
    if (loaded > 0) logger.info(`Loaded ${loaded} env var(s) from .env`);
  } catch (err) {
    logger.warn("Failed to load .env", { err });
  }
}

// src/index.ts
var args = process.argv.slice(2);
var isHttpMode = args.includes("http") || args.includes("--http") || args.includes("-h") || process.env.SEI_MCP_MODE === "http";
async function main() {
  loadDotEnv();
  if (isHttpMode) {
    logger.info("Starting SEI-MCP in HTTP mode...");
    await runHttpServer();
  } else {
    logger.info("Starting SEI-MCP in stdio mode...");
    await runServer();
  }
}
main().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
