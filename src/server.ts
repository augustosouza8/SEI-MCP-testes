import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SeiWebSocketServer } from './websocket/server.js';
import { allTools, toolCount } from './tools/all-tools.js';
import { handleTool } from './tools/index.js';
import { logger } from './utils/logger.js';
import { SeiPlaywrightManager } from './playwright/manager.js';

const WS_PORT = parseInt(process.env.SEI_MCP_WS_PORT || '19999', 10);
const DRIVER = ((process.env.SEI_MCP_DRIVER || 'extension').toLowerCase() === 'playwright')
  ? 'playwright'
  : 'extension';

export async function createServer(): Promise<{ server: Server; wsServer: SeiWebSocketServer }> {
  // Criar servidor WebSocket para comunicação com extensão
  const wsServer = new SeiWebSocketServer(WS_PORT);
  const pwManager = new SeiPlaywrightManager();

  // Criar servidor MCP
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

  // Handler: Listar ferramentas disponíveis
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug(`ListTools request received (${toolCount} tools)`);
    return { tools: allTools };
  });

  // Handler: Executar ferramenta
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug(`CallTool request: ${name}`, args);

    const result = await handleTool(name, args || {}, wsServer, pwManager, DRIVER);

    return {
      content: result.content,
      isError: result.isError,
    };
  });

  // Tratamento de erros
  server.onerror = (error) => {
    logger.error('MCP Server error', error);
  };

  return { server, wsServer };
}

export async function runServer(): Promise<void> {
  const { server, wsServer } = await createServer();

  // Iniciar WebSocket server
  if (DRIVER === 'extension') {
    await wsServer.start();
  } else {
    logger.info('Driver Playwright ativo; WebSocket da extensão não é necessário (não será iniciado).');
  }

  // Conectar ao transporte stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('SEI-MCP server started');
  logger.info(`Driver: ${DRIVER}`);
  if (DRIVER === 'extension') logger.info(`WebSocket server listening on port ${WS_PORT}`);
  logger.info(`Available tools: ${toolCount} (including session and window control)`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    wsServer.stop();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
