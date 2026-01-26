// src/http-server.ts
import { createServer as createHttpServer } from "http";
import { randomUUID as randomUUID4 } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/websocket/server.ts
import { WebSocketServer, WebSocket as WebSocket2 } from "ws";
import { randomUUID as randomUUID2 } from "crypto";

// src/utils/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var currentLevel = process.env.SEI_MCP_LOG_LEVEL || "info";
function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
function formatMessage(level, message, data) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [sei-mcp]`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}
var logger = {
  debug(message, data) {
    if (shouldLog("debug")) {
      console.error(formatMessage("debug", message, data));
    }
  },
  info(message, data) {
    if (shouldLog("info")) {
      console.error(formatMessage("info", message, data));
    }
  },
  warn(message, data) {
    if (shouldLog("warn")) {
      console.error(formatMessage("warn", message, data));
    }
  },
  error(message, data) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, data));
    }
  }
};

// src/sessions/session-manager.ts
import { WebSocket } from "ws";
import { randomUUID } from "crypto";
var SessionManager = class {
  sessions = /* @__PURE__ */ new Map();
  clients = /* @__PURE__ */ new Map();
  getMostRecentConnectedSession() {
    let best;
    for (const session of this.sessions.values()) {
      if (session.status !== "connected") continue;
      if (!best) {
        best = session;
        continue;
      }
      if (session.metadata.lastActivity > best.metadata.lastActivity) {
        best = session;
      }
    }
    return best;
  }
  getMostRecentOpenClient() {
    let best;
    for (const client of this.clients.values()) {
      if (client.ws.readyState !== WebSocket.OPEN) continue;
      if (!best) {
        best = client;
        continue;
      }
      if (client.lastActivity > best.lastActivity) {
        best = client;
      }
    }
    return best;
  }
  /**
   * Create a new session
   */
  createSession(windowId, url) {
    const id = `session_${randomUUID().slice(0, 8)}`;
    const now = /* @__PURE__ */ new Date();
    const session = {
      id,
      status: "connecting",
      windowId,
      metadata: {
        url,
        connectedAt: now,
        lastActivity: now
      }
    };
    this.sessions.set(id, session);
    logger.info(`Session created: ${id}`);
    return id;
  }
  /**
   * Register a WebSocket client connection
   */
  registerClient(ws, sessionId, windowId) {
    const now = /* @__PURE__ */ new Date();
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        status: "connected",
        windowId,
        metadata: {
          connectedAt: now,
          lastActivity: now
        }
      };
      this.sessions.set(sessionId, session);
    } else {
      session.status = "connected";
      session.windowId = windowId;
      session.metadata.lastActivity = now;
    }
    this.clients.set(sessionId, {
      ws,
      sessionId,
      windowId,
      connectedAt: now,
      lastActivity: now
    });
    logger.info(`Client registered for session: ${sessionId}`);
  }
  /**
   * Unregister a client connection
   */
  unregisterClient(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "disconnected";
    }
    this.clients.delete(sessionId);
    logger.info(`Client unregistered for session: ${sessionId}`);
  }
  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  /**
   * Get client connection by session ID
   */
  getClient(sessionId) {
    return this.clients.get(sessionId);
  }
  /**
   * Get the default (first connected) session
   */
  getDefaultSession() {
    return this.getMostRecentConnectedSession();
  }
  /**
   * Get the default (first connected) client
   */
  getDefaultClient() {
    return this.getMostRecentOpenClient();
  }
  /**
   * List all sessions
   */
  listSessions() {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      status: session.status,
      windowId: session.windowId,
      url: session.metadata.url,
      user: session.metadata.user,
      connectedAt: session.metadata.connectedAt,
      lastActivity: session.metadata.lastActivity
    }));
  }
  /**
   * Close a session
   */
  closeSession(sessionId) {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
    this.clients.delete(sessionId);
    this.sessions.delete(sessionId);
    logger.info(`Session closed: ${sessionId}`);
    return true;
  }
  /**
   * Update session metadata
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...updates };
      session.metadata.lastActivity = /* @__PURE__ */ new Date();
    }
    const client = this.clients.get(sessionId);
    if (client) {
      client.lastActivity = /* @__PURE__ */ new Date();
      this.clients.set(sessionId, client);
    }
  }
  /**
   * Update session status
   */
  updateStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.metadata.lastActivity = /* @__PURE__ */ new Date();
    }
    const client = this.clients.get(sessionId);
    if (client) {
      client.lastActivity = /* @__PURE__ */ new Date();
      this.clients.set(sessionId, client);
    }
  }
  /**
   * Check if a session is connected
   */
  isConnected(sessionId) {
    if (sessionId) {
      const client = this.clients.get(sessionId);
      return client !== void 0 && client.ws.readyState === WebSocket.OPEN;
    }
    return this.getDefaultClient() !== void 0;
  }
  /**
   * Get connected session count
   */
  getConnectedCount() {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }
  /**
   * Clean up disconnected sessions
   */
  cleanup() {
    for (const [sessionId, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        this.unregisterClient(sessionId);
      }
    }
  }
};
var sessionManager = new SessionManager();

// src/websocket/server.ts
var DEFAULT_PORT = 19999;
var DEFAULT_COMMAND_TIMEOUT = parseInt(process.env.SEI_MCP_COMMAND_TIMEOUT_MS || "30000", 10);
var HEARTBEAT_INTERVAL = 3e4;
var DEFAULT_MAX_RETRIES = 3;
var DEFAULT_RETRY_BASE_DELAY = 500;
var DEFAULT_RETRY_MAX_DELAY = 4e3;
var RETRYABLE_ERRORS = ["ETIMEDOUT", "ECONNRESET", "EPIPE", "Command timeout"];
var SeiWebSocketServer = class {
  constructor(port = DEFAULT_PORT) {
    this.port = port;
  }
  wss = null;
  pendingCommands = /* @__PURE__ */ new Map();
  commandCounter = 0;
  heartbeatIntervals = /* @__PURE__ */ new Map();
  reconnectConfig = {
    maxAttempts: 5,
    baseDelay: 1e3,
    maxDelay: 3e4,
    backoffMultiplier: 2
  };
  async start() {
    return new Promise((resolve) => {
      try {
        this.wss = new WebSocketServer({ host: "0.0.0.0", port: this.port });
        this.wss.on("listening", () => {
          logger.info(`WebSocket server listening on port ${this.port}`);
          resolve();
        });
        this.wss.on("connection", (ws, req) => {
          this.handleConnection(ws, req);
        });
        this.wss.on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            logger.warn(`Port ${this.port} already in use. MCP server will work but Chrome extension won't connect to this instance.`);
            logger.warn("To fix: close other sei-mcp instances or use a different port via SEI_MCP_WS_PORT env var.");
            this.wss = null;
            resolve();
          } else {
            logger.error("WebSocket server error", err);
            resolve();
          }
        });
      } catch (err) {
        logger.error("Failed to create WebSocket server", err);
        resolve();
      }
    });
  }
  handleConnection(ws, req) {
    const url = new URL(req.url || "/", `http://localhost:${this.port}`);
    let sessionId = url.searchParams.get("sessionId") || `session_${randomUUID2().slice(0, 8)}`;
    const windowId = url.searchParams.get("windowId") ? parseInt(url.searchParams.get("windowId"), 10) : void 0;
    logger.info(`Chrome extension connected: ${sessionId}`);
    sessionManager.registerClient(ws, sessionId, windowId);
    this.startHeartbeat(sessionId);
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message, sessionId);
      } catch (err) {
        logger.error("Failed to parse message", err);
      }
    });
    ws.on("close", () => {
      logger.info(`Chrome extension disconnected: ${sessionId}`);
      this.stopHeartbeat(sessionId);
      sessionManager.unregisterClient(sessionId);
      for (const [id, pending] of this.pendingCommands) {
        if (!pending.sessionId || pending.sessionId === sessionId) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Connection closed for session: ${sessionId}`));
          this.pendingCommands.delete(id);
        }
      }
    });
    ws.on("error", (err) => {
      logger.error(`WebSocket error for session ${sessionId}`, err);
    });
    ws.on("pong", () => {
      sessionManager.updateSession(sessionId, {});
    });
  }
  handleMessage(message, sessionId) {
    sessionManager.updateSession(sessionId, {});
    if (message.type === "event") {
      const event = message;
      logger.debug(`Received event from ${sessionId}: ${event.event}`, event.data);
      if (event.event === "connected") {
        sessionManager.updateStatus(sessionId, "connected");
      } else if (event.event === "disconnected") {
        sessionManager.updateStatus(sessionId, "disconnected");
      } else if (event.event === "login_detected" && event.data) {
        const data = event.data;
        sessionManager.updateSession(sessionId, {
          user: data.user,
          url: data.url
        });
      } else if (event.event === "logout_detected") {
        sessionManager.updateSession(sessionId, { user: void 0 });
      } else if (event.event === "page_changed" && event.data) {
        const data = event.data;
        const url = typeof data === "string" ? data : data.url;
        if (url) sessionManager.updateSession(sessionId, { url });
      }
      return;
    }
    if (message.type === "response" || message.type === "error") {
      const response = message;
      const pending = this.pendingCommands.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCommands.delete(response.id);
        pending.resolve(response);
      } else {
        logger.warn(`Received response for unknown command: ${response.id}`);
      }
    }
  }
  startHeartbeat(sessionId) {
    const interval = setInterval(() => {
      const client = sessionManager.getClient(sessionId);
      if (client && client.ws.readyState === WebSocket2.OPEN) {
        client.ws.ping();
      } else {
        this.stopHeartbeat(sessionId);
      }
    }, HEARTBEAT_INTERVAL);
    this.heartbeatIntervals.set(sessionId, interval);
  }
  stopHeartbeat(sessionId) {
    const interval = this.heartbeatIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(sessionId);
    }
  }
  /**
   * Calculate delay for retry with exponential backoff
   */
  getRetryDelay(attempt) {
    const delay = Math.min(
      DEFAULT_RETRY_BASE_DELAY * Math.pow(2, attempt),
      DEFAULT_RETRY_MAX_DELAY
    );
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.round(delay + jitter);
  }
  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const message = error.message || "";
    return RETRYABLE_ERRORS.some((e) => message.includes(e));
  }
  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Send command to a specific session or the default session
   * With automatic retry and exponential backoff for transient errors
   */
  async sendCommand(action, params = {}, sessionId) {
    const maxRetries = typeof params.max_retries === "number" ? params.max_retries : DEFAULT_MAX_RETRIES;
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.sendCommandOnce(action, params, sessionId);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }
        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt);
          logger.warn(`Command failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
            action,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    throw lastError || new Error(`Command failed after ${maxRetries} retries: ${action}`);
  }
  /**
   * Send a single command (internal, no retry)
   */
  async sendCommandOnce(action, params = {}, sessionId) {
    const client = sessionId ? sessionManager.getClient(sessionId) : sessionManager.getDefaultClient();
    if (!client || client.ws.readyState !== WebSocket2.OPEN) {
      const targetSession = sessionId || "default";
      throw new Error(
        `No Chrome extension connected for session: ${targetSession}. Please open SEI in Chrome and connect the extension.`
      );
    }
    const id = `cmd_${++this.commandCounter}_${Date.now()}`;
    const requestedTimeout = params.timeout_ms;
    const timeoutMs = typeof requestedTimeout === "number" && Number.isFinite(requestedTimeout) ? Math.max(0, requestedTimeout) : DEFAULT_COMMAND_TIMEOUT;
    const forwardedParams = { ...params };
    delete forwardedParams.timeout_ms;
    delete forwardedParams.max_retries;
    const command = {
      id,
      type: "command",
      action,
      params: forwardedParams,
      sessionId: client.sessionId
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`Command timeout after ${timeoutMs}ms: ${action} (use timeout_ms or SEI_MCP_COMMAND_TIMEOUT_MS)`));
      }, timeoutMs);
      this.pendingCommands.set(id, {
        resolve,
        reject,
        timeout,
        sessionId: client.sessionId
      });
      try {
        sessionManager.updateSession(client.sessionId, {});
        client.ws.send(JSON.stringify(command));
        logger.debug(`Sent command to ${client.sessionId}: ${action}`, forwardedParams);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingCommands.delete(id);
        reject(err);
      }
    });
  }
  /**
   * Check if connected (optionally for a specific session)
   */
  isConnected(sessionId) {
    return sessionManager.isConnected(sessionId);
  }
  /**
   * List all sessions
   */
  listSessions() {
    return sessionManager.listSessions();
  }
  /**
   * Close a specific session
   */
  closeSession(sessionId) {
    this.stopHeartbeat(sessionId);
    return sessionManager.closeSession(sessionId);
  }
  /**
   * Get connected session count
   */
  getConnectedCount() {
    return sessionManager.getConnectedCount();
  }
  stop() {
    for (const sessionId of this.heartbeatIntervals.keys()) {
      this.stopHeartbeat(sessionId);
    }
    for (const session of sessionManager.listSessions()) {
      sessionManager.closeSession(session.id);
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info("WebSocket server stopped");
    }
  }
};

// src/tools/all-tools.ts
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
var COMMON_FIELDS = {
  session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)"),
  timeout_ms: z.number().optional().describe("Timeout do comando em ms (server-side; padr\xE3o via SEI_MCP_COMMAND_TIMEOUT_MS)")
};
var COMMON_EXCEPTIONS = /* @__PURE__ */ new Set([
  // Estes schemas precisam manter session_id obrigatório
  "sei_close_session",
  "sei_switch_session"
]);
function withCommonFields(name, schema) {
  if (COMMON_EXCEPTIONS.has(name)) return schema;
  if (schema instanceof z.ZodObject) {
    return schema.extend(COMMON_FIELDS);
  }
  return schema;
}
var baseSchemas = {
  // === AUTENTICAÇÃO ===
  sei_login: z.object({
    url: z.string().url().describe("URL base do SEI (ex: https://sei.sp.gov.br)"),
    username: z.string().describe("Nome de usu\xE1rio"),
    password: z.string().describe("Senha do usu\xE1rio"),
    orgao: z.string().optional().describe("\xD3rg\xE3o/Unidade (se necess\xE1rio selecionar)")
  }),
  sei_logout: z.object({}),
  sei_get_session: z.object({}).describe("Retorna informa\xE7\xF5es da sess\xE3o atual"),
  // === PROCESSOS ===
  sei_search_process: z.object({
    query: z.string().describe("Termo de busca (n\xFAmero do processo ou texto)"),
    type: z.enum(["numero", "texto", "interessado", "assunto", "unidade"]).default("numero"),
    unidade: z.string().optional().describe("Filtrar por unidade"),
    tipo_processo: z.string().optional().describe("Filtrar por tipo de processo"),
    data_inicio: z.string().optional().describe("Data inicial (YYYY-MM-DD)"),
    data_fim: z.string().optional().describe("Data final (YYYY-MM-DD)"),
    limit: z.number().default(20).describe("M\xE1ximo de resultados"),
    offset: z.number().default(0).describe("Pular N resultados")
  }),
  sei_open_process: z.object({
    process_number: z.string().describe("N\xFAmero do processo (ex: 12345.678901/2024-00)")
  }),
  sei_create_process: z.object({
    tipo_processo: z.string().describe("ID ou nome do tipo de processo"),
    especificacao: z.string().describe("Especifica\xE7\xE3o/resumo do processo"),
    interessados: z.array(z.string()).optional().describe("Lista de interessados"),
    assuntos: z.array(z.string()).optional().describe("C\xF3digos dos assuntos"),
    observacao: z.string().optional().describe("Observa\xE7\xF5es"),
    nivel_acesso: z.enum(["publico", "restrito", "sigiloso"]).default("publico"),
    hipotese_legal: z.string().optional().describe("ID da hip\xF3tese legal (obrigat\xF3rio se n\xE3o p\xFAblico)")
  }),
  sei_get_status: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    include_history: z.boolean().default(true).describe("Incluir hist\xF3rico completo"),
    include_documents: z.boolean().default(true).describe("Incluir lista de documentos")
  }),
  sei_forward_process: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    target_unit: z.string().describe("Unidade de destino (sigla ou nome)"),
    keep_open: z.boolean().default(false).describe("Manter aberto na unidade atual"),
    deadline: z.number().optional().describe("Prazo em dias"),
    urgente: z.boolean().default(false).describe("Marcar como urgente"),
    note: z.string().optional().describe("Observa\xE7\xE3o/despacho")
  }),
  sei_conclude_process: z.object({
    process_number: z.string().describe("N\xFAmero do processo")
  }),
  sei_reopen_process: z.object({
    process_number: z.string().describe("N\xFAmero do processo")
  }),
  sei_relate_processes: z.object({
    process_number: z.string().describe("N\xFAmero do processo principal"),
    related_process: z.string().describe("N\xFAmero do processo relacionado"),
    tipo_relacao: z.enum(["anexacao", "apensacao", "relacionamento"]).default("relacionamento")
  }),
  // === DOCUMENTOS ===
  sei_list_documents: z.object({
    process_number: z.string().describe("N\xFAmero do processo")
  }),
  sei_get_document: z.object({
    document_id: z.string().describe("ID do documento"),
    include_content: z.boolean().default(false).describe("Incluir conte\xFAdo do documento")
  }),
  sei_create_document: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    document_type: z.string().describe("Tipo do documento (ex: Of\xEDcio, Despacho, Nota T\xE9cnica, Parecer Jur\xEDdico, Comunica\xE7\xE3o Interna, Anexo)"),
    // Texto inicial
    texto_inicial: z.enum(["modelo", "padrao", "nenhum"]).default("nenhum").describe("Origem do texto: modelo existente, texto padr\xE3o ou em branco"),
    texto_padrao_id: z.string().optional().describe("ID do texto padr\xE3o (se texto_inicial=padrao)"),
    documento_modelo_id: z.string().optional().describe("ID do documento modelo (se texto_inicial=modelo)"),
    // Campos básicos
    descricao: z.string().optional().describe("Descri\xE7\xE3o do documento"),
    numero: z.string().optional().describe("N\xFAmero do documento (ex: 29/2026) - alguns tipos como Parecer, Anexo"),
    nome_arvore: z.string().optional().describe("Nome exibido na \xE1rvore do processo"),
    // Interessados e destinatários
    interessados: z.array(z.string()).optional().describe("Lista de interessados (nome ou ID de contatos)"),
    destinatarios: z.array(z.string()).optional().describe("Lista de destinat\xE1rios - para Despacho, CI (nome ou ID de contatos)"),
    // Classificação
    assuntos: z.array(z.string()).optional().describe("C\xF3digos ou nomes dos assuntos para classifica\xE7\xE3o"),
    // Observações
    observacoes: z.string().optional().describe("Observa\xE7\xF5es desta unidade"),
    // Nível de acesso
    nivel_acesso: z.enum(["publico", "restrito", "sigiloso"]).default("publico"),
    hipotese_legal: z.string().optional().describe("Hip\xF3tese legal (obrigat\xF3rio se restrito/sigiloso)"),
    // Conteúdo (preenchido após criar o documento)
    content: z.string().optional().describe("Conte\xFAdo HTML do documento (preenchido no editor ap\xF3s cria\xE7\xE3o)")
  }),
  // === UPLOAD DE ARQUIVO (DOCUMENTO EXTERNO) ===
  sei_upload_document: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    file_path: z.string().describe("Caminho absoluto do arquivo a enviar"),
    file_name: z.string().optional().describe("Nome do arquivo (se diferente do original)"),
    document_type: z.string().describe("Tipo do documento externo"),
    description: z.string().optional().describe("Descri\xE7\xE3o do documento"),
    data_documento: z.string().optional().describe("Data do documento (YYYY-MM-DD)"),
    nivel_acesso: z.enum(["publico", "restrito", "sigiloso"]).default("publico"),
    hipotese_legal: z.string().optional().describe("ID da hip\xF3tese legal"),
    formato: z.enum(["nato_digital", "digitalizado"]).default("nato_digital"),
    conferencia: z.enum(["copia_autenticada", "copia_simples", "documento_original"]).optional(),
    observacao: z.string().optional()
  }),
  sei_upload_document_base64: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    file_content_base64: z.string().describe("Conte\xFAdo do arquivo em Base64"),
    file_name: z.string().describe("Nome do arquivo com extens\xE3o"),
    mime_type: z.string().describe("Tipo MIME (ex: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)"),
    document_type: z.string().describe("Tipo do documento externo"),
    description: z.string().optional().describe("Descri\xE7\xE3o do documento"),
    nivel_acesso: z.enum(["publico", "restrito", "sigiloso"]).default("publico"),
    hipotese_legal: z.string().optional()
  }),
  // === ASSINATURA ===
  sei_sign_document: z.object({
    document_id: z.string().describe("ID do documento"),
    password: z.string().describe("Senha para assinatura"),
    cargo: z.string().optional().describe("Cargo (se diferente do padr\xE3o)")
  }),
  sei_sign_multiple: z.object({
    document_ids: z.array(z.string()).describe("Lista de IDs de documentos"),
    password: z.string().describe("Senha para assinatura"),
    cargo: z.string().optional()
  }),
  sei_sign_block: z.object({
    block_id: z.string().describe("ID do bloco de assinatura"),
    password: z.string().describe("Senha para assinatura")
  }),
  // === DOWNLOAD ===
  sei_download_process: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    include_attachments: z.boolean().default(true).describe("Incluir anexos"),
    output_path: z.string().optional().describe("Caminho para salvar"),
    format: z.enum(["pdf", "zip"]).default("pdf")
  }),
  sei_download_document: z.object({
    document_id: z.string().describe("ID do documento"),
    output_path: z.string().optional().describe("Caminho para salvar")
  }),
  // === ANOTAÇÕES ===
  sei_add_annotation: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    text: z.string().describe("Texto da anota\xE7\xE3o"),
    prioridade: z.enum(["normal", "alta"]).default("normal")
  }),
  sei_list_annotations: z.object({
    process_number: z.string().describe("N\xFAmero do processo")
  }),
  // === BLOCOS ===
  sei_list_blocks: z.object({
    tipo: z.enum(["assinatura", "interno", "reuniao"]).optional()
  }),
  sei_create_block: z.object({
    tipo: z.enum(["assinatura", "interno", "reuniao"]).describe("Tipo do bloco: A=Assinatura, I=Interno, R=Reuni\xE3o"),
    descricao: z.string().describe("Descri\xE7\xE3o do bloco"),
    unidades_disponibilizacao: z.array(z.string()).optional().describe("Unidades para disponibilizar o bloco"),
    documentos: z.array(z.string()).optional().describe("IDs de documentos para incluir no bloco"),
    disponibilizar: z.boolean().default(false).describe("Disponibilizar imediatamente")
  }),
  sei_get_block: z.object({
    block_id: z.string().describe("ID do bloco"),
    include_documents: z.boolean().default(true).describe("Incluir lista de documentos")
  }),
  sei_add_to_block: z.object({
    block_id: z.string().describe("ID do bloco"),
    process_number: z.string().optional(),
    document_id: z.string().optional()
  }),
  sei_remove_from_block: z.object({
    block_id: z.string().describe("ID do bloco"),
    document_id: z.string().describe("ID do documento a remover")
  }),
  sei_release_block: z.object({
    block_id: z.string().describe("ID do bloco")
  }),
  // === MARCADORES ===
  sei_add_marker: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    marker: z.string().describe("Nome ou ID do marcador"),
    text: z.string().optional().describe("Texto do marcador")
  }),
  sei_remove_marker: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    marker: z.string().describe("Nome ou ID do marcador")
  }),
  // === PRAZOS ===
  sei_set_deadline: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    days: z.number().describe("Prazo em dias"),
    tipo: z.enum(["util", "corrido"]).default("util")
  }),
  // === CIÊNCIA ===
  sei_register_knowledge: z.object({
    document_id: z.string().describe("ID do documento")
  }),
  sei_cancel_document: z.object({
    document_id: z.string().describe("ID do documento a cancelar"),
    motivo: z.string().describe("Motivo do cancelamento")
  }),
  // === PUBLICAÇÃO ===
  sei_schedule_publication: z.object({
    document_id: z.string().describe("ID do documento"),
    veiculo: z.string().describe("Ve\xEDculo de publica\xE7\xE3o"),
    data_publicacao: z.string().optional().describe("Data desejada (YYYY-MM-DD)"),
    resumo: z.string().optional().describe("Resumo/ementa")
  }),
  // === CONSULTAS/LISTAGENS ===
  sei_list_document_types: z.object({
    filter: z.string().optional().describe("Filtrar por nome")
  }),
  sei_list_process_types: z.object({
    filter: z.string().optional().describe("Filtrar por nome")
  }),
  sei_list_units: z.object({
    filter: z.string().optional().describe("Filtrar por nome/sigla")
  }),
  sei_list_users: z.object({
    filter: z.string().optional().describe("Filtrar por nome/sigla do usu\xE1rio")
  }),
  sei_list_hipoteses_legais: z.object({}),
  sei_list_marcadores: z.object({}),
  sei_list_my_processes: z.object({
    status: z.enum(["recebidos", "gerados", "abertos", "todos"]).default("abertos"),
    limit: z.number().default(50)
  }),
  // === CONTROLE DE ACESSO ===
  sei_grant_access: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    user: z.string().describe("Usu\xE1rio ou unidade"),
    tipo: z.enum(["consulta", "acompanhamento"]).default("consulta")
  }),
  sei_revoke_access: z.object({
    process_number: z.string().describe("N\xFAmero do processo"),
    user: z.string().describe("Usu\xE1rio ou unidade")
  }),
  // === VISUALIZAÇÃO ===
  sei_screenshot: z.object({
    full_page: z.boolean().default(false),
    output_path: z.string().optional()
  }),
  sei_snapshot: z.object({
    include_hidden: z.boolean().default(false)
  }),
  sei_get_current_page: z.object({}).describe("Retorna informa\xE7\xF5es da p\xE1gina atual"),
  // === SISTEMA (SERVER-SIDE) ===
  sei_open_url: z.object({
    url: z.string().url().describe("URL para abrir no navegador (http/https)")
  }).describe("Abre uma URL no navegador do sistema (n\xE3o requer extens\xE3o)"),
  // === NAVEGAÇÃO ===
  sei_navigate: z.object({
    target: z.enum([
      "home",
      "search",
      "new_process",
      "signature_block",
      "received",
      "generated",
      "inbox",
      "control"
    ]).describe("P\xE1gina de destino")
  }),
  sei_click: z.object({
    selector: z.string().describe("Seletor CSS ou XPath do elemento")
  }),
  sei_type: z.object({
    selector: z.string().describe("Seletor do campo"),
    text: z.string().describe("Texto a digitar"),
    clear: z.boolean().default(true).describe("Limpar campo antes")
  }),
  sei_select: z.object({
    selector: z.string().describe("Seletor do select"),
    value: z.string().describe("Valor ou texto da op\xE7\xE3o")
  }),
  sei_wait: z.object({
    selector: z.string().optional().describe("Aguardar elemento"),
    timeout: z.number().default(1e4).describe("Timeout em ms")
  }),
  // === SESSÕES ===
  sei_list_sessions: z.object({}).describe("Lista todas as sess\xF5es ativas"),
  sei_get_session_info: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Retorna informa\xE7\xF5es detalhadas de uma sess\xE3o"),
  sei_close_session: z.object({
    session_id: z.string().describe("ID da sess\xE3o a fechar")
  }).describe("Fecha uma sess\xE3o espec\xEDfica"),
  sei_switch_session: z.object({
    session_id: z.string().describe("ID da sess\xE3o para ativar")
  }).describe("Troca para uma sess\xE3o espec\xEDfica"),
  // === CONTROLE DE JANELA ===
  sei_minimize_window: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Minimiza a janela do navegador"),
  sei_restore_window: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Restaura a janela do navegador"),
  sei_focus_window: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Traz a janela para frente (foco)"),
  sei_get_window_state: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Retorna estado atual da janela (posi\xE7\xE3o, tamanho, estado)"),
  sei_set_window_bounds: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)"),
    left: z.number().optional().describe("Posi\xE7\xE3o X"),
    top: z.number().optional().describe("Posi\xE7\xE3o Y"),
    width: z.number().optional().describe("Largura"),
    height: z.number().optional().describe("Altura")
  }).describe("Define posi\xE7\xE3o e tamanho da janela"),
  // === CONEXÃO ===
  sei_get_connection_status: z.object({
    session_id: z.string().optional().describe("ID da sess\xE3o (usa default se omitido)")
  }).describe("Retorna status da conex\xE3o WebSocket"),
  // =====================================================
  // === FERRAMENTAS GENÉRICAS DE PLAYWRIGHT/BROWSER ===
  // =====================================================
  browser_close: z.object({}).describe("Fecha o navegador e encerra a sess\xE3o"),
  browser_navigate: z.object({
    url: z.string().describe("URL para navegar")
  }).describe("Navega para uma URL"),
  browser_navigate_back: z.object({}).describe("Volta para a p\xE1gina anterior no hist\xF3rico"),
  browser_click: z.object({
    ref: z.string().optional().describe("Refer\xEAncia do elemento do snapshot"),
    element: z.string().optional().describe("Descri\xE7\xE3o do elemento"),
    selector: z.string().optional().describe("Seletor CSS ou XPath"),
    button: z.enum(["left", "right", "middle"]).default("left").describe("Bot\xE3o do mouse"),
    doubleClick: z.boolean().default(false).describe("Clique duplo"),
    modifiers: z.array(z.enum(["Alt", "Control", "Meta", "Shift"])).optional().describe("Teclas modificadoras")
  }).describe("Clica em um elemento na p\xE1gina"),
  browser_type: z.object({
    ref: z.string().optional().describe("Refer\xEAncia do elemento"),
    selector: z.string().optional().describe("Seletor do campo"),
    text: z.string().describe("Texto a digitar"),
    slowly: z.boolean().default(false).describe("Digitar caractere por caractere"),
    submit: z.boolean().default(false).describe("Pressionar Enter ap\xF3s digitar")
  }).describe("Digita texto em um elemento edit\xE1vel"),
  browser_fill_form: z.object({
    fields: z.array(z.object({
      name: z.string().describe("Nome do campo"),
      type: z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Tipo do campo"),
      ref: z.string().optional().describe("Refer\xEAncia do campo"),
      selector: z.string().optional().describe("Seletor do campo"),
      value: z.string().describe("Valor a preencher")
    })).describe("Campos a preencher")
  }).describe("Preenche m\xFAltiplos campos de formul\xE1rio"),
  browser_select_option: z.object({
    ref: z.string().optional().describe("Refer\xEAncia do elemento"),
    selector: z.string().optional().describe("Seletor do select"),
    values: z.array(z.string()).describe("Valores a selecionar")
  }).describe("Seleciona op\xE7\xE3o em um dropdown"),
  browser_hover: z.object({
    ref: z.string().optional().describe("Refer\xEAncia do elemento"),
    selector: z.string().optional().describe("Seletor do elemento")
  }).describe("Move o mouse sobre um elemento"),
  browser_drag: z.object({
    startRef: z.string().optional().describe("Refer\xEAncia do elemento de origem"),
    startSelector: z.string().optional().describe("Seletor do elemento de origem"),
    endRef: z.string().optional().describe("Refer\xEAncia do elemento de destino"),
    endSelector: z.string().optional().describe("Seletor do elemento de destino")
  }).describe("Arrasta um elemento para outro"),
  browser_press_key: z.object({
    key: z.string().describe("Nome da tecla (ex: Enter, ArrowLeft, a)")
  }).describe("Pressiona uma tecla no teclado"),
  browser_snapshot: z.object({
    filename: z.string().optional().describe("Salvar snapshot em arquivo")
  }).describe("Captura snapshot de acessibilidade da p\xE1gina (melhor que screenshot para a\xE7\xF5es)"),
  browser_take_screenshot: z.object({
    type: z.enum(["png", "jpeg"]).default("png").describe("Formato da imagem"),
    fullPage: z.boolean().default(false).describe("Capturar p\xE1gina inteira"),
    ref: z.string().optional().describe("Refer\xEAncia do elemento para capturar"),
    selector: z.string().optional().describe("Seletor do elemento para capturar"),
    filename: z.string().optional().describe("Nome do arquivo para salvar")
  }).describe("Captura screenshot da p\xE1gina"),
  browser_resize: z.object({
    width: z.number().describe("Largura da janela"),
    height: z.number().describe("Altura da janela")
  }).describe("Redimensiona a janela do navegador"),
  browser_handle_dialog: z.object({
    accept: z.boolean().describe("Aceitar ou cancelar o di\xE1logo"),
    promptText: z.string().optional().describe("Texto para di\xE1logo de prompt")
  }).describe("Lida com di\xE1logos do navegador (alert, confirm, prompt)"),
  browser_evaluate: z.object({
    function: z.string().describe("C\xF3digo JavaScript a executar: () => { ... } ou (element) => { ... }"),
    ref: z.string().optional().describe("Refer\xEAncia do elemento para passar como argumento"),
    selector: z.string().optional().describe("Seletor do elemento para passar como argumento")
  }).describe("Executa c\xF3digo JavaScript na p\xE1gina"),
  browser_file_upload: z.object({
    paths: z.array(z.string()).optional().describe("Caminhos absolutos dos arquivos. Se omitido, cancela o chooser")
  }).describe("Upload de um ou mais arquivos"),
  browser_tabs: z.object({
    action: z.enum(["list", "new", "close", "select"]).describe("Opera\xE7\xE3o a realizar"),
    index: z.number().optional().describe("\xCDndice da aba (para close/select)")
  }).describe("Gerencia abas do navegador"),
  browser_console_messages: z.object({
    level: z.enum(["error", "warning", "info", "debug"]).default("info").describe("N\xEDvel m\xEDnimo de mensagens"),
    filename: z.string().optional().describe("Salvar em arquivo")
  }).describe("Retorna mensagens do console"),
  browser_network_requests: z.object({
    includeStatic: z.boolean().default(false).describe("Incluir recursos est\xE1ticos"),
    filename: z.string().optional().describe("Salvar em arquivo")
  }).describe("Lista requisi\xE7\xF5es de rede desde o carregamento da p\xE1gina"),
  browser_wait_for: z.object({
    text: z.string().optional().describe("Texto a aguardar aparecer"),
    textGone: z.string().optional().describe("Texto a aguardar desaparecer"),
    time: z.number().optional().describe("Tempo em segundos"),
    selector: z.string().optional().describe("Seletor do elemento a aguardar")
  }).describe("Aguarda texto, elemento ou tempo"),
  browser_run_code: z.object({
    code: z.string().describe("C\xF3digo Playwright: async (page) => { ... }")
  }).describe("Executa c\xF3digo Playwright customizado")
};
var schemas = Object.fromEntries(
  Object.entries(baseSchemas).map(([name, schema]) => [name, withCommonFields(name, schema)])
);
var allTools = [
  // Autenticação
  { name: "sei_login", description: "Faz login no sistema SEI", inputSchema: zodToJsonSchema(schemas.sei_login) },
  { name: "sei_logout", description: "Faz logout do sistema SEI", inputSchema: zodToJsonSchema(schemas.sei_logout) },
  { name: "sei_get_session", description: "Retorna informa\xE7\xF5es da sess\xE3o atual (usu\xE1rio, unidade, etc)", inputSchema: zodToJsonSchema(schemas.sei_get_session) },
  // Processos
  { name: "sei_search_process", description: "Busca processos no SEI por n\xFAmero, texto, interessado ou assunto", inputSchema: zodToJsonSchema(schemas.sei_search_process) },
  { name: "sei_open_process", description: "Abre/navega para um processo espec\xEDfico", inputSchema: zodToJsonSchema(schemas.sei_open_process) },
  { name: "sei_create_process", description: "Cria um novo processo no SEI", inputSchema: zodToJsonSchema(schemas.sei_create_process) },
  { name: "sei_get_status", description: "Consulta andamento, hist\xF3rico e documentos do processo", inputSchema: zodToJsonSchema(schemas.sei_get_status) },
  { name: "sei_forward_process", description: "Tramita processo para outra unidade", inputSchema: zodToJsonSchema(schemas.sei_forward_process) },
  { name: "sei_conclude_process", description: "Conclui processo na unidade atual", inputSchema: zodToJsonSchema(schemas.sei_conclude_process) },
  { name: "sei_reopen_process", description: "Reabre processo conclu\xEDdo", inputSchema: zodToJsonSchema(schemas.sei_reopen_process) },
  { name: "sei_relate_processes", description: "Relaciona, anexa ou apensa processos", inputSchema: zodToJsonSchema(schemas.sei_relate_processes) },
  // Documentos
  { name: "sei_list_documents", description: "Lista todos os documentos de um processo", inputSchema: zodToJsonSchema(schemas.sei_list_documents) },
  { name: "sei_get_document", description: "Obt\xE9m detalhes de um documento espec\xEDfico", inputSchema: zodToJsonSchema(schemas.sei_get_document) },
  { name: "sei_create_document", description: "Cria documento interno no SEI (Despacho, Parecer, CI, Nota T\xE9cnica, Anexo, etc.) com todos os campos: texto inicial, descri\xE7\xE3o, n\xFAmero, nome na \xE1rvore, interessados, destinat\xE1rios, assuntos, observa\xE7\xF5es e n\xEDvel de acesso", inputSchema: zodToJsonSchema(schemas.sei_create_document) },
  // Upload de arquivos (preserva formatação)
  { name: "sei_upload_document", description: "Envia arquivo externo (PDF, Word, etc) para o processo PRESERVANDO FORMATA\xC7\xC3O ORIGINAL", inputSchema: zodToJsonSchema(schemas.sei_upload_document) },
  { name: "sei_upload_document_base64", description: "Envia arquivo em Base64 para o processo (para integra\xE7\xE3o com apps)", inputSchema: zodToJsonSchema(schemas.sei_upload_document_base64) },
  // Assinatura
  { name: "sei_sign_document", description: "Assina documento eletronicamente", inputSchema: zodToJsonSchema(schemas.sei_sign_document) },
  { name: "sei_sign_multiple", description: "Assina m\xFAltiplos documentos de uma vez", inputSchema: zodToJsonSchema(schemas.sei_sign_multiple) },
  { name: "sei_sign_block", description: "Assina todos documentos de um bloco", inputSchema: zodToJsonSchema(schemas.sei_sign_block) },
  // Download
  { name: "sei_download_process", description: "Baixa processo completo em PDF ou ZIP", inputSchema: zodToJsonSchema(schemas.sei_download_process) },
  { name: "sei_download_document", description: "Baixa documento espec\xEDfico", inputSchema: zodToJsonSchema(schemas.sei_download_document) },
  // Anotações
  { name: "sei_add_annotation", description: "Adiciona anota\xE7\xE3o ao processo", inputSchema: zodToJsonSchema(schemas.sei_add_annotation) },
  { name: "sei_list_annotations", description: "Lista anota\xE7\xF5es do processo", inputSchema: zodToJsonSchema(schemas.sei_list_annotations) },
  // Blocos
  { name: "sei_list_blocks", description: "Lista blocos de assinatura/interno/reuni\xE3o", inputSchema: zodToJsonSchema(schemas.sei_list_blocks) },
  { name: "sei_create_block", description: "Cria novo bloco de assinatura/interno/reuni\xE3o", inputSchema: zodToJsonSchema(schemas.sei_create_block) },
  { name: "sei_get_block", description: "Consulta detalhes de um bloco", inputSchema: zodToJsonSchema(schemas.sei_get_block) },
  { name: "sei_add_to_block", description: "Adiciona processo ou documento a um bloco", inputSchema: zodToJsonSchema(schemas.sei_add_to_block) },
  { name: "sei_remove_from_block", description: "Remove documento de um bloco", inputSchema: zodToJsonSchema(schemas.sei_remove_from_block) },
  { name: "sei_release_block", description: "Disponibiliza bloco para outras unidades assinarem", inputSchema: zodToJsonSchema(schemas.sei_release_block) },
  // Marcadores
  { name: "sei_add_marker", description: "Adiciona marcador ao processo", inputSchema: zodToJsonSchema(schemas.sei_add_marker) },
  { name: "sei_remove_marker", description: "Remove marcador do processo", inputSchema: zodToJsonSchema(schemas.sei_remove_marker) },
  // Prazos
  { name: "sei_set_deadline", description: "Define prazo para o processo", inputSchema: zodToJsonSchema(schemas.sei_set_deadline) },
  // Ciência
  { name: "sei_register_knowledge", description: "Registra ci\xEAncia em documento", inputSchema: zodToJsonSchema(schemas.sei_register_knowledge) },
  // Cancelamento
  { name: "sei_cancel_document", description: "Cancela documento no processo", inputSchema: zodToJsonSchema(schemas.sei_cancel_document) },
  // Publicação
  { name: "sei_schedule_publication", description: "Agenda publica\xE7\xE3o de documento", inputSchema: zodToJsonSchema(schemas.sei_schedule_publication) },
  // Consultas/Listagens
  { name: "sei_list_document_types", description: "Lista tipos de documentos dispon\xEDveis", inputSchema: zodToJsonSchema(schemas.sei_list_document_types) },
  { name: "sei_list_process_types", description: "Lista tipos de processos dispon\xEDveis", inputSchema: zodToJsonSchema(schemas.sei_list_process_types) },
  { name: "sei_list_units", description: "Lista unidades/setores dispon\xEDveis", inputSchema: zodToJsonSchema(schemas.sei_list_units) },
  { name: "sei_list_users", description: "Lista usu\xE1rios da unidade atual", inputSchema: zodToJsonSchema(schemas.sei_list_users) },
  { name: "sei_list_hipoteses_legais", description: "Lista hip\xF3teses legais para documentos restritos/sigilosos", inputSchema: zodToJsonSchema(schemas.sei_list_hipoteses_legais) },
  { name: "sei_list_marcadores", description: "Lista marcadores dispon\xEDveis", inputSchema: zodToJsonSchema(schemas.sei_list_marcadores) },
  { name: "sei_list_my_processes", description: "Lista processos do usu\xE1rio (recebidos, gerados, abertos)", inputSchema: zodToJsonSchema(schemas.sei_list_my_processes) },
  // Controle de Acesso
  { name: "sei_grant_access", description: "Concede acesso a processo para usu\xE1rio/unidade", inputSchema: zodToJsonSchema(schemas.sei_grant_access) },
  { name: "sei_revoke_access", description: "Revoga acesso a processo", inputSchema: zodToJsonSchema(schemas.sei_revoke_access) },
  // Visualização
  { name: "sei_screenshot", description: "Captura screenshot da p\xE1gina atual", inputSchema: zodToJsonSchema(schemas.sei_screenshot) },
  { name: "sei_snapshot", description: "Captura estado da p\xE1gina (\xE1rvore de acessibilidade)", inputSchema: zodToJsonSchema(schemas.sei_snapshot) },
  { name: "sei_get_current_page", description: "Retorna URL e informa\xE7\xF5es da p\xE1gina atual", inputSchema: zodToJsonSchema(schemas.sei_get_current_page) },
  { name: "sei_open_url", description: "Abre uma URL no navegador do sistema (server-side; n\xE3o requer extens\xE3o)", inputSchema: zodToJsonSchema(schemas.sei_open_url) },
  // Navegação
  { name: "sei_navigate", description: "Navega para p\xE1gina espec\xEDfica do SEI", inputSchema: zodToJsonSchema(schemas.sei_navigate) },
  { name: "sei_click", description: "Clica em elemento na p\xE1gina", inputSchema: zodToJsonSchema(schemas.sei_click) },
  { name: "sei_type", description: "Digita texto em campo", inputSchema: zodToJsonSchema(schemas.sei_type) },
  { name: "sei_select", description: "Seleciona op\xE7\xE3o em dropdown", inputSchema: zodToJsonSchema(schemas.sei_select) },
  { name: "sei_wait", description: "Aguarda elemento ou tempo", inputSchema: zodToJsonSchema(schemas.sei_wait) },
  // Sessões
  { name: "sei_list_sessions", description: "Lista todas as sess\xF5es ativas conectadas", inputSchema: zodToJsonSchema(schemas.sei_list_sessions) },
  { name: "sei_get_session_info", description: "Retorna informa\xE7\xF5es detalhadas de uma sess\xE3o", inputSchema: zodToJsonSchema(schemas.sei_get_session_info) },
  { name: "sei_close_session", description: "Fecha uma sess\xE3o espec\xEDfica", inputSchema: zodToJsonSchema(schemas.sei_close_session) },
  { name: "sei_switch_session", description: "Troca para uma sess\xE3o espec\xEDfica (traz para foco)", inputSchema: zodToJsonSchema(schemas.sei_switch_session) },
  // Controle de Janela
  { name: "sei_minimize_window", description: "Minimiza a janela do navegador", inputSchema: zodToJsonSchema(schemas.sei_minimize_window) },
  { name: "sei_restore_window", description: "Restaura a janela do navegador (de minimizado)", inputSchema: zodToJsonSchema(schemas.sei_restore_window) },
  { name: "sei_focus_window", description: "Traz a janela para frente (foco)", inputSchema: zodToJsonSchema(schemas.sei_focus_window) },
  { name: "sei_get_window_state", description: "Retorna estado atual da janela (posi\xE7\xE3o, tamanho, estado)", inputSchema: zodToJsonSchema(schemas.sei_get_window_state) },
  { name: "sei_set_window_bounds", description: "Define posi\xE7\xE3o e tamanho da janela", inputSchema: zodToJsonSchema(schemas.sei_set_window_bounds) },
  // Conexão
  { name: "sei_get_connection_status", description: "Retorna status da conex\xE3o WebSocket", inputSchema: zodToJsonSchema(schemas.sei_get_connection_status) },
  // =====================================================
  // === FERRAMENTAS GENÉRICAS DE PLAYWRIGHT/BROWSER ===
  // =====================================================
  // Navegação
  { name: "browser_navigate", description: "Navega para uma URL", inputSchema: zodToJsonSchema(schemas.browser_navigate) },
  { name: "browser_navigate_back", description: "Volta para a p\xE1gina anterior no hist\xF3rico", inputSchema: zodToJsonSchema(schemas.browser_navigate_back) },
  { name: "browser_close", description: "Fecha o navegador e encerra a sess\xE3o", inputSchema: zodToJsonSchema(schemas.browser_close) },
  // Interação
  { name: "browser_click", description: "Clica em um elemento na p\xE1gina", inputSchema: zodToJsonSchema(schemas.browser_click) },
  { name: "browser_type", description: "Digita texto em um elemento edit\xE1vel", inputSchema: zodToJsonSchema(schemas.browser_type) },
  { name: "browser_fill_form", description: "Preenche m\xFAltiplos campos de formul\xE1rio de uma vez", inputSchema: zodToJsonSchema(schemas.browser_fill_form) },
  { name: "browser_select_option", description: "Seleciona op\xE7\xE3o em um dropdown", inputSchema: zodToJsonSchema(schemas.browser_select_option) },
  { name: "browser_hover", description: "Move o mouse sobre um elemento (hover)", inputSchema: zodToJsonSchema(schemas.browser_hover) },
  { name: "browser_drag", description: "Arrasta um elemento para outro (drag and drop)", inputSchema: zodToJsonSchema(schemas.browser_drag) },
  { name: "browser_press_key", description: "Pressiona uma tecla no teclado", inputSchema: zodToJsonSchema(schemas.browser_press_key) },
  // Captura/Visualização
  { name: "browser_snapshot", description: "Captura snapshot de acessibilidade da p\xE1gina (melhor que screenshot para a\xE7\xF5es)", inputSchema: zodToJsonSchema(schemas.browser_snapshot) },
  { name: "browser_take_screenshot", description: "Captura screenshot da p\xE1gina atual", inputSchema: zodToJsonSchema(schemas.browser_take_screenshot) },
  // Janela/Abas
  { name: "browser_resize", description: "Redimensiona a janela do navegador", inputSchema: zodToJsonSchema(schemas.browser_resize) },
  { name: "browser_tabs", description: "Gerencia abas do navegador (listar, criar, fechar, selecionar)", inputSchema: zodToJsonSchema(schemas.browser_tabs) },
  // Diálogos e Uploads
  { name: "browser_handle_dialog", description: "Lida com di\xE1logos do navegador (alert, confirm, prompt)", inputSchema: zodToJsonSchema(schemas.browser_handle_dialog) },
  { name: "browser_file_upload", description: "Upload de um ou mais arquivos", inputSchema: zodToJsonSchema(schemas.browser_file_upload) },
  // JavaScript e Código
  { name: "browser_evaluate", description: "Executa c\xF3digo JavaScript na p\xE1gina", inputSchema: zodToJsonSchema(schemas.browser_evaluate) },
  { name: "browser_run_code", description: "Executa c\xF3digo Playwright customizado", inputSchema: zodToJsonSchema(schemas.browser_run_code) },
  // Debug/Monitoramento
  { name: "browser_console_messages", description: "Retorna mensagens do console do navegador", inputSchema: zodToJsonSchema(schemas.browser_console_messages) },
  { name: "browser_network_requests", description: "Lista requisi\xE7\xF5es de rede desde o carregamento", inputSchema: zodToJsonSchema(schemas.browser_network_requests) },
  // Espera
  { name: "browser_wait_for", description: "Aguarda texto aparecer/desaparecer, elemento ou tempo", inputSchema: zodToJsonSchema(schemas.browser_wait_for) }
];
var toolCount = allTools.length;

// src/tools/index.ts
import { z as z2 } from "zod";
import { zodToJsonSchema as zodToJsonSchema2 } from "zod-to-json-schema";
import { spawn } from "child_process";
var SMART_WAIT_ENABLED = process.env.SEI_MCP_SMART_WAIT === "true";
var SMART_WAIT_STABILITY_MS = parseInt(process.env.SEI_MCP_STABILITY_MS || "300", 10);
var SMART_WAIT_MAX_MS = parseInt(process.env.SEI_MCP_MAX_WAIT_MS || "5000", 10);
var SMART_WAIT_TOOLS = [
  "sei_login",
  "sei_search_process",
  "sei_create_document",
  "sei_sign_document",
  "sei_forward_process",
  "sei_click",
  "sei_type",
  "sei_select",
  "sei_fill"
];
function shouldUseSmartWait(toolName) {
  return SMART_WAIT_ENABLED && SMART_WAIT_TOOLS.includes(toolName);
}
var schemas2 = {
  sei_login: z2.object({
    url: z2.string().url().describe("URL base do SEI (ex: https://sei.sp.gov.br)"),
    username: z2.string().describe("Nome de usu\xE1rio"),
    password: z2.string().describe("Senha do usu\xE1rio"),
    orgao: z2.string().optional().describe("\xD3rg\xE3o (se necess\xE1rio selecionar)")
  }),
  sei_search_process: z2.object({
    query: z2.string().describe("Termo de busca (n\xFAmero do processo ou texto)"),
    type: z2.enum(["numero", "texto", "interessado", "assunto"]).default("numero").describe("Tipo de busca"),
    limit: z2.number().default(10).describe("N\xFAmero m\xE1ximo de resultados")
  }),
  sei_download_process: z2.object({
    process_number: z2.string().describe("N\xFAmero do processo (ex: 12345.678901/2024-00)"),
    include_attachments: z2.boolean().default(true).describe("Incluir anexos"),
    output_path: z2.string().optional().describe("Caminho para salvar o arquivo")
  }),
  sei_list_documents: z2.object({
    process_number: z2.string().describe("N\xFAmero do processo")
  }),
  sei_create_document: z2.object({
    process_number: z2.string().describe("N\xFAmero do processo"),
    document_type: z2.string().describe("Tipo do documento (ex: Of\xEDcio, Despacho)"),
    content: z2.string().describe("Conte\xFAdo do documento em HTML"),
    description: z2.string().optional().describe("Descri\xE7\xE3o/t\xEDtulo do documento"),
    nivel_acesso: z2.enum(["publico", "restrito", "sigiloso"]).default("publico"),
    hipotese_legal: z2.string().optional().describe("Hip\xF3tese legal (obrigat\xF3rio se restrito/sigiloso)")
  }),
  sei_sign_document: z2.object({
    document_id: z2.string().describe("ID do documento no SEI"),
    password: z2.string().describe("Senha para assinatura"),
    cargo: z2.string().optional().describe("Cargo para assinatura")
  }),
  sei_forward_process: z2.object({
    process_number: z2.string().describe("N\xFAmero do processo"),
    target_unit: z2.string().describe("Unidade de destino"),
    keep_open: z2.boolean().default(false).describe("Manter aberto na unidade atual"),
    deadline: z2.number().optional().describe("Prazo em dias"),
    note: z2.string().optional().describe("Observa\xE7\xE3o para tramita\xE7\xE3o")
  }),
  sei_get_status: z2.object({
    process_number: z2.string().describe("N\xFAmero do processo"),
    include_history: z2.boolean().default(true).describe("Incluir hist\xF3rico completo")
  }),
  sei_screenshot: z2.object({
    full_page: z2.boolean().default(false).describe("Capturar p\xE1gina inteira")
  }),
  sei_snapshot: z2.object({
    include_hidden: z2.boolean().default(false).describe("Incluir elementos ocultos")
  })
};
var tools = [
  {
    name: "sei_login",
    description: "Faz login no sistema SEI com usu\xE1rio e senha. Deve ser chamado antes de outras opera\xE7\xF5es.",
    inputSchema: zodToJsonSchema2(schemas2.sei_login)
  },
  {
    name: "sei_search_process",
    description: "Busca processos no SEI por n\xFAmero, texto, interessado ou assunto.",
    inputSchema: zodToJsonSchema2(schemas2.sei_search_process)
  },
  {
    name: "sei_download_process",
    description: "Baixa processo completo como PDF, opcionalmente incluindo anexos.",
    inputSchema: zodToJsonSchema2(schemas2.sei_download_process)
  },
  {
    name: "sei_list_documents",
    description: "Lista todos os documentos de um processo espec\xEDfico.",
    inputSchema: zodToJsonSchema2(schemas2.sei_list_documents)
  },
  {
    name: "sei_create_document",
    description: "Cria um novo documento em um processo existente.",
    inputSchema: zodToJsonSchema2(schemas2.sei_create_document)
  },
  {
    name: "sei_sign_document",
    description: "Assina eletronicamente um documento no SEI.",
    inputSchema: zodToJsonSchema2(schemas2.sei_sign_document)
  },
  {
    name: "sei_forward_process",
    description: "Tramita processo para outra unidade.",
    inputSchema: zodToJsonSchema2(schemas2.sei_forward_process)
  },
  {
    name: "sei_get_status",
    description: "Consulta andamento e hist\xF3rico de tramita\xE7\xF5es do processo.",
    inputSchema: zodToJsonSchema2(schemas2.sei_get_status)
  },
  {
    name: "sei_screenshot",
    description: "Captura screenshot da p\xE1gina atual do SEI.",
    inputSchema: zodToJsonSchema2(schemas2.sei_screenshot)
  },
  {
    name: "sei_snapshot",
    description: "Captura estado da p\xE1gina (\xE1rvore de acessibilidade ARIA) para an\xE1lise.",
    inputSchema: zodToJsonSchema2(schemas2.sei_snapshot)
  }
];
var SESSION_TOOLS = [
  "sei_list_sessions",
  "sei_get_session_info",
  "sei_close_session",
  "sei_switch_session",
  "sei_get_connection_status"
];
var LOCAL_TOOLS = [
  "sei_open_url"
];
async function handleTool(name, args, wsServer, pwManager, driver) {
  logger.info(`Executing tool: ${name}`, args);
  const requestedDriver = args.driver;
  delete args.driver;
  const configuredDriver = driver ?? (process.env.SEI_MCP_DRIVER || "both").toLowerCase();
  let resolvedDriver;
  if (requestedDriver && (requestedDriver === "extension" || requestedDriver === "playwright")) {
    resolvedDriver = requestedDriver;
  } else if (configuredDriver === "playwright") {
    resolvedDriver = "playwright";
  } else if (configuredDriver === "extension") {
    resolvedDriver = "extension";
  } else {
    const pwAvailable = pwManager && pwManager.getConnectedCount() > 0;
    const extAvailable = wsServer.isConnected();
    if (pwAvailable) {
      resolvedDriver = "playwright";
    } else if (extAvailable) {
      resolvedDriver = "extension";
    } else {
      resolvedDriver = "playwright";
    }
    logger.debug(`Auto-selected driver: ${resolvedDriver} (pw: ${pwAvailable}, ext: ${extAvailable})`);
  }
  if (LOCAL_TOOLS.includes(name)) {
    return handleLocalTool(name, args);
  }
  if (SESSION_TOOLS.includes(name)) {
    if (resolvedDriver === "playwright") {
      if (!pwManager) {
        return {
          content: [{ type: "text", text: "Erro: driver Playwright n\xE3o inicializado no servidor" }],
          isError: true
        };
      }
      return handlePlaywrightSessionTool(name, args, pwManager);
    }
    return handleSessionTool(name, args, wsServer);
  }
  if (resolvedDriver === "playwright") {
    if (!pwManager) {
      return {
        content: [{ type: "text", text: "Erro: driver Playwright n\xE3o inicializado no servidor" }],
        isError: true
      };
    }
    const sessionId2 = args.session_id;
    const forwardedArgs = { ...args };
    delete forwardedArgs.session_id;
    try {
      const data = await pwManager.executeTool(name, forwardedArgs, sessionId2);
      if (name === "sei_screenshot" && data && typeof data === "object" && "image" in data) {
        const d = data;
        return {
          content: [
            {
              type: "image",
              data: d.image,
              mimeType: d.mimeType || "image/png"
            }
          ]
        };
      }
      return {
        content: [
          {
            type: "text",
            text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      logger.error(`Tool error (playwright): ${name}`, { error: message });
      return {
        content: [{ type: "text", text: `Erro ao executar ${name}: ${message}` }],
        isError: true
      };
    }
  }
  const sessionId = args.session_id;
  if (!wsServer.isConnected(sessionId)) {
    const sessions = wsServer.listSessions();
    const connected = sessions.filter((s) => s.status === "connected");
    return {
      content: [
        {
          type: "text",
          text: `Erro: Extens\xE3o do Chrome n\xE3o conectada${sessionId ? ` para sess\xE3o ${sessionId}` : ""}.

Como resolver:
1. Abra o SEI no Chrome
2. Clique no \xEDcone da extens\xE3o SEI-MCP
3. Clique em "Conectar"

` + (connected.length ? `Sess\xF5es conectadas dispon\xEDveis (use \`session_id\` para escolher):
${connected.map((s) => `- ${s.id}${s.url ? ` (${s.url})` : ""}${s.user ? ` [${s.user}]` : ""}`).join("\n")}` : `Dica: chame \`sei_list_sessions\` para ver sess\xF5es detectadas.`)
        }
      ],
      isError: true
    };
  }
  try {
    const forwardedArgs = { ...args };
    delete forwardedArgs.session_id;
    if (shouldUseSmartWait(name)) {
      try {
        logger.debug(`Smart Wait: waiting for page stability before ${name}`);
        await wsServer.sendCommand("sei_wait_for_stable", {
          stability_ms: SMART_WAIT_STABILITY_MS,
          max_wait_ms: SMART_WAIT_MAX_MS
        }, sessionId);
      } catch (waitError) {
        logger.warn(`Smart Wait failed for ${name}, proceeding anyway`, {
          error: waitError instanceof Error ? waitError.message : String(waitError)
        });
      }
    }
    const response = await wsServer.sendCommand(name, forwardedArgs, sessionId);
    if (!response.success) {
      return {
        content: [
          {
            type: "text",
            text: `Erro: ${response.error?.message || "Erro desconhecido"}`
          }
        ],
        isError: true
      };
    }
    if (name === "sei_screenshot" && response.data) {
      const data = response.data;
      return {
        content: [
          {
            type: "image",
            data: data.image,
            mimeType: data.mimeType || "image/png"
          }
        ]
      };
    }
    return {
      content: [
        {
          type: "text",
          text: typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2)
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error(`Tool error: ${name}`, { error: message });
    return {
      content: [
        {
          type: "text",
          text: `Erro ao executar ${name}: ${message}`
        }
      ],
      isError: true
    };
  }
}
function handlePlaywrightSessionTool(name, args, pwManager) {
  try {
    switch (name) {
      case "sei_list_sessions": {
        const sessions = pwManager.listSessions();
        return {
          content: [{ type: "text", text: JSON.stringify({ total: sessions.length, connected: pwManager.getConnectedCount(), sessions }, null, 2) }]
        };
      }
      case "sei_get_session_info": {
        const sessionId = args.session_id;
        const sessions = pwManager.listSessions();
        const session = sessionId ? sessions.find((s) => s.id === sessionId) : sessions[0];
        return {
          content: [{ type: "text", text: JSON.stringify(session ?? null, null, 2) }]
        };
      }
      case "sei_close_session": {
        const sessionId = args.session_id;
        if (!sessionId) {
          return { content: [{ type: "text", text: "Erro: session_id \xE9 obrigat\xF3rio" }], isError: true };
        }
        void pwManager.closeSession(sessionId);
        return { content: [{ type: "text", text: `Sess\xE3o fechada: ${sessionId}` }] };
      }
      case "sei_switch_session": {
        const sessionId = args.session_id;
        if (!sessionId) {
          return { content: [{ type: "text", text: "Erro: session_id \xE9 obrigat\xF3rio" }], isError: true };
        }
        const ok = pwManager.switchSession(sessionId);
        return ok ? { content: [{ type: "text", text: `Sess\xE3o ativa: ${sessionId}` }] } : { content: [{ type: "text", text: `Sess\xE3o n\xE3o encontrada ou desconectada: ${sessionId}` }], isError: true };
      }
      case "sei_get_connection_status": {
        const sessionId = args.session_id;
        return {
          content: [{ type: "text", text: JSON.stringify({ driver: "playwright", connected: pwManager.isConnected(sessionId), session_id: sessionId }, null, 2) }]
        };
      }
      default:
        return { content: [{ type: "text", text: `Ferramenta de sess\xE3o desconhecida: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { content: [{ type: "text", text: `Erro ao executar ${name}: ${message}` }], isError: true };
  }
}
function openUrlInSystemBrowser(url) {
  const platform = process.platform;
  if (platform === "darwin") {
    const child2 = spawn("open", [url], { detached: true, stdio: "ignore" });
    child2.unref();
    return;
  }
  if (platform === "win32") {
    const child2 = spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" });
    child2.unref();
    return;
  }
  const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
}
function handleLocalTool(name, args) {
  try {
    switch (name) {
      case "sei_open_url": {
        const urlRaw = args.url;
        if (typeof urlRaw !== "string") {
          return {
            content: [{ type: "text", text: "Erro: url \xE9 obrigat\xF3rio" }],
            isError: true
          };
        }
        let parsed;
        try {
          parsed = new URL(urlRaw);
        } catch {
          return {
            content: [{ type: "text", text: `Erro: URL inv\xE1lida: ${urlRaw}` }],
            isError: true
          };
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return {
            content: [{ type: "text", text: "Erro: apenas URLs http/https s\xE3o permitidas" }],
            isError: true
          };
        }
        openUrlInSystemBrowser(parsed.toString());
        return {
          content: [{ type: "text", text: `OK: aberto no navegador: ${parsed.toString()}` }]
        };
      }
      default:
        return {
          content: [{ type: "text", text: `Erro: ferramenta local desconhecida: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      content: [{ type: "text", text: `Erro ao executar ${name}: ${message}` }],
      isError: true
    };
  }
}
function handleSessionTool(name, args, wsServer) {
  try {
    switch (name) {
      case "sei_list_sessions": {
        const sessions = wsServer.listSessions();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: sessions.length,
                connected: wsServer.getConnectedCount(),
                sessions
              }, null, 2)
            }
          ]
        };
      }
      case "sei_get_session_info": {
        const sessionId = args.session_id;
        const sessions = wsServer.listSessions();
        const session = sessionId ? sessions.find((s) => s.id === sessionId) : sessions.find((s) => s.status === "connected");
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: `Sess\xE3o n\xE3o encontrada: ${sessionId || "default"}`
              }
            ],
            isError: true
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(session, null, 2)
            }
          ]
        };
      }
      case "sei_close_session": {
        const sessionId = args.session_id;
        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: "Erro: session_id \xE9 obrigat\xF3rio"
              }
            ],
            isError: true
          };
        }
        const closed = wsServer.closeSession(sessionId);
        return {
          content: [
            {
              type: "text",
              text: closed ? `Sess\xE3o ${sessionId} fechada com sucesso` : `Sess\xE3o ${sessionId} n\xE3o encontrada`
            }
          ],
          isError: !closed
        };
      }
      case "sei_switch_session": {
        const sessionId = args.session_id;
        if (!wsServer.isConnected(sessionId)) {
          return {
            content: [
              {
                type: "text",
                text: `Sess\xE3o ${sessionId} n\xE3o est\xE1 conectada`
              }
            ],
            isError: true
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Sess\xE3o ativa: ${sessionId}`
            }
          ]
        };
      }
      case "sei_get_connection_status": {
        const sessionId = args.session_id;
        const isConnected = wsServer.isConnected(sessionId);
        const sessions = wsServer.listSessions();
        const session = sessionId ? sessions.find((s) => s.id === sessionId) : sessions.find((s) => s.status === "connected");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                connected: isConnected,
                sessionId: session?.id || null,
                status: session?.status || "disconnected",
                lastActivity: session?.lastActivity || null,
                totalSessions: sessions.length,
                connectedSessions: wsServer.getConnectedCount()
              }, null, 2)
            }
          ]
        };
      }
      default:
        return {
          content: [
            {
              type: "text",
              text: `Ferramenta de sess\xE3o desconhecida: ${name}`
            }
          ],
          isError: true
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      content: [
        {
          type: "text",
          text: `Erro ao executar ${name}: ${message}`
        }
      ],
      isError: true
    };
  }
}

// src/playwright/manager.ts
import { randomUUID as randomUUID3 } from "crypto";
import { readFile } from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
  SEIClient
} from "sei-playwright";
function normalizeBaseUrl(url) {
  return url.replace(/\/$/, "");
}
function nivelAcessoFromLabel(label) {
  if (label === "restrito") return 1;
  if (label === "sigiloso") return 2;
  return 0;
}
function toPlaywrightSelector(selector) {
  const trimmed = selector.trim();
  if (trimmed.startsWith("xpath=") || trimmed.startsWith("css=")) return trimmed;
  if (trimmed.startsWith("//") || trimmed.startsWith("(")) return `xpath=${trimmed}`;
  return trimmed;
}
var SeiPlaywrightManager = class {
  sessions = /* @__PURE__ */ new Map();
  defaultSessionId = null;
  get globalTimeoutMs() {
    const raw = process.env.SEI_MCP_COMMAND_TIMEOUT_MS || process.env.SEI_MCP_PW_TIMEOUT_MS || "30000";
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 3e4;
  }
  get headlessDefault() {
    const raw = process.env.SEI_MCP_PW_HEADLESS;
    if (raw === void 0) return true;
    return raw === "1" || raw.toLowerCase() === "true";
  }
  get persistentDefault() {
    const raw = process.env.SEI_MCP_PW_PERSISTENT;
    if (raw === void 0) return true;
    return raw === "1" || raw.toLowerCase() === "true";
  }
  get channelDefault() {
    const raw = process.env.SEI_MCP_PW_CHANNEL;
    return raw ? raw : void 0;
  }
  defaultUserDataDir(sessionId) {
    return path.join(os.homedir(), ".sei-mcp", "playwright", "profiles", sessionId);
  }
  listSessions() {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      status: s.status,
      baseUrl: s.baseUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      cdpEndpoint: s.client.getCdpEndpoint()
    }));
  }
  isConnected(sessionId) {
    if (sessionId) return this.sessions.has(sessionId) && this.sessions.get(sessionId).status === "ready";
    return this.defaultSessionId !== null && this.sessions.get(this.defaultSessionId)?.status === "ready";
  }
  getConnectedCount() {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.status === "ready") count++;
    }
    return count;
  }
  async closeSession(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.status = "closed";
    try {
      await s.client.close();
    } catch (err) {
      logger.warn("Failed closing Playwright session", { sessionId, err });
    }
    this.sessions.delete(sessionId);
    if (this.defaultSessionId === sessionId) this.defaultSessionId = null;
    return true;
  }
  switchSession(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "ready") return false;
    this.defaultSessionId = sessionId;
    s.lastActivity = /* @__PURE__ */ new Date();
    return true;
  }
  async getSessionInfo(sessionId) {
    const s = this.getSession(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      status: s.status,
      baseUrl: s.baseUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      cdpEndpoint: s.client.getCdpEndpoint()
    };
  }
  getSession(sessionId) {
    if (sessionId) return this.sessions.get(sessionId) ?? null;
    if (this.defaultSessionId) return this.sessions.get(this.defaultSessionId) ?? null;
    return null;
  }
  async runExclusive(sessionId, fn) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Sess\xE3o n\xE3o encontrada: ${sessionId}`);
    const next = s.queue.then(async () => {
      s.lastActivity = /* @__PURE__ */ new Date();
      return fn(s);
    });
    s.queue = next.catch(() => void 0);
    return next;
  }
  async createSession(options) {
    const id = `session_${randomUUID3().slice(0, 8)}`;
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const now = /* @__PURE__ */ new Date();
    const cfg = {
      baseUrl,
      mode: "browser",
      browser: options.username && options.password ? {
        usuario: options.username,
        senha: options.password,
        orgao: options.orgao
      } : void 0,
      playwright: {
        headless: options.headless ?? this.headlessDefault,
        timeout: options.timeoutMs ?? this.globalTimeoutMs,
        persistent: options.persistent ?? this.persistentDefault,
        userDataDir: options.userDataDir ?? this.defaultUserDataDir(id),
        channel: this.channelDefault,
        keepAlive: true
      }
    };
    const defaultTimeoutMs = cfg.playwright?.timeout ?? this.globalTimeoutMs;
    const client = new SEIClient(cfg);
    await client.init();
    const state = {
      id,
      status: "ready",
      baseUrl,
      client,
      createdAt: now,
      lastActivity: now,
      defaultTimeoutMs,
      queue: Promise.resolve()
    };
    this.sessions.set(id, state);
    if (!this.defaultSessionId) this.defaultSessionId = id;
    return state;
  }
  async login(args) {
    if (args.session_id) {
      const existing = this.sessions.get(args.session_id);
      if (existing) {
        return this.runExclusive(existing.id, async (s) => {
          const page = s.client.getBrowserClient()?.getPage();
          if (page && typeof args.timeout_ms === "number") page.setDefaultTimeout(args.timeout_ms);
          try {
            const ok = await s.client.login(args.username, args.password, args.orgao);
            return { session_id: s.id, logged_in: ok, baseUrl: s.baseUrl };
          } finally {
            if (page) page.setDefaultTimeout(s.defaultTimeoutMs);
          }
        });
      }
    }
    const session = await this.createSession({
      baseUrl: args.url,
      username: args.username,
      password: args.password,
      orgao: args.orgao,
      timeoutMs: typeof args.timeout_ms === "number" ? args.timeout_ms : void 0
    });
    return this.runExclusive(session.id, async (s) => {
      const ok = await s.client.login(args.username, args.password, args.orgao);
      return { session_id: s.id, logged_in: ok, baseUrl: s.baseUrl };
    });
  }
  async executeTool(name, args, sessionId) {
    if (name === "sei_login") {
      return this.login({
        url: args.url,
        username: args.username,
        password: args.password,
        orgao: args.orgao,
        session_id: sessionId,
        timeout_ms: args.timeout_ms
      });
    }
    const s = this.getSession(sessionId);
    if (!s) {
      throw new Error("Nenhuma sess\xE3o Playwright ativa. Chame sei_login primeiro (com url/usu\xE1rio/senha).");
    }
    const timeoutMs = typeof args.timeout_ms === "number" && Number.isFinite(args.timeout_ms) ? Math.max(0, args.timeout_ms) : void 0;
    return this.runExclusive(s.id, async (session) => {
      const browserClient = session.client.getBrowserClient();
      const page = browserClient?.getPage();
      if (page && timeoutMs !== void 0) page.setDefaultTimeout(timeoutMs);
      try {
        switch (name) {
          // === AUTENTICAÇÃO ===
          case "sei_login": {
            const url = args.url;
            const username = args.username;
            const password = args.password;
            const orgao = args.orgao;
            return this.login({ url, username, password, orgao, session_id: sessionId, timeout_ms: timeoutMs });
          }
          case "sei_logout": {
            await session.client.logout();
            return { success: true };
          }
          case "sei_get_session": {
            const loggedIn = await session.client.isLoggedIn();
            return {
              session_id: session.id,
              baseUrl: session.baseUrl,
              logged_in: loggedIn,
              cdpEndpoint: session.client.getCdpEndpoint()
            };
          }
          // === PROCESSOS ===
          case "sei_search_process": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const query = args.query;
            const type = args.type ?? "numero";
            const limit = args.limit ?? 20;
            const mappedType = type === "texto" ? "texto" : type === "interessado" ? "interessado" : "numero";
            const results = await browserClient.searchProcessos(query, mappedType, limit);
            return { results, total: results.length };
          }
          case "sei_open_process": {
            const processNumber = args.process_number;
            const ok = await session.client.openProcess(processNumber);
            return { success: ok, process_number: processNumber, url: session.client.getBrowserClient()?.getPage().url() };
          }
          case "sei_create_process": {
            const options = {
              tipoProcedimento: args.tipo_processo,
              especificacao: args.especificacao,
              assuntos: args.assuntos ?? [],
              interessados: args.interessados ?? void 0,
              observacao: args.observacao,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal
            };
            const result = await session.client.createProcess(options);
            return result;
          }
          case "sei_get_status": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const processNumber = args.process_number;
            const includeHistory = args.include_history ?? true;
            const includeDocuments = args.include_documents ?? true;
            const details = await browserClient.getProcessDetails(processNumber);
            const andamentos = includeHistory ? await session.client.listAndamentos(processNumber) : [];
            const documents = includeDocuments ? await (async () => {
              await session.client.openProcess(processNumber);
              return session.client.listDocuments();
            })() : [];
            return { process: details, andamentos, documents };
          }
          case "sei_forward_process": {
            const processNumber = args.process_number;
            const options = {
              unidadesDestino: [args.target_unit],
              manterAberto: args.keep_open ?? false,
              diasRetornoProgramado: args.deadline
              // note/urgente etc não mapeados diretamente na lib (browser ignora)
            };
            const ok = await session.client.forwardProcess(processNumber, options);
            return { success: ok };
          }
          case "sei_conclude_process": {
            const ok = await session.client.concludeProcess(args.process_number);
            return { success: ok };
          }
          case "sei_reopen_process": {
            const ok = await session.client.reopenProcess(args.process_number);
            return { success: ok };
          }
          case "sei_relate_processes": {
            const main = args.process_number;
            const related = args.related_process;
            const tipo = args.tipo_relacao ?? "relacionamento";
            if (tipo === "anexacao") {
              const ok2 = await session.client.anexarProcesso(main, related);
              return { success: ok2 };
            }
            const ok = await session.client.relacionarProcesso(main, related);
            return { success: ok };
          }
          // === DOCUMENTOS ===
          case "sei_list_documents": {
            const processNumber = args.process_number;
            await session.client.openProcess(processNumber);
            const docs = await session.client.listDocuments();
            return { process_number: processNumber, documents: docs };
          }
          case "sei_get_document": {
            const docId = args.document_id;
            const doc = await session.client.getDocumentDetails(docId);
            return { document: doc };
          }
          case "sei_create_document": {
            const processNumber = args.process_number;
            const options = {
              tipo: "G",
              idSerie: args.document_type,
              descricao: args.descricao ?? args.description,
              numero: args.numero,
              interessados: args.interessados,
              destinatarios: args.destinatarios,
              observacao: args.observacoes,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal,
              conteudoHtml: args.content
            };
            const id = await session.client.createDocument(processNumber, options);
            return { document_id: id };
          }
          case "sei_upload_document": {
            const processNumber = args.process_number;
            const filePath = args.file_path;
            const fileName = args.file_name ?? path.basename(filePath);
            const content = await readFile(filePath);
            const base64 = content.toString("base64");
            const options = {
              tipo: "R",
              idSerie: args.document_type,
              descricao: args.description,
              numero: args.numero,
              observacao: args.observacao,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal
            };
            const id = await session.client.uploadDocument(processNumber, fileName, base64, options);
            return { document_id: id };
          }
          case "sei_upload_document_base64": {
            const processNumber = args.process_number;
            const fileName = args.file_name;
            const base64 = args.file_content_base64;
            const options = {
              tipo: "R",
              idSerie: args.document_type,
              descricao: args.description,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal
            };
            const id = await session.client.uploadDocument(processNumber, fileName, base64, options);
            return { document_id: id };
          }
          case "sei_sign_document": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const docId = args.document_id;
            const senha = args.password;
            const cargo = args.cargo;
            await browserClient.navigate(`/sei/controlador.php?acao=documento_assinar&id_documento=${encodeURIComponent(docId)}`);
            const ok = await session.client.signDocument(senha, cargo);
            return { success: ok };
          }
          case "sei_sign_multiple": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const ids = args.document_ids;
            const senha = args.password;
            const cargo = args.cargo;
            const results = [];
            for (const docId of ids) {
              try {
                await browserClient.navigate(`/sei/controlador.php?acao=documento_assinar&id_documento=${encodeURIComponent(docId)}`);
                const ok = await session.client.signDocument(senha, cargo);
                results.push({ document_id: docId, success: ok });
              } catch (err) {
                results.push({ document_id: docId, success: false, error: err instanceof Error ? err.message : String(err) });
              }
            }
            return { results };
          }
          case "sei_cancel_document": {
            const ok = await session.client.cancelDocument(args.document_id, args.motivo);
            return { success: ok };
          }
          // === DOWNLOAD ===
          case "sei_download_process": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const processNumber = args.process_number;
            const outputPath = args.output_path;
            const includeAttachments = args.include_attachments ?? true;
            const result = await browserClient.downloadProcess(processNumber, includeAttachments, outputPath);
            return result;
          }
          case "sei_download_document": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const docId = args.document_id;
            const outputPath = args.output_path;
            return browserClient.downloadDocument(docId, outputPath);
          }
          // === ANOTAÇÕES ===
          case "sei_list_annotations": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            return browserClient.listAnnotations();
          }
          case "sei_add_annotation": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.addAnnotation(args.text, args.prioridade ?? "normal");
            return { success: ok };
          }
          // === BLOCOS ===
          case "sei_list_blocks": {
            const blocks = await session.client.listBlocos();
            const tipo = args.tipo;
            if (!tipo) return { blocks };
            return { blocks: blocks.filter((b) => b.descricao.toLowerCase().includes(tipo.toLowerCase())) };
          }
          case "sei_create_block": {
            const tipo = args.tipo;
            const id = await session.client.createBloco(
              args.descricao,
              tipo,
              args.unidades_disponibilizacao,
              args.documentos
            );
            return { block_id: id };
          }
          case "sei_get_block": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const bloco = await browserClient.getBloco(args.block_id);
            return { block: bloco };
          }
          case "sei_add_to_block": {
            const idBloco = args.block_id;
            const documentId = args.document_id ?? null;
            const processNumber = args.process_number ?? null;
            if (!documentId && !processNumber) throw new Error("document_id ou process_number \xE9 obrigat\xF3rio");
            if (!documentId) throw new Error("Para bloco, forne\xE7a document_id (ID do documento).");
            const ok = await session.client.addDocumentoToBloco(idBloco, documentId);
            return { success: ok };
          }
          case "sei_remove_from_block": {
            const ok = await session.client.removeDocumentoFromBloco(args.block_id, args.document_id);
            return { success: ok };
          }
          case "sei_release_block": {
            const ok = await session.client.disponibilizarBloco(args.block_id);
            return { success: ok };
          }
          case "sei_sign_block": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const ok = await browserClient.signBloco(args.block_id, args.password);
            return { success: ok };
          }
          // === MARCADORES ===
          case "sei_list_marcadores": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            return browserClient.listMarcadores();
          }
          case "sei_add_marker": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.addMarker(args.marker, args.text);
            return { success: ok };
          }
          case "sei_remove_marker": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.removeMarker(args.marker);
            return { success: ok };
          }
          // === PRAZOS ===
          case "sei_set_deadline": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.setDeadline(args.days, args.tipo ?? "util");
            return { success: ok };
          }
          // === CIÊNCIA / PUBLICAÇÃO ===
          case "sei_register_knowledge": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await browserClient.navigate(`/sei/controlador.php?acao=documento_visualizar&id_documento=${encodeURIComponent(args.document_id)}`);
            const ok = await browserClient.registerKnowledge();
            return { success: ok };
          }
          case "sei_schedule_publication": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const docId = args.document_id;
            const ok = await browserClient.schedulePublication(docId, {
              veiculo: args.veiculo,
              dataPublicacao: args.data_publicacao,
              resumo: args.resumo
            });
            return { success: ok };
          }
          // === LISTAGENS ===
          case "sei_list_document_types": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const list = await browserClient.listDocumentTypes();
            const filter = args.filter?.toLowerCase();
            return filter ? list.filter((i) => i.nome.toLowerCase().includes(filter)) : list;
          }
          case "sei_list_process_types": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const list = await browserClient.listProcessTypes();
            const filter = args.filter?.toLowerCase();
            return filter ? list.filter((i) => i.nome.toLowerCase().includes(filter)) : list;
          }
          case "sei_list_units": {
            const units = await session.client.listUnits();
            const filter = args.filter?.toLowerCase();
            const mapped = units.map((u) => ({
              id: u.IdUnidade ?? u.id ?? "",
              sigla: u.Sigla ?? u.sigla ?? "",
              descricao: u.Descricao ?? u.descricao ?? ""
            }));
            return filter ? mapped.filter((u) => `${u.sigla} ${u.descricao}`.toLowerCase().includes(filter)) : mapped;
          }
          case "sei_list_users": {
            const users = await session.client.listUsers();
            const filter = args.filter?.toLowerCase();
            const mapped = users.map((u) => ({
              id: u.IdUsuario ?? "",
              sigla: u.Sigla ?? "",
              nome: u.Nome ?? ""
            }));
            return filter ? mapped.filter((u) => `${u.sigla} ${u.nome}`.toLowerCase().includes(filter)) : mapped;
          }
          case "sei_list_hipoteses_legais": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            return browserClient.listHipotesesLegais();
          }
          case "sei_list_my_processes": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const status = args.status ?? "abertos";
            const limit = args.limit ?? 50;
            const page2 = browserClient.getPage();
            const baseUrl = session.baseUrl;
            const scrapeTable = async () => {
              const rows = await page2.getByRole("row").all();
              const out = [];
              for (const row of rows.slice(1)) {
                if (out.length >= limit) break;
                try {
                  const cells = await row.getByRole("cell").all();
                  const link = await cells[0]?.getByRole("link").first();
                  const numero = (await link?.textContent())?.trim() ?? "";
                  const tipo = (await cells[1]?.textContent())?.trim() ?? "";
                  const especificacao = (await cells[2]?.textContent())?.trim() ?? "";
                  if (numero) out.push({ numero, tipo, especificacao });
                } catch {
                }
              }
              return out;
            };
            const recebidos = async () => {
              await page2.goto(`${baseUrl}/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido`);
              await page2.waitForLoadState("networkidle");
              return scrapeTable();
            };
            const gerados = async () => {
              await page2.goto(`${baseUrl}/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_gerado`);
              await page2.waitForLoadState("networkidle");
              return scrapeTable();
            };
            const abertos = async () => browserClient.listMeusProcessos("abertos", limit);
            if (status === "recebidos") return { status, items: await recebidos() };
            if (status === "gerados") return { status, items: await gerados() };
            if (status === "abertos") return { status, items: await abertos() };
            const all = [
              ...await abertos(),
              ...await recebidos(),
              ...await gerados()
            ];
            const uniq = /* @__PURE__ */ new Map();
            for (const item of all) {
              if (!item.numero) continue;
              if (!uniq.has(item.numero)) uniq.set(item.numero, item);
            }
            return { status: "todos", items: Array.from(uniq.values()).slice(0, limit) };
          }
          // === CONTROLE DE ACESSO ===
          case "sei_grant_access": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.grantAccess(args.user, args.tipo ?? "consulta");
            return { success: ok };
          }
          case "sei_revoke_access": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            await session.client.openProcess(args.process_number);
            const ok = await browserClient.revokeAccess(args.user);
            return { success: ok };
          }
          // === VISUALIZAÇÃO / DEBUG ===
          case "sei_screenshot": {
            const fullPage = args.full_page ?? false;
            const b64 = await session.client.screenshot(fullPage);
            const outputPath = args.output_path;
            if (outputPath) {
              const buf = Buffer.from(b64, "base64");
              const { writeFile } = await import("fs/promises");
              await writeFile(outputPath, buf);
              return { output_path: outputPath, bytes: buf.byteLength };
            }
            return { image: b64, mimeType: "image/png" };
          }
          case "sei_snapshot": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const snap = await browserClient.snapshot(args.include_hidden ?? false);
            try {
              return JSON.parse(snap);
            } catch {
              return snap;
            }
          }
          case "sei_get_current_page": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            return { url: browserClient.getPage().url() };
          }
          case "sei_navigate": {
            if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const target = args.target;
            const map = {
              home: "/sei/controlador.php?acao=procedimento_controlar",
              search: "/sei/controlador.php?acao=protocolo_pesquisa_rapida",
              new_process: "/sei/controlador.php?acao=procedimento_gerar",
              signature_block: "/sei/controlador.php?acao=bloco_assinatura_listar",
              received: "/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido",
              generated: "/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_gerado",
              inbox: "/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido",
              control: "/sei/controlador.php?acao=procedimento_controlar"
            };
            const path2 = map[target] ?? target;
            await browserClient.navigate(path2);
            return { success: true, url: browserClient.getPage().url() };
          }
          case "sei_click": {
            if (!page) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const sel = toPlaywrightSelector(args.selector);
            await page.locator(sel).first().click();
            return { success: true };
          }
          case "sei_type": {
            if (!page) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const sel = toPlaywrightSelector(args.selector);
            const text = args.text;
            const clear = args.clear ?? true;
            const loc = page.locator(sel).first();
            if (clear) await loc.fill("");
            await loc.type(text);
            return { success: true };
          }
          case "sei_select": {
            if (!page) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const sel = toPlaywrightSelector(args.selector);
            const value = args.value;
            await page.locator(sel).first().selectOption({ label: value }).catch(async () => {
              await page.locator(sel).first().selectOption(value);
            });
            return { success: true };
          }
          case "sei_wait": {
            if (!page) throw new Error("Browser client n\xE3o dispon\xEDvel");
            const timeout = args.timeout ?? 1e4;
            const selector = args.selector;
            if (!selector) {
              await page.waitForTimeout(timeout);
              return { success: true };
            }
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().waitFor({ timeout });
            return { success: true };
          }
          // === SESSÕES / JANELA (compat) ===
          case "sei_minimize_window": {
            await session.client.minimizeWindow();
            return { success: true };
          }
          case "sei_restore_window": {
            await session.client.restoreWindow();
            return { success: true };
          }
          case "sei_focus_window": {
            await session.client.bringToFront();
            return { success: true };
          }
          case "sei_get_window_state": {
            const bounds = await session.client.getWindowBounds();
            return bounds ? { focused: true, bounds } : null;
          }
          case "sei_set_window_bounds": {
            await session.client.setWindowBounds({
              left: args.left,
              top: args.top,
              width: args.width,
              height: args.height
            });
            return { success: true };
          }
          case "sei_get_connection_status": {
            return {
              driver: "playwright",
              connected: true,
              session_id: session.id,
              cdpEndpoint: session.client.getCdpEndpoint()
            };
          }
          // =====================================================
          // === FERRAMENTAS GENÉRICAS DE PLAYWRIGHT/BROWSER ===
          // =====================================================
          case "browser_close": {
            void this.closeSession(session.id);
            return { success: true, message: "Navegador fechado" };
          }
          case "browser_navigate": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const url = args.url;
            await page.goto(url, { waitUntil: "domcontentloaded" });
            return { success: true, url: page.url(), title: await page.title() };
          }
          case "browser_navigate_back": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            await page.goBack();
            return { success: true, url: page.url() };
          }
          case "browser_click": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const selector = args.selector || args.ref;
            if (!selector) throw new Error("selector ou ref \xE9 obrigat\xF3rio");
            const sel = toPlaywrightSelector(selector);
            const button = args.button ?? "left";
            const doubleClick = args.doubleClick ?? false;
            const modifiers = args.modifiers;
            const loc = page.locator(sel).first();
            if (doubleClick) {
              await loc.dblclick({ button, modifiers });
            } else {
              await loc.click({ button, modifiers });
            }
            return { success: true };
          }
          case "browser_type": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const selector = args.selector || args.ref;
            if (!selector) throw new Error("selector ou ref \xE9 obrigat\xF3rio");
            const sel = toPlaywrightSelector(selector);
            const text = args.text;
            const slowly = args.slowly ?? false;
            const submit = args.submit ?? false;
            const loc = page.locator(sel).first();
            if (slowly) {
              await loc.pressSequentially(text);
            } else {
              await loc.fill(text);
            }
            if (submit) {
              await loc.press("Enter");
            }
            return { success: true };
          }
          case "browser_fill_form": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const fields = args.fields;
            const results = [];
            for (const field of fields) {
              try {
                const selector = field.selector || field.ref;
                if (!selector) {
                  results.push({ name: field.name, success: false, error: "selector ou ref necess\xE1rio" });
                  continue;
                }
                const sel = toPlaywrightSelector(selector);
                const loc = page.locator(sel).first();
                switch (field.type) {
                  case "textbox":
                    await loc.fill(field.value);
                    break;
                  case "checkbox":
                    if (field.value === "true") await loc.check();
                    else await loc.uncheck();
                    break;
                  case "radio":
                    await loc.check();
                    break;
                  case "combobox":
                    await loc.selectOption({ label: field.value }).catch(() => loc.selectOption(field.value));
                    break;
                  case "slider":
                    await loc.fill(field.value);
                    break;
                }
                results.push({ name: field.name, success: true });
              } catch (err) {
                results.push({ name: field.name, success: false, error: err instanceof Error ? err.message : String(err) });
              }
            }
            return { results };
          }
          case "browser_select_option": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const selector = args.selector || args.ref;
            if (!selector) throw new Error("selector ou ref \xE9 obrigat\xF3rio");
            const values = args.values;
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().selectOption(values);
            return { success: true };
          }
          case "browser_hover": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const selector = args.selector || args.ref;
            if (!selector) throw new Error("selector ou ref \xE9 obrigat\xF3rio");
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().hover();
            return { success: true };
          }
          case "browser_drag": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const startSelector = args.startSelector || args.startRef;
            const endSelector = args.endSelector || args.endRef;
            if (!startSelector || !endSelector) throw new Error("startSelector e endSelector s\xE3o obrigat\xF3rios");
            const startSel = toPlaywrightSelector(startSelector);
            const endSel = toPlaywrightSelector(endSelector);
            await page.locator(startSel).first().dragTo(page.locator(endSel).first());
            return { success: true };
          }
          case "browser_press_key": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const key = args.key;
            await page.keyboard.press(key);
            return { success: true };
          }
          case "browser_snapshot": {
            if (!browserClient) throw new Error("Browser n\xE3o dispon\xEDvel");
            const snap = await browserClient.snapshot(false);
            const filename = args.filename;
            if (filename) {
              const { writeFile } = await import("fs/promises");
              await writeFile(filename, snap);
              return { saved: filename };
            }
            try {
              return JSON.parse(snap);
            } catch {
              return { snapshot: snap };
            }
          }
          case "browser_take_screenshot": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const type = args.type ?? "png";
            const fullPage = args.fullPage ?? false;
            const filename = args.filename;
            const selector = args.selector || args.ref;
            let buffer;
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              buffer = await page.locator(sel).first().screenshot({ type });
            } else {
              buffer = await page.screenshot({ type, fullPage });
            }
            if (filename) {
              const { writeFile } = await import("fs/promises");
              await writeFile(filename, buffer);
              return { saved: filename, bytes: buffer.byteLength };
            }
            return { image: buffer.toString("base64"), mimeType: `image/${type}` };
          }
          case "browser_resize": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const width = args.width;
            const height = args.height;
            await page.setViewportSize({ width, height });
            return { success: true, width, height };
          }
          case "browser_handle_dialog": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const accept = args.accept;
            const promptText = args.promptText;
            page.once("dialog", async (dialog) => {
              if (accept) {
                await dialog.accept(promptText);
              } else {
                await dialog.dismiss();
              }
            });
            return { success: true, message: "Handler configurado para pr\xF3ximo di\xE1logo" };
          }
          case "browser_evaluate": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const fn = args.function;
            const selector = args.selector || args.ref;
            let result;
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              const element = page.locator(sel).first();
              result = await element.evaluate(new Function("return " + fn)());
            } else {
              result = await page.evaluate(new Function("return " + fn)());
            }
            return { result };
          }
          case "browser_file_upload": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const paths = args.paths;
            const fileChooserPromise = page.waitForEvent("filechooser");
            if (paths && paths.length > 0) {
              page.once("filechooser", async (fileChooser) => {
                await fileChooser.setFiles(paths);
              });
              return { success: true, message: `Handler configurado para upload de ${paths.length} arquivo(s)` };
            } else {
              page.once("filechooser", async (fileChooser) => {
                await fileChooser.setFiles([]);
              });
              return { success: true, message: "File chooser ser\xE1 cancelado" };
            }
          }
          case "browser_tabs": {
            if (!browserClient) throw new Error("Browser n\xE3o dispon\xEDvel");
            const action = args.action;
            const index = args.index;
            const context = page?.context();
            if (!context) throw new Error("Browser context n\xE3o dispon\xEDvel");
            switch (action) {
              case "list": {
                const pages = context.pages();
                return {
                  tabs: pages.map((p, i) => ({
                    index: i,
                    url: p.url(),
                    title: p.url()
                    // title seria async, simplificamos
                  })),
                  current: pages.indexOf(page)
                };
              }
              case "new": {
                const newPage = await context.newPage();
                return { success: true, index: context.pages().indexOf(newPage) };
              }
              case "close": {
                const pages = context.pages();
                const targetIndex = index ?? pages.indexOf(page);
                if (targetIndex >= 0 && targetIndex < pages.length) {
                  await pages[targetIndex].close();
                }
                return { success: true };
              }
              case "select": {
                if (index === void 0) throw new Error("index \xE9 obrigat\xF3rio para select");
                const pages = context.pages();
                if (index >= 0 && index < pages.length) {
                  await pages[index].bringToFront();
                }
                return { success: true };
              }
            }
            break;
          }
          case "browser_console_messages": {
            return {
              message: "Para capturar mensagens do console, configure um listener antes de navegar.",
              example: "page.on('console', msg => console.log(msg.text()))"
            };
          }
          case "browser_network_requests": {
            return {
              message: "Para capturar requisi\xE7\xF5es de rede, configure um listener antes de navegar.",
              example: "page.on('request', req => console.log(req.url()))"
            };
          }
          case "browser_wait_for": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const text = args.text;
            const textGone = args.textGone;
            const time = args.time;
            const selector = args.selector;
            if (time !== void 0) {
              await page.waitForTimeout(time * 1e3);
              return { success: true, waited: `${time}s` };
            }
            if (text) {
              await page.getByText(text).first().waitFor({ state: "visible" });
              return { success: true, found: text };
            }
            if (textGone) {
              await page.getByText(textGone).first().waitFor({ state: "hidden" });
              return { success: true, gone: textGone };
            }
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              await page.locator(sel).first().waitFor();
              return { success: true, found: selector };
            }
            return { success: true };
          }
          case "browser_run_code": {
            if (!page) throw new Error("Browser n\xE3o dispon\xEDvel");
            const code = args.code;
            const fn = new Function("page", `return (async () => { ${code} })()`);
            const result = await fn(page);
            return { result };
          }
          default:
            throw new Error(`Ferramenta n\xE3o suportada no driver Playwright: ${name}`);
        }
      } finally {
        if (page && timeoutMs !== void 0) page.setDefaultTimeout(session.defaultTimeoutMs);
      }
    });
  }
};

// src/http/auth.ts
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64urlDecode(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}
function signHmacSha256(data, secret) {
  return base64url(createHmac("sha256", secret).update(data).digest());
}
function parseCookies(header) {
  if (!header) return {};
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}
function setCookie(res, name, value, opts) {
  const parts = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Path=${opts?.path ?? "/"}`);
  if (opts?.httpOnly !== false) parts.push("HttpOnly");
  if (opts?.secure) parts.push("Secure");
  parts.push(`SameSite=${opts?.sameSite ?? "Lax"}`);
  if (typeof opts?.maxAgeSeconds === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", parts.join("; "));
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, parts.join("; ")]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), parts.join("; ")]);
  }
}
function clearCookie(res, name) {
  setCookie(res, name, "", { maxAgeSeconds: 0 });
}
function createJwt(payload, secret, ttlSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(body));
  const sig = signHmacSha256(`${h}.${p}`, secret);
  return `${h}.${p}.${sig}`;
}
function verifyJwt(token, secret) {
  const parts = token.split(".");
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
    const payload = JSON.parse(base64urlDecode(p).toString("utf8"));
    const exp = payload.exp;
    if (typeof exp === "number" && Math.floor(Date.now() / 1e3) > exp) return null;
    return payload;
  } catch {
    return null;
  }
}
function getAuthUser(req) {
  const expectedToken = process.env.SEI_MCP_BEARER_TOKEN;
  const auth = req.headers.authorization;
  if (expectedToken && auth?.startsWith("Bearer ")) {
    const token2 = auth.slice("Bearer ".length).trim();
    if (token2 && token2 === expectedToken) return { type: "token" };
  }
  const jwtSecret = process.env.SEI_MCP_JWT_SECRET;
  if (!jwtSecret) return null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.sei_mcp_token;
  if (!token) return null;
  const payload = verifyJwt(token, jwtSecret);
  if (!payload) return null;
  const email = payload.email;
  if (typeof email !== "string" || !email) return null;
  return {
    type: "google",
    email,
    name: typeof payload.name === "string" ? payload.name : void 0,
    picture: typeof payload.picture === "string" ? payload.picture : void 0,
    sub: typeof payload.sub === "string" ? payload.sub : void 0
  };
}
function parseBearerToken(authorization) {
  if (!authorization) return null;
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token ? token : null;
}
function requireAuth(req, res) {
  const require2 = (process.env.SEI_MCP_REQUIRE_AUTH ?? "true").toLowerCase() !== "false";
  if (!require2) return { type: "token" };
  const user = getAuthUser(req);
  if (user) return user;
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    error: "Unauthorized",
    hint: "Use Authorization: Bearer <token> (SEI_MCP_BEARER_TOKEN) or login via /auth/google/start"
  }));
  return null;
}
function newOauthState() {
  return base64url(randomBytes(24));
}
var LICENSING_API_URL = process.env.SEI_MCP_LICENSING_API_URL || "https://sei-tribunais-licensing-api.onrender.com/api/v1";
async function validateTokenWithLicensing(token) {
  try {
    const response = await fetch(`${LICENSING_API_URL}/auth/api-token/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.valid || !data.email) return null;
    return { email: data.email, userId: data.user_id };
  } catch {
    return null;
  }
}
async function recordUsageWithLicensing(token, operationType) {
  try {
    const response = await fetch(`${LICENSING_API_URL}/usage/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        product: "sei-mcp",
        operation_type: operationType,
        count: 1
      })
    });
    if (!response.ok) {
      return {
        allowed: false,
        remaining: 0,
        usedToday: 0,
        unlimited: false,
        reason: "Erro ao verificar licen\xE7a"
      };
    }
    const data = await response.json();
    return {
      allowed: data.allowed,
      remaining: data.remaining,
      usedToday: data.used_today,
      limit: data.limit,
      unlimited: data.unlimited,
      reason: data.reason
    };
  } catch {
    return {
      allowed: false,
      remaining: 0,
      usedToday: 0,
      unlimited: false,
      reason: "Erro de conex\xE3o com servidor de licenciamento"
    };
  }
}
async function requireMcpAuth(req, res) {
  const require2 = (process.env.SEI_MCP_REQUIRE_AUTH ?? "true").toLowerCase() !== "false";
  if (!require2) return { kind: "admin", authToken: null };
  const incomingToken = parseBearerToken(req.headers.authorization);
  if (!incomingToken) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Unauthorized",
      hint: "Use Authorization: Bearer <api_token> (gerado no licensing / extens\xE3o) ou um token admin (SEI_MCP_BEARER_TOKEN)."
    }));
    return null;
  }
  const expectedToken = process.env.SEI_MCP_BEARER_TOKEN;
  if (expectedToken && incomingToken === expectedToken) {
    return { kind: "admin", authToken: incomingToken };
  }
  const user = await validateTokenWithLicensing(incomingToken);
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Unauthorized",
      hint: "API token inv\xE1lido/expirado. Gere um novo token na extens\xE3o (ou no licensing) e tente novamente."
    }));
    return null;
  }
  return {
    kind: "license",
    authToken: incomingToken,
    token: incomingToken,
    email: user.email,
    userId: user.userId
  };
}

// src/http/stripe.ts
function formEncode(obj) {
  const pairs = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null) continue;
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return pairs.join("&");
}
async function stripeRequest(method, path2, params) {
  const secretKey = process.env.SEI_MCP_STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE n\xE3o configurado: defina SEI_MCP_STRIPE_SECRET_KEY");
  const url = method === "GET" && params ? `https://api.stripe.com${path2}?${formEncode(params)}` : `https://api.stripe.com${path2}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      ...method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
    },
    body: method === "POST" ? formEncode(params ?? {}) : void 0
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json && typeof json === "object" && "error" in json ? json.error?.message : void 0;
    throw new Error(msg || `Stripe error (${res.status})`);
  }
  return json;
}
async function createCheckoutSession(params) {
  const priceStarter = process.env.SEI_MCP_STRIPE_PRICE_STARTER_MONTHLY;
  const pricePro = process.env.SEI_MCP_STRIPE_PRICE_PRO_MONTHLY;
  const price = params.plan === "starter" ? priceStarter : pricePro;
  if (!price) throw new Error(`Price ID n\xE3o configurado para ${params.plan} (env SEI_MCP_STRIPE_PRICE_...)`);
  const successUrl = process.env.SEI_MCP_STRIPE_SUCCESS_URL || `${params.baseUrl}/pricing?success=1`;
  const cancelUrl = process.env.SEI_MCP_STRIPE_CANCEL_URL || `${params.baseUrl}/pricing?canceled=1`;
  const session = await stripeRequest("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: params.customerEmail,
    "line_items[0][price]": price,
    "line_items[0][quantity]": 1,
    allow_promotion_codes: true
  });
  if (!session.url) throw new Error("Stripe n\xE3o retornou URL do checkout");
  return { url: session.url };
}
async function createPortalSession(params) {
  const list = await stripeRequest("GET", "/v1/customers", {
    email: params.customerEmail,
    limit: 1
  });
  const customerId = list.data?.[0]?.id;
  if (!customerId) throw new Error("Nenhum cliente Stripe encontrado para este email");
  const portal = await stripeRequest("POST", "/v1/billing_portal/sessions", {
    customer: customerId,
    return_url: params.returnUrl
  });
  if (!portal.url) throw new Error("Stripe n\xE3o retornou URL do portal");
  return { url: portal.url };
}
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// src/http/pages.ts
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function renderPricingPage(params) {
  const { user, baseUrl, query } = params;
  const loggedIn = user && user.type === "google";
  const email = loggedIn ? user.email : null;
  const name = loggedIn ? user.name ?? user.email : null;
  const success = query.get("success") === "1";
  const canceled = query.get("canceled") === "1";
  const notice = success ? '<div class="notice ok">Pagamento conclu\xEDdo. Voc\xEA j\xE1 pode voltar ao Claude/MCP.</div>' : canceled ? '<div class="notice warn">Checkout cancelado.</div>' : "";
  const authBlock = loggedIn ? `<div class="auth">Logado como <strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) \xB7 <a href="/logout">Sair</a></div>` : `<div class="auth"><a class="btn" href="/auth/google/start">Entrar com Google</a></div>`;
  const actions = loggedIn ? `
      <div class="actions">
        <form method="POST" action="/checkout/create">
          <input type="hidden" name="plan" value="starter" />
          <button class="btn primary" type="submit">Assinar Starter</button>
        </form>
        <form method="POST" action="/checkout/create">
          <input type="hidden" name="plan" value="pro" />
          <button class="btn primary" type="submit">Assinar Pro</button>
        </form>
        <form method="POST" action="/portal/create">
          <button class="btn" type="submit">Gerenciar assinatura</button>
        </form>
      </div>
    ` : `
      <div class="actions">
        <div class="hint">Fa\xE7a login para assinar e gerenciar cobran\xE7a.</div>
      </div>
    `;
  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>SEI-MCP \xB7 Planos</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background: #0b1220; color: #e5e7eb; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 28px 16px; }
    .card { background: #0f172a; border: 1px solid rgba(148,163,184,.2); border-radius: 14px; padding: 18px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .sub { color: #94a3b8; margin-bottom: 16px; }
    .auth { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin: 12px 0 18px; color: #cbd5e1; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .auth { flex-direction: column; align-items: flex-start; } }
    .plan { background: rgba(15,23,42,.6); border: 1px solid rgba(148,163,184,.2); border-radius: 14px; padding: 14px; }
    .name { font-weight: 700; font-size: 16px; }
    .price { margin-top: 6px; font-size: 22px; font-weight: 800; }
    .muted { color: #94a3b8; font-size: 12px; margin-top: 6px; }
    .btn { display: inline-block; border: 1px solid rgba(148,163,184,.35); background: rgba(2,6,23,.35); color: #e5e7eb; border-radius: 10px; padding: 10px 12px; cursor: pointer; text-decoration: none; }
    .btn.primary { background: #2563eb; border-color: #2563eb; }
    .actions { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
    form { margin: 0; }
    .hint { color: #94a3b8; font-size: 12px; }
    .notice { margin: 12px 0; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(148,163,184,.2); }
    .notice.ok { background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.3); }
    .notice.warn { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.3); }
    code { background: rgba(2,6,23,.5); padding: 2px 6px; border-radius: 8px; }
    .footer { margin-top: 16px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>SEI\u2011MCP \xB7 Planos</h1>
      <div class="sub">Cobran\xE7a via Stripe. Depois de assinar, volte ao Claude e use o MCP via HTTP.</div>
      ${notice}
      ${authBlock}

      <div class="grid">
        <div class="plan">
          <div class="name">Starter</div>
          <div class="price">R$ 29,90<span style="font-size:12px; font-weight:600; color:#94a3b8"> / m\xEAs</span></div>
          <div class="muted">Uso moderado \xB7 Ideal para 1 usu\xE1rio</div>
        </div>
        <div class="plan">
          <div class="name">Pro</div>
          <div class="price">R$ 49,90<span style="font-size:12px; font-weight:600; color:#94a3b8"> / m\xEAs</span></div>
          <div class="muted">Ilimitado \xB7 Melhor para uso intenso</div>
        </div>
      </div>

      ${actions}

      <div class="footer">
        Dica: para proteger o MCP, configure <code>SEI_MCP_BEARER_TOKEN</code> ou use login Google.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// src/http-server.ts
var HTTP_PORT = parseInt(process.env.PORT || process.env.SEI_MCP_HTTP_PORT || "3100", 10);
var WS_PORT = parseInt(process.env.SEI_MCP_WS_PORT || "19999", 10);
var DRIVER_ENV = (process.env.SEI_MCP_DRIVER || "both").toLowerCase();
var DRIVER = DRIVER_ENV === "playwright" ? "playwright" : DRIVER_ENV === "extension" ? "extension" : "both";
var ALLOWED_ORIGINS = [
  "chrome-extension://",
  // Qualquer extensão Chrome
  "http://localhost",
  "http://127.0.0.1"
];
function isOriginAllowed(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
}
function setCorsHeaders(res, origin) {
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}
function getPublicBaseUrl() {
  const env = process.env.SEI_MCP_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return `http://localhost:${HTTP_PORT}`;
}
async function readBodyText(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
async function readFormBody(req) {
  const text = await readBodyText(req);
  const params = new URLSearchParams(text);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}
async function exchangeGoogleCode(code, redirectUri) {
  const clientId = process.env.SEI_MCP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SEI_MCP_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth n\xE3o configurado (SEI_MCP_GOOGLE_CLIENT_ID/SECRET)");
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  return res.json();
}
async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Google userinfo failed (${res.status})`);
  return res.json();
}
async function runHttpServer() {
  const wsServer = new SeiWebSocketServer(WS_PORT);
  if (DRIVER === "both" || DRIVER === "extension") {
    await wsServer.start();
    logger.info(`WebSocket server started on port ${WS_PORT} for Chrome extension connections`);
  }
  const pwManager = new SeiPlaywrightManager();
  if (DRIVER === "both" || DRIVER === "playwright") {
    logger.info("Playwright driver enabled for direct browser automation");
  }
  const transports = /* @__PURE__ */ new Map();
  const sessionAuth = /* @__PURE__ */ new Map();
  const httpServer = createHttpServer(async (req, res) => {
    const origin = req.headers.origin;
    setCorsHeaders(res, origin);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", `http://localhost:${HTTP_PORT}`);
    const publicBaseUrl = getPublicBaseUrl();
    if (url.pathname === "/pricing" && req.method === "GET") {
      const user = getAuthUser(req);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderPricingPage({ baseUrl: publicBaseUrl, user, query: url.searchParams }));
      return;
    }
    if (url.pathname === "/logout" && req.method === "GET") {
      clearCookie(res, "sei_mcp_token");
      clearCookie(res, "sei_mcp_oauth_state");
      res.writeHead(302, { Location: "/pricing" });
      res.end();
      return;
    }
    if (url.pathname === "/auth/google/start" && req.method === "GET") {
      const clientId = process.env.SEI_MCP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Google OAuth n\xE3o configurado (SEI_MCP_GOOGLE_CLIENT_ID)" }));
        return;
      }
      const state = newOauthState();
      setCookie(res, "sei_mcp_oauth_state", state, { httpOnly: true, sameSite: "Lax" });
      const redirectUri = `${publicBaseUrl}/auth/google/callback`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("prompt", "select_account");
      authUrl.searchParams.set("state", state);
      res.writeHead(302, { Location: authUrl.toString() });
      res.end();
      return;
    }
    if (url.pathname === "/auth/google/callback" && req.method === "GET") {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const storedState = cookies.sei_mcp_oauth_state;
        const state = url.searchParams.get("state") || "";
        if (!storedState || storedState !== state) throw new Error("OAuth state inv\xE1lido");
        const code = url.searchParams.get("code");
        if (!code) throw new Error("C\xF3digo OAuth ausente");
        const redirectUri = `${publicBaseUrl}/auth/google/callback`;
        const token = await exchangeGoogleCode(code, redirectUri);
        const userInfo = await fetchGoogleUserInfo(token.access_token);
        const email = userInfo.email;
        if (!email) throw new Error("Google n\xE3o retornou email");
        const jwtSecret = process.env.SEI_MCP_JWT_SECRET;
        if (!jwtSecret) throw new Error("Defina SEI_MCP_JWT_SECRET para usar OAuth no servidor");
        const jwt = createJwt(
          { email, name: userInfo.name, picture: userInfo.picture, sub: userInfo.id },
          jwtSecret,
          60 * 60 * 24 * 30
          // 30 dias
        );
        setCookie(res, "sei_mcp_token", jwt, { httpOnly: true, sameSite: "Lax" });
        clearCookie(res, "sei_mcp_oauth_state");
        res.writeHead(302, { Location: "/pricing?success=1" });
        res.end();
        return;
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        return;
      }
    }
    if (url.pathname === "/checkout/create" && req.method === "POST") {
      const user = requireAuth(req, res);
      if (!user || user.type !== "google") return;
      const contentType = req.headers["content-type"] || "";
      const body = contentType.includes("application/json") ? await readJsonBody(req) : await readFormBody(req);
      const plan = body.plan ?? "starter";
      try {
        const session = await createCheckoutSession({ plan, customerEmail: user.email, baseUrl: publicBaseUrl });
        res.writeHead(303, { Location: session.url });
        res.end();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }
    if (url.pathname === "/portal/create" && req.method === "POST") {
      const user = requireAuth(req, res);
      if (!user || user.type !== "google") return;
      try {
        const session = await createPortalSession({ customerEmail: user.email, returnUrl: `${publicBaseUrl}/pricing` });
        res.writeHead(303, { Location: session.url });
        res.end();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }
    if (url.pathname === "/health" || url.pathname === "/") {
      const extensionConnections = DRIVER === "both" || DRIVER === "extension" ? wsServer.getConnectedCount() : 0;
      const playwrightSessions = DRIVER === "both" || DRIVER === "playwright" ? pwManager.getConnectedCount() : 0;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        name: "sei-mcp",
        version: "1.0.0",
        mode: "http",
        driver: DRIVER,
        drivers: {
          extension: {
            enabled: DRIVER === "both" || DRIVER === "extension",
            wsPort: WS_PORT,
            connections: extensionConnections
          },
          playwright: {
            enabled: DRIVER === "both" || DRIVER === "playwright",
            sessions: playwrightSessions
          }
        },
        tools: toolCount,
        totalConnections: extensionConnections + playwrightSessions
      }));
      return;
    }
    if (url.pathname === "/mcp") {
      let sessionId = req.headers["mcp-session-id"];
      let transport = sessionId ? transports.get(sessionId) : void 0;
      const existingAuth = sessionId ? sessionAuth.get(sessionId) : void 0;
      if (existingAuth?.authToken) {
        const incoming = parseBearerToken(req.headers.authorization);
        if (!incoming || incoming !== existingAuth.authToken) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized", hint: "Envie o mesmo Bearer token em todas as chamadas desta sess\xE3o." }));
          return;
        }
      }
      if (req.method === "POST" && !transport) {
        const mcpAuth = await requireMcpAuth(req, res);
        if (!mcpAuth) return;
        sessionId = randomUUID4();
        logger.info(`New MCP session: ${sessionId}`);
        sessionAuth.set(sessionId, mcpAuth);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId
        });
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
          logger.debug(`ListTools request (session: ${sessionId})`);
          return { tools: allTools };
        });
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          const { name, arguments: args } = request.params;
          logger.debug(`CallTool request: ${name} (session: ${sessionId})`);
          const ctx = sessionAuth.get(sessionId);
          if (ctx?.kind === "license") {
            const usage = await recordUsageWithLicensing(ctx.token, name);
            if (!usage.allowed) {
              return {
                content: [{
                  type: "text",
                  text: usage.reason || "Limite de uso excedido. Atualize seu plano ou tente amanh\xE3."
                }],
                isError: true
              };
            }
          }
          const result = await handleTool(name, args || {}, wsServer, pwManager, DRIVER);
          return {
            content: result.content,
            isError: result.isError
          };
        });
        server.onerror = (error) => {
          logger.error(`MCP Server error (session: ${sessionId})`, error);
        };
        await server.connect(transport);
        transports.set(sessionId, transport);
        transport.onclose = () => {
          logger.info(`MCP session closed: ${sessionId}`);
          transports.delete(sessionId);
          sessionAuth.delete(sessionId);
        };
      }
      if (!transport) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found. Send a POST to initialize." }));
        return;
      }
      if (sessionId && !sessionAuth.has(sessionId)) {
        const mcpAuth = await requireMcpAuth(req, res);
        if (!mcpAuth) return;
        sessionAuth.set(sessionId, mcpAuth);
      }
      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        logger.error("Error handling MCP request", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
  const shutdown = () => {
    logger.info("Shutting down HTTP server...");
    wsServer.stop();
    for (const [sessionId, transport] of transports) {
      logger.debug(`Closing transport: ${sessionId}`);
      transport.close();
    }
    transports.clear();
    httpServer.close(() => {
      logger.info("HTTP server stopped");
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  httpServer.listen(HTTP_PORT, () => {
    logger.info("=".repeat(50));
    logger.info("SEI-MCP HTTP Server started");
    logger.info("=".repeat(50));
    logger.info(`MCP endpoint: http://localhost:${HTTP_PORT}/mcp`);
    logger.info(`Health check: http://localhost:${HTTP_PORT}/health`);
    logger.info(`Driver mode: ${DRIVER}`);
    if (DRIVER === "both" || DRIVER === "extension") {
      logger.info(`  - Extension: WebSocket on ws://localhost:${WS_PORT}`);
    }
    if (DRIVER === "both" || DRIVER === "playwright") {
      logger.info(`  - Playwright: Direct browser automation enabled`);
    }
    logger.info(`Pricing: http://localhost:${HTTP_PORT}/pricing`);
    logger.info(`Available tools: ${toolCount}`);
    logger.info("=".repeat(50));
    if (DRIVER === "both" || DRIVER === "extension") {
      logger.info("");
      logger.info("Para conectar a extens\xE3o Chrome:");
      logger.info(`  WebSocket: ws://localhost:${WS_PORT}`);
    }
    logger.info("");
  });
}

export {
  logger,
  SeiWebSocketServer,
  allTools,
  toolCount,
  handleTool,
  SeiPlaywrightManager,
  runHttpServer
};
