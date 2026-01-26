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
} from 'sei-playwright';

import { logger } from '../utils/logger.js';

type PlaywrightSessionStatus = 'ready' | 'closed' | 'error';

export interface PlaywrightSessionInfo {
  id: string;
  status: PlaywrightSessionStatus;
  baseUrl: string;
  createdAt: Date;
  lastActivity: Date;
  cdpEndpoint?: string | null;
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
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function nivelAcessoFromLabel(label: unknown): NivelAcesso {
  if (label === 'restrito') return 1;
  if (label === 'sigiloso') return 2;
  return 0;
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
  }): Promise<{ session_id: string; logged_in: boolean; baseUrl: string }> {
    // Reuse session if provided, otherwise create fresh
    if (args.session_id) {
      const existing = this.sessions.get(args.session_id);
      if (existing) {
        return this.runExclusive(existing.id, async (s) => {
          const page = s.client.getBrowserClient()?.getPage();
          if (page && typeof args.timeout_ms === 'number') page.setDefaultTimeout(args.timeout_ms);
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
      timeoutMs: typeof args.timeout_ms === 'number' ? args.timeout_ms : undefined,
    });

    return this.runExclusive(session.id, async (s) => {
      const ok = await s.client.login(args.username, args.password, args.orgao);
      return { session_id: s.id, logged_in: ok, baseUrl: s.baseUrl };
    });
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    sessionId?: string
  ): Promise<unknown> {
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
            const results = await browserClient.searchProcessos(query, mappedType, limit);
            return { results, total: results.length };
          }
          case 'sei_open_process': {
            const processNumber = args.process_number as string;
            const ok = await session.client.openProcess(processNumber);
            return { success: ok, process_number: processNumber, url: session.client.getBrowserClient()?.getPage().url() };
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

            const details = await browserClient.getProcessDetails(processNumber);
            const andamentos = includeHistory ? await session.client.listAndamentos(processNumber) : [];
            const documents = includeDocuments
              ? (await (async () => {
                await session.client.openProcess(processNumber);
                return session.client.listDocuments();
              })())
              : [];

            return { process: details, andamentos, documents };
          }
          case 'sei_forward_process': {
            const processNumber = args.process_number as string;
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
            await session.client.openProcess(processNumber);
            const docs = await session.client.listDocuments();
            return { process_number: processNumber, documents: docs };
          }
          case 'sei_get_document': {
            const docId = args.document_id as string;
            const doc = await session.client.getDocumentDetails(docId);
            return { document: doc };
          }
          case 'sei_create_document': {
            const processNumber = args.process_number as string;
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
            const includeAttachments = (args.include_attachments as boolean | undefined) ?? true;
            const result = await browserClient.downloadProcess(processNumber, includeAttachments, outputPath);
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
            await session.client.openProcess(args.process_number as string);
            return browserClient.listAnnotations();
          }
          case 'sei_add_annotation': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await session.client.openProcess(args.process_number as string);
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
            await session.client.openProcess(args.process_number as string);
            const ok = await browserClient.addMarker(args.marker as string, args.text as string | undefined);
            return { success: ok };
          }
          case 'sei_remove_marker': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await session.client.openProcess(args.process_number as string);
            const ok = await browserClient.removeMarker(args.marker as string);
            return { success: ok };
          }

          // === PRAZOS ===
          case 'sei_set_deadline': {
            if (!browserClient) throw new Error('Browser client não disponível');
            await session.client.openProcess(args.process_number as string);
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
            const snap = await browserClient.snapshot((args.include_hidden as boolean | undefined) ?? false);
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

          default:
            throw new Error(`Ferramenta não suportada no driver Playwright: ${name}`);
        }
      } finally {
        if (page && timeoutMs !== undefined) page.setDefaultTimeout(session.defaultTimeoutMs);
      }
    });
  }
}
