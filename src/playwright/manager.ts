import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  SEIClient,
  type SEIClientOptions,
  type CreateDocumentOptions,
  type CreateProcessOptions,
  type ForwardOptions,
  type NivelAcesso,
  type ResilienceConfig,
  type AgentFallbackConfig,
} from 'sei-playwright';

import { logger } from '../utils/logger.js';

// ============================================
// Resilience config from environment
// ============================================
function getResilienceConfig(): ResilienceConfig | undefined {
  const failFastMs = parseInt(process.env.RESILIENCE_FAIL_FAST_MS ?? '', 10);
  if (isNaN(failFastMs) && !process.env.AGENT_FALLBACK_ENABLED) return undefined;
  return {
    failFastTimeout: isNaN(failFastMs) ? 3000 : failFastMs,
    maxRetries: parseInt(process.env.RESILIENCE_MAX_RETRIES ?? '2', 10),
    retryBackoff: parseInt(process.env.RESILIENCE_RETRY_BACKOFF_MS ?? '500', 10),
    speculative: process.env.RESILIENCE_SPECULATIVE === 'true',
  };
}

function getAgentFallbackConfig(): AgentFallbackConfig | undefined {
  if (process.env.AGENT_FALLBACK_ENABLED !== 'true') return undefined;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return undefined;
  return {
    enabled: true,
    apiKey,
    model: process.env.AGENT_FALLBACK_MODEL ?? 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.AGENT_FALLBACK_MAX_TOKENS ?? '1024', 10),
  };
}

type PlaywrightSessionStatus = 'ready' | 'closed' | 'error';

export interface PlaywrightSessionInfo {
  id: string;
  status: PlaywrightSessionStatus;
  baseUrl: string;
  createdAt: Date;
  lastActivity: Date;
  cdpEndpoint?: string | null;
}

interface CacheEntry {
  data: unknown;
  expires: number;
}

interface SessionState {
  id: string;
  status: PlaywrightSessionStatus;
  baseUrl: string;
  client: SEIClient;
  createdAt: Date;
  lastActivity: Date;
  defaultTimeoutMs: number;
  queue: Promise<unknown>;
  currentProcessNumber?: string;
  processCache: Map<string, CacheEntry>;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function nivelAcessoFromLabel(label: unknown): NivelAcesso {
  if (label === 'restrito') return 1;
  if (label === 'sigiloso') return 2;
  return 0;
}

function getCached<T>(session: SessionState, key: string): T | null {
  const entry = session.processCache.get(key);
  if (!entry || entry.expires < Date.now()) {
    if (entry) session.processCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(session: SessionState, key: string, data: unknown, ttlMs = 60000): void {
  session.processCache.set(key, { data, expires: Date.now() + ttlMs });
}

function invalidateProcessCache(session: SessionState, processNumber?: string): void {
  if (!processNumber) {
    session.processCache.clear();
    return;
  }
  for (const key of session.processCache.keys()) {
    if (key.includes(processNumber)) {
      session.processCache.delete(key);
    }
  }
}

async function ensureProcessOpen(session: SessionState, processNumber: string): Promise<void> {
  if (session.currentProcessNumber === processNumber) return;
  await session.client.openProcess(processNumber);
  session.currentProcessNumber = processNumber;
}

function cleanSnapshot(snap: string): string {
  return snap
    // Remover linhas de "Menu cópia protocolo" repetidas
    .replace(/^\s*-\s*link\s+"Menu cópia protocolo".*$/gm, '')
    // Resumir assinaturas longas multi-linha
    .replace(/link "Assinado por: ([^\n]+?)(?:\\n|\n)[^"]*"/g, (_match, first: string) => {
      return `link "Assinado: ${first.trim()}"`;
    })
    // Remover refs de img sem texto (decorativas)
    .replace(/^\s*-\s*img\s+\[ref=\w+\](?:\s*\[cursor=pointer\])?\s*$/gm, '')
    // Limpar linhas vazias consecutivas
    .replace(/\n{3,}/g, '\n\n');
}

function truncateSnapshot(snap: string, maxLength: number): string {
  if (snap.length <= maxLength) return snap;
  const truncated = snap.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');
  return truncated.slice(0, lastNewline > 0 ? lastNewline : maxLength) +
    `\n... [truncado em ${maxLength} chars, total: ${snap.length}]`;
}

function toPlaywrightSelector(selector: string): string {
  const trimmed = selector.trim();
  if (trimmed.startsWith('xpath=') || trimmed.startsWith('css=')) return trimmed;
  if (trimmed.startsWith('//') || trimmed.startsWith('(')) return `xpath=${trimmed}`;
  return trimmed;
}

export class SeiPlaywrightManager {
  private sessions = new Map<string, SessionState>();
  private defaultSessionId: string | null = null;

  private get globalTimeoutMs(): number {
    const raw = process.env.SEI_MCP_COMMAND_TIMEOUT_MS || process.env.SEI_MCP_PW_TIMEOUT_MS || '30000';
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 30000;
  }

  private get headlessDefault(): boolean {
    const raw = process.env.SEI_MCP_PW_HEADLESS;
    if (raw === undefined) return true;
    return raw === '1' || raw.toLowerCase() === 'true';
  }

  private get persistentDefault(): boolean {
    const raw = process.env.SEI_MCP_PW_PERSISTENT;
    if (raw === undefined) return true;
    return raw === '1' || raw.toLowerCase() === 'true';
  }

  private get channelDefault(): string | undefined {
    const raw = process.env.SEI_MCP_PW_CHANNEL;
    return raw ? raw : undefined;
  }

  private defaultUserDataDir(sessionId: string): string {
    return path.join(os.homedir(), '.sei-mcp', 'playwright', 'profiles', sessionId);
  }

  listSessions(): PlaywrightSessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      status: s.status,
      baseUrl: s.baseUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      cdpEndpoint: s.client.getCdpEndpoint(),
    }));
  }

  isConnected(sessionId?: string): boolean {
    if (sessionId) return this.sessions.has(sessionId) && this.sessions.get(sessionId)!.status === 'ready';
    return this.defaultSessionId !== null && this.sessions.get(this.defaultSessionId)?.status === 'ready';
  }

  getConnectedCount(): number {
    let count = 0;
    for (const s of this.sessions.values()) {
      if (s.status === 'ready') count++;
    }
    return count;
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s) return false;
    s.status = 'closed';
    try {
      await s.client.close();
    } catch (err) {
      logger.warn('Failed closing Playwright session', { sessionId, err });
    }
    this.sessions.delete(sessionId);
    if (this.defaultSessionId === sessionId) this.defaultSessionId = null;
    return true;
  }

  switchSession(sessionId: string): boolean {
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== 'ready') return false;
    this.defaultSessionId = sessionId;
    s.lastActivity = new Date();
    return true;
  }

  async getSessionInfo(sessionId?: string): Promise<PlaywrightSessionInfo | null> {
    const s = this.getSession(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      status: s.status,
      baseUrl: s.baseUrl,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      cdpEndpoint: s.client.getCdpEndpoint(),
    };
  }

  private getSession(sessionId?: string): SessionState | null {
    if (sessionId) return this.sessions.get(sessionId) ?? null;
    if (this.defaultSessionId) return this.sessions.get(this.defaultSessionId) ?? null;
    return null;
  }

  private async runExclusive<T>(sessionId: string, fn: (s: SessionState) => Promise<T>): Promise<T> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Sessão não encontrada: ${sessionId}`);
    const next = s.queue.then(async () => {
      s.lastActivity = new Date();
      return fn(s);
    });
    s.queue = next.catch(() => undefined);
    return next;
  }

  private async createSession(options: {
    baseUrl: string;
    username?: string;
    password?: string;
    orgao?: string;
    headless?: boolean;
    persistent?: boolean;
    userDataDir?: string;
    timeoutMs?: number;
  }): Promise<SessionState> {
    const id = `session_${randomUUID().slice(0, 8)}`;
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const now = new Date();

    const cfg: SEIClientOptions = {
      baseUrl,
      mode: 'browser',
      browser: options.username && options.password
        ? {
          usuario: options.username,
          senha: options.password,
          orgao: options.orgao,
        }
        : undefined,
      playwright: {
        headless: options.headless ?? this.headlessDefault,
        timeout: options.timeoutMs ?? this.globalTimeoutMs,
        persistent: options.persistent ?? this.persistentDefault,
        userDataDir: options.userDataDir ?? this.defaultUserDataDir(id),
        channel: this.channelDefault,
        keepAlive: true,
      },
      resilience: getResilienceConfig(),
      agentFallback: getAgentFallbackConfig(),
    };

    const defaultTimeoutMs = cfg.playwright?.timeout ?? this.globalTimeoutMs;
    const client = new SEIClient(cfg);
    await client.init();

    const state: SessionState = {
      id,
      status: 'ready',
      baseUrl,
      client,
      createdAt: now,
      lastActivity: now,
      defaultTimeoutMs,
      queue: Promise.resolve(),
      processCache: new Map(),
    };

    this.sessions.set(id, state);
    if (!this.defaultSessionId) this.defaultSessionId = id;

    return state;
  }

  async login(args: {
    url: string;
    username: string;
    password: string;
    orgao?: string;
    session_id?: string;
    timeout_ms?: number;
    headless?: boolean;
    persistent?: boolean;
  }): Promise<{ session_id: string; logged_in: boolean; baseUrl: string; headless: boolean }> {
    const resolvedHeadless = args.headless ?? this.headlessDefault;
    const resolvedPersistent = args.persistent ?? this.persistentDefault;

    // Reuse session if provided, otherwise create fresh
    if (args.session_id) {
      const existing = this.sessions.get(args.session_id);
      if (existing) {
        return this.runExclusive(existing.id, async (s) => {
          const page = s.client.getBrowserClient()?.getPage();
          if (page && typeof args.timeout_ms === 'number') page.setDefaultTimeout(args.timeout_ms);
          try {
            const ok = await s.client.login(args.username, args.password, args.orgao);
            return { session_id: s.id, logged_in: ok, baseUrl: s.baseUrl, headless: resolvedHeadless };
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
      headless: resolvedHeadless,
      persistent: resolvedPersistent,
      timeoutMs: typeof args.timeout_ms === 'number' ? args.timeout_ms : undefined,
    });

    return this.runExclusive(session.id, async (s) => {
      const ok = await s.client.login(args.username, args.password, args.orgao);
      return { session_id: s.id, logged_in: ok, baseUrl: s.baseUrl, headless: resolvedHeadless };
    });
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    sessionId?: string
  ): Promise<unknown> {
    // sei_login is special: it creates the session, so don't require one
    if (name === 'sei_login') {
      return this.login({
        url: args.url as string,
        username: args.username as string,
        password: args.password as string,
        orgao: args.orgao as string | undefined,
        session_id: sessionId,
        timeout_ms: args.timeout_ms as number | undefined,
        headless: args.headless as boolean | undefined,
        persistent: args.persistent as boolean | undefined,
      });
    }

    const s = this.getSession(sessionId);
    if (!s) {
      throw new Error('Nenhuma sessão Playwright ativa. Chame sei_login primeiro (com url/usuário/senha).');
    }

    const timeoutMs = typeof args.timeout_ms === 'number' && Number.isFinite(args.timeout_ms)
      ? Math.max(0, args.timeout_ms)
      : undefined;

    return this.runExclusive(s.id, async (session) => {
      const browserClient = session.client.getBrowserClient();
      const page = browserClient?.getPage();
      if (page && timeoutMs !== undefined) page.setDefaultTimeout(timeoutMs);

      try {
        switch (name) {
          // === AUTENTICAÇÃO ===
          case 'sei_login': {
            const url = args.url as string;
            const username = args.username as string;
            const password = args.password as string;
            const orgao = args.orgao as string | undefined;
            return this.login({ url, username, password, orgao, session_id: sessionId, timeout_ms: timeoutMs });
          }
          case 'sei_logout': {
            await session.client.logout();
            return { success: true };
          }
          case 'sei_get_session': {
            const loggedIn = await session.client.isLoggedIn();
            return {
              session_id: session.id,
              baseUrl: session.baseUrl,
              logged_in: loggedIn,
              cdpEndpoint: session.client.getCdpEndpoint(),
            };
          }

          // === PROCESSOS ===
          case 'sei_search_process': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const query = args.query as string;
            const type = (args.type as 'numero' | 'texto' | 'interessado' | 'assunto' | 'unidade') ?? 'numero';
            const limit = (args.limit as number | undefined) ?? 20;
            const mappedType = type === 'texto' ? 'texto' : type === 'interessado' ? 'interessado' : 'numero';

            const searchCacheKey = `search:${query}:${mappedType}:${limit}`;
            const cachedSearch = getCached<{ results: unknown[]; total: number }>(session, searchCacheKey);
            if (cachedSearch) return cachedSearch;

            const results = await browserClient.searchProcessos(query, mappedType, limit);
            const searchResult = { results, total: results.length };
            setCache(session, searchCacheKey, searchResult, 30000);
            return searchResult;
          }
          case 'sei_search_and_open': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const query = args.query as string;
            const type = (args.type as 'numero' | 'texto' | 'interessado' | 'assunto') ?? 'numero';
            const includeDocuments2 = (args.include_documents as boolean | undefined) ?? true;
            const mappedType2 = type === 'texto' ? 'texto' : type === 'interessado' ? 'interessado' : 'numero';

            // Buscar
            const results = await browserClient.searchProcessos(query, mappedType2, 1);
            if (!results || results.length === 0) {
              return { found: false, query, message: 'Nenhum processo encontrado' };
            }

            const proc = results[0];
            const procNum = proc.numero || proc.protocolo || query;

            // Abrir
            await ensureProcessOpen(session, procNum);

            // Listar documentos
            const docs = includeDocuments2 ? await session.client.listDocuments() : [];
            if (includeDocuments2) {
              setCache(session, `docs:${procNum}`, { process_number: procNum, documents: docs }, 60000);
            }

            return {
              found: true,
              process: proc,
              process_number: procNum,
              documents: docs,
              url: browserClient.getPage().url(),
            };
          }
          case 'sei_open_process': {
            const processNumber = args.process_number as string;
            await ensureProcessOpen(session, processNumber);
            return { success: true, process_number: processNumber, url: session.client.getBrowserClient()?.getPage().url() };
          }
          case 'sei_create_process': {
            const options: CreateProcessOptions = {
              tipoProcedimento: args.tipo_processo as string,
              especificacao: args.especificacao as string,
              assuntos: (args.assuntos as string[] | undefined) ?? [],
              interessados: (args.interessados as string[] | undefined) ?? undefined,
              observacao: args.observacao as string | undefined,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal as string | undefined,
            };
            const result = await session.client.createProcess(options);
            return result;
          }
          case 'sei_get_status': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const processNumber = args.process_number as string;
            const includeHistory = (args.include_history as boolean | undefined) ?? true;
            const includeDocuments = (args.include_documents as boolean | undefined) ?? true;

            // Cache: status do processo
            const cacheKey = `status:${processNumber}:${includeHistory}:${includeDocuments}`;
            const cached = getCached<{ process: unknown; andamentos: unknown[]; documents: unknown[] }>(session, cacheKey);
            if (cached) return cached;

            const details = await browserClient.getProcessDetails(processNumber);
            const andamentos = includeHistory ? await session.client.listAndamentos(processNumber) : [];
            const documents = includeDocuments
              ? (await (async () => {
                await ensureProcessOpen(session, processNumber);
                return session.client.listDocuments();
              })())
              : [];

            const result = { process: details, andamentos, documents };
            setCache(session, cacheKey, result, 30000);
            return result;
          }
          case 'sei_forward_process': {
            const processNumber = args.process_number as string;
            invalidateProcessCache(session, processNumber);
            session.currentProcessNumber = undefined;
            const options: ForwardOptions = {
              unidadesDestino: [args.target_unit as string],
              manterAberto: (args.keep_open as boolean | undefined) ?? false,
              diasRetornoProgramado: args.deadline as number | undefined,
              // note/urgente etc não mapeados diretamente na lib (browser ignora)
            };
            const ok = await session.client.forwardProcess(processNumber, options);
            return { success: ok };
          }
          case 'sei_conclude_process': {
            const ok = await session.client.concludeProcess(args.process_number as string);
            return { success: ok };
          }
          case 'sei_reopen_process': {
            const ok = await session.client.reopenProcess(args.process_number as string);
            return { success: ok };
          }
          case 'sei_relate_processes': {
            const main = args.process_number as string;
            const related = args.related_process as string;
            const tipo = (args.tipo_relacao as 'anexacao' | 'apensacao' | 'relacionamento' | undefined) ?? 'relacionamento';
            if (tipo === 'anexacao') {
              const ok = await session.client.anexarProcesso(main, related);
              return { success: ok };
            }
            const ok = await session.client.relacionarProcesso(main, related);
            return { success: ok };
          }

          // === DOCUMENTOS ===
          case 'sei_list_documents': {
            const processNumber = args.process_number as string;
            const docCacheKey = `docs:${processNumber}`;
            const cachedDocs = getCached<{ process_number: string; documents: unknown[] }>(session, docCacheKey);
            if (cachedDocs) return cachedDocs;

            await ensureProcessOpen(session, processNumber);
            const docs = await session.client.listDocuments();
            const docResult = { process_number: processNumber, documents: docs };
            setCache(session, docCacheKey, docResult, 60000);
            return docResult;
          }
          case 'sei_get_document': {
            const docId = args.document_id as string;
            const doc = await session.client.getDocumentDetails(docId);
            return { document: doc };
          }
          case 'sei_create_document': {
            const processNumber = args.process_number as string;
            invalidateProcessCache(session, processNumber);
            const options: CreateDocumentOptions = {
              tipo: 'G',
              idSerie: args.document_type as string,
              descricao: (args.descricao as string | undefined) ?? (args.description as string | undefined),
              numero: args.numero as string | undefined,
              interessados: args.interessados as string[] | undefined,
              destinatarios: args.destinatarios as string[] | undefined,
              observacao: args.observacoes as string | undefined,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal as string | undefined,
              conteudoHtml: args.content as string | undefined,
            };
            const id = await session.client.createDocument(processNumber, options);
            return { document_id: id };
          }
          case 'sei_upload_document': {
            const processNumber = args.process_number as string;
            const filePath = args.file_path as string;
            const fileName = (args.file_name as string | undefined) ?? path.basename(filePath);
            const content = await readFile(filePath);
            const base64 = content.toString('base64');

            const options: Partial<CreateDocumentOptions> = {
              tipo: 'R',
              idSerie: args.document_type as string,
              descricao: args.description as string | undefined,
              numero: args.numero as string | undefined,
              observacao: args.observacao as string | undefined,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal as string | undefined,
            };

            const id = await session.client.uploadDocument(processNumber, fileName, base64, options);
            return { document_id: id };
          }
          case 'sei_upload_document_base64': {
            const processNumber = args.process_number as string;
            const fileName = args.file_name as string;
            const base64 = args.file_content_base64 as string;
            const options: Partial<CreateDocumentOptions> = {
              tipo: 'R',
              idSerie: args.document_type as string,
              descricao: args.description as string | undefined,
              nivelAcesso: nivelAcessoFromLabel(args.nivel_acesso),
              hipoteseLegal: args.hipotese_legal as string | undefined,
            };
            const id = await session.client.uploadDocument(processNumber, fileName, base64, options);
            return { document_id: id };
          }
          case 'sei_sign_document': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const docId = args.document_id as string;
            const senha = args.password as string;
            const cargo = args.cargo as string | undefined;
            await browserClient.navigate(`/sei/controlador.php?acao=documento_assinar&id_documento=${encodeURIComponent(docId)}`);
            const ok = await session.client.signDocument(senha, cargo);
            return { success: ok };
          }
          case 'sei_sign_multiple': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const ids = args.document_ids as string[];
            const senha = args.password as string;
            const cargo = args.cargo as string | undefined;
            const results: Array<{ document_id: string; success: boolean; error?: string }> = [];
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
          case 'sei_cancel_document': {
            const ok = await session.client.cancelDocument(args.document_id as string, args.motivo as string);
            return { success: ok };
          }

          // === DOWNLOAD ===
          case 'sei_download_process': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const processNumber = args.process_number as string;
            const outputPath = args.output_path as string | undefined;
            const format = (args.format as 'zip' | 'pdf' | undefined) ?? 'zip';
            const result = await browserClient.downloadProcess(processNumber, format, outputPath);
            return result;
          }
          case 'sei_download_document': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const docId = args.document_id as string;
            const outputPath = args.output_path as string | undefined;
            return browserClient.downloadDocument(docId, outputPath);
          }

          // === ANOTAÇÕES ===
          case 'sei_list_annotations': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await ensureProcessOpen(session, args.process_number as string);
            return browserClient.listAnnotations();
          }
          case 'sei_add_annotation': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await ensureProcessOpen(session, args.process_number as string);
            const ok = await browserClient.addAnnotation(args.text as string, (args.prioridade as 'normal' | 'alta' | undefined) ?? 'normal');
            return { success: ok };
          }

          // === BLOCOS ===
          case 'sei_list_blocks': {
            const blocks = await session.client.listBlocos();
            const tipo = args.tipo as string | undefined;
            if (!tipo) return { blocks };
            return { blocks: blocks.filter((b) => b.descricao.toLowerCase().includes(tipo.toLowerCase())) };
          }
          case 'sei_create_block': {
            const tipo = args.tipo as 'assinatura' | 'interno' | 'reuniao';
            const id = await session.client.createBloco(
              args.descricao as string,
              tipo,
              args.unidades_disponibilizacao as string[] | undefined,
              args.documentos as string[] | undefined
            );
            return { block_id: id };
          }
          case 'sei_get_block': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const bloco = await browserClient.getBloco(args.block_id as string);
            return { block: bloco };
          }
          case 'sei_add_to_block': {
            const idBloco = args.block_id as string;
            const documentId = (args.document_id as string | undefined) ?? null;
            const processNumber = (args.process_number as string | undefined) ?? null;
            if (!documentId && !processNumber) throw new Error('document_id ou process_number é obrigatório');
            // Para processo, tenta abrir e adicionar o documento selecionado (não há mapeamento direto); exige document_id.
            if (!documentId) throw new Error('Para bloco, forneça document_id (ID do documento).');
            const ok = await session.client.addDocumentoToBloco(idBloco, documentId);
            return { success: ok };
          }
          case 'sei_remove_from_block': {
            const ok = await session.client.removeDocumentoFromBloco(args.block_id as string, args.document_id as string);
            return { success: ok };
          }
          case 'sei_release_block': {
            const ok = await session.client.disponibilizarBloco(args.block_id as string);
            return { success: ok };
          }
          case 'sei_sign_block': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const ok = await browserClient.signBloco(args.block_id as string, args.password as string);
            return { success: ok };
          }

          // === MARCADORES ===
          case 'sei_list_marcadores': {
            if (!browserClient) throw new Error('Browser client não disponível');
            return browserClient.listMarcadores();
          }
          case 'sei_add_marker': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await ensureProcessOpen(session, args.process_number as string);
            const ok = await browserClient.addMarker(args.marker as string, args.text as string | undefined);
            return { success: ok };
          }
          case 'sei_remove_marker': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await ensureProcessOpen(session, args.process_number as string);
            const ok = await browserClient.removeMarker(args.marker as string);
            return { success: ok };
          }

          // === PRAZOS ===
          case 'sei_set_deadline': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await ensureProcessOpen(session, args.process_number as string);
            const ok = await browserClient.setDeadline(args.days as number, (args.tipo as 'util' | 'corrido' | undefined) ?? 'util');
            return { success: ok };
          }

          // === CIÊNCIA / PUBLICAÇÃO ===
          case 'sei_register_knowledge': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await browserClient.navigate(`/sei/controlador.php?acao=documento_visualizar&id_documento=${encodeURIComponent(args.document_id as string)}`);
            const ok = await browserClient.registerKnowledge();
            return { success: ok };
          }
          case 'sei_schedule_publication': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const docId = args.document_id as string;
            const ok = await browserClient.schedulePublication(docId, {
              veiculo: args.veiculo as string,
              dataPublicacao: args.data_publicacao as string | undefined,
              resumo: args.resumo as string | undefined,
            });
            return { success: ok };
          }

          // === LISTAGENS ===
          case 'sei_list_document_types': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const list = await browserClient.listDocumentTypes();
            const filter = (args.filter as string | undefined)?.toLowerCase();
            return filter ? list.filter((i) => i.nome.toLowerCase().includes(filter)) : list;
          }
          case 'sei_list_process_types': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const list = await browserClient.listProcessTypes();
            const filter = (args.filter as string | undefined)?.toLowerCase();
            return filter ? list.filter((i) => i.nome.toLowerCase().includes(filter)) : list;
          }
          case 'sei_list_units': {
            const units = await session.client.listUnits();
            const filter = (args.filter as string | undefined)?.toLowerCase();
            const mapped = units.map((u) => ({
              id: (u as any).IdUnidade ?? (u as any).id ?? '',
              sigla: (u as any).Sigla ?? (u as any).sigla ?? '',
              descricao: (u as any).Descricao ?? (u as any).descricao ?? '',
            }));
            return filter
              ? mapped.filter((u) => `${u.sigla} ${u.descricao}`.toLowerCase().includes(filter))
              : mapped;
          }
          case 'sei_list_users': {
            // Requer SOAP na lib
            const users = await session.client.listUsers();
            const filter = (args.filter as string | undefined)?.toLowerCase();
            const mapped = users.map((u) => ({
              id: (u as any).IdUsuario ?? '',
              sigla: (u as any).Sigla ?? '',
              nome: (u as any).Nome ?? '',
            }));
            return filter
              ? mapped.filter((u) => `${u.sigla} ${u.nome}`.toLowerCase().includes(filter))
              : mapped;
          }
          case 'sei_list_hipoteses_legais': {
            if (!browserClient) throw new Error('Browser client não disponível');
            return browserClient.listHipotesesLegais();
          }
          case 'sei_list_my_processes': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const status = (args.status as 'recebidos' | 'gerados' | 'abertos' | 'todos' | undefined) ?? 'abertos';
            const limit = (args.limit as number | undefined) ?? 50;

            const page2 = browserClient.getPage();
            const baseUrl = session.baseUrl;

            const scrapeTable = async (): Promise<Array<{ numero: string; tipo: string; especificacao: string }>> => {
              const rows = await page2.getByRole('row').all();
              const out: Array<{ numero: string; tipo: string; especificacao: string }> = [];
              for (const row of rows.slice(1)) {
                if (out.length >= limit) break;
                try {
                  const cells = await row.getByRole('cell').all();
                  const link = await cells[0]?.getByRole('link').first();
                  const numero = (await link?.textContent())?.trim() ?? '';
                  const tipo = (await cells[1]?.textContent())?.trim() ?? '';
                  const especificacao = (await cells[2]?.textContent())?.trim() ?? '';
                  if (numero) out.push({ numero, tipo, especificacao });
                } catch {
                  // ignore
                }
              }
              return out;
            };

            const recebidos = async () => {
              await page2.goto(`${baseUrl}/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido`);
              await page2.waitForLoadState('networkidle');
              return scrapeTable();
            };

            const gerados = async () => {
              await page2.goto(`${baseUrl}/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_gerado`);
              await page2.waitForLoadState('networkidle');
              return scrapeTable();
            };

            const abertos = async () => browserClient.listMeusProcessos('abertos', limit);

            if (status === 'recebidos') return { status, items: await recebidos() };
            if (status === 'gerados') return { status, items: await gerados() };
            if (status === 'abertos') return { status, items: await abertos() };

            const all = [
              ...(await abertos()),
              ...(await recebidos()),
              ...(await gerados()),
            ];
            const uniq = new Map<string, { numero: string; tipo: string; especificacao: string }>();
            for (const item of all) {
              if (!item.numero) continue;
              if (!uniq.has(item.numero)) uniq.set(item.numero, item);
            }
            return { status: 'todos', items: Array.from(uniq.values()).slice(0, limit) };
          }

          // === CONTROLE DE ACESSO ===
          case 'sei_grant_access': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await session.client.openProcess(args.process_number as string);
            const ok = await browserClient.grantAccess(args.user as string, (args.tipo as 'consulta' | 'acompanhamento' | undefined) ?? 'consulta');
            return { success: ok };
          }
          case 'sei_revoke_access': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await session.client.openProcess(args.process_number as string);
            const ok = await browserClient.revokeAccess(args.user as string);
            return { success: ok };
          }

          // === VISUALIZAÇÃO / DEBUG ===
          case 'sei_screenshot': {
            const fullPage = (args.full_page as boolean | undefined) ?? false;
            const b64 = await session.client.screenshot(fullPage);
            const outputPath = args.output_path as string | undefined;
            if (outputPath) {
              const buf = Buffer.from(b64, 'base64');
              const { writeFile } = await import('fs/promises');
              await writeFile(outputPath, buf);
              return { output_path: outputPath, bytes: buf.byteLength };
            }
            return { image: b64, mimeType: 'image/png' };
          }
          case 'sei_snapshot': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const scope = (args.scope as string) ?? 'full';
            const maxLength = (args.max_length as number | undefined) ?? 50000;
            const includeHidden = (args.include_hidden as boolean | undefined) ?? false;

            let snap: string;

            if (scope === 'tree' || scope === 'view') {
              // Capturar snapshot de iframe específico
              const frameName = scope === 'tree' ? 'ifrArvore' : 'ifrVisualizacao';
              const frame = page?.frame(frameName);
              if (frame) {
                // Usar accessibility snapshot do frame
                const tree = await frame.locator('body').first().evaluate((el) => el.innerText);
                // Tentar ARIA snapshot via page accessibility
                try {
                  const ariaTree = await (frame as any).accessibility?.snapshot({ interestingOnly: !includeHidden });
                  snap = ariaTree ? JSON.stringify(ariaTree, null, 2) : tree;
                } catch {
                  // Fallback: extrair texto estruturado do frame
                  snap = await frame.evaluate(() => {
                    const items: string[] = [];
                    document.querySelectorAll('a, button, input, select, [role]').forEach((el) => {
                      const tag = el.tagName.toLowerCase();
                      const role = el.getAttribute('role') || tag;
                      const text = (el as HTMLElement).innerText?.trim()?.slice(0, 200) || el.getAttribute('title') || el.getAttribute('aria-label') || '';
                      if (text) items.push(`[${role}] ${text}`);
                    });
                    return items.join('\n');
                  });
                }
              } else {
                snap = `Frame "${frameName}" não encontrado na página atual`;
              }
            } else if (scope === 'main') {
              // Capturar snapshot da página principal sem iframes
              snap = await browserClient.snapshot(includeHidden);
            } else {
              // full: snapshot completo
              snap = await browserClient.snapshot(includeHidden);
            }

            // Pós-processamento: limpar e truncar
            snap = cleanSnapshot(snap);
            snap = truncateSnapshot(snap, maxLength);

            try {
              return JSON.parse(snap);
            } catch {
              return snap;
            }
          }
          case 'sei_get_current_page': {
            if (!browserClient) throw new Error('Browser client não disponível');
            return { url: browserClient.getPage().url() };
          }
          case 'sei_navigate': {
            if (!browserClient) throw new Error('Browser client não disponível');
            const target = args.target as string;
            const map: Record<string, string> = {
              home: '/sei/controlador.php?acao=procedimento_controlar',
              search: '/sei/controlador.php?acao=protocolo_pesquisa_rapida',
              new_process: '/sei/controlador.php?acao=procedimento_gerar',
              signature_block: '/sei/controlador.php?acao=bloco_assinatura_listar',
              received: '/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido',
              generated: '/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_gerado',
              inbox: '/sei/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_recebido',
              control: '/sei/controlador.php?acao=procedimento_controlar',
            };
            const path2 = map[target] ?? target;
            await browserClient.navigate(path2);
            // Esperar DOM carregado para navegação mais estável
            await page!.waitForLoadState('domcontentloaded');
            // Limpar currentProcessNumber ao navegar para outra página
            session.currentProcessNumber = undefined;
            return { success: true, url: browserClient.getPage().url() };
          }
          case 'sei_click': {
            if (!page) throw new Error('Browser client não disponível');
            const sel = toPlaywrightSelector(args.selector as string);
            await page.locator(sel).first().click();
            return { success: true };
          }
          case 'sei_type': {
            if (!page) throw new Error('Browser client não disponível');
            const sel = toPlaywrightSelector(args.selector as string);
            const text = args.text as string;
            const clear = (args.clear as boolean | undefined) ?? true;
            const loc = page.locator(sel).first();
            if (clear) await loc.fill('');
            await loc.type(text);
            return { success: true };
          }
          case 'sei_select': {
            if (!page) throw new Error('Browser client não disponível');
            const sel = toPlaywrightSelector(args.selector as string);
            const value = args.value as string;
            await page.locator(sel).first().selectOption({ label: value }).catch(async () => {
              await page.locator(sel).first().selectOption(value);
            });
            return { success: true };
          }
          case 'sei_wait': {
            if (!page) throw new Error('Browser client não disponível');
            const timeout = (args.timeout as number | undefined) ?? 10000;
            const selector = args.selector as string | undefined;
            if (!selector) {
              await page.waitForTimeout(timeout);
              return { success: true };
            }
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().waitFor({ timeout });
            return { success: true };
          }

          // === SESSÕES / JANELA (compat) ===
          case 'sei_minimize_window': {
            await session.client.minimizeWindow();
            return { success: true };
          }
          case 'sei_restore_window': {
            await session.client.restoreWindow();
            return { success: true };
          }
          case 'sei_focus_window': {
            await session.client.bringToFront();
            return { success: true };
          }
          case 'sei_get_window_state': {
            const bounds = await session.client.getWindowBounds();
            return bounds ? { focused: true, bounds } : null;
          }
          case 'sei_set_window_bounds': {
            await session.client.setWindowBounds({
              left: args.left as number | undefined,
              top: args.top as number | undefined,
              width: args.width as number | undefined,
              height: args.height as number | undefined,
            });
            return { success: true };
          }
          case 'sei_get_connection_status': {
            return {
              driver: 'playwright',
              connected: true,
              session_id: session.id,
              cdpEndpoint: session.client.getCdpEndpoint(),
            };
          }

          // =====================================================
          // === FERRAMENTAS GENÉRICAS DE PLAYWRIGHT/BROWSER ===
          // =====================================================

          case 'browser_close': {
            void this.closeSession(session.id);
            return { success: true, message: 'Navegador fechado' };
          }

          case 'browser_navigate': {
            if (!page) throw new Error('Browser não disponível');
            const url = args.url as string;
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            return { success: true, url: page.url(), title: await page.title() };
          }

          case 'browser_navigate_back': {
            if (!page) throw new Error('Browser não disponível');
            await page.goBack();
            return { success: true, url: page.url() };
          }

          case 'browser_click': {
            if (!page) throw new Error('Browser não disponível');
            const selector = (args.selector || args.ref) as string;
            if (!selector) throw new Error('selector ou ref é obrigatório');
            const sel = toPlaywrightSelector(selector);
            const button = (args.button as 'left' | 'right' | 'middle' | undefined) ?? 'left';
            const doubleClick = (args.doubleClick as boolean | undefined) ?? false;
            const modifiers = args.modifiers as Array<'Alt' | 'Control' | 'Meta' | 'Shift'> | undefined;

            const loc = page.locator(sel).first();
            if (doubleClick) {
              await loc.dblclick({ button, modifiers });
            } else {
              await loc.click({ button, modifiers });
            }
            return { success: true };
          }

          case 'browser_type': {
            if (!page) throw new Error('Browser não disponível');
            const selector = (args.selector || args.ref) as string;
            if (!selector) throw new Error('selector ou ref é obrigatório');
            const sel = toPlaywrightSelector(selector);
            const text = args.text as string;
            const slowly = (args.slowly as boolean | undefined) ?? false;
            const submit = (args.submit as boolean | undefined) ?? false;

            const loc = page.locator(sel).first();
            if (slowly) {
              await loc.pressSequentially(text);
            } else {
              await loc.fill(text);
            }
            if (submit) {
              await loc.press('Enter');
            }
            return { success: true };
          }

          case 'browser_fill_form': {
            if (!page) throw new Error('Browser não disponível');
            const fields = args.fields as Array<{
              name: string;
              type: string;
              ref?: string;
              selector?: string;
              value: string;
            }>;

            const results: Array<{ name: string; success: boolean; error?: string }> = [];
            for (const field of fields) {
              try {
                const selector = field.selector || field.ref;
                if (!selector) {
                  results.push({ name: field.name, success: false, error: 'selector ou ref necessário' });
                  continue;
                }
                const sel = toPlaywrightSelector(selector);
                const loc = page.locator(sel).first();

                switch (field.type) {
                  case 'textbox':
                    await loc.fill(field.value);
                    break;
                  case 'checkbox':
                    if (field.value === 'true') await loc.check();
                    else await loc.uncheck();
                    break;
                  case 'radio':
                    await loc.check();
                    break;
                  case 'combobox':
                    await loc.selectOption({ label: field.value }).catch(() => loc.selectOption(field.value));
                    break;
                  case 'slider':
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

          case 'browser_select_option': {
            if (!page) throw new Error('Browser não disponível');
            const selector = (args.selector || args.ref) as string;
            if (!selector) throw new Error('selector ou ref é obrigatório');
            const values = args.values as string[];
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().selectOption(values);
            return { success: true };
          }

          case 'browser_hover': {
            if (!page) throw new Error('Browser não disponível');
            const selector = (args.selector || args.ref) as string;
            if (!selector) throw new Error('selector ou ref é obrigatório');
            const sel = toPlaywrightSelector(selector);
            await page.locator(sel).first().hover();
            return { success: true };
          }

          case 'browser_drag': {
            if (!page) throw new Error('Browser não disponível');
            const startSelector = (args.startSelector || args.startRef) as string;
            const endSelector = (args.endSelector || args.endRef) as string;
            if (!startSelector || !endSelector) throw new Error('startSelector e endSelector são obrigatórios');

            const startSel = toPlaywrightSelector(startSelector);
            const endSel = toPlaywrightSelector(endSelector);
            await page.locator(startSel).first().dragTo(page.locator(endSel).first());
            return { success: true };
          }

          case 'browser_press_key': {
            if (!page) throw new Error('Browser não disponível');
            const key = args.key as string;
            await page.keyboard.press(key);
            return { success: true };
          }

          case 'browser_snapshot': {
            if (!browserClient) throw new Error('Browser não disponível');
            const snap = await browserClient.snapshot(false);
            const filename = args.filename as string | undefined;
            if (filename) {
              const { writeFile } = await import('fs/promises');
              await writeFile(filename, snap);
              return { saved: filename };
            }
            try {
              return JSON.parse(snap);
            } catch {
              return { snapshot: snap };
            }
          }

          case 'browser_take_screenshot': {
            if (!page) throw new Error('Browser não disponível');
            const type = (args.type as 'png' | 'jpeg' | undefined) ?? 'png';
            const fullPage = (args.fullPage as boolean | undefined) ?? false;
            const filename = args.filename as string | undefined;
            const selector = (args.selector || args.ref) as string | undefined;

            let buffer: Buffer;
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              buffer = await page.locator(sel).first().screenshot({ type });
            } else {
              buffer = await page.screenshot({ type, fullPage });
            }

            if (filename) {
              const { writeFile } = await import('fs/promises');
              await writeFile(filename, buffer);
              return { saved: filename, bytes: buffer.byteLength };
            }
            return { image: buffer.toString('base64'), mimeType: `image/${type}` };
          }

          case 'browser_resize': {
            if (!page) throw new Error('Browser não disponível');
            const width = args.width as number;
            const height = args.height as number;
            await page.setViewportSize({ width, height });
            return { success: true, width, height };
          }

          case 'browser_handle_dialog': {
            if (!page) throw new Error('Browser não disponível');
            const accept = args.accept as boolean;
            const promptText = args.promptText as string | undefined;

            // Configurar handler para próximo diálogo
            page.once('dialog', async (dialog) => {
              if (accept) {
                await dialog.accept(promptText);
              } else {
                await dialog.dismiss();
              }
            });
            return { success: true, message: 'Handler configurado para próximo diálogo' };
          }

          case 'browser_evaluate': {
            if (!page) throw new Error('Browser não disponível');
            const fn = args.function as string;
            const selector = (args.selector || args.ref) as string | undefined;

            let result: unknown;
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              const element = page.locator(sel).first();
              result = await element.evaluate(new Function('return ' + fn)() as (el: Element) => unknown);
            } else {
              result = await page.evaluate(new Function('return ' + fn)() as () => unknown);
            }
            return { result };
          }

          case 'browser_file_upload': {
            if (!page) throw new Error('Browser não disponível');
            const paths = args.paths as string[] | undefined;

            // Configurar handler para próximo file chooser
            const fileChooserPromise = page.waitForEvent('filechooser');
            // O usuário precisa clicar no input de arquivo após chamar esta função
            // ou podemos apenas configurar o handler
            if (paths && paths.length > 0) {
              page.once('filechooser', async (fileChooser) => {
                await fileChooser.setFiles(paths);
              });
              return { success: true, message: `Handler configurado para upload de ${paths.length} arquivo(s)` };
            } else {
              page.once('filechooser', async (fileChooser) => {
                await fileChooser.setFiles([]);
              });
              return { success: true, message: 'File chooser será cancelado' };
            }
          }

          case 'browser_tabs': {
            if (!browserClient) throw new Error('Browser não disponível');
            const action = args.action as 'list' | 'new' | 'close' | 'select';
            const index = args.index as number | undefined;
            const context = page?.context();

            if (!context) throw new Error('Browser context não disponível');

            switch (action) {
              case 'list': {
                const pages = context.pages();
                return {
                  tabs: pages.map((p, i) => ({
                    index: i,
                    url: p.url(),
                    title: p.url(), // title seria async, simplificamos
                  })),
                  current: pages.indexOf(page!),
                };
              }
              case 'new': {
                const newPage = await context.newPage();
                return { success: true, index: context.pages().indexOf(newPage) };
              }
              case 'close': {
                const pages = context.pages();
                const targetIndex = index ?? pages.indexOf(page!);
                if (targetIndex >= 0 && targetIndex < pages.length) {
                  await pages[targetIndex].close();
                }
                return { success: true };
              }
              case 'select': {
                if (index === undefined) throw new Error('index é obrigatório para select');
                const pages = context.pages();
                if (index >= 0 && index < pages.length) {
                  await pages[index].bringToFront();
                }
                return { success: true };
              }
            }
            break;
          }

          case 'browser_console_messages': {
            // Playwright não mantém histórico de console por padrão
            // Retornamos instrução de como capturar
            return {
              message: 'Para capturar mensagens do console, configure um listener antes de navegar.',
              example: "page.on('console', msg => console.log(msg.text()))",
            };
          }

          case 'browser_network_requests': {
            // Similar ao console, Playwright não mantém histórico
            return {
              message: 'Para capturar requisições de rede, configure um listener antes de navegar.',
              example: "page.on('request', req => console.log(req.url()))",
            };
          }

          case 'browser_wait_for': {
            if (!page) throw new Error('Browser não disponível');
            const text = args.text as string | undefined;
            const textGone = args.textGone as string | undefined;
            const time = args.time as number | undefined;
            const selector = args.selector as string | undefined;

            if (time !== undefined) {
              await page.waitForTimeout(time * 1000);
              return { success: true, waited: `${time}s` };
            }
            if (text) {
              await page.getByText(text).first().waitFor({ state: 'visible' });
              return { success: true, found: text };
            }
            if (textGone) {
              await page.getByText(textGone).first().waitFor({ state: 'hidden' });
              return { success: true, gone: textGone };
            }
            if (selector) {
              const sel = toPlaywrightSelector(selector);
              await page.locator(sel).first().waitFor();
              return { success: true, found: selector };
            }
            return { success: true };
          }

          case 'browser_run_code': {
            if (!page) throw new Error('Browser não disponível');
            const code = args.code as string;
            // Executar código Playwright customizado
            // O código deve ser uma função async que recebe 'page'
            const fn = new Function('page', `return (async () => { ${code} })()`) as (p: typeof page) => Promise<unknown>;
            const result = await fn(page);
            return { result };
          }

          default:
            throw new Error(`Ferramenta não suportada no driver Playwright: ${name}`);
        }
      } finally {
        if (page && timeoutMs !== undefined) page.setDefaultTimeout(session.defaultTimeoutMs);
      }
    });
  }
}
