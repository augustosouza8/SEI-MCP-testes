import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { SeiWebSocketServer } from '../websocket/server.js';
import type { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import type { SeiPlaywrightManager } from '../playwright/manager.js';

// Smart Wait configuration
const SMART_WAIT_ENABLED = process.env.SEI_MCP_SMART_WAIT !== 'false';
const SMART_WAIT_STABILITY_MS = parseInt(process.env.SEI_MCP_STABILITY_MS || '300', 10);
const SMART_WAIT_MAX_MS = parseInt(process.env.SEI_MCP_MAX_WAIT_MS || '5000', 10);

// Tools that benefit from smart wait (DOM interaction tools)
const SMART_WAIT_TOOLS = [
  'sei_login',
  'sei_search_process',
  'sei_create_document',
  'sei_sign_document',
  'sei_forward_process',
  'sei_click',
  'sei_type',
  'sei_select',
  'sei_fill',
];

/**
 * Check if tool should use smart wait
 */
function shouldUseSmartWait(toolName: string): boolean {
  return SMART_WAIT_ENABLED && SMART_WAIT_TOOLS.includes(toolName);
}

// Schemas de entrada das ferramentas
export const schemas = {
  sei_login: z.object({
    url: z.string().url().describe('URL base do SEI (ex: https://sei.sp.gov.br)'),
    username: z.string().describe('Nome de usuário'),
    password: z.string().describe('Senha do usuário'),
    orgao: z.string().optional().describe('Órgão (se necessário selecionar)'),
  }),

  sei_search_process: z.object({
    query: z.string().describe('Termo de busca (número do processo ou texto)'),
    type: z.enum(['numero', 'texto', 'interessado', 'assunto']).default('numero').describe('Tipo de busca'),
    limit: z.number().default(10).describe('Número máximo de resultados'),
  }),

  sei_download_process: z.object({
    process_number: z.string().describe('Número do processo (ex: 12345.678901/2024-00)'),
    include_attachments: z.boolean().default(true).describe('Incluir anexos'),
    output_path: z.string().optional().describe('Caminho para salvar o arquivo'),
  }),

  sei_list_documents: z.object({
    process_number: z.string().describe('Número do processo'),
  }),

  sei_create_document: z.object({
    process_number: z.string().describe('Número do processo'),
    document_type: z.string().describe('Tipo do documento (ex: Ofício, Despacho)'),
    content: z.string().describe('Conteúdo do documento em HTML'),
    description: z.string().optional().describe('Descrição/título do documento'),
    nivel_acesso: z.enum(['publico', 'restrito', 'sigiloso']).default('publico'),
    hipotese_legal: z.string().optional().describe('Hipótese legal (obrigatório se restrito/sigiloso)'),
  }),

  sei_sign_document: z.object({
    document_id: z.string().describe('ID do documento no SEI'),
    password: z.string().describe('Senha para assinatura'),
    cargo: z.string().optional().describe('Cargo para assinatura'),
  }),

  sei_forward_process: z.object({
    process_number: z.string().describe('Número do processo'),
    target_unit: z.string().describe('Unidade de destino'),
    keep_open: z.boolean().default(false).describe('Manter aberto na unidade atual'),
    deadline: z.number().optional().describe('Prazo em dias'),
    note: z.string().optional().describe('Observação para tramitação'),
  }),

  sei_get_status: z.object({
    process_number: z.string().describe('Número do processo'),
    include_history: z.boolean().default(true).describe('Incluir histórico completo'),
  }),

  sei_screenshot: z.object({
    full_page: z.boolean().default(false).describe('Capturar página inteira'),
  }),

  sei_snapshot: z.object({
    include_hidden: z.boolean().default(false).describe('Incluir elementos ocultos'),
  }),
};

// Definição das ferramentas
export const tools = [
  {
    name: 'sei_login',
    description: 'Faz login no sistema SEI com usuário e senha. Deve ser chamado antes de outras operações.',
    inputSchema: zodToJsonSchema(schemas.sei_login),
  },
  {
    name: 'sei_search_process',
    description: 'Busca processos no SEI por número, texto, interessado ou assunto.',
    inputSchema: zodToJsonSchema(schemas.sei_search_process),
  },
  {
    name: 'sei_download_process',
    description: 'Baixa processo completo como PDF, opcionalmente incluindo anexos.',
    inputSchema: zodToJsonSchema(schemas.sei_download_process),
  },
  {
    name: 'sei_list_documents',
    description: 'Lista todos os documentos de um processo específico.',
    inputSchema: zodToJsonSchema(schemas.sei_list_documents),
  },
  {
    name: 'sei_create_document',
    description: 'Cria um novo documento em um processo existente.',
    inputSchema: zodToJsonSchema(schemas.sei_create_document),
  },
  {
    name: 'sei_sign_document',
    description: 'Assina eletronicamente um documento no SEI.',
    inputSchema: zodToJsonSchema(schemas.sei_sign_document),
  },
  {
    name: 'sei_forward_process',
    description: 'Tramita processo para outra unidade.',
    inputSchema: zodToJsonSchema(schemas.sei_forward_process),
  },
  {
    name: 'sei_get_status',
    description: 'Consulta andamento e histórico de tramitações do processo.',
    inputSchema: zodToJsonSchema(schemas.sei_get_status),
  },
  {
    name: 'sei_screenshot',
    description: 'Captura screenshot da página atual do SEI.',
    inputSchema: zodToJsonSchema(schemas.sei_screenshot),
  },
  {
    name: 'sei_snapshot',
    description: 'Captura estado da página (árvore de acessibilidade ARIA) para análise.',
    inputSchema: zodToJsonSchema(schemas.sei_snapshot),
  },
];

// Session management tools (handled server-side)
const SESSION_TOOLS = [
  'sei_list_sessions',
  'sei_get_session_info',
  'sei_close_session',
  'sei_switch_session',
  'sei_get_connection_status',
];

// Local/server-side tools (no extension needed)
const LOCAL_TOOLS = [
  'sei_open_url',
];

// Window control tools (forwarded to Chrome extension)
const WINDOW_TOOLS = [
  'sei_minimize_window',
  'sei_restore_window',
  'sei_focus_window',
  'sei_get_window_state',
  'sei_set_window_bounds',
];

// Handler das ferramentas
export async function handleTool(
  name: string,
  args: Record<string, unknown>,
  wsServer: SeiWebSocketServer,
  pwManager?: SeiPlaywrightManager,
  driver?: 'extension' | 'playwright'
): Promise<ToolResult> {
  logger.info(`Executing tool: ${name}`, args);

  const resolvedDriver: 'extension' | 'playwright' =
    driver ?? ((process.env.SEI_MCP_DRIVER || '').toLowerCase() === 'playwright' ? 'playwright' : 'extension');

  // Handle local tools first (no extension needed)
  if (LOCAL_TOOLS.includes(name)) {
    return handleLocalTool(name, args);
  }

  // Handle session management tools (server-side, no extension needed)
  if (SESSION_TOOLS.includes(name)) {
    if (resolvedDriver === 'playwright') {
      if (!pwManager) {
        return {
          content: [{ type: 'text', text: 'Erro: driver Playwright não inicializado no servidor' }],
          isError: true,
        };
      }
      return handlePlaywrightSessionTool(name, args, pwManager);
    }
    return handleSessionTool(name, args, wsServer);
  }

  // Playwright driver: execute directly (no extension)
  if (resolvedDriver === 'playwright') {
    if (!pwManager) {
      return {
        content: [{ type: 'text', text: 'Erro: driver Playwright não inicializado no servidor' }],
        isError: true,
      };
    }

    const sessionId = args.session_id as string | undefined;
    const forwardedArgs = { ...args } as Record<string, unknown>;
    delete forwardedArgs.session_id;

    try {
      const data = await pwManager.executeTool(name, forwardedArgs, sessionId);

      // Screenshot returns image in base64
      if (name === 'sei_screenshot' && data && typeof data === 'object' && 'image' in (data as any)) {
        const d = data as { image: string; mimeType?: string };
        return {
          content: [
            {
              type: 'image',
              data: d.image,
              mimeType: d.mimeType || 'image/png',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Tool error (playwright): ${name}`, { error: message });
      return {
        content: [{ type: 'text', text: `Erro ao executar ${name}: ${message}` }],
        isError: true,
      };
    }
  }

  // For all other tools, check connection first
  const sessionId = args.session_id as string | undefined;
  if (!wsServer.isConnected(sessionId)) {
    const sessions = wsServer.listSessions();
    const connected = sessions.filter((s) => s.status === 'connected');
    return {
      content: [
        {
          type: 'text',
          text:
            `Erro: Extensão do Chrome não conectada${sessionId ? ` para sessão ${sessionId}` : ''}.\n\n` +
            `Como resolver:\n` +
            `1. Abra o SEI no Chrome\n` +
            `2. Clique no ícone da extensão SEI-MCP\n` +
            `3. Clique em "Conectar"\n\n` +
            (connected.length
              ? `Sessões conectadas disponíveis (use \`session_id\` para escolher):\n${connected
                .map((s) => `- ${s.id}${s.url ? ` (${s.url})` : ''}${s.user ? ` [${s.user}]` : ''}`)
                .join('\n')}`
              : `Dica: chame \`sei_list_sessions\` para ver sessões detectadas.`),
        },
      ],
      isError: true,
    };
  }

  try {
    // Don't forward server-only routing param to the extension
    const forwardedArgs = { ...args } as Record<string, unknown>;
    delete forwardedArgs.session_id;

    // Smart Wait: Wait for page stability before DOM operations
    if (shouldUseSmartWait(name)) {
      try {
        logger.debug(`Smart Wait: waiting for page stability before ${name}`);
        await wsServer.sendCommand('sei_wait_for_stable', {
          stability_ms: SMART_WAIT_STABILITY_MS,
          max_wait_ms: SMART_WAIT_MAX_MS,
        }, sessionId);
      } catch (waitError) {
        // Log but don't fail - the tool may still work
        logger.warn(`Smart Wait failed for ${name}, proceeding anyway`, {
          error: waitError instanceof Error ? waitError.message : String(waitError),
        });
      }
    }

    const response = await wsServer.sendCommand(name, forwardedArgs, sessionId);

    if (!response.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Erro: ${response.error?.message || 'Erro desconhecido'}`,
          },
        ],
        isError: true,
      };
    }

    // Formatar resposta baseado no tipo de ferramenta
    if (name === 'sei_screenshot' && response.data) {
      const data = response.data as { image: string; mimeType: string };
      return {
        content: [
          {
            type: 'image',
            data: data.image,
            mimeType: data.mimeType || 'image/png',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Tool error: ${name}`, { error: message });

    return {
      content: [
        {
          type: 'text',
          text: `Erro ao executar ${name}: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

function handlePlaywrightSessionTool(
  name: string,
  args: Record<string, unknown>,
  pwManager: SeiPlaywrightManager
): ToolResult {
  try {
    switch (name) {
      case 'sei_list_sessions': {
        const sessions = pwManager.listSessions();
        return {
          content: [{ type: 'text', text: JSON.stringify({ total: sessions.length, connected: pwManager.getConnectedCount(), sessions }, null, 2) }],
        };
      }

      case 'sei_get_session_info': {
        const sessionId = args.session_id as string | undefined;
        const sessions = pwManager.listSessions();
        const session = sessionId
          ? sessions.find((s) => s.id === sessionId)
          : sessions[0];
        return {
          content: [{ type: 'text', text: JSON.stringify(session ?? null, null, 2) }],
        };
      }

      case 'sei_close_session': {
        const sessionId = args.session_id as string | undefined;
        if (!sessionId) {
          return { content: [{ type: 'text', text: 'Erro: session_id é obrigatório' }], isError: true };
        }
        // Fire-and-forget close
        void pwManager.closeSession(sessionId);
        return { content: [{ type: 'text', text: `Sessão fechada: ${sessionId}` }] };
      }

      case 'sei_switch_session': {
        const sessionId = args.session_id as string | undefined;
        if (!sessionId) {
          return { content: [{ type: 'text', text: 'Erro: session_id é obrigatório' }], isError: true };
        }
        const ok = pwManager.switchSession(sessionId);
        return ok
          ? { content: [{ type: 'text', text: `Sessão ativa: ${sessionId}` }] }
          : { content: [{ type: 'text', text: `Sessão não encontrada ou desconectada: ${sessionId}` }], isError: true };
      }

      case 'sei_get_connection_status': {
        const sessionId = args.session_id as string | undefined;
        return {
          content: [{ type: 'text', text: JSON.stringify({ driver: 'playwright', connected: pwManager.isConnected(sessionId), session_id: sessionId }, null, 2) }],
        };
      }

      default:
        return { content: [{ type: 'text', text: `Ferramenta de sessão desconhecida: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { content: [{ type: 'text', text: `Erro ao executar ${name}: ${message}` }], isError: true };
  }
}

function openUrlInSystemBrowser(url: string): void {
  const platform = process.platform;
  if (platform === 'darwin') {
    const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
    return;
  }
  if (platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    child.unref();
    return;
  }
  const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.unref();
}

function handleLocalTool(name: string, args: Record<string, unknown>): ToolResult {
  try {
    switch (name) {
      case 'sei_open_url': {
        const urlRaw = args.url;
        if (typeof urlRaw !== 'string') {
          return {
            content: [{ type: 'text', text: 'Erro: url é obrigatório' }],
            isError: true,
          };
        }

        let parsed: URL;
        try {
          parsed = new URL(urlRaw);
        } catch {
          return {
            content: [{ type: 'text', text: `Erro: URL inválida: ${urlRaw}` }],
            isError: true,
          };
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return {
            content: [{ type: 'text', text: 'Erro: apenas URLs http/https são permitidas' }],
            isError: true,
          };
        }

        openUrlInSystemBrowser(parsed.toString());
        return {
          content: [{ type: 'text', text: `OK: aberto no navegador: ${parsed.toString()}` }],
        };
      }
      default:
        return {
          content: [{ type: 'text', text: `Erro: ferramenta local desconhecida: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      content: [{ type: 'text', text: `Erro ao executar ${name}: ${message}` }],
      isError: true,
    };
  }
}

// Handle session management tools
function handleSessionTool(
  name: string,
  args: Record<string, unknown>,
  wsServer: SeiWebSocketServer
): ToolResult {
  try {
    switch (name) {
      case 'sei_list_sessions': {
        const sessions = wsServer.listSessions();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total: sessions.length,
                connected: wsServer.getConnectedCount(),
                sessions,
              }, null, 2),
            },
          ],
        };
      }

      case 'sei_get_session_info': {
        const sessionId = args.session_id as string | undefined;
        const sessions = wsServer.listSessions();
        const session = sessionId
          ? sessions.find(s => s.id === sessionId)
          : sessions.find(s => s.status === 'connected');

        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Sessão não encontrada: ${sessionId || 'default'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      }

      case 'sei_close_session': {
        const sessionId = args.session_id as string;
        if (!sessionId) {
          return {
            content: [
              {
                type: 'text',
                text: 'Erro: session_id é obrigatório',
              },
            ],
            isError: true,
          };
        }

        const closed = wsServer.closeSession(sessionId);
        return {
          content: [
            {
              type: 'text',
              text: closed
                ? `Sessão ${sessionId} fechada com sucesso`
                : `Sessão ${sessionId} não encontrada`,
            },
          ],
          isError: !closed,
        };
      }

      case 'sei_switch_session': {
        // This is a client-side hint - we just validate the session exists
        const sessionId = args.session_id as string;
        if (!wsServer.isConnected(sessionId)) {
          return {
            content: [
              {
                type: 'text',
                text: `Sessão ${sessionId} não está conectada`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Sessão ativa: ${sessionId}`,
            },
          ],
        };
      }

      case 'sei_get_connection_status': {
        const sessionId = args.session_id as string | undefined;
        const isConnected = wsServer.isConnected(sessionId);
        const sessions = wsServer.listSessions();
        const session = sessionId
          ? sessions.find(s => s.id === sessionId)
          : sessions.find(s => s.status === 'connected');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                connected: isConnected,
                sessionId: session?.id || null,
                status: session?.status || 'disconnected',
                lastActivity: session?.lastActivity || null,
                totalSessions: sessions.length,
                connectedSessions: wsServer.getConnectedCount(),
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Ferramenta de sessão desconhecida: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      content: [
        {
          type: 'text',
          text: `Erro ao executar ${name}: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
