#!/usr/bin/env node
/**
 * SEI-MCP Entry Point
 *
 * Modos de execução:
 *   sei-mcp          - Modo stdio (padrão, para Claude Desktop)
 *   sei-mcp http     - Modo HTTP Streamable (para extensão mcp-chrome)
 *   sei-mcp --http   - Alias para modo HTTP
 *
 * Variáveis de ambiente:
 *   SEI_MCP_MODE       - 'stdio' ou 'http' (default: stdio)
 *   SEI_MCP_HTTP_PORT  - Porta HTTP (default: 3100)
 *   SEI_MCP_WS_PORT    - Porta WebSocket (default: 19999)
 */

import { runServer } from './server.js';
import { runHttpServer } from './http-server.js';
import { logger } from './utils/logger.js';
import { loadDotEnv } from './utils/dotenv.js';

// Determinar modo de execução
const args = process.argv.slice(2);
const isHttpMode =
  args.includes('http') ||
  args.includes('--http') ||
  args.includes('-h') ||
  process.env.SEI_MCP_MODE === 'http';

async function main(): Promise<void> {
  // Load env from .env if present (does not override existing process.env)
  loadDotEnv();

  if (isHttpMode) {
    logger.info('Starting SEI-MCP in HTTP mode...');
    await runHttpServer();
  } else {
    logger.info('Starting SEI-MCP in stdio mode...');
    await runServer();
  }
}

main().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
