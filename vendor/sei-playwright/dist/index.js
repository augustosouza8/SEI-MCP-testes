import "./chunk-QGM4M3NI.js";

// src/soap/client.ts
import * as soap from "soap";
var SEISoapClient = class {
  config;
  client = null;
  constructor(config) {
    this.config = config;
  }
  /** URL do WSDL do SEI */
  get wsdlUrl() {
    const base = this.config.baseUrl.replace(/\/$/, "");
    return `${base}/sei/controlador_ws.php?servico=sei`;
  }
  /** Conecta ao serviço SOAP */
  async connect() {
    this.client = await soap.createClientAsync(this.wsdlUrl);
  }
  /** Verifica se está conectado */
  get isConnected() {
    return this.client !== null;
  }
  /** Autentica requisição */
  auth(idUnidade) {
    return {
      siglaSistema: this.config.siglaSistema,
      identificacaoServico: this.config.identificacaoServico,
      idUnidade
    };
  }
  /** Executa chamada SOAP */
  async call(method, args) {
    if (!this.client) {
      throw new Error("SOAP client n\xE3o conectado. Chame connect() primeiro.");
    }
    const fn = this.client[`${method}Async`];
    if (!fn) {
      throw new Error(`M\xE9todo SOAP '${method}' n\xE3o encontrado`);
    }
    const [result] = await fn.call(this.client, args);
    return result;
  }
  // ============================================
  // Métodos de Listagem
  // ============================================
  /** Lista séries/tipos de documento */
  async listarSeries(idUnidade, idTipoProcedimento) {
    return this.call("listarSeries", {
      ...this.auth(idUnidade),
      IdTipoProcedimento: idTipoProcedimento
    });
  }
  /** Lista tipos de procedimento/processo */
  async listarTiposProcedimento(idUnidade) {
    return this.call("listarTiposProcedimento", {
      ...this.auth(idUnidade)
    });
  }
  /** Lista unidades */
  async listarUnidades(idUnidade, idTipoProcedimento) {
    return this.call("listarUnidades", {
      ...this.auth(idUnidade),
      IdTipoProcedimento: idTipoProcedimento
    });
  }
  /** Lista usuários da unidade */
  async listarUsuarios(idUnidade) {
    return this.call("listarUsuarios", {
      ...this.auth(idUnidade)
    });
  }
  /** Lista hipóteses legais */
  async listarHipotesesLegais(idUnidade, nivelAcesso) {
    return this.call("listarHipotesesLegais", {
      ...this.auth(idUnidade),
      NivelAcesso: nivelAcesso
    });
  }
  // ============================================
  // Métodos de Procedimento (Processo)
  // ============================================
  /** Gera novo procedimento/processo */
  async gerarProcedimento(idUnidade, procedimento, documentos, procedimentosRelacionados, unidadesEnvio, sinManterAbertoUnidade, sinEnviarEmailNotificacao, dataRetornoProgramado, idMarcador, textoMarcador) {
    return this.call("gerarProcedimento", {
      ...this.auth(idUnidade),
      Procedimento: procedimento,
      Documentos: documentos,
      ProcedimentosRelacionados: procedimentosRelacionados,
      UnidadesEnvio: unidadesEnvio,
      SinManterAbertoUnidade: sinManterAbertoUnidade ? "S" : "N",
      SinEnviarEmailNotificacao: sinEnviarEmailNotificacao ? "S" : "N",
      DataRetornoProgramado: dataRetornoProgramado,
      IdMarcador: idMarcador,
      TextoMarcador: textoMarcador
    });
  }
  /** Consulta procedimento/processo */
  async consultarProcedimento(idUnidade, protocoloProcedimento, sinRetornarAssuntos, sinRetornarInteressados, sinRetornarObservacoes, sinRetornarAndamentoGeracao, sinRetornarAndamentoConclusao, sinRetornarUltimoAndamento, sinRetornarUnidadesProcedimentoAberto, sinRetornarProcedimentosRelacionados, sinRetornarProcedimentosAnexados) {
    return this.call("consultarProcedimento", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento,
      SinRetornarAssuntos: sinRetornarAssuntos ? "S" : "N",
      SinRetornarInteressados: sinRetornarInteressados ? "S" : "N",
      SinRetornarObservacoes: sinRetornarObservacoes ? "S" : "N",
      SinRetornarAndamentoGeracao: sinRetornarAndamentoGeracao ? "S" : "N",
      SinRetornarAndamentoConclusao: sinRetornarAndamentoConclusao ? "S" : "N",
      SinRetornarUltimoAndamento: sinRetornarUltimoAndamento ? "S" : "N",
      SinRetornarUnidadesProcedimentoAberto: sinRetornarUnidadesProcedimentoAberto ? "S" : "N",
      SinRetornarProcedimentosRelacionados: sinRetornarProcedimentosRelacionados ? "S" : "N",
      SinRetornarProcedimentosAnexados: sinRetornarProcedimentosAnexados ? "S" : "N"
    });
  }
  /** Envia processo para outras unidades */
  async enviarProcesso(idUnidade, protocoloProcedimento, unidadesDestino, sinManterAbertoUnidade, sinRemoverAnotacao, sinEnviarEmailNotificacao, dataRetornoProgramado, diasRetornoProgramado, sinDiasUteisRetornoProgramado, sinReabrir) {
    return this.call("enviarProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento,
      UnidadesDestino: unidadesDestino,
      SinManterAbertoUnidade: sinManterAbertoUnidade ? "S" : "N",
      SinRemoverAnotacao: sinRemoverAnotacao ? "S" : "N",
      SinEnviarEmailNotificacao: sinEnviarEmailNotificacao ? "S" : "N",
      DataRetornoProgramado: dataRetornoProgramado,
      DiasRetornoProgramado: diasRetornoProgramado,
      SinDiasUteisRetornoProgramado: sinDiasUteisRetornoProgramado ? "S" : "N",
      SinReabrir: sinReabrir ? "S" : "N"
    });
  }
  /** Conclui processo na unidade */
  async concluirProcesso(idUnidade, protocoloProcedimento) {
    return this.call("concluirProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento
    });
  }
  /** Reabre processo na unidade */
  async reabrirProcesso(idUnidade, protocoloProcedimento) {
    return this.call("reabrirProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento
    });
  }
  /** Atribui processo a um usuário */
  async atribuirProcesso(idUnidade, protocoloProcedimento, idUsuario, sinReabrir) {
    return this.call("atribuirProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento,
      IdUsuario: idUsuario,
      SinReabrir: sinReabrir ? "S" : "N"
    });
  }
  /** Anexa processo a outro */
  async anexarProcesso(idUnidade, protocoloProcedimentoPrincipal, protocoloProcedimentoAnexado) {
    return this.call("anexarProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimentoPrincipal: protocoloProcedimentoPrincipal,
      ProtocoloProcedimentoAnexado: protocoloProcedimentoAnexado
    });
  }
  /** Relaciona processos */
  async relacionarProcesso(idUnidade, protocoloProcedimento1, protocoloProcedimento2) {
    return this.call("relacionarProcesso", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento1: protocoloProcedimento1,
      ProtocoloProcedimento2: protocoloProcedimento2
    });
  }
  // ============================================
  // Métodos de Documento
  // ============================================
  /** Inclui documento em processo */
  async incluirDocumento(idUnidade, documento) {
    return this.call("incluirDocumento", {
      ...this.auth(idUnidade),
      Documento: documento
    });
  }
  /** Consulta documento */
  async consultarDocumento(idUnidade, protocoloDocumento, sinRetornarAndamentoGeracao, sinRetornarAssinaturas, sinRetornarPublicacao, sinRetornarCampos) {
    return this.call("consultarDocumento", {
      ...this.auth(idUnidade),
      ProtocoloDocumento: protocoloDocumento,
      SinRetornarAndamentoGeracao: sinRetornarAndamentoGeracao ? "S" : "N",
      SinRetornarAssinaturas: sinRetornarAssinaturas ? "S" : "N",
      SinRetornarPublicacao: sinRetornarPublicacao ? "S" : "N",
      SinRetornarCampos: sinRetornarCampos ? "S" : "N"
    });
  }
  /** Cancela documento */
  async cancelarDocumento(idUnidade, protocoloDocumento, motivo) {
    return this.call("cancelarDocumento", {
      ...this.auth(idUnidade),
      ProtocoloDocumento: protocoloDocumento,
      Motivo: motivo
    });
  }
  /** Adiciona arquivo para upload em partes (arquivos grandes) */
  async adicionarArquivo(idUnidade, nome, tamanho, hash, conteudo) {
    return this.call("adicionarArquivo", {
      ...this.auth(idUnidade),
      Nome: nome,
      Tamanho: tamanho,
      Hash: hash,
      Conteudo: conteudo
    });
  }
  // ============================================
  // Métodos de Bloco
  // ============================================
  /** Gera bloco de assinatura */
  async gerarBloco(idUnidade, tipo, descricao, unidadesDisponibilizacao, documentos, sinDisponibilizar) {
    return this.call("gerarBloco", {
      ...this.auth(idUnidade),
      Tipo: tipo,
      Descricao: descricao,
      UnidadesDisponibilizacao: unidadesDisponibilizacao,
      Documentos: documentos,
      SinDisponibilizar: sinDisponibilizar ? "S" : "N"
    });
  }
  /** Consulta bloco */
  async consultarBloco(idUnidade, idBloco, sinRetornarProtocolos) {
    return this.call("consultarBloco", {
      ...this.auth(idUnidade),
      IdBloco: idBloco,
      SinRetornarProtocolos: sinRetornarProtocolos ? "S" : "N"
    });
  }
  /** Inclui documento em bloco */
  async incluirDocumentoBloco(idUnidade, idBloco, protocoloDocumento) {
    return this.call("incluirDocumentoBloco", {
      ...this.auth(idUnidade),
      IdBloco: idBloco,
      ProtocoloDocumento: protocoloDocumento
    });
  }
  /** Exclui documento de bloco */
  async excluirDocumentoBloco(idUnidade, idBloco, protocoloDocumento) {
    return this.call("excluirDocumentoBloco", {
      ...this.auth(idUnidade),
      IdBloco: idBloco,
      ProtocoloDocumento: protocoloDocumento
    });
  }
  /** Disponibiliza bloco para outras unidades */
  async disponibilizarBloco(idUnidade, idBloco) {
    return this.call("disponibilizarBloco", {
      ...this.auth(idUnidade),
      IdBloco: idBloco
    });
  }
  // ============================================
  // Métodos de Andamento
  // ============================================
  /** Lista andamentos */
  async listarAndamentos(idUnidade, protocoloProcedimento, sinRetornarAtributos, andamentos) {
    return this.call("listarAndamentos", {
      ...this.auth(idUnidade),
      ProtocoloProcedimento: protocoloProcedimento,
      SinRetornarAtributos: sinRetornarAtributos ? "S" : "N",
      Andamentos: andamentos
    });
  }
};

// src/browser/client.ts
import { chromium } from "playwright";

// src/browser/selectors.ts
var SEI_SELECTORS = {
  // ============================================
  // Login
  // ============================================
  login: {
    form: '#frmLogin, form[name="frmLogin"]',
    usuario: '#txtUsuario, input[name="txtUsuario"]',
    // SEI MG: campo visível tem id=pwdSenha, class=masked, SEM name
    // SEI MG: campo oculto (display:none) tem name=pwdSenha, SEM id
    // Prioriza o campo visível (com class masked) sobre o oculto
    senha: 'input#pwdSenha.masked, input#pwdSenha:not([type="password"]), input[name="pwdSenha"]:not([style*="none"])',
    orgao: '#selOrgao, select[name="selOrgao"]',
    // SEI MG usa #Acessar, outros SEIs usam #sbmLogin
    submit: '#Acessar, #sbmLogin, input[name="sbmLogin"], button[type="submit"]',
    error: ".infraException, .msgErro, #divInfraExcecao"
  },
  // ============================================
  // Navegação Principal
  // ============================================
  nav: {
    menu: "#infraMenu, .infraMenu",
    pesquisa: '#txtPesquisaRapida, input[name="txtPesquisaRapida"]',
    btnPesquisa: '#btnPesquisaRapida, a[onclick*="pesquisar"]',
    controleProcessos: '#lnkControleProcessos, a[href*="procedimento_controlar"]',
    iniciarProcesso: '#lnkIniciarProcesso, a[href*="procedimento_escolher_tipo"]',
    usuario: "#lnkUsuarioSistema, #spanUsuario, .usuario-logado",
    unidade: '#selInfraUnidades, select[name="selInfraUnidades"]',
    logout: '#lnkSairSistema, a[href*="usuario_externo_logar"], a[href*="logout"]'
  },
  // ============================================
  // Lista de Processos
  // ============================================
  processList: {
    container: "#divArvore, #tblProcessosRecebidos, .infraTable",
    rows: 'tr[class*="infraTr"], .processo-item',
    link: 'a[href*="procedimento_trabalhar"]',
    numero: ".numero-processo, td:first-child a",
    tipo: ".tipo-processo, td:nth-child(2)",
    especificacao: ".especificacao, td:nth-child(3)"
  },
  // ============================================
  // Árvore do Processo
  // ============================================
  processTree: {
    container: "#divArvore, #arvore",
    root: "#anchor0, .infraArvoreNo",
    documents: '.infraArvoreNo a, #divArvore a[href*="documento"]',
    documentLink: 'a[href*="documento_visualizar"], a[href*="editor"]',
    selected: ".infraArvoreNoSelecionado, .selected"
  },
  // ============================================
  // Barra de Ações do Processo
  // ============================================
  processActions: {
    container: "#divInfraBarraComandosSuperior, .barra-acoes",
    incluirDocumento: 'a[href*="documento_escolher_tipo"], img[title*="Incluir Documento"]',
    enviarProcesso: 'a[href*="procedimento_enviar"], img[title*="Enviar Processo"]',
    concluirProcesso: 'a[href*="procedimento_concluir"], img[title*="Concluir"]',
    reabrirProcesso: 'a[href*="procedimento_reabrir"], img[title*="Reabrir"]',
    anexarProcesso: 'a[href*="procedimento_anexar"], img[title*="Anexar"]',
    relacionarProcesso: 'a[href*="procedimento_relacionar"], img[title*="Relacionar"]',
    atribuirProcesso: 'a[href*="procedimento_atribuir"], img[title*="Atribuir"]',
    gerarPdf: 'a[href*="procedimento_gerar_pdf"], img[title*="Gerar PDF"]',
    anotacoes: 'a[href*="anotacao"], img[title*="Anota\xE7\xF5es"]',
    ciencia: 'a[href*="procedimento_registrar_ciencia"], img[title*="Ci\xEAncia"]',
    consultarAndamento: 'a[href*="procedimento_consultar_andamento"], img[title*="Consultar Andamento"]',
    blocoAssinatura: 'a[href*="bloco"], img[title*="Bloco"]'
  },
  // ============================================
  // Formulário de Novo Processo
  // ============================================
  newProcess: {
    form: '#frmProcedimentoGerar, form[name="frmProcedimentoGerar"]',
    tipo: '#selTipoProcedimento, select[name="selTipoProcedimento"]',
    tipoSearch: "#txtPalavrasPesquisaTipoProcedimento",
    especificacao: '#txtEspecificacao, input[name="txtEspecificacao"]',
    interessado: '#txtInteressadoProcedimento, input[name="txtInteressadoProcedimento"]',
    interessadoAdd: '#btnAdicionarInteressado, a[onclick*="adicionarInteressado"]',
    observacao: '#txaObservacoes, textarea[name="txaObservacoes"]',
    nivelAcesso: {
      publico: '#optPublico, input[value="0"]',
      restrito: '#optRestrito, input[value="1"]',
      sigiloso: '#optSigiloso, input[value="2"]'
    },
    hipoteseLegal: '#selHipoteseLegal, select[name="selHipoteseLegal"]',
    salvar: '#btnSalvar, button[name="sbmCadastrarProcedimento"]'
  },
  // ============================================
  // Formulário de Novo Documento
  // ============================================
  newDocument: {
    form: '#frmDocumentoGerar, form[name="frmDocumentoGerar"]',
    // Seleção de tipo
    tipoContainer: "#divTipoDocumento, .tipo-documento-container",
    tipoSearch: '#txtPalavrasPesquisaTipo, input[name="txtPalavrasPesquisaTipo"]',
    tipoSelect: '#selSerie, select[name="selSerie"]',
    tipoLinks: 'a[href*="documento_gerar"], .tipo-documento a',
    // Texto inicial
    textoInicial: {
      nenhum: '#optSemTexto, input[value="N"]',
      modelo: '#optTextoPadrao, input[value="M"]',
      padrao: '#optTextoModelo, input[value="T"]'
    },
    textoPadraoSelect: '#selTextoPadrao, select[name="selTextoPadrao"]',
    documentoModeloInput: '#txtProtocolo, input[name="txtProtocolo"]',
    // Campos básicos
    descricao: '#txtDescricao, input[name="txtDescricao"]',
    numero: '#txtNumero, input[name="txtNumero"]',
    nomeArvore: '#txtNomeArvore, input[name="txtNomeArvore"]',
    // Interessados
    interessadoInput: '#txtInteressado, input[name="txtInteressado"]',
    interessadoAdd: '#btnAdicionarInteressado, a[onclick*="adicionarInteressado"]',
    interessadosList: "#tblInteressados, .lista-interessados",
    // Destinatários
    destinatarioInput: '#txtDestinatario, input[name="txtDestinatario"]',
    destinatarioAdd: '#btnAdicionarDestinatario, a[onclick*="adicionarDestinatario"]',
    destinatariosList: "#tblDestinatarios, .lista-destinatarios",
    // Assuntos
    assuntoBtn: '#btnPesquisarAssunto, a[href*="assunto_selecionar"]',
    assuntoInput: '#txtAssunto, input[name="txtAssunto"]',
    // Observações
    observacao: '#txaObservacoes, textarea[name="txaObservacoes"]',
    // Nível de acesso
    nivelAcesso: {
      publico: '#optPublico, input[value="0"]',
      restrito: '#optRestrito, input[value="1"]',
      sigiloso: '#optSigiloso, input[value="2"]'
    },
    hipoteseLegal: '#selHipoteseLegal, select[name="selHipoteseLegal"]',
    // Ações
    salvar: '#btnSalvar, button[name="sbmCadastrarDocumento"]',
    confirmar: '#btnConfirmar, button[name="sbmConfirmar"]'
  },
  // ============================================
  // Upload de Documento Externo
  // ============================================
  upload: {
    form: '#frmDocumentoExterno, form[name="frmDocumentoExterno"]',
    arquivo: '#filArquivo, input[type="file"]',
    formato: '#selFormato, select[name="selFormato"]',
    tipoConferencia: '#selTipoConferencia, select[name="selTipoConferencia"]',
    salvar: '#btnSalvar, button[name="sbmCadastrarDocumentoExterno"]'
  },
  // ============================================
  // Editor de Documento
  // ============================================
  editor: {
    frame: '#ifrArvoreHtml, iframe[name="ifrArvoreHtml"]',
    ckeditor: ".cke_editable, #cke_txtConteudo",
    textarea: '#txtConteudo, textarea[name="txtConteudo"]',
    salvar: '#btnSalvar, button[name="sbmSalvar"]'
  },
  // ============================================
  // Assinatura
  // ============================================
  signature: {
    form: '#frmDocumentoAssinar, form[name="frmDocumentoAssinar"]',
    senha: '#pwdSenha, input[name="pwdSenha"]',
    cargo: '#selCargo, select[name="selCargo"]',
    assinar: '#btnAssinar, button[name="sbmAssinar"]',
    confirmar: "#btnConfirmar"
  },
  // ============================================
  // Tramitação (Enviar Processo)
  // ============================================
  forward: {
    form: '#frmEnviarProcesso, form[name="frmEnviarProcesso"]',
    unidadeInput: '#txtUnidade, input[name="txtUnidade"]',
    unidadeSelect: '#selUnidades, select[name="selUnidades"]',
    unidadeAdd: '#btnAdicionarUnidade, a[onclick*="adicionarUnidade"]',
    manterAberto: '#chkManterAberto, input[name="chkManterAberto"]',
    removerAnotacoes: '#chkRemoverAnotacoes, input[name="chkRemoverAnotacoes"]',
    enviarEmail: '#chkEnviarEmail, input[name="chkEnviarEmail"]',
    dataRetorno: '#txtDataRetorno, input[name="txtDataRetorno"]',
    enviar: '#btnEnviar, button[name="sbmEnviar"]'
  },
  // ============================================
  // Bloco de Assinatura
  // ============================================
  block: {
    container: "#divBlocos, .blocos-container",
    novo: 'a[href*="bloco_cadastrar"], #btnNovoBloco',
    lista: "#tblBlocos, .lista-blocos",
    incluirDocumento: 'a[href*="bloco_incluir_documento"]',
    disponibilizar: 'a[href*="bloco_disponibilizar"]',
    assinar: 'a[href*="bloco_assinar"]',
    formNovo: {
      descricao: '#txtDescricao, input[name="txtDescricao"]',
      unidadeInput: '#txtUnidade, input[name="txtUnidade"]',
      salvar: '#btnSalvar, button[name="sbmSalvar"]'
    }
  },
  // ============================================
  // Andamento / Histórico
  // ============================================
  history: {
    container: "#divAndamentos, .historico-container",
    table: "#tblHistorico, .infraTable",
    rows: 'tr[class*="infraTr"]',
    data: "td:first-child",
    unidade: "td:nth-child(2)",
    usuario: "td:nth-child(3)",
    descricao: "td:nth-child(4)"
  },
  // ============================================
  // Elementos Comuns
  // ============================================
  common: {
    loading: "#divInfraCarregando, .infraCarregando",
    modal: "#divInfraModal, .infraModal",
    alert: ".infraException, .msgErro, .alert-danger",
    success: ".msgSucesso, .alert-success",
    iframe: 'iframe[name="ifrVisualizacao"], iframe[name="ifrConteudo"]',
    close: '#btnFechar, a[onclick*="fechar"], .btn-close',
    confirm: '#btnConfirmar, button[name="sbmConfirmar"]',
    cancel: '#btnCancelar, button[name="sbmCancelar"]'
  }
};

// src/browser/client.ts
import * as fs2 from "fs";
import * as path2 from "path";
import * as os2 from "os";

// src/core/resilience.ts
var RESILIENCE_DEFAULTS = {
  failFastTimeout: 3e3,
  maxRetries: 2,
  retryBackoff: 500,
  speculative: false
};
function resolveResilienceConfig(config) {
  return { ...RESILIENCE_DEFAULTS, ...config };
}
function classifyError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("econnreset") || lower.includes("econnrefused") || lower.includes("epipe") || lower.includes("navigation") || lower.includes("net::err_")) {
    return "transient";
  }
  if (lower.includes("not found") || lower.includes("n\xE3o encontrado") || lower.includes("waiting for selector") || lower.includes("waiting for locator") || lower.includes("strict mode violation")) {
    return "selector_not_found";
  }
  return "permanent";
}
async function failFast(fn, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Fail-fast: timeout de ${timeout}ms excedido`));
    }, timeout);
    fn().then((result) => {
      clearTimeout(timer);
      resolve(result);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
async function withRetry(fn, opts) {
  const retryOn = opts.retryOn ?? ["transient"];
  let lastError;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === opts.maxRetries) break;
      const kind = classifyError(error);
      if (!retryOn.includes(kind)) break;
      const delay = opts.backoff * Math.pow(2, attempt);
      const jitter = delay * (0.8 + Math.random() * 0.4);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
  throw lastError;
}

// src/core/selector-store.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var DEFAULT_DIR = path.join(os.homedir(), ".sei-playwright");
var DEFAULT_FILE = "selector-cache.json";
var DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var SelectorStore = class {
  filePath;
  cache = /* @__PURE__ */ new Map();
  dirty = false;
  constructor(storePath) {
    this.filePath = storePath ?? path.join(DEFAULT_DIR, DEFAULT_FILE);
    this.load();
  }
  get(key) {
    const entry = this.cache.get(key);
    return entry?.discoveredSelector ?? null;
  }
  set(key, selector) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = this.cache.get(key);
    this.cache.set(key, {
      discoveredSelector: selector,
      discoveredAt: existing?.discoveredAt ?? now,
      successCount: existing?.successCount ?? 0,
      lastSuccess: now
    });
    this.dirty = true;
    this.save();
  }
  recordSuccess(key) {
    const entry = this.cache.get(key);
    if (!entry) return;
    entry.successCount++;
    entry.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
    this.dirty = true;
    this.debounceSave();
  }
  prune(maxAge = DEFAULT_MAX_AGE_MS) {
    const cutoff = Date.now() - maxAge;
    let removed = 0;
    for (const [key, entry] of this.cache) {
      const lastUsed = new Date(entry.lastSuccess).getTime();
      if (lastUsed < cutoff) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.dirty = true;
      this.save();
    }
    return removed;
  }
  get size() {
    return this.cache.size;
  }
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const data = JSON.parse(raw);
        for (const [key, entry] of Object.entries(data)) {
          this.cache.set(key, entry);
        }
      }
    } catch {
    }
  }
  save() {
    if (!this.dirty) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {};
      for (const [key, entry] of this.cache) {
        data[key] = entry;
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
      this.dirty = false;
    } catch {
    }
  }
  saveTimer = null;
  debounceSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 5e3);
  }
};

// src/core/agent-fallback.ts
var DEFAULT_MODEL = "claude-sonnet-4-20250514";
var DEFAULT_MAX_TOKENS = 1024;
function createAgentFallback(config) {
  if (!config.enabled) return null;
  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[AGENT-FALLBACK] Nenhuma API key encontrada. Desativando agent fallback.");
    return null;
  }
  let anthropicClient = null;
  async function getClient() {
    if (anthropicClient) return anthropicClient;
    try {
      const { default: Anthropic } = await import("./sdk-64FSB2WI.js");
      anthropicClient = new Anthropic({ apiKey });
      return anthropicClient;
    } catch {
      console.warn("[AGENT-FALLBACK] @anthropic-ai/sdk n\xE3o instalado. Desativando agent fallback.");
      return null;
    }
  }
  return {
    async askForSelector(page, description, context, original) {
      const client = await getClient();
      if (!client) return null;
      try {
        const screenshotBuffer = await page.screenshot({
          fullPage: false,
          type: "jpeg",
          quality: 60
        });
        const screenshotBase64 = screenshotBuffer.toString("base64");
        const domSnapshot = await extractInteractiveDOM(page);
        const nameStr = original.name instanceof RegExp ? original.name.source : original.name;
        const prompt = `Voc\xEA \xE9 um assistente especializado em automa\xE7\xE3o do sistema SEI (Sistema Eletr\xF4nico de Informa\xE7\xF5es) do governo brasileiro.

TAREFA: Encontre o elemento descrito abaixo na p\xE1gina e retorne APENAS um seletor CSS v\xE1lido.

ELEMENTO PROCURADO: ${description}
CONTEXTO DA P\xC1GINA: ${context}
SELETOR ORIGINAL (que falhou):
- role: ${original.role}
- name: ${nameStr}
- fallback CSS: ${original.cssFallback ?? "N/A"}

ELEMENTOS INTERATIVOS NA P\xC1GINA:
${domSnapshot}

REGRAS:
1. Retorne APENAS o seletor CSS, sem explica\xE7\xE3o
2. O seletor deve ser espec\xEDfico o suficiente para ser \xFAnico
3. Prefira seletores por ID > atributos > classe > hierarquia
4. O seletor deve funcionar com document.querySelector()
5. Formate a resposta assim: SELECTOR: <seu-seletor-aqui>

Analise o screenshot e o DOM para encontrar o elemento correto.`;
        const response = await client.messages.create({
          model: config.model ?? DEFAULT_MODEL,
          max_tokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: screenshotBase64
                  }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ]
        });
        const text = response.content.filter((c) => c.type === "text").map((c) => c.text).join("");
        const selector = extractSelectorFromResponse(text);
        if (!selector) return null;
        const valid = await validateSelector(page, selector);
        if (!valid) return null;
        return selector;
      } catch (error) {
        console.warn("[AGENT-FALLBACK] Erro ao consultar agent:", error);
        return null;
      }
    }
  };
}
async function extractInteractiveDOM(page) {
  return await page.evaluate(() => {
    const doc = globalThis.document;
    const interactiveTags = ["INPUT", "BUTTON", "SELECT", "TEXTAREA", "A", "LABEL"];
    const elements = [];
    function describeElement(el) {
      const tag = el.tagName.toLowerCase();
      const attrs = [];
      for (const attr of ["id", "name", "class", "type", "role", "aria-label", "placeholder", "href", "value"]) {
        const val = el.getAttribute(attr);
        if (val) attrs.push(`${attr}="${val.substring(0, 80)}"`);
      }
      const text = (el.textContent ?? "").trim().substring(0, 60);
      const textPart = text ? ` text="${text}"` : "";
      return `<${tag} ${attrs.join(" ")}${textPart}/>`;
    }
    for (const tag of interactiveTags) {
      const nodeList = doc.querySelectorAll(tag);
      for (let i = 0; i < nodeList.length; i++) {
        const el = nodeList[i];
        if (el.offsetParent !== null) {
          elements.push(describeElement(el));
        }
      }
    }
    const roleNodes = doc.querySelectorAll("[role]");
    for (let i = 0; i < roleNodes.length; i++) {
      const el = roleNodes[i];
      if (el.offsetParent !== null) {
        const desc = describeElement(el);
        if (!elements.includes(desc)) {
          elements.push(desc);
        }
      }
    }
    return elements.join("\n").substring(0, 5e3);
  });
}
function extractSelectorFromResponse(text) {
  const match = text.match(/SELECTOR:\s*(.+)/i);
  if (match) {
    return match[1].trim().replace(/^["'`]+|["'`]+$/g, "");
  }
  const codeMatch = text.match(/```(?:css)?\s*\n?(.+?)\n?```/s);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[#.\[\w]/.test(line) && !line.includes(" ") || line.includes("[") || line.startsWith("#")) {
      return line;
    }
  }
  return null;
}
async function validateSelector(page, selector) {
  try {
    const el = await page.$(selector);
    return el !== null;
  } catch {
    return false;
  }
}

// src/browser/client.ts
var SEIBrowserClient = class {
  config;
  browser = null;
  context = null;
  page = null;
  /** Endpoint CDP para reconexão */
  cdpEndpoint = null;
  /** Resiliência */
  resilience;
  selectorStore;
  agentFallback = null;
  constructor(config) {
    this.config = config;
    this.resilience = resolveResilienceConfig(config.resilience);
    this.selectorStore = new SelectorStore();
    if (config.agentFallback) {
      this.agentFallback = createAgentFallback(config.agentFallback);
    }
  }
  /** URL base do SEI */
  get baseUrl() {
    return this.config.baseUrl.replace(/\/$/, "");
  }
  /** Timeout padrao */
  get timeout() {
    return this.config.playwright?.timeout ?? 3e4;
  }
  /** Diretório padrão para persistent context */
  get defaultUserDataDir() {
    return path2.join(os2.homedir(), ".sei-playwright", "chrome-profile");
  }
  /** Inicializa o navegador */
  async init() {
    const options = this.config.playwright ?? {};
    if (options.cdpEndpoint) {
      this.browser = await chromium.connectOverCDP(options.cdpEndpoint);
      this.cdpEndpoint = options.cdpEndpoint;
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
        const pages = this.context.pages();
        this.page = pages[0] ?? await this.context.newPage();
      } else {
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
      }
      this.page.setDefaultTimeout(this.timeout);
      return;
    }
    if (options.persistent || options.userDataDir) {
      const userDataDir = options.userDataDir ?? this.defaultUserDataDir;
      if (!fs2.existsSync(userDataDir)) {
        fs2.mkdirSync(userDataDir, { recursive: true });
      }
      const args2 = [];
      if (options.cdpPort) {
        args2.push(`--remote-debugging-port=${options.cdpPort}`);
        this.cdpEndpoint = `http://127.0.0.1:${options.cdpPort}`;
      }
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless: options.headless ?? true,
        channel: options.channel,
        // 'chrome' usa Chrome instalado
        args: args2.length > 0 ? args2 : void 0
      });
      this.page = this.context.pages()[0] ?? await this.context.newPage();
      this.page.setDefaultTimeout(this.timeout);
      return;
    }
    const args = [];
    if (options.cdpPort) {
      args.push(`--remote-debugging-port=${options.cdpPort}`);
      this.cdpEndpoint = `http://127.0.0.1:${options.cdpPort}`;
    }
    this.browser = await chromium.launch({
      headless: options.headless ?? true,
      channel: options.channel,
      args: args.length > 0 ? args : void 0
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.timeout);
  }
  /** Verifica se esta inicializado */
  get isReady() {
    return this.page !== null;
  }
  /** Obtem a pagina atual */
  getPage() {
    if (!this.page) {
      throw new Error("Cliente nao inicializado. Chame init() primeiro.");
    }
    return this.page;
  }
  /** Fecha o navegador */
  async close() {
    if (this.config.playwright?.keepAlive) {
      console.log("[SEI] keepAlive ativo - navegador mantido aberto");
      this.page = null;
      this.context = null;
      this.browser = null;
      return;
    }
    if (this.browser) {
      await this.browser.close();
    } else if (this.context) {
      await this.context.close();
    }
    this.browser = null;
    this.context = null;
    this.page = null;
  }
  // ============================================
  // Session Management & Window Control
  // ============================================
  /**
   * Retorna o endpoint CDP para reconexão futura
   * Útil para manter sessão entre execuções
   */
  getCdpEndpoint() {
    return this.cdpEndpoint;
  }
  /**
   * Minimiza a janela do navegador (via CDP)
   * Útil quando se quer manter o navegador aberto mas fora do caminho
   */
  async minimizeWindow() {
    if (!this.page) return;
    try {
      const cdp = await this.page.context().newCDPSession(this.page);
      const { windowId } = await cdp.send("Browser.getWindowForTarget");
      await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds: { windowState: "minimized" }
      });
      console.log("[SEI] Janela minimizada");
    } catch (err) {
      console.warn("[SEI] Erro ao minimizar janela:", err);
    }
  }
  /**
   * Restaura a janela do navegador (via CDP)
   */
  async restoreWindow() {
    if (!this.page) return;
    try {
      const cdp = await this.page.context().newCDPSession(this.page);
      const { windowId } = await cdp.send("Browser.getWindowForTarget");
      await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds: { windowState: "normal" }
      });
      console.log("[SEI] Janela restaurada");
    } catch (err) {
      console.warn("[SEI] Erro ao restaurar janela:", err);
    }
  }
  /**
   * Traz a janela para frente
   */
  async bringToFront() {
    if (!this.page) return;
    await this.page.bringToFront();
    console.log("[SEI] Janela trazida para frente");
  }
  /**
   * Obtém as dimensões e posição da janela
   */
  async getWindowBounds() {
    if (!this.page) return null;
    try {
      const cdp = await this.page.context().newCDPSession(this.page);
      const { windowId } = await cdp.send("Browser.getWindowForTarget");
      const result = await cdp.send("Browser.getWindowBounds", { windowId });
      return result.bounds;
    } catch (err) {
      console.warn("[SEI] Erro ao obter bounds da janela:", err);
      return null;
    }
  }
  /**
   * Define as dimensões e posição da janela
   */
  async setWindowBounds(bounds) {
    if (!this.page) return;
    try {
      const cdp = await this.page.context().newCDPSession(this.page);
      const { windowId } = await cdp.send("Browser.getWindowForTarget");
      await cdp.send("Browser.setWindowBounds", {
        windowId,
        bounds
      });
      console.log("[SEI] Bounds da janela atualizados");
    } catch (err) {
      console.warn("[SEI] Erro ao definir bounds da janela:", err);
    }
  }
  /**
   * Maximiza a janela do navegador
   */
  async maximizeWindow() {
    await this.setWindowBounds({ windowState: "maximized" });
    console.log("[SEI] Janela maximizada");
  }
  /**
   * Coloca a janela em tela cheia
   */
  async fullscreenWindow() {
    await this.setWindowBounds({ windowState: "fullscreen" });
    console.log("[SEI] Janela em tela cheia");
  }
  /**
   * Verifica se a sessão ainda está ativa
   */
  async isSessionActive() {
    try {
      return await this.isLoggedIn();
    } catch {
      return false;
    }
  }
  /**
   * Obtém o contexto atual do browser
   */
  getContext() {
    return this.context;
  }
  /**
   * Obtém o browser atual
   */
  getBrowser() {
    return this.browser;
  }
  /** Aguarda carregamento */
  async waitForLoad() {
    const page = this.getPage();
    await page.waitForLoadState("networkidle");
    try {
      const spinner = page.locator('[class*="Carregando"], [class*="loading"], [aria-busy="true"]');
      await spinner.waitFor({ state: "hidden", timeout: 5e3 });
    } catch {
    }
  }
  /** Navega para URL */
  async navigate(path3) {
    const page = this.getPage();
    const url = path3.startsWith("http") ? path3 : `${this.baseUrl}${path3}`;
    await page.goto(url);
    await this.waitForLoad();
  }
  // ============================================
  // Helpers para Locators Semanticos
  // ============================================
  /** Obtem locator para campo de texto por label */
  getTextbox(page, namePattern) {
    return page.getByRole("textbox", { name: namePattern });
  }
  /** Obtem locator para botao por nome */
  getButton(page, namePattern) {
    return page.getByRole("button", { name: namePattern });
  }
  /** Obtem locator para link por nome */
  getLink(page, namePattern) {
    return page.getByRole("link", { name: namePattern });
  }
  /** Obtem locator para combobox/select */
  getCombobox(page, namePattern) {
    if (namePattern) {
      return page.getByRole("combobox", { name: namePattern });
    }
    return page.getByRole("combobox");
  }
  /** Obtem locator para checkbox por nome */
  getCheckbox(page, namePattern) {
    return page.getByRole("checkbox", { name: namePattern });
  }
  /** Obtem locator para radio button por nome */
  getRadio(page, namePattern) {
    return page.getByRole("radio", { name: namePattern });
  }
  /** Obtem frame locator para iframe da arvore */
  getTreeFrame(page) {
    return page.frameLocator('iframe[name="ifrArvore"]');
  }
  /** Obtem frame locator para iframe de visualizacao */
  getViewFrame(page) {
    return page.frameLocator('iframe[name="ifrVisualizacao"], iframe[name="ifrConteudo"]');
  }
  /** Obtem frame locator para editor */
  getEditorFrame(page) {
    return page.frameLocator('iframe[name="ifrArvoreHtml"], #ifrArvoreHtml');
  }
  // ============================================
  // Smart Helpers (ARIA primeiro, CSS fallback, Self-Healing)
  // ============================================
  /**
   * Gera chave para o selector store.
   */
  getSelectorKey(role, name, context) {
    const nameStr = name instanceof RegExp ? name.source : name ?? "unknown";
    return `sei|${context ?? "default"}|${role}:${nameStr}`;
  }
  /**
   * Tenta executar ação via CSS selector no target (Page ou FrameLocator).
   */
  async executeCssAction(target, cssSelector, action) {
    const locator = "locator" in target ? target.locator(cssSelector) : target.locator(cssSelector);
    return await action(locator.first());
  }
  /**
   * Tenta agent fallback para descobrir seletor.
   * Só funciona com target = Page (não FrameLocator).
   */
  async tryAgentFallback(target, aria, cssFallback) {
    if (!this.agentFallback) return null;
    if (!("screenshot" in target)) return null;
    const page = target;
    const nameStr = aria.name instanceof RegExp ? aria.name.source : aria.name ?? "";
    const description = `${aria.role} com texto "${nameStr}"`;
    const original = {
      role: aria.role,
      name: aria.name ?? "",
      cssFallback
    };
    return await this.agentFallback.askForSelector(page, description, "sei", original);
  }
  /** Clica em elemento: ARIA → CSS → Store → Agent */
  async clickSmart(target, aria, cssFallback) {
    const t = this.resilience.failFastTimeout;
    const storeKey = this.getSelectorKey(aria.role, aria.name);
    try {
      await failFast(
        () => target.getByRole(aria.role, { name: aria.name }).first().click(),
        t
      );
      this.selectorStore.recordSuccess(storeKey);
      return;
    } catch {
    }
    if (cssFallback) {
      try {
        await failFast(
          () => this.executeCssAction(target, cssFallback, (loc) => loc.click()),
          t
        );
        return;
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        await failFast(
          () => this.executeCssAction(target, cached, (loc) => loc.click()),
          t
        );
        this.selectorStore.recordSuccess(storeKey);
        console.log(`[SELF-HEALING] Usando seletor do cache: ${cached}`);
        return;
      } catch {
      }
    }
    const discovered = await this.tryAgentFallback(target, aria, cssFallback);
    if (discovered) {
      try {
        await this.executeCssAction(target, discovered, (loc) => loc.click());
        this.selectorStore.set(storeKey, discovered);
        console.log(`[SELF-HEALING] Novo seletor descoberto: ${discovered}`);
        return;
      } catch {
      }
    }
    throw new Error(`Elemento n\xE3o encontrado: ${aria.role} "${aria.name}"`);
  }
  /** Preenche campo: ARIA → CSS → Store → Agent */
  async fillSmart(target, aria, value, cssFallback) {
    const t = this.resilience.failFastTimeout;
    const storeKey = this.getSelectorKey(aria.role ?? "textbox", aria.name);
    try {
      await failFast(async () => {
        let locator;
        if (aria.role && aria.name) {
          locator = target.getByRole(aria.role, { name: aria.name });
        } else if (aria.role) {
          locator = target.getByRole(aria.role);
        } else {
          throw new Error("role \xE9 obrigat\xF3rio");
        }
        if (aria.nth !== void 0) {
          locator = locator.nth(aria.nth);
        } else {
          locator = locator.first();
        }
        await locator.fill(value);
      }, t);
      this.selectorStore.recordSuccess(storeKey);
      return;
    } catch {
    }
    if (cssFallback) {
      try {
        await failFast(
          () => this.executeCssAction(target, cssFallback, (loc) => loc.fill(value)),
          t
        );
        return;
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        await failFast(
          () => this.executeCssAction(target, cached, (loc) => loc.fill(value)),
          t
        );
        this.selectorStore.recordSuccess(storeKey);
        return;
      } catch {
      }
    }
    const discovered = await this.tryAgentFallback(target, { role: aria.role ?? "textbox", name: aria.name }, cssFallback);
    if (discovered) {
      try {
        await this.executeCssAction(target, discovered, (loc) => loc.fill(value));
        this.selectorStore.set(storeKey, discovered);
        console.log(`[SELF-HEALING] Novo seletor descoberto: ${discovered}`);
        return;
      } catch {
      }
    }
    throw new Error(`Campo n\xE3o encontrado: ${aria.role} "${aria.name}"`);
  }
  /** Seleciona opção: ARIA → CSS → Store → Agent */
  async selectSmart(target, aria, value, cssFallback) {
    const t = this.resilience.failFastTimeout;
    const storeKey = this.getSelectorKey(aria.role ?? "combobox", aria.name);
    try {
      await failFast(async () => {
        let locator;
        if (aria.role && aria.name) {
          locator = target.getByRole(aria.role, { name: aria.name });
        } else if (aria.role) {
          locator = target.getByRole(aria.role);
        } else {
          throw new Error("role \xE9 obrigat\xF3rio");
        }
        if (aria.nth !== void 0) {
          locator = locator.nth(aria.nth);
        } else {
          locator = locator.first();
        }
        await locator.selectOption(value);
      }, t);
      this.selectorStore.recordSuccess(storeKey);
      return;
    } catch {
    }
    if (cssFallback) {
      try {
        await failFast(
          () => this.executeCssAction(target, cssFallback, (loc) => loc.selectOption(value)),
          t
        );
        return;
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        await failFast(
          () => this.executeCssAction(target, cached, (loc) => loc.selectOption(value)),
          t
        );
        this.selectorStore.recordSuccess(storeKey);
        return;
      } catch {
      }
    }
    const discovered = await this.tryAgentFallback(target, { role: aria.role ?? "combobox", name: aria.name }, cssFallback);
    if (discovered) {
      try {
        await this.executeCssAction(target, discovered, (loc) => loc.selectOption(value));
        this.selectorStore.set(storeKey, discovered);
        return;
      } catch {
      }
    }
    throw new Error(`Select n\xE3o encontrado: ${aria.role} "${aria.name}"`);
  }
  /** Marca checkbox/radio: ARIA → CSS → Store → Agent */
  async checkSmart(target, aria, cssFallback) {
    const t = this.resilience.failFastTimeout;
    const storeKey = this.getSelectorKey(aria.role, aria.name);
    try {
      await failFast(
        () => target.getByRole(aria.role, { name: aria.name }).first().check(),
        t
      );
      this.selectorStore.recordSuccess(storeKey);
      return;
    } catch {
    }
    if (cssFallback) {
      try {
        await failFast(
          () => this.executeCssAction(target, cssFallback, (loc) => loc.check()),
          t
        );
        return;
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        await failFast(
          () => this.executeCssAction(target, cached, (loc) => loc.check()),
          t
        );
        this.selectorStore.recordSuccess(storeKey);
        return;
      } catch {
      }
    }
    const discovered = await this.tryAgentFallback(target, aria, cssFallback);
    if (discovered) {
      try {
        await this.executeCssAction(target, discovered, (loc) => loc.check());
        this.selectorStore.set(storeKey, discovered);
        return;
      } catch {
      }
    }
    throw new Error(`${aria.role} n\xE3o encontrado: "${aria.name}"`);
  }
  /** Aguarda elemento: ARIA → CSS → Store */
  async waitForSmart(target, aria, cssFallback, options) {
    const t = options?.timeout ?? this.resilience.failFastTimeout;
    const state = options?.state ?? "visible";
    const storeKey = this.getSelectorKey(aria.role, aria.name);
    try {
      const locator = aria.name ? target.getByRole(aria.role, { name: aria.name }) : target.getByRole(aria.role);
      await failFast(() => locator.first().waitFor({ timeout: t, state }), t + 500);
      this.selectorStore.recordSuccess(storeKey);
      return;
    } catch {
    }
    if (cssFallback) {
      const locator = "locator" in target ? target.locator(cssFallback) : target.locator(cssFallback);
      await locator.first().waitFor({ timeout: t, state });
      return;
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      const locator = "locator" in target ? target.locator(cached) : target.locator(cached);
      await locator.first().waitFor({ timeout: t, state });
      this.selectorStore.recordSuccess(storeKey);
      return;
    }
    throw new Error(`Elemento n\xE3o encontrado: ${aria.role} "${aria.name}"`);
  }
  /** Obtém texto de elemento: ARIA → CSS → Store */
  async getTextSmart(target, aria, cssFallback) {
    const storeKey = this.getSelectorKey(aria.role, aria.name);
    try {
      const locator = aria.name ? target.getByRole(aria.role, { name: aria.name }) : target.getByRole(aria.role);
      const text = await locator.first().textContent();
      this.selectorStore.recordSuccess(storeKey);
      return text;
    } catch {
    }
    if (cssFallback) {
      try {
        const locator = "locator" in target ? target.locator(cssFallback) : target.locator(cssFallback);
        return await locator.first().textContent();
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        const locator = "locator" in target ? target.locator(cached) : target.locator(cached);
        const text = await locator.first().textContent();
        this.selectorStore.recordSuccess(storeKey);
        return text;
      } catch {
      }
    }
    return null;
  }
  /** Verifica se elemento existe: ARIA → CSS → Store */
  async existsSmart(target, aria, cssFallback, timeout = 2e3) {
    const storeKey = this.getSelectorKey(aria.role, aria.name);
    try {
      const locator = aria.name ? target.getByRole(aria.role, { name: aria.name }) : target.getByRole(aria.role);
      await locator.first().waitFor({ timeout, state: "visible" });
      this.selectorStore.recordSuccess(storeKey);
      return true;
    } catch {
    }
    if (cssFallback) {
      try {
        const locator = "locator" in target ? target.locator(cssFallback) : target.locator(cssFallback);
        await locator.first().waitFor({ timeout, state: "visible" });
        return true;
      } catch {
      }
    }
    const cached = this.selectorStore.get(storeKey);
    if (cached) {
      try {
        const locator = "locator" in target ? target.locator(cached) : target.locator(cached);
        await locator.first().waitFor({ timeout, state: "visible" });
        this.selectorStore.recordSuccess(storeKey);
        return true;
      } catch {
      }
    }
    return false;
  }
  // ============================================
  // Autenticacao
  // ============================================
  /** Realiza login no SEI */
  async login(usuario, senha, orgao) {
    const page = this.getPage();
    const creds = this.config.browser ?? {};
    await this.navigate("/sei/");
    if (await this.existsSmart(page, { role: "link", name: /sair|logout/i }, "#lnkUsuarioSistema, .usuario-logado")) {
      return true;
    }
    const userValue = usuario ?? creds.usuario ?? "";
    const passValue = senha ?? creds.senha ?? "";
    await this.fillSmart(page, { role: "textbox", nth: 0 }, userValue, SEI_SELECTORS.login.usuario);
    await this.fillSmart(page, { role: "textbox", name: /senha/i }, passValue, "input#pwdSenha.masked, input#pwdSenha");
    const orgaoValue = orgao ?? creds.orgao;
    if (orgaoValue) {
      await this.selectSmart(page, { role: "combobox", nth: 0 }, { label: orgaoValue }, SEI_SELECTORS.login.orgao);
    }
    await this.clickSmart(page, { role: "button", name: /acessar|entrar|login/i }, SEI_SELECTORS.login.submit);
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "link", name: /sair|logout/i }, "#lnkUsuarioSistema", 5e3);
  }
  /** Verifica se está logado */
  async isLoggedIn() {
    const page = this.getPage();
    return await this.existsSmart(page, { role: "link", name: /sair|logout/i }, "#lnkUsuarioSistema, .usuario-logado");
  }
  /** Realiza logout */
  async logout() {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /sair|logout/i }, SEI_SELECTORS.nav.logout);
      await this.waitForLoad();
    } catch {
    }
  }
  // ============================================
  // Processos
  // ============================================
  /** Abre processo pelo numero */
  async openProcess(numeroProcesso) {
    const page = this.getPage();
    await this.fillSmart(page, { role: "textbox", name: /pesquis/i }, numeroProcesso, SEI_SELECTORS.nav.pesquisa);
    try {
      await this.clickSmart(page, { role: "button", name: /pesquis/i }, SEI_SELECTORS.nav.btnPesquisa);
    } catch {
      await this.clickSmart(page, { role: "link", name: /pesquis/i }, SEI_SELECTORS.nav.btnPesquisa);
    }
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "tree" }, '#divArvore, #arvore, [class*="arvore"]', 5e3);
  }
  /** Lista documentos do processo atual */
  async listDocuments() {
    const page = this.getPage();
    const docs = [];
    try {
      const frame = this.getTreeFrame(page);
      const docLinks = await frame.getByRole("link").filter({ hasText: /\(\d+\)/ }).all();
      for (const link of docLinks) {
        const href = await link.getAttribute("href") ?? "";
        const text = await link.textContent() ?? "";
        const idMatch = href.match(/id_documento=(\d+)/);
        const id = idMatch?.[1] ?? "";
        const parts = text.split(/\s+/);
        const tipo = parts[0] ?? "";
        const titulo = parts.slice(1).join(" ") || tipo;
        if (id) {
          docs.push({ id, titulo, tipo });
        }
      }
    } catch {
      const links = await page.$$(SEI_SELECTORS.processTree.documents);
      for (const link of links) {
        const href = await link.getAttribute("href") ?? "";
        const text = await link.textContent() ?? "";
        const idMatch = href.match(/id_documento=(\d+)/);
        const id = idMatch?.[1] ?? "";
        const parts = text.split(/\s+/);
        const tipo = parts[0] ?? "";
        const titulo = parts.slice(1).join(" ") || tipo;
        if (id) {
          docs.push({ id, titulo, tipo });
        }
      }
    }
    return docs;
  }
  /** Tramita processo para unidades */
  async forwardProcess(options) {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /enviar processo/i }, SEI_SELECTORS.processActions.enviarProcesso);
    await this.waitForLoad();
    for (const unidade of options.unidadesDestino) {
      await this.fillSmart(page, { role: "textbox", name: /unidade/i }, unidade, SEI_SELECTORS.forward.unidadeInput);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
    if (options.manterAberto !== void 0) {
      try {
        const checkbox = page.getByRole("checkbox", { name: /manter.*aberto/i }).or(page.locator(SEI_SELECTORS.forward.manterAberto));
        const isChecked = await checkbox.first().isChecked();
        if (isChecked !== options.manterAberto) {
          await checkbox.first().click();
        }
      } catch {
      }
    }
    if (options.enviarEmailNotificacao !== void 0) {
      try {
        const checkbox = page.getByRole("checkbox", { name: /e-?mail|notifica/i }).or(page.locator(SEI_SELECTORS.forward.enviarEmail));
        const isChecked = await checkbox.first().isChecked();
        if (isChecked !== options.enviarEmailNotificacao) {
          await checkbox.first().click();
        }
      } catch {
      }
    }
    await this.clickSmart(page, { role: "button", name: /enviar/i }, SEI_SELECTORS.forward.enviar);
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "alert" }, '.msgSucesso, .alert-success, [class*="sucesso"]', 5e3);
  }
  /** Conclui processo */
  async concludeProcess() {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /concluir.*processo/i }, SEI_SELECTORS.processActions.concluirProcesso);
    await this.waitForLoad();
    try {
      await this.clickSmart(page, { role: "button", name: /confirmar|sim|ok/i });
      await this.waitForLoad();
    } catch {
    }
    return true;
  }
  /** Reabre processo */
  async reopenProcess() {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /reabrir.*processo/i }, SEI_SELECTORS.processActions.reabrirProcesso);
    await this.waitForLoad();
    return true;
  }
  /** Cria novo processo */
  async createProcess(options) {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /iniciar.*processo/i }, SEI_SELECTORS.nav.iniciarProcesso);
    await this.waitForLoad();
    try {
      await this.fillSmart(page, { role: "textbox", name: /pesquis.*tipo|tipo.*procedimento/i }, options.tipoProcedimento, SEI_SELECTORS.newProcess.tipoSearch);
      await page.waitForTimeout(500);
    } catch {
    }
    let tipoEncontrado = false;
    try {
      if (await this.existsSmart(page, { role: "link", name: new RegExp(options.tipoProcedimento, "i") }, void 0, 2e3)) {
        await this.clickSmart(page, { role: "link", name: new RegExp(options.tipoProcedimento, "i") });
        await this.waitForLoad();
        tipoEncontrado = true;
      }
    } catch {
    }
    if (!tipoEncontrado) {
      try {
        await this.selectSmart(page, { role: "combobox", name: /tipo.*procedimento/i }, { label: options.tipoProcedimento }, SEI_SELECTORS.newProcess.tipo);
        await this.waitForLoad();
      } catch {
        try {
          const select = await page.$(SEI_SELECTORS.newProcess.tipo);
          if (select) {
            const optionValues = await select.$$eval(
              "option",
              (opts) => opts.map((o) => ({ value: o.value, text: o.textContent }))
            );
            const match = optionValues.find(
              (o) => o.text?.toLowerCase().includes(options.tipoProcedimento.toLowerCase())
            );
            if (match?.value) {
              await page.selectOption(SEI_SELECTORS.newProcess.tipo, match.value);
              await this.waitForLoad();
            }
          }
        } catch {
        }
      }
    }
    await this.fillSmart(page, { role: "textbox", name: /especifica[cç][aã]o/i }, options.especificacao, SEI_SELECTORS.newProcess.especificacao);
    if (options.assuntos?.length) {
      for (const assunto of options.assuntos) {
        try {
          await this.clickSmart(page, { role: "button", name: /pesquis.*assunto|adicionar.*assunto/i });
          await this.waitForLoad();
          await this.fillSmart(page, { role: "textbox", name: /palavras|pesquis/i }, assunto);
          await this.clickSmart(page, { role: "button", name: /pesquis/i });
          await this.waitForLoad();
          const resultado = page.getByRole("row").first().getByRole("link");
          await resultado.click();
          await this.waitForLoad();
        } catch {
        }
      }
    }
    if (options.interessados?.length) {
      for (const interessado of options.interessados) {
        try {
          await this.fillSmart(page, { role: "textbox", name: /interessado/i }, interessado);
          await page.waitForTimeout(300);
          const autocomplete = page.locator(".autocomplete-item, .infraAjaxListaItens div").first();
          if (await autocomplete.isVisible({ timeout: 1e3 })) {
            await autocomplete.click();
          } else {
            await page.keyboard.press("Tab");
          }
          try {
            await this.clickSmart(page, { role: "button", name: /adicionar.*interessado/i });
          } catch {
          }
          await page.waitForTimeout(200);
        } catch {
        }
      }
    }
    if (options.observacao) {
      try {
        await this.fillSmart(page, { role: "textbox", name: /observa[cç]/i }, options.observacao, SEI_SELECTORS.newProcess.observacao);
      } catch {
      }
    }
    if (options.nivelAcesso !== void 0) {
      const nivelLabel = options.nivelAcesso === 0 ? /p[uú]blico/i : options.nivelAcesso === 1 ? /restrito/i : /sigiloso/i;
      const selector = options.nivelAcesso === 0 ? SEI_SELECTORS.newProcess.nivelAcesso.publico : options.nivelAcesso === 1 ? SEI_SELECTORS.newProcess.nivelAcesso.restrito : SEI_SELECTORS.newProcess.nivelAcesso.sigiloso;
      try {
        await this.clickSmart(page, { role: "radio", name: nivelLabel }, selector);
        if ((options.nivelAcesso === 1 || options.nivelAcesso === 2) && options.hipoteseLegal) {
          await this.selectSmart(page, { role: "combobox", name: /hip[oó]tese.*legal/i }, { label: options.hipoteseLegal }, SEI_SELECTORS.newProcess.hipoteseLegal);
        }
      } catch {
      }
    }
    await this.clickSmart(page, { role: "button", name: /salvar|cadastrar|gerar/i }, SEI_SELECTORS.newProcess.salvar);
    await this.waitForLoad();
    try {
      await this.waitForSmart(page, { role: "tree" }, "#divArvore, #arvore", { timeout: 1e4 });
      const url = page.url();
      const idMatch = url.match(/id_procedimento=(\d+)/);
      const numeroElement = page.locator("#txtNumeroProcesso, .numero-processo, #anchor0").first();
      const numero = (await numeroElement.textContent())?.trim() ?? "";
      if (idMatch) {
        return {
          id: idMatch[1],
          numero
        };
      }
    } catch {
      const erro = page.locator(".infraException, .msgErro, .alert-danger").first();
      if (await erro.isVisible({ timeout: 1e3 })) {
        const mensagem = await erro.textContent();
        throw new Error(`Erro ao criar processo: ${mensagem}`);
      }
    }
    return null;
  }
  /** Gera PDF do processo */
  async downloadProcessPdf() {
    const page = this.getPage();
    const downloadPromise = page.waitForEvent("download");
    await this.clickSmart(page, { role: "link", name: /gerar.*pdf|download.*pdf/i }, SEI_SELECTORS.processActions.gerarPdf);
    try {
      const download = await downloadPromise;
      const path3 = await download.path();
      return path3;
    } catch {
      return null;
    }
  }
  // ============================================
  // Documentos
  // ============================================
  /** Abre documento pelo ID */
  async openDocument(idDocumento) {
    const page = this.getPage();
    try {
      const frame = this.getTreeFrame(page);
      const docLink = frame.getByRole("link").filter({ hasText: new RegExp(`\\(${idDocumento}\\)|${idDocumento}`) });
      if (await docLink.first().isVisible({ timeout: 2e3 })) {
        await docLink.first().click();
        await this.waitForLoad();
        return true;
      }
    } catch {
    }
    const links = await page.$$(SEI_SELECTORS.processTree.documents);
    for (const link of links) {
      const href = await link.getAttribute("href") ?? "";
      if (href.includes(`id_documento=${idDocumento}`) || href.includes(idDocumento)) {
        await link.click();
        await this.waitForLoad();
        return true;
      }
    }
    return false;
  }
  /** Cria documento interno */
  async createDocument(options) {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /incluir.*documento/i }, SEI_SELECTORS.processActions.incluirDocumento);
    await this.waitForLoad();
    try {
      await this.clickSmart(page, { role: "link", name: new RegExp(options.idSerie, "i") });
      await this.waitForLoad();
    } catch {
      const tipoLinks = await page.$$(SEI_SELECTORS.newDocument.tipoLinks);
      for (const link of tipoLinks) {
        const text = await link.textContent() ?? "";
        if (text.toLowerCase().includes(options.idSerie.toLowerCase())) {
          await link.click();
          await this.waitForLoad();
          break;
        }
      }
    }
    if (options.descricao) {
      await this.fillSmart(page, { role: "textbox", name: /descri[cç][aã]o/i }, options.descricao, SEI_SELECTORS.newDocument.descricao);
    }
    if (options.numero) {
      try {
        await this.fillSmart(page, { role: "textbox", name: /n[uú]mero/i }, options.numero, SEI_SELECTORS.newDocument.numero);
      } catch {
      }
    }
    if (options.interessados?.length) {
      for (const interessado of options.interessados) {
        try {
          await this.fillSmart(page, { role: "textbox", name: /interessado/i }, interessado, SEI_SELECTORS.newDocument.interessadoInput);
          await page.keyboard.press("Tab");
          await page.waitForTimeout(300);
          try {
            await this.clickSmart(page, { role: "button", name: /adicionar/i });
          } catch {
          }
        } catch {
        }
      }
    }
    if (options.destinatarios?.length) {
      for (const dest of options.destinatarios) {
        try {
          await this.fillSmart(page, { role: "textbox", name: /destinat[aá]rio/i }, dest, SEI_SELECTORS.newDocument.destinatarioInput);
          await page.keyboard.press("Tab");
          await page.waitForTimeout(300);
          await this.clickSmart(page, { role: "button", name: /adicionar/i }, SEI_SELECTORS.newDocument.destinatarioAdd);
        } catch {
        }
      }
    }
    if (options.observacao) {
      await this.fillSmart(page, { role: "textbox", name: /observa[cç]/i }, options.observacao, SEI_SELECTORS.newDocument.observacao);
    }
    if (options.nivelAcesso !== void 0) {
      const nivelLabel = options.nivelAcesso === 0 ? /p[uú]blico/i : options.nivelAcesso === 1 ? /restrito/i : /sigiloso/i;
      const selector = options.nivelAcesso === 0 ? SEI_SELECTORS.newDocument.nivelAcesso.publico : options.nivelAcesso === 1 ? SEI_SELECTORS.newDocument.nivelAcesso.restrito : SEI_SELECTORS.newDocument.nivelAcesso.sigiloso;
      await this.clickSmart(page, { role: "radio", name: nivelLabel }, selector);
      if ((options.nivelAcesso === 1 || options.nivelAcesso === 2) && options.hipoteseLegal) {
        await this.selectSmart(page, { role: "combobox", name: /hip[oó]tese/i }, { label: options.hipoteseLegal }, SEI_SELECTORS.newDocument.hipoteseLegal);
      }
    }
    await this.clickSmart(page, { role: "button", name: /salvar|confirmar|gerar/i }, SEI_SELECTORS.newDocument.salvar);
    await this.waitForLoad();
    if (options.conteudoHtml) {
      try {
        const editorFrame = this.getEditorFrame(page);
        const editorBody = editorFrame.locator("body");
        await editorBody.fill(options.conteudoHtml);
        await this.clickSmart(page, { role: "button", name: /salvar/i });
        await this.waitForLoad();
      } catch {
      }
    }
    const url = page.url();
    const idMatch = url.match(/id_documento=(\d+)/);
    return idMatch?.[1] ?? null;
  }
  /** Upload de documento externo */
  async uploadDocument(nomeArquivo, conteudoBase64, options = {}) {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /incluir.*documento/i }, SEI_SELECTORS.processActions.incluirDocumento);
    await this.waitForLoad();
    const tipoDoc = options.idSerie ?? "Externo";
    try {
      await this.clickSmart(page, { role: "link", name: new RegExp(tipoDoc, "i") });
      await this.waitForLoad();
    } catch {
      const tipoLinks = await page.$$(SEI_SELECTORS.newDocument.tipoLinks);
      for (const link of tipoLinks) {
        const text = await link.textContent() ?? "";
        if (text.toLowerCase().includes(tipoDoc.toLowerCase())) {
          await link.click();
          await this.waitForLoad();
          break;
        }
      }
    }
    const buffer = Buffer.from(conteudoBase64, "base64");
    const tempPath = `/tmp/${nomeArquivo}`;
    const fs3 = await import("fs/promises");
    await fs3.writeFile(tempPath, buffer);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempPath);
    if (options.descricao) {
      await this.fillSmart(page, { role: "textbox", name: /descri[cç][aã]o/i }, options.descricao, SEI_SELECTORS.newDocument.descricao);
    }
    if (options.observacao) {
      await this.fillSmart(page, { role: "textbox", name: /observa[cç]/i }, options.observacao, SEI_SELECTORS.newDocument.observacao);
    }
    if (options.nivelAcesso !== void 0) {
      const nivelLabel = options.nivelAcesso === 0 ? /p[uú]blico/i : options.nivelAcesso === 1 ? /restrito/i : /sigiloso/i;
      const selector = options.nivelAcesso === 0 ? SEI_SELECTORS.newDocument.nivelAcesso.publico : options.nivelAcesso === 1 ? SEI_SELECTORS.newDocument.nivelAcesso.restrito : SEI_SELECTORS.newDocument.nivelAcesso.sigiloso;
      await this.clickSmart(page, { role: "radio", name: nivelLabel }, selector);
    }
    await this.clickSmart(page, { role: "button", name: /salvar|confirmar/i }, SEI_SELECTORS.upload.salvar);
    await this.waitForLoad();
    await fs3.unlink(tempPath).catch(() => {
    });
    const url = page.url();
    const idMatch = url.match(/id_documento=(\d+)/);
    return idMatch?.[1] ?? null;
  }
  /** Assina documento */
  async signDocument(senha, cargo) {
    const page = this.getPage();
    await this.fillSmart(page, { role: "textbox", name: /senha/i }, senha, SEI_SELECTORS.signature.senha);
    if (cargo) {
      try {
        await this.selectSmart(page, { role: "combobox", name: /cargo|fun[cç][aã]o/i }, { label: cargo }, SEI_SELECTORS.signature.cargo);
      } catch {
      }
    }
    await this.clickSmart(page, { role: "button", name: /assinar/i }, SEI_SELECTORS.signature.assinar);
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
  }
  // ============================================
  // Listagens (via navegacao)
  // ============================================
  /** Lista tipos de processo disponiveis */
  async listProcessTypes() {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /iniciar.*processo/i }, SEI_SELECTORS.nav.iniciarProcesso);
    await this.waitForLoad();
    const tipos = [];
    try {
      const select = page.getByRole("combobox", { name: /tipo/i }).or(page.locator(SEI_SELECTORS.newProcess.tipo));
      const selectEl = await select.first().elementHandle();
      if (selectEl) {
        const options = await selectEl.$$eval(
          "option",
          (opts) => opts.filter((o) => o.value).map((o) => ({ id: o.value, nome: o.textContent?.trim() ?? "" }))
        );
        return options;
      }
    } catch {
    }
    const links = await page.getByRole("link").filter({ hasText: /.+/ }).all();
    for (const link of links) {
      const href = await link.getAttribute("href") ?? "";
      const idMatch = href.match(/id_tipo_procedimento=(\d+)/);
      const nome = (await link.textContent())?.trim() ?? "";
      if (idMatch && nome) {
        tipos.push({ id: idMatch[1], nome });
      }
    }
    return tipos;
  }
  /** Lista tipos de documento (series) */
  async listDocumentTypes() {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /incluir.*documento/i }, SEI_SELECTORS.processActions.incluirDocumento);
    await this.waitForLoad();
    const tipos = [];
    try {
      const select = page.getByRole("combobox", { name: /tipo|s[eé]rie/i }).or(page.locator(SEI_SELECTORS.newDocument.tipoSelect));
      const selectEl = await select.first().elementHandle();
      if (selectEl) {
        const options = await selectEl.$$eval(
          "option",
          (opts) => opts.filter((o) => o.value).map((o) => ({ id: o.value, nome: o.textContent?.trim() ?? "" }))
        );
        return options;
      }
    } catch {
    }
    const links = await page.$$(SEI_SELECTORS.newDocument.tipoLinks);
    for (const link of links) {
      const href = await link.getAttribute("href") ?? "";
      const idMatch = href.match(/id_serie=(\d+)/);
      const nome = (await link.textContent())?.trim() ?? "";
      if (idMatch && nome) {
        tipos.push({ id: idMatch[1], nome });
      }
    }
    try {
      await this.clickSmart(page, { role: "button", name: /fechar|cancelar/i }, SEI_SELECTORS.common.close);
    } catch {
      await page.goBack();
    }
    return tipos;
  }
  /** Lista unidades do orgao */
  async listUnits() {
    const page = this.getPage();
    const unidades = [];
    try {
      const select = page.getByRole("combobox", { name: /unidade/i }).or(page.locator(SEI_SELECTORS.nav.unidade));
      const selectEl = await select.first().elementHandle();
      if (selectEl) {
        const options = await selectEl.$$eval(
          "option",
          (opts) => opts.filter((o) => o.value).map((o) => ({
            id: o.value,
            sigla: o.textContent?.trim() ?? "",
            descricao: o.textContent?.trim() ?? ""
          }))
        );
        return options;
      }
    } catch {
    }
    return unidades;
  }
  /** Consulta andamentos/historico do processo */
  async listAndamentos(numeroProcesso) {
    const page = this.getPage();
    if (numeroProcesso) {
      await this.openProcess(numeroProcesso);
    }
    await this.clickSmart(page, { role: "link", name: /consultar.*andamento|hist[oó]rico/i }, SEI_SELECTORS.processActions.consultarAndamento);
    await this.waitForLoad();
    const andamentos = [];
    const rows = await page.getByRole("row").all();
    for (const row of rows.slice(1)) {
      try {
        const cells = await row.getByRole("cell").all();
        if (cells.length >= 4) {
          andamentos.push({
            data: (await cells[0]?.textContent())?.trim() ?? "",
            unidade: (await cells[1]?.textContent())?.trim() ?? "",
            usuario: (await cells[2]?.textContent())?.trim() ?? "",
            descricao: (await cells[3]?.textContent())?.trim() ?? ""
          });
        }
      } catch {
      }
    }
    return andamentos;
  }
  /** Consulta detalhes do processo */
  async getProcessDetails(numeroProcesso) {
    const page = this.getPage();
    if (numeroProcesso) {
      const opened = await this.openProcess(numeroProcesso);
      if (!opened) return null;
    }
    const url = page.url();
    const idMatch = url.match(/id_procedimento=(\d+)/);
    const numeroEl = page.locator("#txtNumeroProcesso, .numero-processo, #anchor0").first();
    const numero = (await numeroEl.textContent())?.trim() ?? "";
    await this.clickSmart(page, { role: "link", name: /consultar.*andamento/i }, SEI_SELECTORS.processActions.consultarAndamento);
    await this.waitForLoad();
    let tipo = "";
    let especificacao = "";
    let dataAutuacao = "";
    const interessados = [];
    const unidadesAbertas = [];
    try {
      tipo = (await page.locator("text=Tipo").locator("xpath=following-sibling::*").first().textContent())?.trim() ?? "";
      especificacao = (await page.locator("text=Especificacao").locator("xpath=following-sibling::*").first().textContent())?.trim() ?? "";
      dataAutuacao = (await page.locator("text=Autuacao").locator("xpath=following-sibling::*").first().textContent())?.trim() ?? "";
      const interessadosItems = await page.locator('.interessado-item, [class*="interessado"] li').all();
      for (const el of interessadosItems) {
        const text = await el.textContent();
        if (text) interessados.push(text.trim());
      }
      const unidadesItems = await page.locator('.unidade-aberta, [class*="unidade"] li').all();
      for (const el of unidadesItems) {
        const text = await el.textContent();
        if (text) unidadesAbertas.push(text.trim());
      }
    } catch {
    }
    return {
      id: idMatch?.[1] ?? "",
      numero,
      tipo,
      especificacao,
      interessados,
      unidadesAbertas,
      dataAutuacao
    };
  }
  // ============================================
  // Operacoes com Processos
  // ============================================
  /** Anexa processo a outro */
  async anexarProcesso(processoPrincipal, processoAnexado) {
    const page = this.getPage();
    await this.openProcess(processoPrincipal);
    await this.clickSmart(page, { role: "link", name: /anexar.*processo/i }, SEI_SELECTORS.processActions.anexarProcesso);
    await this.waitForLoad();
    await this.fillSmart(page, { role: "textbox", name: /protocolo|processo/i }, processoAnexado, '#txtProtocoloAnexar, input[name="txtProtocoloAnexar"]');
    await this.clickSmart(page, { role: "button", name: /pesquis/i }, '#btnPesquisar, button[name="sbmPesquisar"]');
    await this.waitForLoad();
    try {
      await this.clickSmart(page, { role: "button", name: /confirmar/i });
      await this.waitForLoad();
      return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
    } catch {
      return false;
    }
  }
  /** Relaciona dois processos */
  async relacionarProcesso(processo1, processo2) {
    const page = this.getPage();
    await this.openProcess(processo1);
    await this.clickSmart(page, { role: "link", name: /relacionar.*processo/i }, SEI_SELECTORS.processActions.relacionarProcesso);
    await this.waitForLoad();
    await this.fillSmart(page, { role: "textbox", name: /protocolo|processo/i }, processo2, '#txtProtocoloRelacionar, input[name="txtProtocoloRelacionar"]');
    await this.clickSmart(page, { role: "button", name: /pesquis/i }, '#btnPesquisar, button[name="sbmPesquisar"]');
    await this.waitForLoad();
    try {
      await this.clickSmart(page, { role: "button", name: /confirmar/i });
      await this.waitForLoad();
      return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
    } catch {
      return false;
    }
  }
  /** Atribui processo a um usuario */
  async atribuirProcesso(numeroProcesso, nomeUsuario) {
    const page = this.getPage();
    await this.openProcess(numeroProcesso);
    await this.clickSmart(page, { role: "link", name: /atribuir.*processo/i }, SEI_SELECTORS.processActions.atribuirProcesso);
    await this.waitForLoad();
    try {
      await this.selectSmart(page, { role: "combobox", name: /usu[aá]rio|atribui[cç][aã]o/i }, { label: nomeUsuario }, '#selAtribuicao, select[name="selAtribuicao"]');
    } catch {
      const select = await page.$('#selAtribuicao, select[name="selAtribuicao"]');
      if (select) {
        const options = await select.$$eval(
          "option",
          (opts) => opts.map((o) => ({ value: o.value, text: o.textContent }))
        );
        const match = options.find((o) => o.text?.toLowerCase().includes(nomeUsuario.toLowerCase()));
        if (match?.value) {
          await page.selectOption('#selAtribuicao, select[name="selAtribuicao"]', match.value);
        }
      }
    }
    await this.clickSmart(page, { role: "button", name: /salvar|confirmar/i }, '#btnSalvar, button[name="sbmSalvar"]');
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
  }
  // ============================================
  // Operacoes com Documentos
  // ============================================
  /** Consulta detalhes do documento */
  async getDocumentDetails(idDocumento) {
    const page = this.getPage();
    const opened = await this.openDocument(idDocumento);
    if (!opened) return null;
    const numero = (await page.locator(".numero-documento, #txtNumeroDocumento").first().textContent())?.trim() ?? "";
    const tipo = (await page.locator(".tipo-documento, #txtTipoDocumento").first().textContent())?.trim() ?? "";
    const data = (await page.locator(".data-documento, #txtDataDocumento").first().textContent())?.trim() ?? "";
    const assinaturas = [];
    try {
      const rows = await page.getByRole("row").all();
      for (const row of rows) {
        const cells = await row.getByRole("cell").all();
        if (cells.length >= 3) {
          assinaturas.push({
            nome: (await cells[0]?.textContent())?.trim() ?? "",
            cargo: (await cells[1]?.textContent())?.trim() ?? "",
            data: (await cells[2]?.textContent())?.trim() ?? ""
          });
        }
      }
    } catch {
    }
    return {
      id: idDocumento,
      numero,
      tipo,
      data,
      assinaturas
    };
  }
  /** Cancela documento */
  async cancelDocument(idDocumento, motivo) {
    const page = this.getPage();
    await this.openDocument(idDocumento);
    await this.clickSmart(page, { role: "link", name: /cancelar|excluir/i }, 'a[href*="documento_cancelar"], img[title*="Cancelar"], img[title*="Excluir"]');
    await this.waitForLoad();
    await this.fillSmart(page, { role: "textbox", name: /motivo/i }, motivo, '#txaMotivo, textarea[name="txaMotivo"]');
    await this.clickSmart(page, { role: "button", name: /confirmar/i }, '#btnConfirmar, button[name="sbmConfirmar"]');
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
  }
  // ============================================
  // Blocos de Assinatura
  // ============================================
  /** Lista blocos de assinatura */
  async listBlocos() {
    const page = this.getPage();
    await page.goto(`${this.baseUrl}/sei/controlador.php?acao=bloco_assinatura_listar`);
    await this.waitForLoad();
    const blocos = [];
    const rows = await page.getByRole("row").all();
    for (const row of rows.slice(1)) {
      try {
        const link = await row.getByRole("link").first();
        const href = await link.getAttribute("href") ?? "";
        const idMatch = href.match(/id_bloco=(\d+)/);
        if (!idMatch) continue;
        const cells = await row.getByRole("cell").all();
        blocos.push({
          id: idMatch[1],
          descricao: (await cells[1]?.textContent())?.trim() ?? "",
          quantidade: parseInt((await cells[2]?.textContent())?.match(/\d+/)?.[0] ?? "0", 10),
          unidade: (await cells[3]?.textContent())?.trim() ?? ""
        });
      } catch {
      }
    }
    return blocos;
  }
  /** Cria bloco de assinatura */
  async createBloco(descricao, tipo = "assinatura") {
    const page = this.getPage();
    await this.clickSmart(page, { role: "link", name: /novo.*bloco|criar.*bloco/i }, SEI_SELECTORS.block.novo);
    await this.waitForLoad();
    const tipoMap = { assinatura: "A", reuniao: "R", interno: "I" };
    try {
      await this.selectSmart(page, { role: "combobox", name: /tipo/i }, tipoMap[tipo], '#selTipo, select[name="selTipo"]');
    } catch {
    }
    await this.fillSmart(page, { role: "textbox", name: /descri[cç][aã]o/i }, descricao, SEI_SELECTORS.block.formNovo.descricao);
    await this.clickSmart(page, { role: "button", name: /salvar/i }, SEI_SELECTORS.block.formNovo.salvar);
    await this.waitForLoad();
    const url = page.url();
    const idMatch = url.match(/id_bloco=(\d+)/);
    return idMatch?.[1] ?? null;
  }
  /** Adiciona documento ao bloco */
  async addDocumentoToBloco(idBloco, idDocumento) {
    const page = this.getPage();
    await this.openDocument(idDocumento);
    try {
      await this.clickSmart(page, { role: "link", name: /bloco|incluir.*bloco/i }, 'a[href*="bloco_incluir"], img[title*="Bloco"]');
    } catch {
      return false;
    }
    await this.waitForLoad();
    try {
      await this.selectSmart(page, { role: "combobox", name: /bloco/i }, idBloco, '#selBloco, select[name="selBloco"]');
      await this.clickSmart(page, { role: "button", name: /adicionar/i }, '#btnAdicionar, button[name="sbmAdicionar"]');
      await this.waitForLoad();
      return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
    } catch {
      return false;
    }
  }
  /** Remove documento do bloco */
  async removeDocumentoFromBloco(idBloco, idDocumento) {
    const page = this.getPage();
    await page.goto(`${this.baseUrl}/sei/controlador.php?acao=bloco_protocolo_listar&id_bloco=${idBloco}`);
    await this.waitForLoad();
    const rows = await page.getByRole("row").all();
    for (const row of rows) {
      const docLink = await row.getByRole("link").filter({ hasText: new RegExp(idDocumento) }).first();
      if (await docLink.isVisible({ timeout: 500 }).catch(() => false)) {
        try {
          await row.getByRole("link", { name: /remover|excluir/i }).or(row.locator('img[title*="Remover"], img[title*="Excluir"]').locator("xpath=..")).first().click();
          await this.waitForLoad();
          try {
            await page.getByRole("button", { name: /confirmar|sim/i }).click({ timeout: 2e3 });
            await this.waitForLoad();
          } catch {
          }
          return true;
        } catch {
        }
      }
    }
    return false;
  }
  /** Disponibiliza bloco para outras unidades */
  async disponibilizarBloco(idBloco, unidades) {
    const page = this.getPage();
    await page.goto(`${this.baseUrl}/sei/controlador.php?acao=bloco_assinatura_disponibilizar&id_bloco=${idBloco}`);
    await this.waitForLoad();
    if (unidades?.length) {
      for (const unidade of unidades) {
        await this.fillSmart(page, { role: "textbox", name: /unidade/i }, unidade, '#txtUnidade, input[name="txtUnidade"]');
        await page.waitForTimeout(300);
        await page.keyboard.press("Enter");
      }
    }
    await this.clickSmart(page, { role: "button", name: /disponibilizar/i }, '#btnDisponibilizar, button[name="sbmDisponibilizar"]');
    await this.waitForLoad();
    return await this.existsSmart(page, { role: "alert" }, ".msgSucesso, .alert-success", 5e3);
  }
  // ============================================
  // Utilitarios
  // ============================================
  /** Captura screenshot */
  async screenshot(fullPage = false) {
    const page = this.getPage();
    const buffer = await page.screenshot({ fullPage });
    return buffer.toString("base64");
  }
  /** Captura arvore de acessibilidade (ARIA snapshot) */
  async snapshot(_includeHidden = false) {
    const page = this.getPage();
    const url = page.url();
    const title = await page.title();
    const text = await page.innerText("body").catch(() => "");
    const snapshot = {
      url,
      title,
      textContent: text.substring(0, 5e3)
    };
    return JSON.stringify(snapshot, null, 2);
  }
  /** Obtem arvore de acessibilidade completa */
  async getAriaSnapshot() {
    const page = this.getPage();
    try {
      const ariaTree = await page.locator("body").ariaSnapshot();
      return { ariaSnapshot: ariaTree };
    } catch {
      try {
        const url = page.url();
        const title = await page.title();
        return { url, title, note: "ARIA snapshot nao disponivel" };
      } catch {
        return null;
      }
    }
  }
  /** Obtem texto visivel da pagina */
  async getVisibleText() {
    const page = this.getPage();
    return page.innerText("body");
  }
  /** Executa JavaScript na pagina */
  async evaluate(fn) {
    const page = this.getPage();
    return page.evaluate(fn);
  }
  // ============================================
  // Metodos Adicionais (Paridade com MCP)
  // ============================================
  /** Lista usuarios do SEI */
  async listUsuarios(filter) {
    const page = this.getPage();
    const usuarios = [];
    try {
      await page.getByRole("link", { name: /atribuir/i }).or(page.locator('img[title*="Atribuir"]').locator("xpath=..")).first().click();
      await this.waitForLoad();
      const select = page.getByRole("combobox", { name: /atribui[cç][aã]o|usu[aá]rio/i }).or(page.locator('#selAtribuicao, select[name="selAtribuicao"]'));
      const selectEl = await select.first().elementHandle();
      if (selectEl) {
        const options = await selectEl.$$eval(
          "option",
          (opts) => opts.filter((o) => o.value).map((o) => ({
            id: o.value,
            nome: o.textContent?.trim() ?? "",
            sigla: o.value
          }))
        );
        if (filter) {
          return options.filter((u) => u.nome.toLowerCase().includes(filter.toLowerCase()));
        }
        return options;
      }
    } catch {
    }
    return usuarios;
  }
  /** Lista hipoteses legais */
  async listHipotesesLegais() {
    const page = this.getPage();
    const hipoteses = [];
    try {
      await page.getByRole("link", { name: /incluir.*documento/i }).or(page.locator('img[title*="Incluir Documento"]').locator("xpath=..")).first().click();
      await this.waitForLoad();
      await page.getByRole("radio", { name: /restrito/i }).click();
      await this.waitForLoad();
      const select = page.getByRole("combobox", { name: /hip[oó]tese/i }).or(page.locator(SEI_SELECTORS.newDocument.hipoteseLegal));
      const selectEl = await select.first().elementHandle();
      if (selectEl) {
        const options = await selectEl.$$eval(
          "option",
          (opts) => opts.filter((o) => o.value).map((o) => ({
            id: o.value,
            nome: o.textContent?.trim() ?? ""
          }))
        );
        return options;
      }
    } catch {
    }
    return hipoteses;
  }
  /** Lista marcadores disponiveis */
  async listMarcadores() {
    const page = this.getPage();
    const marcadores = [];
    try {
      await page.goto(`${this.baseUrl}/sei/controlador.php?acao=marcador_listar`);
      await this.waitForLoad();
      const rows = await page.getByRole("row").all();
      for (const row of rows.slice(1)) {
        try {
          const link = await row.getByRole("link").first();
          const href = await link.getAttribute("href") ?? "";
          const idMatch = href.match(/id_marcador=(\d+)/);
          if (idMatch) {
            const cells = await row.getByRole("cell").all();
            const corElement = row.locator('.cor-marcador, span[style*="background"]').first();
            const cor = (await corElement.getAttribute("style"))?.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#000000";
            marcadores.push({
              id: idMatch[1],
              nome: (await cells[1]?.textContent())?.trim() ?? "",
              cor
            });
          }
        } catch {
        }
      }
    } catch {
    }
    return marcadores;
  }
  /** Lista processos do usuario */
  async listMeusProcessos(status = "abertos", limit = 50) {
    const page = this.getPage();
    const processos = [];
    try {
      await page.goto(`${this.baseUrl}/sei/controlador.php?acao=procedimento_controlar`);
      await this.waitForLoad();
      if (status === "fechados") {
        try {
          await page.getByRole("combobox", { name: /filtro|status/i }).selectOption("concluidos");
          await this.waitForLoad();
        } catch {
        }
      }
      const rows = await page.getByRole("row").all();
      let count = 0;
      for (const row of rows.slice(1)) {
        if (count >= limit) break;
        try {
          const cells = await row.getByRole("cell").all();
          const link = await cells[0]?.getByRole("link").first();
          const numero = (await link?.textContent())?.trim() ?? "";
          const tipo = (await cells[1]?.textContent())?.trim() ?? "";
          const especificacao = (await cells[2]?.textContent())?.trim() ?? "";
          if (numero) {
            processos.push({ numero, tipo, especificacao });
            count++;
          }
        } catch {
        }
      }
    } catch {
    }
    return processos;
  }
  /** Busca processos */
  async searchProcessos(query, type = "numero", limit = 20) {
    const page = this.getPage();
    const processos = [];
    try {
      await page.goto(`${this.baseUrl}/sei/controlador.php?acao=protocolo_pesquisa_rapida`);
      await this.waitForLoad();
      const typeMap = { numero: "1", texto: "2", interessado: "3" };
      try {
        await page.getByRole("combobox", { name: /tipo.*pesquisa/i }).selectOption(typeMap[type]);
      } catch {
        try {
          await page.selectOption('#selTipoPesquisa, select[name="selTipoPesquisa"]', typeMap[type]);
        } catch {
        }
      }
      try {
        await page.getByRole("textbox", { name: /pesquis/i }).fill(query);
        await page.getByRole("button", { name: /pesquis/i }).click();
      } catch {
        await page.fill('#txtPesquisa, input[name="txtPesquisa"]', query);
        await page.click('#btnPesquisar, button[name="sbmPesquisar"]');
      }
      await this.waitForLoad();
      const rows = await page.getByRole("row").all();
      let count = 0;
      for (const row of rows.slice(1)) {
        if (count >= limit) break;
        try {
          const cells = await row.getByRole("cell").all();
          const link = await cells[0]?.getByRole("link").first();
          const numero = (await link?.textContent())?.trim() ?? "";
          const tipo = (await cells[1]?.textContent())?.trim() ?? "";
          const especificacao = (await cells[2]?.textContent())?.trim() ?? "";
          if (numero) {
            processos.push({ numero, tipo, especificacao });
            count++;
          }
        } catch {
        }
      }
    } catch {
    }
    return processos;
  }
  /** Faz download do processo completo */
  async downloadProcess(numeroProcesso, _includeAttachments = true, outputPath) {
    const page = this.getPage();
    await this.openProcess(numeroProcesso);
    const downloadPromise = page.waitForEvent("download");
    try {
      await page.getByRole("link", { name: /gerar.*pdf/i }).or(page.locator('img[title*="PDF"]').locator("xpath=..")).first().click();
    } catch {
      await page.click(SEI_SELECTORS.processActions.gerarPdf);
    }
    const download = await downloadPromise;
    const suggestedPath = outputPath || `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(suggestedPath);
    const fs3 = await import("fs/promises");
    const stats = await fs3.stat(suggestedPath);
    return { filePath: suggestedPath, size: stats.size };
  }
  /** Faz download de documento especifico */
  async downloadDocument(idDocumento, outputPath) {
    const page = this.getPage();
    await this.openDocument(idDocumento);
    const downloadPromise = page.waitForEvent("download");
    await this.clickSmart(page, { role: "link", name: /download|pdf/i }, 'a[href*="documento_download"], img[title*="Download"], img[title*="PDF"]');
    const download = await downloadPromise;
    const suggestedPath = outputPath || `/tmp/${download.suggestedFilename()}`;
    await download.saveAs(suggestedPath);
    const fs3 = await import("fs/promises");
    const stats = await fs3.stat(suggestedPath);
    return { filePath: suggestedPath, size: stats.size };
  }
  /** Lista anotacoes do processo */
  async listAnnotations() {
    const page = this.getPage();
    const annotations = [];
    try {
      const anotacoesEl = await page.locator('.anotacao-item, [class*="anotacao"]').all();
      for (const el of anotacoesEl) {
        const texto = (await el.locator(".texto, .conteudo").first().textContent())?.trim() ?? "";
        const data = (await el.locator(".data").first().textContent())?.trim() ?? "";
        const usuario = (await el.locator(".usuario").first().textContent())?.trim() ?? "";
        annotations.push({ texto, data, usuario });
      }
    } catch {
    }
    return annotations;
  }
  /** Adiciona anotacao ao processo */
  async addAnnotation(texto, prioridade = "normal") {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /anota[cç]/i }, 'img[title*="Anota"]');
      await this.waitForLoad();
      await this.fillSmart(page, { role: "textbox", name: /anota[cç][aã]o|texto/i }, texto, '#txaAnotacao, textarea[name="txaAnotacao"]');
      if (prioridade === "alta") {
        try {
          await this.checkSmart(page, { role: "checkbox", name: /prioridade|alta/i }, '#chkPrioridade, input[name="chkPrioridade"]');
        } catch {
        }
      }
      await this.clickSmart(page, { role: "button", name: /salvar/i }, '#btnSalvar, button[name="sbmSalvar"]');
      await this.waitForLoad();
      return true;
    } catch {
      return false;
    }
  }
  /** Adiciona marcador ao processo */
  async addMarker(marcador, texto) {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /marcador/i }, 'img[title*="Marcador"]');
      await this.waitForLoad();
      await this.selectSmart(page, { role: "combobox", name: /marcador/i }, { label: marcador }, '#selMarcador, select[name="selMarcador"]');
      if (texto) {
        await this.fillSmart(page, { role: "textbox", name: /texto|observa[cç]/i }, texto, '#txaTexto, textarea[name="txaTexto"]');
      }
      await this.clickSmart(page, { role: "button", name: /salvar/i }, '#btnSalvar, button[name="sbmSalvar"]');
      await this.waitForLoad();
      return true;
    } catch {
      return false;
    }
  }
  /** Remove marcador do processo */
  async removeMarker(marcador) {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /marcador/i }, 'img[title*="Marcador"]');
      await this.waitForLoad();
      const marcadorEl = page.getByText(marcador).first();
      if (await marcadorEl.isVisible({ timeout: 2e3 })) {
        const parentEl = marcadorEl.locator("xpath=..");
        const removeLink = parentEl.getByRole("link", { name: /excluir|remover/i }).or(parentEl.locator('img[title*="Excluir"], img[title*="Remover"]').locator("xpath=.."));
        await removeLink.first().click();
        await this.waitForLoad();
        return true;
      }
    } catch {
    }
    return false;
  }
  /** Define prazo no processo */
  async setDeadline(dias, tipo = "util") {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /prazo/i }, 'img[title*="Prazo"]');
      await this.waitForLoad();
      await this.fillSmart(page, { role: "textbox", name: /dias/i }, String(dias), '#txtDias, input[name="txtDias"]');
      if (tipo === "corrido") {
        await this.clickSmart(page, { role: "radio", name: /corrido/i }, '#rdoCorrido, input[value="corrido"]');
      } else {
        await this.clickSmart(page, { role: "radio", name: /[uú]t/i }, '#rdoUtil, input[value="util"]');
      }
      await this.clickSmart(page, { role: "button", name: /salvar/i }, '#btnSalvar, button[name="sbmSalvar"]');
      await this.waitForLoad();
      return true;
    } catch {
      return false;
    }
  }
  /** Concede acesso ao processo */
  async grantAccess(usuario, tipo = "consulta") {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /credencial|acesso/i }, 'img[title*="Credencial"], img[title*="Acesso"]');
      await this.waitForLoad();
      await this.fillSmart(page, { role: "textbox", name: /usu[aá]rio/i }, usuario, '#txtUsuario, input[name="txtUsuario"]');
      const tipoValue = tipo === "acompanhamento" ? "2" : "1";
      try {
        await this.selectSmart(page, { role: "combobox", name: /tipo/i }, tipoValue, '#selTipo, select[name="selTipo"]');
      } catch {
      }
      await this.clickSmart(page, { role: "button", name: /conceder/i }, '#btnConceder, button[name="sbmConceder"]');
      await this.waitForLoad();
      return true;
    } catch {
      return false;
    }
  }
  /** Revoga acesso ao processo */
  async revokeAccess(usuario) {
    const page = this.getPage();
    try {
      await this.clickSmart(page, { role: "link", name: /credencial|acesso/i }, 'img[title*="Credencial"], img[title*="Acesso"]');
      await this.waitForLoad();
      const rows = await page.getByRole("row").all();
      for (const row of rows) {
        const nomeEl = await row.getByRole("cell").first();
        const nome = await nomeEl?.textContent();
        if (nome?.toLowerCase().includes(usuario.toLowerCase())) {
          const revokeLink = row.getByRole("link", { name: /revogar|excluir/i }).or(row.locator('img[title*="Revogar"], img[title*="Excluir"]').locator("xpath=.."));
          await revokeLink.first().click();
          await this.waitForLoad();
          return true;
        }
      }
    } catch {
    }
    return false;
  }
  /** Obtem conteudo HTML do documento */
  async getDocumentContent(idDocumento) {
    const page = this.getPage();
    await this.openDocument(idDocumento);
    try {
      const editorFrame = this.getEditorFrame(page);
      const content = await editorFrame.locator("body").innerHTML();
      return content;
    } catch {
      try {
        const viewFrame = this.getViewFrame(page);
        const content = await viewFrame.locator("body").innerHTML();
        return content;
      } catch {
        return "";
      }
    }
  }
  /** Registra ciencia no documento */
  async registerKnowledge() {
    const page = this.getPage();
    try {
      await page.getByRole("link", { name: /ci[eê]ncia|ciente/i }).or(page.locator('img[title*="Ci\xEAncia"], img[title*="Ciente"]').locator("xpath=..")).first().click();
      await this.waitForLoad();
      try {
        await page.getByRole("button", { name: /confirmar|sim/i }).click({ timeout: 2e3 });
        await this.waitForLoad();
      } catch {
      }
      return true;
    } catch {
      return false;
    }
  }
  /** Agenda publicacao do documento */
  async schedulePublication(veiculo, dataPublicacao, resumo) {
    const page = this.getPage();
    try {
      await page.getByRole("link", { name: /publica[cç][aã]o|publicar/i }).or(page.locator('img[title*="Publica\xE7\xE3o"], img[title*="Publicar"]').locator("xpath=..")).first().click();
      await this.waitForLoad();
      try {
        await page.getByRole("combobox", { name: /ve[ií]culo/i }).selectOption({ label: veiculo });
      } catch {
        await page.selectOption('#selVeiculo, select[name="selVeiculo"]', { label: veiculo });
      }
      if (dataPublicacao) {
        try {
          await page.getByRole("textbox", { name: /data.*publica[cç][aã]o/i }).fill(dataPublicacao);
        } catch {
          await page.fill('#txtDataPublicacao, input[name="txtDataPublicacao"]', dataPublicacao);
        }
      }
      if (resumo) {
        try {
          await page.getByRole("textbox", { name: /resumo/i }).fill(resumo);
        } catch {
          await page.fill('#txaResumo, textarea[name="txaResumo"]', resumo);
        }
      }
      try {
        await page.getByRole("button", { name: /agendar/i }).click();
      } catch {
        await page.click('#btnAgendar, button[name="sbmAgendar"]');
      }
      await this.waitForLoad();
      return true;
    } catch {
      return false;
    }
  }
  /** Assina todos os documentos de um bloco */
  async signBloco(idBloco, senha) {
    const page = this.getPage();
    try {
      await page.goto(`${this.baseUrl}/sei/controlador.php?acao=bloco_protocolo_listar&id_bloco=${idBloco}`);
      await this.waitForLoad();
      await page.getByRole("link", { name: /assinar.*bloco|assinar/i }).or(page.locator('img[title*="Assinar"]').locator("xpath=..")).first().click();
      await this.waitForLoad();
      try {
        await page.getByRole("textbox", { name: /senha/i }).fill(senha);
        await page.getByRole("button", { name: /assinar/i }).click();
      } catch {
        await page.fill(SEI_SELECTORS.signature.senha, senha);
        await page.click(SEI_SELECTORS.signature.assinar);
      }
      await this.waitForLoad();
      const success = page.locator(".msgSucesso, .alert-success");
      await success.first().waitFor({ timeout: 5e3 });
      return true;
    } catch {
      return false;
    }
  }
  /** Obtem informacoes do bloco */
  async getBloco(idBloco) {
    const page = this.getPage();
    try {
      await page.goto(`${this.baseUrl}/sei/controlador.php?acao=bloco_protocolo_listar&id_bloco=${idBloco}`);
      await this.waitForLoad();
      const descricao = (await page.locator("#txtDescricao, .descricao-bloco").first().textContent())?.trim() ?? "";
      const tipo = (await page.locator("#txtTipo, .tipo-bloco").first().textContent())?.trim() ?? "";
      const documentos = [];
      const rows = await page.getByRole("row").all();
      for (const row of rows.slice(1)) {
        try {
          const link = await row.getByRole("link").first();
          const href = await link.getAttribute("href") ?? "";
          const idMatch = href.match(/id_documento=(\d+)/);
          if (idMatch) {
            const cells = await row.getByRole("cell").all();
            documentos.push({
              id: idMatch[1],
              numero: (await cells[1]?.textContent())?.trim() ?? "",
              processo: (await cells[2]?.textContent())?.trim() ?? ""
            });
          }
        } catch {
        }
      }
      return { id: idBloco, descricao, tipo, documentos };
    } catch {
      return null;
    }
  }
};

// src/client.ts
var SEIClient = class {
  config;
  soapClient = null;
  browserClient = null;
  soapAvailable = false;
  currentIdUnidade = null;
  constructor(config) {
    this.config = {
      mode: "auto",
      ...config
    };
  }
  /** Modo de operação atual */
  get mode() {
    return this.config.mode ?? "auto";
  }
  /** SOAP está disponível */
  get hasSoap() {
    return this.soapAvailable;
  }
  /** Browser está disponível */
  get hasBrowser() {
    return this.browserClient?.isReady ?? false;
  }
  /** Inicializa clientes */
  async init() {
    const mode = this.mode;
    if ((mode === "auto" || mode === "soap") && this.config.soap) {
      try {
        this.soapClient = new SEISoapClient({
          baseUrl: this.config.baseUrl,
          ...this.config.soap
        });
        await this.soapClient.connect();
        this.soapAvailable = true;
      } catch (err) {
        console.warn("SOAP n\xE3o dispon\xEDvel:", err);
        this.soapAvailable = false;
      }
    }
    if (mode === "auto" || mode === "browser" || !this.soapAvailable) {
      this.browserClient = new SEIBrowserClient(this.config);
      await this.browserClient.init();
    }
  }
  /** Fecha todos os clientes */
  async close() {
    await this.browserClient?.close();
    this.browserClient = null;
    this.soapClient = null;
    this.soapAvailable = false;
  }
  /** Define a unidade atual para operações SOAP */
  setUnidade(idUnidade) {
    this.currentIdUnidade = idUnidade;
  }
  // ============================================
  // Autenticação (Browser only)
  // ============================================
  /** Login no SEI via browser */
  async login(usuario, senha, orgao) {
    if (!this.browserClient) {
      throw new Error("Browser client n\xE3o dispon\xEDvel");
    }
    return this.browserClient.login(usuario, senha, orgao);
  }
  /** Logout do SEI */
  async logout() {
    await this.browserClient?.logout();
  }
  /** Verifica se está logado */
  async isLoggedIn() {
    return await this.browserClient?.isLoggedIn() ?? false;
  }
  // ============================================
  // Listagens
  // ============================================
  /** Lista tipos de processo */
  async listProcessTypes() {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.listarTiposProcedimento(this.currentIdUnidade);
      } catch (err) {
        console.warn("SOAP listarTiposProcedimento falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      const tipos = await this.browserClient.listProcessTypes();
      return tipos.map((t) => ({
        IdTipoProcedimento: t.id,
        Nome: t.nome
      }));
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Lista tipos de documento (séries) */
  async listDocumentTypes(idTipoProcedimento) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.listarSeries(this.currentIdUnidade, idTipoProcedimento);
      } catch (err) {
        console.warn("SOAP listarSeries falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      const tipos = await this.browserClient.listDocumentTypes();
      return tipos.map((t) => ({
        IdSerie: t.id,
        Nome: t.nome
      }));
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Lista unidades */
  async listUnits(idTipoProcedimento) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.listarUnidades(this.currentIdUnidade, idTipoProcedimento);
      } catch (err) {
        console.warn("SOAP listarUnidades falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      const unidades = await this.browserClient.listUnits();
      return unidades.map((u) => ({
        IdUnidade: u.id,
        Sigla: u.sigla,
        Descricao: u.descricao
      }));
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Lista usuários da unidade */
  async listUsers() {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      return this.soapClient.listarUsuarios(this.currentIdUnidade);
    }
    throw new Error("Listagem de usu\xE1rios requer SOAP");
  }
  /** Lista andamentos do processo */
  async listAndamentos(numeroProcesso, options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        const andamentos = await this.soapClient.listarAndamentos(
          this.currentIdUnidade,
          numeroProcesso,
          options?.retornarAtributos
        );
        return andamentos.map((a) => ({
          data: a.DataHora,
          unidade: a.Unidade?.Sigla ?? "",
          usuario: a.Usuario?.Nome ?? "",
          descricao: a.Descricao
        }));
      } catch (err) {
        console.warn("SOAP listarAndamentos falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.listAndamentos(numeroProcesso);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  // ============================================
  // Processos
  // ============================================
  /** Abre processo */
  async openProcess(numeroProcesso) {
    if (this.browserClient) {
      return this.browserClient.openProcess(numeroProcesso);
    }
    throw new Error("Browser client n\xE3o dispon\xEDvel");
  }
  /** Consulta processo */
  async getProcess(protocoloProcedimento, options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.consultarProcedimento(
          this.currentIdUnidade,
          protocoloProcedimento,
          options?.assuntos,
          options?.interessados,
          options?.observacoes,
          true,
          // andamento geração
          true,
          // andamento conclusão
          true,
          // último andamento
          true,
          // unidades aberto
          options?.relacionados,
          true
          // anexados
        );
      } catch (err) {
        console.warn("SOAP consultarProcedimento falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      const details = await this.browserClient.getProcessDetails(protocoloProcedimento);
      if (details) {
        return {
          IdProcedimento: details.id,
          ProcedimentoFormatado: details.numero,
          Especificacao: details.especificacao,
          DataAutuacao: details.dataAutuacao,
          LinkAcesso: `${this.config.baseUrl}/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=${details.id}`,
          TipoProcedimento: { IdTipoProcedimento: "", Nome: details.tipo },
          AndamentoGeracao: { IdAndamento: "", IdTarefa: "", IdTarefaModulo: "", Descricao: "", DataHora: "", Unidade: { IdUnidade: "", Sigla: "", Descricao: "" }, Usuario: { IdUsuario: "", Sigla: "", Nome: "" } },
          UltimoAndamento: { IdAndamento: "", IdTarefa: "", IdTarefaModulo: "", Descricao: "", DataHora: "", Unidade: { IdUnidade: "", Sigla: "", Descricao: "" }, Usuario: { IdUsuario: "", Sigla: "", Nome: "" } },
          UnidadesProcedimentoAberto: details.unidadesAbertas.map((u) => ({ IdUnidade: "", Sigla: u, Descricao: u })),
          Assuntos: [],
          Interessados: details.interessados.map((i) => ({ Sigla: i, Nome: i }))
        };
      }
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Cria processo */
  async createProcess(options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.gerarProcedimento(this.currentIdUnidade, {
          IdTipoProcedimento: options.tipoProcedimento,
          Especificacao: options.especificacao,
          Assuntos: options.assuntos.map((a) => ({ CodigoEstruturado: a })),
          Interessados: options.interessados?.map((i) => ({ Sigla: i, Nome: i })),
          Observacao: options.observacao,
          NivelAcesso: options.nivelAcesso ?? 0,
          IdHipoteseLegal: options.hipoteseLegal
        });
      } catch (err) {
        console.warn("SOAP gerarProcedimento falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      const result = await this.browserClient.createProcess({
        tipoProcedimento: options.tipoProcedimento,
        especificacao: options.especificacao,
        assuntos: options.assuntos,
        interessados: options.interessados,
        observacao: options.observacao,
        nivelAcesso: options.nivelAcesso,
        hipoteseLegal: options.hipoteseLegal
      });
      if (result) {
        return {
          IdProcedimento: result.id,
          ProcedimentoFormatado: result.numero,
          LinkAcesso: `${this.config.baseUrl}/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=${result.id}`
        };
      }
    }
    throw new Error("Nenhum cliente dispon\xEDvel para criar processo");
  }
  /** Tramita processo */
  async forwardProcess(numeroProcesso, options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.enviarProcesso(
          this.currentIdUnidade,
          numeroProcesso,
          options.unidadesDestino,
          options.manterAberto,
          options.removerAnotacoes,
          options.enviarEmailNotificacao,
          options.dataRetornoProgramado,
          options.diasRetornoProgramado,
          void 0,
          // diasUteis
          options.sinReabrir
        );
      } catch (err) {
        console.warn("SOAP enviarProcesso falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      await this.browserClient.openProcess(numeroProcesso);
      return this.browserClient.forwardProcess(options);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Conclui processo */
  async concludeProcess(numeroProcesso) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      return this.soapClient.concluirProcesso(this.currentIdUnidade, numeroProcesso);
    }
    if (this.browserClient) {
      await this.browserClient.openProcess(numeroProcesso);
      return this.browserClient.concludeProcess();
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Reabre processo */
  async reopenProcess(numeroProcesso) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      return this.soapClient.reabrirProcesso(this.currentIdUnidade, numeroProcesso);
    }
    if (this.browserClient) {
      await this.browserClient.openProcess(numeroProcesso);
      return this.browserClient.reopenProcess();
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Anexa processo a outro */
  async anexarProcesso(processoPrincipal, processoAnexado) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.anexarProcesso(
          this.currentIdUnidade,
          processoPrincipal,
          processoAnexado
        );
      } catch (err) {
        console.warn("SOAP anexarProcesso falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.anexarProcesso(processoPrincipal, processoAnexado);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Relaciona dois processos */
  async relacionarProcesso(processo1, processo2) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.relacionarProcesso(
          this.currentIdUnidade,
          processo1,
          processo2
        );
      } catch (err) {
        console.warn("SOAP relacionarProcesso falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.relacionarProcesso(processo1, processo2);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Atribui processo a um usuário */
  async atribuirProcesso(numeroProcesso, usuario, sinReabrir) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.atribuirProcesso(
          this.currentIdUnidade,
          numeroProcesso,
          usuario,
          sinReabrir
        );
      } catch (err) {
        console.warn("SOAP atribuirProcesso falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.atribuirProcesso(numeroProcesso, usuario);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  // ============================================
  // Documentos
  // ============================================
  /** Lista documentos do processo atual */
  async listDocuments() {
    if (this.browserClient) {
      return this.browserClient.listDocuments();
    }
    throw new Error("Browser client n\xE3o dispon\xEDvel");
  }
  /** Cria documento interno */
  async createDocument(numeroProcesso, options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      const doc = await this.soapClient.incluirDocumento(this.currentIdUnidade, {
        Tipo: options.tipo ?? "G",
        IdProcedimento: numeroProcesso,
        IdSerie: options.idSerie,
        Numero: options.numero,
        Descricao: options.descricao,
        Interessados: options.interessados?.map((i) => ({ Sigla: i, Nome: i })),
        Destinatarios: options.destinatarios?.map((d) => ({ Sigla: d, Nome: d })),
        Observacao: options.observacao,
        NivelAcesso: options.nivelAcesso ?? 0,
        IdHipoteseLegal: options.hipoteseLegal,
        NomeArquivo: options.nomeArquivo,
        Conteudo: options.conteudoBase64
      });
      return doc.IdDocumento;
    }
    if (this.browserClient) {
      await this.browserClient.openProcess(numeroProcesso);
      return this.browserClient.createDocument(options);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Upload de documento externo */
  async uploadDocument(numeroProcesso, nomeArquivo, conteudoBase64, options) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      const doc = await this.soapClient.incluirDocumento(this.currentIdUnidade, {
        Tipo: "R",
        // Recebido/Externo
        IdProcedimento: numeroProcesso,
        IdSerie: options?.idSerie ?? "Externo",
        Descricao: options?.descricao,
        Observacao: options?.observacao,
        NivelAcesso: options?.nivelAcesso ?? 0,
        IdHipoteseLegal: options?.hipoteseLegal,
        NomeArquivo: nomeArquivo,
        Conteudo: conteudoBase64
      });
      return doc.IdDocumento;
    }
    if (this.browserClient) {
      await this.browserClient.openProcess(numeroProcesso);
      return this.browserClient.uploadDocument(nomeArquivo, conteudoBase64, options);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Assina documento */
  async signDocument(senha, cargo) {
    if (this.browserClient) {
      return this.browserClient.signDocument(senha, cargo);
    }
    throw new Error("Assinatura requer browser client");
  }
  /** Cancela documento */
  async cancelDocument(idDocumento, motivo) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.cancelarDocumento(
          this.currentIdUnidade,
          idDocumento,
          motivo
        );
      } catch (err) {
        console.warn("SOAP cancelarDocumento falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.cancelDocument(idDocumento, motivo);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Consulta detalhes do documento */
  async getDocumentDetails(idDocumento) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        const doc = await this.soapClient.consultarDocumento(
          this.currentIdUnidade,
          idDocumento,
          true,
          // andamento geração
          true,
          // assinaturas
          true,
          // publicação
          true
          // campos
        );
        return {
          id: doc.IdDocumento,
          numero: doc.DocumentoFormatado,
          tipo: doc.Serie?.Nome ?? "",
          data: doc.Data,
          assinaturas: doc.Assinaturas?.map((a) => ({
            nome: a.Nome,
            cargo: a.CargoFuncao,
            data: a.DataHora
          })) ?? []
        };
      } catch (err) {
        console.warn("SOAP consultarDocumento falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.getDocumentDetails(idDocumento);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  // ============================================
  // Blocos de Assinatura
  // ============================================
  /** Lista blocos de assinatura */
  async listBlocos() {
    if (this.browserClient) {
      return this.browserClient.listBlocos();
    }
    throw new Error("Browser client n\xE3o dispon\xEDvel");
  }
  /** Cria bloco de assinatura */
  async createBloco(descricao, tipo = "assinatura", unidades, documentos) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        const tipoMap = { assinatura: "A", reuniao: "R", interno: "I" };
        const bloco = await this.soapClient.gerarBloco(
          this.currentIdUnidade,
          tipoMap[tipo],
          descricao,
          unidades,
          documentos,
          false
        );
        return bloco.IdBloco;
      } catch (err) {
        console.warn("SOAP gerarBloco falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.createBloco(descricao, tipo);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Consulta bloco */
  async getBloco(idBloco) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        const bloco = await this.soapClient.consultarBloco(
          this.currentIdUnidade,
          idBloco,
          true
        );
        return {
          id: bloco.IdBloco,
          descricao: bloco.Descricao,
          documentos: bloco.Documentos?.map((d) => d.IdProtocolo) ?? []
        };
      } catch (err) {
        console.warn("SOAP consultarBloco falhou:", err);
      }
    }
    return null;
  }
  /** Adiciona documento ao bloco */
  async addDocumentoToBloco(idBloco, idDocumento) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.incluirDocumentoBloco(
          this.currentIdUnidade,
          idBloco,
          idDocumento
        );
      } catch (err) {
        console.warn("SOAP incluirDocumentoBloco falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.addDocumentoToBloco(idBloco, idDocumento);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Remove documento do bloco */
  async removeDocumentoFromBloco(idBloco, idDocumento) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.excluirDocumentoBloco(
          this.currentIdUnidade,
          idBloco,
          idDocumento
        );
      } catch (err) {
        console.warn("SOAP excluirDocumentoBloco falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.removeDocumentoFromBloco(idBloco, idDocumento);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  /** Disponibiliza bloco para outras unidades */
  async disponibilizarBloco(idBloco, unidades) {
    if (this.soapAvailable && this.soapClient && this.currentIdUnidade) {
      try {
        return await this.soapClient.disponibilizarBloco(this.currentIdUnidade, idBloco);
      } catch (err) {
        console.warn("SOAP disponibilizarBloco falhou, tentando browser:", err);
      }
    }
    if (this.browserClient) {
      return this.browserClient.disponibilizarBloco(idBloco, unidades);
    }
    throw new Error("Nenhum cliente dispon\xEDvel");
  }
  // ============================================
  // Utilitários
  // ============================================
  /** Captura screenshot (retorna base64) */
  async screenshot(fullPage = false) {
    if (this.browserClient) {
      return this.browserClient.screenshot(fullPage);
    }
    throw new Error("Screenshot requer browser client");
  }
  /** Acesso direto ao cliente browser */
  getBrowserClient() {
    return this.browserClient;
  }
  /** Acesso direto ao cliente SOAP */
  getSoapClient() {
    return this.soapClient;
  }
  // ============================================
  // Session Management & Window Control
  // ============================================
  /**
   * Retorna o endpoint CDP para reconexão futura
   * Útil para manter sessão entre execuções do agente
   */
  getCdpEndpoint() {
    return this.browserClient?.getCdpEndpoint() ?? null;
  }
  /**
   * Minimiza a janela do navegador (via CDP)
   * Útil quando se quer manter o navegador aberto mas fora do caminho
   */
  async minimizeWindow() {
    if (this.browserClient) {
      await this.browserClient.minimizeWindow();
    }
  }
  /**
   * Restaura a janela do navegador (via CDP)
   */
  async restoreWindow() {
    if (this.browserClient) {
      await this.browserClient.restoreWindow();
    }
  }
  /**
   * Traz a janela para frente
   */
  async bringToFront() {
    if (this.browserClient) {
      await this.browserClient.bringToFront();
    }
  }
  /**
   * Maximiza a janela do navegador
   */
  async maximizeWindow() {
    if (this.browserClient) {
      await this.browserClient.maximizeWindow();
    }
  }
  /**
   * Obtém as dimensões e posição da janela
   */
  async getWindowBounds() {
    return this.browserClient?.getWindowBounds() ?? null;
  }
  /**
   * Define as dimensões e posição da janela
   */
  async setWindowBounds(bounds) {
    if (this.browserClient) {
      await this.browserClient.setWindowBounds(bounds);
    }
  }
  /**
   * Verifica se a sessão ainda está ativa
   */
  async isSessionActive() {
    if (this.browserClient) {
      return this.browserClient.isSessionActive();
    }
    return false;
  }
};
var client_default = SEIClient;

// src/watcher.ts
import { EventEmitter } from "events";
var SEIWatcher = class extends EventEmitter {
  client;
  options;
  intervalId = null;
  isRunning = false;
  lastState = /* @__PURE__ */ new Map();
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.options = {
      interval: options.interval ?? 3e4,
      types: options.types ?? ["processos_recebidos"],
      maxItems: options.maxItems ?? 100,
      preferSoap: options.preferSoap ?? true
    };
    for (const type of this.options.types) {
      this.lastState.set(type, /* @__PURE__ */ new Map());
    }
  }
  /** Inicia o monitoramento */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.emit("started");
    this.check();
    this.intervalId = setInterval(() => {
      this.check();
    }, this.options.interval);
  }
  /** Para o monitoramento */
  stop() {
    if (!this.isRunning) return;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.emit("stopped");
  }
  /** Verifica se está rodando */
  get running() {
    return this.isRunning;
  }
  /** Força uma verificação imediata */
  async check() {
    for (const type of this.options.types) {
      try {
        await this.checkType(type);
      } catch (error) {
        this.emit("error", error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  /** Verifica um tipo específico */
  async checkType(type) {
    let items = [];
    let source = "browser";
    if (this.options.preferSoap && this.client.hasSoap) {
      try {
        items = await this.fetchViaSoap(type);
        source = "soap";
      } catch {
        items = await this.fetchViaBrowser(type);
        source = "browser";
      }
    } else {
      items = await this.fetchViaBrowser(type);
      source = "browser";
    }
    this.emit("check", type, source);
    const previousState = this.lastState.get(type) ?? /* @__PURE__ */ new Map();
    const newItems = [];
    for (const item of items) {
      if (!previousState.has(item.id)) {
        newItems.push(item);
      }
    }
    const newState = /* @__PURE__ */ new Map();
    for (const item of items.slice(0, this.options.maxItems)) {
      newState.set(item.id, item);
    }
    this.lastState.set(type, newState);
    if (newItems.length > 0 && previousState.size > 0) {
      const event = {
        type,
        timestamp: /* @__PURE__ */ new Date(),
        items: newItems,
        source
      };
      this.emit(type, event);
    }
  }
  /** Busca dados via SOAP */
  async fetchViaSoap(type) {
    const soapClient = this.client.getSoapClient();
    if (!soapClient) throw new Error("SOAP client n\xE3o dispon\xEDvel");
    throw new Error("SOAP fetch n\xE3o implementado para este tipo");
  }
  /** Busca dados via Playwright/Browser */
  async fetchViaBrowser(type) {
    const browserClient = this.client.getBrowserClient();
    if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
    const page = browserClient.getPage();
    switch (type) {
      case "processos_recebidos":
        return this.fetchProcessosRecebidos(page);
      case "processos_gerados":
        return this.fetchProcessosGerados(page);
      case "blocos_assinatura":
        return this.fetchBlocosAssinatura(page);
      case "documentos":
        return this.fetchDocumentosNovos(page);
      case "retornos_programados":
        return this.fetchRetornosProgramados(page);
      case "prazos":
        return this.fetchPrazos(page);
      default:
        return [];
    }
  }
  /** Busca processos recebidos */
  async fetchProcessosRecebidos(page) {
    await page.goto(await this.buildUrl("procedimento_controlar", { acao_origem: "procedimento_recebido" }));
    await page.waitForLoadState("networkidle");
    const items = [];
    const rows = await page.$$("table#tblProcessosRecebidos tbody tr, #divProcessos .processo-item, .infraTable tbody tr");
    for (const row of rows.slice(0, this.options.maxItems)) {
      try {
        const cells = await row.$$("td");
        const link = await row.$('a[href*="procedimento"]');
        const numero = await link?.textContent() ?? await cells[0]?.textContent() ?? "";
        const href = await link?.getAttribute("href") ?? "";
        const idMatch = href.match(/id_procedimento=(\d+)/);
        if (!idMatch) continue;
        const item = {
          id: idMatch[1],
          numero: numero.trim(),
          tipo: await cells[1]?.textContent() ?? "",
          remetente: await cells[2]?.textContent() ?? "",
          dataRecebimento: await cells[3]?.textContent() ?? "",
          anotacao: await cells[4]?.textContent() ?? "",
          urgente: await row.$('.marcador-urgente, [class*="urgente"], img[title*="Urgente"]') !== null
        };
        items.push(item);
      } catch {
      }
    }
    return items;
  }
  /** Busca processos gerados */
  async fetchProcessosGerados(page) {
    await page.goto(await this.buildUrl("procedimento_controlar", { acao_origem: "procedimento_gerado" }));
    await page.waitForLoadState("networkidle");
    const items = [];
    const rows = await page.$$("table tbody tr, .infraTable tbody tr");
    for (const row of rows.slice(0, this.options.maxItems)) {
      try {
        const link = await row.$('a[href*="procedimento"]');
        const href = await link?.getAttribute("href") ?? "";
        const idMatch = href.match(/id_procedimento=(\d+)/);
        if (!idMatch) continue;
        const cells = await row.$$("td");
        items.push({
          id: idMatch[1],
          numero: (await link?.textContent())?.trim() ?? "",
          tipo: await cells[1]?.textContent() ?? "",
          descricao: await cells[2]?.textContent() ?? "",
          data: await cells[3]?.textContent() ?? ""
        });
      } catch {
      }
    }
    return items;
  }
  /** Busca blocos de assinatura */
  async fetchBlocosAssinatura(page) {
    await page.goto(await this.buildUrl("bloco_assinatura_listar"));
    await page.waitForLoadState("networkidle");
    const items = [];
    const rows = await page.$$("table#tblBlocos tbody tr, .bloco-item");
    for (const row of rows.slice(0, this.options.maxItems)) {
      try {
        const link = await row.$('a[href*="bloco"]');
        const href = await link?.getAttribute("href") ?? "";
        const idMatch = href.match(/id_bloco=(\d+)/);
        if (!idMatch) continue;
        const cells = await row.$$("td");
        const qtdText = await cells[2]?.textContent() ?? "0";
        const item = {
          id: idMatch[1],
          numero: (await link?.textContent())?.trim() ?? "",
          descricao: await cells[1]?.textContent() ?? "",
          quantidadeDocumentos: parseInt(qtdText.match(/\d+/)?.[0] ?? "0", 10),
          unidadeOrigem: await cells[3]?.textContent() ?? ""
        };
        items.push(item);
      } catch {
      }
    }
    return items;
  }
  /** Busca documentos novos (requer processo aberto) */
  async fetchDocumentosNovos(page) {
    return [];
  }
  /** Busca retornos programados */
  async fetchRetornosProgramados(page) {
    await page.goto(await this.buildUrl("procedimento_controlar", { acao_origem: "retorno_programado" }));
    await page.waitForLoadState("networkidle");
    const items = [];
    const rows = await page.$$("table tbody tr");
    for (const row of rows.slice(0, this.options.maxItems)) {
      try {
        const link = await row.$('a[href*="procedimento"]');
        const href = await link?.getAttribute("href") ?? "";
        const idMatch = href.match(/id_procedimento=(\d+)/);
        if (!idMatch) continue;
        const cells = await row.$$("td");
        items.push({
          id: idMatch[1],
          numero: (await link?.textContent())?.trim() ?? "",
          data: await cells[1]?.textContent() ?? "",
          // Data de retorno
          unidade: await cells[2]?.textContent() ?? ""
        });
      } catch {
      }
    }
    return items;
  }
  /** Busca processos com prazo */
  async fetchPrazos(page) {
    await page.goto(await this.buildUrl("procedimento_controlar", { acao_origem: "prazo" }));
    await page.waitForLoadState("networkidle");
    const items = [];
    const rows = await page.$$("table tbody tr, .processo-prazo");
    for (const row of rows.slice(0, this.options.maxItems)) {
      try {
        const link = await row.$('a[href*="procedimento"]');
        const href = await link?.getAttribute("href") ?? "";
        const idMatch = href.match(/id_procedimento=(\d+)/);
        if (!idMatch) continue;
        const cells = await row.$$("td");
        const prazoText = await cells[1]?.textContent() ?? "";
        items.push({
          id: idMatch[1],
          numero: (await link?.textContent())?.trim() ?? "",
          data: prazoText,
          urgente: prazoText.includes("VENCIDO") || prazoText.includes("HOJE"),
          metadata: {
            diasRestantes: parseInt(prazoText.match(/-?\d+/)?.[0] ?? "0", 10)
          }
        });
      } catch {
      }
    }
    return items;
  }
  /** Constrói URL do SEI */
  async buildUrl(acao, params = {}) {
    const browserClient = this.client.getBrowserClient();
    if (!browserClient) throw new Error("Browser client n\xE3o dispon\xEDvel");
    const page = browserClient.getPage();
    const currentUrl = page.url();
    const baseUrl = currentUrl.match(/^(https?:\/\/[^/]+)/)?.[1] ?? "";
    const searchParams = new URLSearchParams({ acao, ...params });
    return `${baseUrl}/sei/controlador.php?${searchParams.toString()}`;
  }
  // Typed event emitter overloads
  on(event, listener) {
    return super.on(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }
};

// src/service.ts
import { EventEmitter as EventEmitter2 } from "events";
import { mkdir as mkdir2 } from "fs/promises";
import { join as join4 } from "path";

// src/users.ts
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";

// src/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var SALT_LENGTH = 32;
var KEY_LENGTH = 32;
function deriveKey(password, salt) {
  return scryptSync(password, salt, KEY_LENGTH);
}
function encrypt(data, masterPassword) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(masterPassword, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    salt: salt.toString("base64")
  };
}
function decrypt(encryptedData, masterPassword) {
  const salt = Buffer.from(encryptedData.salt, "base64");
  const key = deriveKey(masterPassword, salt);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const tag = Buffer.from(encryptedData.tag, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function decryptJson(encryptedData, masterPassword) {
  const decrypted = decrypt(encryptedData, masterPassword);
  return JSON.parse(decrypted);
}
function generateSecurePassword(length = 32) {
  return randomBytes(length).toString("base64").slice(0, length);
}

// src/users.ts
var DEFAULT_NOTIFICATION_CONFIG = {
  email: true,
  push: false,
  events: {
    processos_recebidos: true,
    blocos_assinatura: true,
    prazos: true,
    retornos_programados: true
  },
  includeContent: true,
  attachDocuments: false,
  downloadProcess: false
};
var SEIUserManager = class {
  storagePath;
  masterPassword;
  store = null;
  storeFile;
  constructor(options) {
    this.storagePath = options.storagePath;
    this.masterPassword = options.masterPassword;
    this.storeFile = join3(this.storagePath, "sei-users.encrypted.json");
  }
  /** Inicializa o gerenciador */
  async init() {
    if (!existsSync3(this.storagePath)) {
      await mkdir(this.storagePath, { recursive: true });
    }
    if (existsSync3(this.storeFile)) {
      const data = await readFile(this.storeFile, "utf-8");
      this.store = JSON.parse(data);
    } else {
      this.store = { version: 1, users: [] };
      await this.save();
    }
  }
  /** Salva o store em disco */
  async save() {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    await writeFile(this.storeFile, JSON.stringify(this.store, null, 2));
  }
  /** Adiciona um novo usuário */
  async addUser(options) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const existing = this.store.users.find((u) => u.config.id === options.id);
    if (existing) {
      throw new Error(`Usu\xE1rio ${options.id} j\xE1 existe`);
    }
    const encryptedCreds = encrypt(options.credentials, this.masterPassword);
    const config = {
      id: options.id,
      nome: options.nome,
      email: options.email,
      seiUrl: options.seiUrl,
      orgao: options.orgao,
      notifications: {
        ...DEFAULT_NOTIFICATION_CONFIG,
        ...options.notifications
      },
      active: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.store.users.push({
      config,
      credentials: encryptedCreds
    });
    await this.save();
    return config;
  }
  /** Atualiza um usuário existente */
  async updateUser(id, updates) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const userIndex = this.store.users.findIndex((u) => u.config.id === id);
    if (userIndex === -1) {
      throw new Error(`Usu\xE1rio ${id} n\xE3o encontrado`);
    }
    this.store.users[userIndex].config = {
      ...this.store.users[userIndex].config,
      ...updates
    };
    await this.save();
    return this.store.users[userIndex].config;
  }
  /** Atualiza credenciais de um usuário */
  async updateCredentials(id, credentials) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const userIndex = this.store.users.findIndex((u) => u.config.id === id);
    if (userIndex === -1) {
      throw new Error(`Usu\xE1rio ${id} n\xE3o encontrado`);
    }
    this.store.users[userIndex].credentials = encrypt(credentials, this.masterPassword);
    await this.save();
  }
  /** Remove um usuário */
  async removeUser(id) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const userIndex = this.store.users.findIndex((u) => u.config.id === id);
    if (userIndex === -1) {
      throw new Error(`Usu\xE1rio ${id} n\xE3o encontrado`);
    }
    this.store.users.splice(userIndex, 1);
    await this.save();
  }
  /** Obtém configuração de um usuário */
  getUser(id) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const user = this.store.users.find((u) => u.config.id === id);
    return user?.config ?? null;
  }
  /** Obtém credenciais descriptografadas */
  getCredentials(id) {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    const user = this.store.users.find((u) => u.config.id === id);
    if (!user) return null;
    return decryptJson(user.credentials, this.masterPassword);
  }
  /** Lista todos os usuários */
  getAllUsers() {
    if (!this.store) throw new Error("Store n\xE3o inicializado");
    return this.store.users.map((u) => u.config);
  }
  /** Lista usuários ativos */
  getActiveUsers() {
    return this.getAllUsers().filter((u) => u.active);
  }
  /** Atualiza timestamp da última verificação */
  async updateLastCheck(id) {
    await this.updateUser(id, { lastCheck: (/* @__PURE__ */ new Date()).toISOString() });
  }
  /** Ativa/desativa um usuário */
  async setActive(id, active) {
    await this.updateUser(id, { active });
  }
};

// src/notifications.ts
import { createTransport } from "nodemailer";
var SEINotificationService = class {
  emailConfig;
  transporter;
  constructor(options) {
    this.emailConfig = options.email;
    if (this.emailConfig) {
      this.transporter = createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth
      });
    }
  }
  /** Envia notificação por email */
  async sendEmail(payload) {
    if (!this.transporter || !this.emailConfig) {
      console.warn("Email n\xE3o configurado");
      return false;
    }
    const html = this.buildEmailHtml(payload);
    const subject = this.buildSubject(payload);
    const attachments = payload.items.flatMap((item) => item.documentos ?? []).filter((doc) => doc.filePath || doc.base64).map((doc) => ({
      filename: doc.nome,
      path: doc.filePath,
      content: doc.base64 ? Buffer.from(doc.base64, "base64") : void 0
    }));
    try {
      await this.transporter.sendMail({
        from: `"${this.emailConfig.fromName ?? "SEI Notifica\xE7\xF5es"}" <${this.emailConfig.from}>`,
        to: payload.email,
        subject,
        html,
        attachments: attachments.length > 0 ? attachments : void 0
      });
      return true;
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      return false;
    }
  }
  /** Envia notificação via webhook */
  async sendWebhook(url, payload) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: payload.type,
          userId: payload.userId,
          timestamp: payload.timestamp.toISOString(),
          items: payload.items.map((item) => ({
            ...item,
            // Remover base64 do webhook para não sobrecarregar
            documentos: item.documentos?.map(({ base64, ...doc }) => doc)
          }))
        })
      });
      return response.ok;
    } catch (error) {
      console.error("Erro ao enviar webhook:", error);
      return false;
    }
  }
  /** Constrói assunto do email */
  buildSubject(payload) {
    const count = payload.items.length;
    switch (payload.type) {
      case "processos_recebidos":
        return `\u{1F4E5} SEI: ${count} novo${count > 1 ? "s" : ""} processo${count > 1 ? "s" : ""} recebido${count > 1 ? "s" : ""}`;
      case "blocos_assinatura":
        return `\u270D\uFE0F SEI: ${count} bloco${count > 1 ? "s" : ""} de assinatura pendente${count > 1 ? "s" : ""}`;
      case "prazos":
        const urgentes = payload.items.filter((i) => i.prazo?.status === "vencido" || i.prazo?.status === "vencendo_hoje").length;
        if (urgentes > 0) {
          return `\u26A0\uFE0F SEI: ${urgentes} prazo${urgentes > 1 ? "s" : ""} URGENTE${urgentes > 1 ? "S" : ""}!`;
        }
        return `\u23F0 SEI: ${count} processo${count > 1 ? "s" : ""} com prazo`;
      case "retornos_programados":
        return `\u{1F4C5} SEI: ${count} retorno${count > 1 ? "s" : ""} programado${count > 1 ? "s" : ""}`;
      default:
        return `\u{1F514} SEI: Nova notifica\xE7\xE3o`;
    }
  }
  /** Constrói HTML do email */
  buildEmailHtml(payload) {
    const items = payload.items.map((item) => this.buildItemHtml(item, payload)).join("");
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a365d; color: #fff; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; }
    .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .item-title { font-size: 16px; font-weight: 600; color: #1a365d; margin: 0; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-urgente { background: #fed7d7; color: #c53030; }
    .badge-normal { background: #e2e8f0; color: #4a5568; }
    .badge-prazo { background: #fefcbf; color: #975a16; }
    .meta { color: #718096; font-size: 14px; margin-bottom: 8px; }
    .teor { background: #f7fafc; border-left: 4px solid #4299e1; padding: 12px; margin: 12px 0; font-size: 14px; color: #2d3748; }
    .prazo { background: #fffaf0; border: 1px solid #ed8936; border-radius: 4px; padding: 12px; margin: 12px 0; }
    .prazo-vencido { background: #fff5f5; border-color: #c53030; }
    .prazo-hoje { background: #fffff0; border-color: #d69e2e; }
    .documentos { margin-top: 12px; }
    .documento { display: flex; align-items: center; padding: 8px; background: #f7fafc; border-radius: 4px; margin-bottom: 8px; }
    .documento-icon { margin-right: 8px; }
    .actions { margin-top: 16px; }
    .btn { display: inline-block; padding: 10px 20px; background: #4299e1; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 500; margin-right: 8px; }
    .btn-secondary { background: #e2e8f0; color: #4a5568; }
    .footer { background: #f7fafc; padding: 16px; text-align: center; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.getHeaderTitle(payload.type)}</h1>
    </div>
    <div class="content">
      <p>Ol\xE1, <strong>${payload.nome}</strong>!</p>
      <p>${this.getIntroText(payload)}</p>

      ${items}

    </div>
    <div class="footer">
      <p>Esta notifica\xE7\xE3o foi enviada automaticamente pelo sistema Iudex.</p>
      <p>SEI: ${payload.seiUrl}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
  /** Constrói HTML de um item */
  buildItemHtml(item, payload) {
    const processo = item;
    const bloco = item;
    let badge = "";
    if (item.urgente) {
      badge = '<span class="badge badge-urgente">URGENTE</span>';
    } else if (item.prazo?.status === "vencido") {
      badge = '<span class="badge badge-urgente">PRAZO VENCIDO</span>';
    } else if (item.prazo?.status === "vencendo_hoje") {
      badge = '<span class="badge badge-prazo">VENCE HOJE</span>';
    }
    let meta = "";
    if (processo.remetente) {
      meta += `<div class="meta">\u{1F4E4} Remetente: <strong>${processo.remetente}</strong></div>`;
    }
    if (processo.dataRecebimento) {
      meta += `<div class="meta">\u{1F4C5} Recebido em: ${processo.dataRecebimento}</div>`;
    }
    if (item.tipo) {
      meta += `<div class="meta">\u{1F4CB} Tipo: ${item.tipo}</div>`;
    }
    if (bloco.quantidadeDocumentos) {
      meta += `<div class="meta">\u{1F4C4} Documentos: ${bloco.quantidadeDocumentos}</div>`;
    }
    let teor = "";
    if (item.teor) {
      const teorTruncado = item.teor.length > 500 ? item.teor.substring(0, 500) + "..." : item.teor;
      teor = `
        <div class="teor">
          <strong>Teor:</strong><br>
          ${teorTruncado.replace(/\n/g, "<br>")}
        </div>
      `;
    }
    let prazo = "";
    if (item.prazo) {
      const prazoClass = item.prazo.status === "vencido" ? "prazo-vencido" : item.prazo.status === "vencendo_hoje" ? "prazo-hoje" : "";
      prazo = `
        <div class="prazo ${prazoClass}">
          <strong>\u23F0 Prazo:</strong> ${item.prazo.dataLimite}<br>
          <strong>Dias restantes:</strong> ${item.prazo.diasRestantes} (${item.prazo.tipo === "util" ? "\xFAteis" : "corridos"})
        </div>
      `;
    }
    let documentos = "";
    if (item.documentos && item.documentos.length > 0) {
      const docList = item.documentos.map((doc) => `
        <div class="documento">
          <span class="documento-icon">\u{1F4C4}</span>
          <span>${doc.nome} (${doc.tipo}) - ${doc.data}</span>
        </div>
      `).join("");
      documentos = `
        <div class="documentos">
          <strong>Documentos da data:</strong>
          ${docList}
        </div>
      `;
    }
    const linkProcesso = item.linkProcesso ?? `${payload.seiUrl}/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=${item.id}`;
    return `
      <div class="item">
        <div class="item-header">
          <h3 class="item-title">${item.numero ?? item.descricao ?? `ID: ${item.id}`}</h3>
          ${badge}
        </div>
        ${meta}
        ${teor}
        ${prazo}
        ${documentos}
        <div class="actions">
          <a href="${linkProcesso}" class="btn" target="_blank">Abrir no SEI</a>
        </div>
      </div>
    `;
  }
  /** Título do header por tipo */
  getHeaderTitle(type) {
    switch (type) {
      case "processos_recebidos":
        return "\u{1F4E5} Novos Processos Recebidos";
      case "blocos_assinatura":
        return "\u270D\uFE0F Blocos de Assinatura";
      case "prazos":
        return "\u23F0 Alertas de Prazo";
      case "retornos_programados":
        return "\u{1F4C5} Retornos Programados";
      default:
        return "\u{1F514} Notifica\xE7\xE3o SEI";
    }
  }
  /** Texto introdutório */
  getIntroText(payload) {
    const count = payload.items.length;
    switch (payload.type) {
      case "processos_recebidos":
        return `Voc\xEA recebeu <strong>${count}</strong> novo${count > 1 ? "s" : ""} processo${count > 1 ? "s" : ""} no SEI.`;
      case "blocos_assinatura":
        return `Voc\xEA tem <strong>${count}</strong> bloco${count > 1 ? "s" : ""} de assinatura aguardando.`;
      case "prazos":
        return `Aten\xE7\xE3o! <strong>${count}</strong> processo${count > 1 ? "s" : ""} com prazo requer${count > 1 ? "em" : ""} sua aten\xE7\xE3o.`;
      case "retornos_programados":
        return `Voc\xEA tem <strong>${count}</strong> retorno${count > 1 ? "s" : ""} programado${count > 1 ? "s" : ""}.`;
      default:
        return `Voc\xEA tem <strong>${count}</strong> nova${count > 1 ? "s" : ""} notifica\xE7${count > 1 ? "\xF5es" : "\xE3o"}.`;
    }
  }
  /** Verifica conexão com servidor de email */
  async verify() {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
};

// src/service.ts
var SEIService = class extends EventEmitter2 {
  config;
  userManager;
  notifier;
  sessions = /* @__PURE__ */ new Map();
  isRunning = false;
  constructor(config) {
    super();
    this.config = {
      pollInterval: 6e4,
      watchTypes: ["processos_recebidos", "blocos_assinatura", "prazos", "retornos_programados"],
      playwright: { headless: true, timeout: 3e4 },
      ...config
    };
    this.userManager = new SEIUserManager({
      storagePath: config.dataPath,
      masterPassword: config.masterPassword
    });
    this.notifier = new SEINotificationService({
      email: config.email
    });
  }
  /** Inicializa o serviço */
  async init() {
    await this.userManager.init();
    await mkdir2(join4(this.config.dataPath, "downloads"), { recursive: true });
  }
  // ============================================
  // Gestão de Usuários
  // ============================================
  /** Adiciona um novo usuário */
  async addUser(options) {
    const user = await this.userManager.addUser(options);
    this.emit("user:added", user);
    return user;
  }
  /** Remove um usuário */
  async removeUser(userId) {
    await this.stopUser(userId);
    await this.userManager.removeUser(userId);
    this.emit("user:removed", userId);
  }
  /** Obtém configuração de usuário */
  getUser(userId) {
    return this.userManager.getUser(userId);
  }
  /** Lista todos os usuários */
  getAllUsers() {
    return this.userManager.getAllUsers();
  }
  /** Atualiza configurações de usuário */
  async updateUser(userId, updates) {
    return this.userManager.updateUser(userId, updates);
  }
  /** Atualiza credenciais */
  async updateCredentials(userId, credentials) {
    await this.userManager.updateCredentials(userId, credentials);
    if (this.sessions.has(userId)) {
      await this.stopUser(userId);
      await this.startUser(userId);
    }
  }
  // ============================================
  // Monitoramento
  // ============================================
  /** Inicia monitoramento de um usuário */
  async startUser(userId) {
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error(`Usu\xE1rio ${userId} n\xE3o encontrado`);
    }
    if (!user.active) {
      throw new Error(`Usu\xE1rio ${userId} est\xE1 inativo`);
    }
    if (this.sessions.has(userId)) {
      return true;
    }
    const credentials = this.userManager.getCredentials(userId);
    if (!credentials) {
      throw new Error(`Credenciais de ${userId} n\xE3o encontradas`);
    }
    try {
      const client = new SEIClient({
        baseUrl: user.seiUrl,
        browser: {
          usuario: credentials.usuario,
          senha: credentials.senha,
          orgao: user.orgao
        },
        playwright: this.config.playwright
      });
      await client.init();
      const loggedIn = await client.login();
      if (!loggedIn) {
        await client.close();
        throw new Error("Falha no login");
      }
      const watcher = new SEIWatcher(client, {
        interval: this.config.pollInterval,
        types: this.config.watchTypes
      });
      this.setupWatcherHandlers(watcher, user);
      watcher.start();
      this.sessions.set(userId, { client, watcher, config: user });
      await this.userManager.updateLastCheck(userId);
      return true;
    } catch (error) {
      this.emit("user:error", userId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
  /** Para monitoramento de um usuário */
  async stopUser(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;
    session.watcher.stop();
    await session.client.close();
    this.sessions.delete(userId);
  }
  /** Inicia monitoramento de todos os usuários ativos */
  async startAll() {
    const users = this.userManager.getActiveUsers();
    for (const user of users) {
      try {
        await this.startUser(user.id);
      } catch (error) {
        console.error(`Erro ao iniciar ${user.id}:`, error);
      }
    }
    this.isRunning = true;
    this.emit("started");
  }
  /** Para monitoramento de todos os usuários */
  async stopAll() {
    for (const userId of this.sessions.keys()) {
      await this.stopUser(userId);
    }
    this.isRunning = false;
    this.emit("stopped");
  }
  /** Verifica se está rodando */
  get running() {
    return this.isRunning;
  }
  /** Lista sessões ativas */
  getActiveSessions() {
    return Array.from(this.sessions.keys());
  }
  // ============================================
  // Handlers do Watcher
  // ============================================
  setupWatcherHandlers(watcher, user) {
    const types = ["processos_recebidos", "blocos_assinatura", "prazos", "retornos_programados"];
    for (const type of types) {
      if (!user.notifications.events[type]) {
        continue;
      }
      watcher.on(type, async (event) => {
        try {
          await this.handleWatchEvent(user, event);
        } catch (error) {
          this.emit("notification:error", user.id, error instanceof Error ? error : new Error(String(error)));
        }
      });
    }
    watcher.on("error", (error) => {
      this.emit("user:error", user.id, error);
    });
  }
  /** Processa evento do watcher */
  async handleWatchEvent(user, event) {
    const session = this.sessions.get(user.id);
    if (!session) return;
    const enrichedItems = await this.enrichItems(session, user, event);
    const payload = {
      type: event.type,
      userId: user.id,
      email: user.email,
      nome: user.nome,
      items: enrichedItems,
      timestamp: event.timestamp,
      seiUrl: user.seiUrl
    };
    if (user.notifications.email) {
      const sent = await this.notifier.sendEmail(payload);
      if (sent) {
        this.emit("notification:sent", user.id, event.type);
      }
    }
    if (user.notifications.push && user.notifications.webhookUrl) {
      await this.notifier.sendWebhook(user.notifications.webhookUrl, payload);
    }
    await this.userManager.updateLastCheck(user.id);
  }
  /** Enriquece itens com informações adicionais */
  async enrichItems(session, user, event) {
    const enriched = [];
    for (const item of event.items) {
      const enrichedItem = { ...item };
      try {
        const browserClient = session.client.getBrowserClient();
        if (!browserClient) continue;
        const opened = await browserClient.openProcess(item.numero ?? item.id);
        if (!opened) continue;
        enrichedItem.prazo = await this.extractPrazo(browserClient);
        if (user.notifications.includeContent) {
          enrichedItem.teor = await this.extractTeor(browserClient, item);
        }
        const docs = await browserClient.listDocuments();
        const hoje = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
        enrichedItem.documentos = docs.filter((d) => d.tipo && d.titulo).slice(0, 10).map((d) => ({
          id: d.id,
          nome: d.titulo,
          tipo: d.tipo,
          data: hoje
        }));
        if (user.notifications.attachDocuments && enrichedItem.documentos) {
          enrichedItem.documentos = await this.downloadDocuments(
            session,
            user,
            enrichedItem.documentos
          );
        }
        if (user.notifications.downloadProcess) {
          const processPath = await this.downloadProcess(session, user, item);
          if (processPath) {
            enrichedItem.documentos = enrichedItem.documentos ?? [];
            enrichedItem.documentos.push({
              id: "processo-completo",
              nome: `Processo_${item.numero?.replace(/[^0-9]/g, "") ?? item.id}.pdf`,
              tipo: "Processo Completo",
              data: hoje,
              filePath: processPath
            });
          }
        }
        enrichedItem.linkProcesso = `${user.seiUrl}/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=${item.id}`;
      } catch (error) {
        console.error(`Erro ao enriquecer item ${item.id}:`, error);
      }
      enriched.push(enrichedItem);
    }
    return enriched;
  }
  /** Extrai informações de prazo */
  async extractPrazo(browserClient) {
    try {
      const page = browserClient.getPage();
      const prazoEl = await page.$('[class*="prazo"], .marcador-prazo, [title*="Prazo"]');
      if (!prazoEl) return void 0;
      const prazoText = await prazoEl.textContent();
      if (!prazoText) return void 0;
      const dataMatch = prazoText.match(/(\d{2}\/\d{2}\/\d{4})/);
      const diasMatch = prazoText.match(/(-?\d+)\s*(dias?|úteis?|corridos?)/i);
      if (!dataMatch) return void 0;
      const diasRestantes = diasMatch ? parseInt(diasMatch[1], 10) : 0;
      const tipo = prazoText.toLowerCase().includes("\xFAteis") ? "util" : "corrido";
      let status = "normal";
      if (diasRestantes < 0) {
        status = "vencido";
      } else if (diasRestantes === 0) {
        status = "vencendo_hoje";
      } else if (diasRestantes <= 3) {
        status = "proximo";
      }
      return {
        dataLimite: dataMatch[1],
        diasRestantes,
        tipo,
        status
      };
    } catch {
      return void 0;
    }
  }
  /** Extrai teor do documento */
  async extractTeor(browserClient, item) {
    try {
      const page = browserClient.getPage();
      const docLink = await page.$('#divArvore a[href*="documento"], .arvore a[href*="documento"]');
      if (docLink) {
        await docLink.click();
        await page.waitForLoadState("networkidle");
      }
      const iframe = page.frameLocator('iframe[name="ifrVisualizacao"], iframe[name="ifrConteudo"]');
      const body = iframe.locator("body");
      const text = await body.textContent({ timeout: 5e3 });
      return text?.trim().substring(0, 2e3);
    } catch {
      return void 0;
    }
  }
  /** Baixa documentos */
  async downloadDocuments(session, user, docs) {
    const downloadPath = join4(this.config.dataPath, "downloads", user.id);
    await mkdir2(downloadPath, { recursive: true });
    for (const doc of docs) {
      try {
        const page = session.client.getBrowserClient()?.getPage();
        if (!page) continue;
        const downloadLink = await page.$(`a[href*="documento_download"][href*="${doc.id}"]`);
        if (!downloadLink) continue;
        const downloadPromise = page.waitForEvent("download", { timeout: 1e4 });
        await downloadLink.click();
        const download = await downloadPromise;
        const filePath = join4(downloadPath, doc.nome);
        await download.saveAs(filePath);
        doc.filePath = filePath;
      } catch {
      }
    }
    return docs;
  }
  /** Baixa processo completo */
  async downloadProcess(session, user, item) {
    try {
      const browserClient = session.client.getBrowserClient();
      if (!browserClient) return void 0;
      const downloadPath = join4(this.config.dataPath, "downloads", user.id);
      await mkdir2(downloadPath, { recursive: true });
      const page = browserClient.getPage();
      const pdfBtn = await page.$('a[href*="gerar_pdf"], a[href*="procedimento_gerar_pdf"]');
      if (!pdfBtn) return void 0;
      const downloadPromise = page.waitForEvent("download", { timeout: 3e4 });
      await pdfBtn.click();
      await page.waitForTimeout(1e3);
      const confirmBtn = await page.$('input[value*="Gerar"], #btnGerar');
      if (confirmBtn) {
        await confirmBtn.click();
      }
      const download = await downloadPromise;
      const filePath = join4(downloadPath, `Processo_${item.numero?.replace(/[^0-9]/g, "") ?? item.id}.pdf`);
      await download.saveAs(filePath);
      return filePath;
    } catch {
      return void 0;
    }
  }
  // ============================================
  // Event Emitter Typed
  // ============================================
  on(event, listener) {
    return super.on(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }
};

// src/api.ts
import { createServer } from "http";

// src/daemon.ts
import { EventEmitter as EventEmitter3 } from "events";
var SEIDaemon = class extends EventEmitter3 {
  config;
  client = null;
  watcher = null;
  notifier = null;
  isRunning = false;
  sessionCheckTimer = null;
  keepAliveTimer = null;
  loginAttempts = 0;
  maxLoginAttempts = 3;
  constructor(config) {
    super();
    this.config = {
      ...config,
      watch: {
        types: config.watch?.types ?? ["processos_recebidos", "blocos_assinatura", "prazos"],
        interval: config.watch?.interval ?? 6e4,
        maxItems: config.watch?.maxItems ?? 100
      },
      sessionCheckInterval: config.sessionCheckInterval ?? 3e5,
      // 5 min
      keepAliveInterval: config.keepAliveInterval ?? 12e4
      // 2 min
    };
  }
  /** Modo CDP ativo */
  isCdpMode = false;
  /** Inicia o daemon */
  async start() {
    if (this.isRunning) {
      console.log("\u26A0\uFE0F Daemon j\xE1 est\xE1 rodando");
      return;
    }
    const cdpEndpoint = this.config.browser?.cdpEndpoint;
    this.isCdpMode = !!cdpEndpoint;
    console.log("\u{1F680} Iniciando SEI Daemon...");
    console.log(`   URL: ${this.config.baseUrl}`);
    console.log(`   Modo: ${this.isCdpMode ? "CDP (Chrome j\xE1 aberto)" : "Browser pr\xF3prio"}`);
    if (this.isCdpMode) {
      console.log(`   CDP Endpoint: ${cdpEndpoint}`);
    } else {
      console.log(`   Usu\xE1rio: ${this.config.credentials?.usuario || "(n\xE3o configurado)"}`);
    }
    console.log(`   Monitorando: ${this.config.watch.types.join(", ")}`);
    console.log(`   Intervalo: ${this.config.watch.interval / 1e3}s`);
    try {
      this.client = new SEIClient({
        baseUrl: this.config.baseUrl,
        browser: this.config.credentials,
        playwright: {
          headless: this.config.browser?.headless ?? true,
          timeout: this.config.browser?.timeout ?? 6e4,
          cdpEndpoint
        }
      });
      await this.client.init();
      if (this.isCdpMode) {
        const loggedIn = await this.client.isLoggedIn();
        if (loggedIn) {
          console.log("   \u2705 J\xE1 logado no Chrome");
          this.emit("login");
        } else {
          console.log("   \u26A0\uFE0F N\xE3o est\xE1 logado no Chrome!");
          if (this.config.credentials?.usuario && this.config.credentials?.senha) {
            console.log("   \u{1F510} Fazendo login...");
            await this.doLogin();
          } else {
            throw new Error("Chrome n\xE3o est\xE1 logado no SEI. Fa\xE7a login manualmente e reinicie o daemon.");
          }
        }
      } else {
        await this.doLogin();
      }
      if (this.config.notifications?.email) {
        this.notifier = new SEINotificationService({
          email: this.config.notifications.email
        });
      }
      this.watcher = new SEIWatcher(this.client, {
        interval: this.config.watch.interval,
        types: this.config.watch.types,
        maxItems: this.config.watch.maxItems
      });
      this.setupEventHandlers();
      this.watcher.start();
      this.startSessionCheck();
      if (!this.isCdpMode) {
        this.startKeepAlive();
      }
      this.isRunning = true;
      this.emit("started");
      console.log("\u2705 SEI Daemon iniciado com sucesso!");
      console.log("   Pressione Ctrl+C para parar");
    } catch (error) {
      console.error("\u274C Erro ao iniciar daemon:", error);
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  /** Para o daemon */
  async stop() {
    if (!this.isRunning) return;
    console.log("\u{1F6D1} Parando SEI Daemon...");
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    this.watcher?.stop();
    if (this.isCdpMode) {
      console.log("   \u{1F4A1} Chrome n\xE3o fechado (modo CDP)");
      this.client = null;
    } else {
      await this.client?.close();
    }
    this.isRunning = false;
    this.emit("stopped");
    console.log("\u2705 SEI Daemon parado");
  }
  /** Realiza login */
  async doLogin() {
    if (!this.client) throw new Error("Cliente n\xE3o inicializado");
    if (!this.config.credentials?.usuario || !this.config.credentials?.senha) {
      throw new Error("Credenciais n\xE3o configuradas");
    }
    console.log("\u{1F510} Fazendo login...");
    const success = await this.client.login(
      this.config.credentials.usuario,
      this.config.credentials.senha,
      this.config.credentials.orgao
    );
    if (!success) {
      this.loginAttempts++;
      if (this.loginAttempts >= this.maxLoginAttempts) {
        throw new Error(`Falha no login ap\xF3s ${this.maxLoginAttempts} tentativas`);
      }
      console.log(`   \u26A0\uFE0F Tentativa ${this.loginAttempts}/${this.maxLoginAttempts} falhou, tentando novamente em 10s...`);
      await this.sleep(1e4);
      return this.doLogin();
    }
    this.loginAttempts = 0;
    console.log("   \u2705 Login OK");
    this.emit("login");
  }
  /** Configura handlers de eventos do watcher */
  setupEventHandlers() {
    if (!this.watcher) return;
    const types = this.config.watch.types;
    for (const type of types) {
      this.watcher.on(type, async (event) => {
        console.log(`\u{1F4EC} Novo evento: ${type} (${event.items.length} itens)`);
        this.emit("event", event);
        await this.sendNotifications(event);
      });
    }
    this.watcher.on("error", (error) => {
      console.error("\u274C Erro no watcher:", error.message);
      this.emit("error", error);
    });
    this.watcher.on("check", (type, source) => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR");
      console.log(`   [${timestamp}] Verificando ${type} via ${source}...`);
    });
  }
  /** Envia notificações */
  async sendNotifications(event) {
    const recipients = this.config.notifications?.recipients ?? [];
    const webhook = this.config.notifications?.webhook;
    const enrichedItems = event.items.map((item) => ({
      ...item,
      linkProcesso: `${this.config.baseUrl}/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=${item.id}`
    }));
    for (const recipient of recipients) {
      const payload = {
        type: event.type,
        userId: recipient.userId,
        email: recipient.email,
        nome: recipient.nome,
        items: enrichedItems,
        timestamp: event.timestamp,
        seiUrl: this.config.baseUrl
      };
      if (this.notifier) {
        const sent = await this.notifier.sendEmail(payload);
        if (sent) {
          console.log(`   \u{1F4E7} Email enviado para ${recipient.email}`);
        }
      }
      this.emit("notification", payload);
    }
    if (webhook && this.notifier) {
      const payload = {
        type: event.type,
        userId: "system",
        email: "",
        nome: "Sistema",
        items: enrichedItems,
        timestamp: event.timestamp,
        seiUrl: this.config.baseUrl
      };
      const sent = await this.notifier.sendWebhook(webhook, payload);
      if (sent) {
        console.log(`   \u{1F517} Webhook enviado para ${webhook}`);
      }
    }
  }
  /** Inicia verificação periódica de sessão */
  startSessionCheck() {
    this.sessionCheckTimer = setInterval(async () => {
      try {
        const loggedIn = await this.client?.isLoggedIn();
        if (!loggedIn) {
          console.log("\u26A0\uFE0F Sess\xE3o expirada, fazendo relogin...");
          this.emit("sessionExpired");
          await this.doLogin();
          this.emit("relogin");
        }
      } catch (error) {
        console.error("\u274C Erro ao verificar sess\xE3o:", error);
      }
    }, this.config.sessionCheckInterval);
  }
  /** Inicia keep-alive (mantém sessão ativa) */
  startKeepAlive() {
    this.keepAliveTimer = setInterval(async () => {
      try {
        const browserClient = this.client?.getBrowserClient();
        if (browserClient) {
          const page = browserClient.getPage();
          await page.reload({ waitUntil: "domcontentloaded" });
        }
      } catch (error) {
      }
    }, this.config.keepAliveInterval);
  }
  /** Verifica se está rodando */
  get running() {
    return this.isRunning;
  }
  /** Acesso ao cliente */
  getClient() {
    return this.client;
  }
  /** Acesso ao watcher */
  getWatcher() {
    return this.watcher;
  }
  /** Sleep helper */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // Typed event emitter
  on(event, listener) {
    return super.on(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }
};

// src/api.ts
var SEIServiceAPI = class {
  config;
  service;
  server = null;
  sessions = /* @__PURE__ */ new Map();
  sessionTimeout = 30 * 60 * 1e3;
  // 30 minutos
  daemon = null;
  daemonConfig = null;
  constructor(config) {
    this.config = {
      port: 3001,
      host: "localhost",
      ...config
    };
    this.service = new SEIService(config);
  }
  /** Inicia a API */
  async start() {
    await this.service.init();
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1e3);
    this.server = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-Session-Id");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (this.config.apiKey) {
        const apiKey = req.headers["x-api-key"];
        if (apiKey !== this.config.apiKey) {
          this.sendResponse(res, { status: 401, error: "Unauthorized" });
          return;
        }
      }
      try {
        const request = await this.parseRequest(req);
        const sessionId = req.headers["x-session-id"];
        const response = await this.handleRequest(request, sessionId);
        this.sendResponse(res, response);
      } catch (error) {
        console.error("API Error:", error);
        this.sendResponse(res, {
          status: 500,
          error: error instanceof Error ? error.message : "Internal Server Error"
        });
      }
    });
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`SEI API rodando em http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }
  /** Para a API */
  async stop() {
    for (const [, session] of this.sessions) {
      await session.client.close();
    }
    this.sessions.clear();
    await this.service.stopAll();
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }
  /** Acesso ao serviço interno */
  getService() {
    return this.service;
  }
  /** Limpa sessões expiradas */
  cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastUsed.getTime() > this.sessionTimeout) {
        session.client.close();
        this.sessions.delete(id);
      }
    }
  }
  /** Obtém ou cria sessão para usuário */
  async getSession(sessionId) {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastUsed = /* @__PURE__ */ new Date();
      return session;
    }
    return null;
  }
  /** Parse da requisição */
  async parseRequest(req) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const query = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const params = {};
    let body = {};
    if (req.method === "POST" || req.method === "PUT") {
      body = await this.parseBody(req);
    }
    return {
      method: req.method ?? "GET",
      path: url.pathname,
      pathParts,
      params,
      query,
      body
    };
  }
  /** Parse do body JSON */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => data += chunk);
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
      req.on("error", reject);
    });
  }
  /** Envia resposta */
  sendResponse(res, response) {
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response.error ? { error: response.error } : response.data));
  }
  /** Roteamento de requisições */
  async handleRequest(req, sessionId) {
    const { method, path: path3, pathParts, body } = req;
    if (path3 === "/status" && method === "GET") {
      return this.handleGetStatus();
    }
    if (path3 === "/start" && method === "POST") {
      return this.handleStartAll();
    }
    if (path3 === "/stop" && method === "POST") {
      return this.handleStopAll();
    }
    if (path3 === "/daemon/status" && method === "GET") {
      return this.handleDaemonStatus();
    }
    if (path3 === "/daemon/start" && method === "POST") {
      return this.handleDaemonStart(body);
    }
    if (path3 === "/daemon/stop" && method === "POST") {
      return this.handleDaemonStop();
    }
    if (path3 === "/daemon/config" && method === "GET") {
      return this.handleDaemonGetConfig();
    }
    if (path3 === "/daemon/config" && method === "PUT") {
      return this.handleDaemonUpdateConfig(body);
    }
    if (path3 === "/sessions" && method === "POST") {
      return this.handleCreateSession(body);
    }
    if (pathParts[0] === "sessions" && pathParts[1] && method === "DELETE") {
      return this.handleDeleteSession(pathParts[1]);
    }
    if (path3 === "/users" && method === "GET") {
      return this.handleListUsers();
    }
    if (path3 === "/users" && method === "POST") {
      return this.handleAddUser(body);
    }
    if (pathParts[0] === "users" && pathParts[1]) {
      const userId = pathParts[1];
      if (!pathParts[2]) {
        if (method === "GET") return this.handleGetUser(userId);
        if (method === "PUT") return this.handleUpdateUser(userId, body);
        if (method === "DELETE") return this.handleDeleteUser(userId);
      }
      if (pathParts[2] === "credentials" && method === "PUT") {
        return this.handleUpdateCredentials(userId, body);
      }
      if (pathParts[2] === "start" && method === "POST") {
        return this.handleStartUser(userId);
      }
      if (pathParts[2] === "stop" && method === "POST") {
        return this.handleStopUser(userId);
      }
    }
    if (path3 === "/tipos-processo" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListProcessTypes(client));
    }
    if (path3 === "/tipos-documento" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListDocumentTypes(client));
    }
    if (path3 === "/unidades" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListUnits(client, req.query));
    }
    if (path3 === "/usuarios" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListUsuarios(client, req.query));
    }
    if (path3 === "/hipoteses-legais" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListHipotesesLegais(client));
    }
    if (path3 === "/marcadores" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListMarcadores(client));
    }
    if (path3 === "/meus-processos" && method === "GET") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleListMeusProcessos(client, req.query)
      );
    }
    if (path3 === "/screenshot" && method === "GET") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleScreenshot(client, req.query)
      );
    }
    if (path3 === "/snapshot" && method === "GET") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleSnapshot(client, req.query)
      );
    }
    if (path3 === "/current-page" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleGetCurrentPage(client));
    }
    if (path3 === "/navigate" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleNavigate(client, body)
      );
    }
    if (path3 === "/click" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleClick(client, body)
      );
    }
    if (path3 === "/type" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleType(client, body)
      );
    }
    if (path3 === "/select" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleSelect(client, body)
      );
    }
    if (path3 === "/wait" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleWait(client, body)
      );
    }
    if (path3 === "/documents/sign-multiple" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleSignMultiple(client, body)
      );
    }
    if (path3 === "/process/search" && method === "GET") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleSearchProcess(client, req.query)
      );
    }
    if (path3 === "/process" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleCreateProcess(client, body)
      );
    }
    if (pathParts[0] === "process" && pathParts[1]) {
      const processNumber = decodeURIComponent(pathParts[1]);
      if (!pathParts[2]) {
        if (method === "GET") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleGetProcess(client, processNumber)
          );
        }
      }
      if (pathParts[2] === "open" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleOpenProcess(client, processNumber)
        );
      }
      if (pathParts[2] === "status" && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleGetProcessStatus(client, processNumber, req.query)
        );
      }
      if (pathParts[2] === "download" && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleDownloadProcess(client, processNumber, req.query)
        );
      }
      if (pathParts[2] === "annotations") {
        if (method === "GET") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleListAnnotations(client, processNumber)
          );
        }
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleAddAnnotation(client, processNumber, body)
          );
        }
      }
      if (pathParts[2] === "markers") {
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleAddMarker(client, processNumber, body)
          );
        }
        if (method === "DELETE" && pathParts[3]) {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleRemoveMarker(client, processNumber, decodeURIComponent(pathParts[3]))
          );
        }
      }
      if (pathParts[2] === "deadline" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleSetDeadline(client, processNumber, body)
        );
      }
      if (pathParts[2] === "access") {
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleGrantAccess(client, processNumber, body)
          );
        }
        if (method === "DELETE" && pathParts[3]) {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleRevokeAccess(client, processNumber, decodeURIComponent(pathParts[3]))
          );
        }
      }
      if (pathParts[2] === "forward" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleForwardProcess(client, processNumber, body)
        );
      }
      if (pathParts[2] === "conclude" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleConcludeProcess(client, processNumber)
        );
      }
      if (pathParts[2] === "reopen" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleReopenProcess(client, processNumber)
        );
      }
      if (pathParts[2] === "anexar" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleAnexarProcess(client, processNumber, body)
        );
      }
      if (pathParts[2] === "relacionar" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleRelacionarProcess(client, processNumber, body)
        );
      }
      if (pathParts[2] === "atribuir" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleAtribuirProcess(client, processNumber, body)
        );
      }
      if (pathParts[2] === "andamentos" && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleListAndamentos(client, processNumber)
        );
      }
      if (pathParts[2] === "documents") {
        if (method === "GET") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleListDocuments(client, processNumber)
          );
        }
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleCreateDocument(client, processNumber, body)
          );
        }
      }
      if (pathParts[2] === "upload" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleUploadDocument(client, processNumber, body)
        );
      }
      if (pathParts[2] === "upload-base64" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleUploadDocumentBase64(client, processNumber, body)
        );
      }
      if (pathParts[2] === "relate" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleRelateProcess(client, processNumber, body)
        );
      }
    }
    if (pathParts[0] === "document" && pathParts[1]) {
      const documentId = pathParts[1];
      if (!pathParts[2] && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleGetDocument(client, documentId, req.query)
        );
      }
      if (pathParts[2] === "sign" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleSignDocument(client, documentId, body)
        );
      }
      if (pathParts[2] === "cancel" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleCancelDocument(client, documentId, body)
        );
      }
      if (pathParts[2] === "download" && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleDownloadDocument(client, documentId, req.query)
        );
      }
      if (pathParts[2] === "knowledge" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleRegisterKnowledge(client, documentId)
        );
      }
      if (pathParts[2] === "publish" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleSchedulePublication(client, documentId, body)
        );
      }
    }
    if (path3 === "/blocos" && method === "GET") {
      return this.handleWithSession(sessionId, (client) => this.handleListBlocos(client));
    }
    if (path3 === "/blocos" && method === "POST") {
      return this.handleWithSession(
        sessionId,
        (client) => this.handleCreateBloco(client, body)
      );
    }
    if (pathParts[0] === "bloco" && pathParts[1]) {
      const blocoId = pathParts[1];
      if (!pathParts[2] && method === "GET") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleGetBloco(client, blocoId)
        );
      }
      if (pathParts[2] === "documentos") {
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleAddDocumentoToBloco(client, blocoId, body)
          );
        }
        if (method === "DELETE" && pathParts[3]) {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleRemoveDocumentoFromBloco(client, blocoId, pathParts[3])
          );
        }
      }
      if (pathParts[2] === "disponibilizar" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleDisponibilizarBloco(client, blocoId, body)
        );
      }
      if (pathParts[2] === "release" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleReleaseBloco(client, blocoId)
        );
      }
      if (pathParts[2] === "sign" && method === "POST") {
        return this.handleWithSession(
          sessionId,
          (client) => this.handleSignBloco(client, blocoId, body)
        );
      }
      if (pathParts[2] === "documents") {
        if (method === "POST") {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleAddDocumentoToBloco(client, blocoId, body)
          );
        }
        if (method === "DELETE" && pathParts[3]) {
          return this.handleWithSession(
            sessionId,
            (client) => this.handleRemoveDocumentoFromBloco(client, blocoId, pathParts[3])
          );
        }
      }
    }
    return { status: 404, error: "Not Found" };
  }
  /** Executa handler com sessão */
  async handleWithSession(sessionId, handler) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { status: 401, error: "Session required. Create session with POST /sessions" };
    }
    return handler(session.client);
  }
  // ============================================
  // Handlers - Status e Controle
  // ============================================
  async handleGetStatus() {
    return {
      status: 200,
      data: {
        running: this.service.running,
        activeSessions: this.service.getActiveSessions(),
        totalUsers: this.service.getAllUsers().length,
        apiSessions: this.sessions.size
      }
    };
  }
  async handleStartAll() {
    await this.service.startAll();
    return { status: 200, data: { message: "Started" } };
  }
  async handleStopAll() {
    await this.service.stopAll();
    return { status: 200, data: { message: "Stopped" } };
  }
  // ============================================
  // Handlers - Sessões
  // ============================================
  async handleCreateSession(body) {
    if (!body.seiUrl || !body.usuario || !body.senha) {
      return { status: 400, error: "Missing required fields: seiUrl, usuario, senha" };
    }
    try {
      const client = new SEIClient({
        baseUrl: body.seiUrl,
        browser: {
          usuario: body.usuario,
          senha: body.senha,
          orgao: body.orgao
        },
        soap: body.soap,
        playwright: { headless: true }
      });
      await client.init();
      const loggedIn = await client.login();
      if (!loggedIn) {
        await client.close();
        return { status: 401, error: "Login failed" };
      }
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessions.set(sessionId, {
        client,
        userId: body.usuario,
        createdAt: /* @__PURE__ */ new Date(),
        lastUsed: /* @__PURE__ */ new Date()
      });
      return {
        status: 201,
        data: {
          sessionId,
          message: "Session created",
          expiresIn: this.sessionTimeout / 1e3
        }
      };
    } catch (error) {
      return { status: 500, error: error instanceof Error ? error.message : "Session creation failed" };
    }
  }
  async handleDeleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { status: 404, error: "Session not found" };
    }
    await session.client.close();
    this.sessions.delete(sessionId);
    return { status: 200, data: { message: "Session closed" } };
  }
  // ============================================
  // Handlers - Usuários
  // ============================================
  async handleListUsers() {
    const users = this.service.getAllUsers();
    return { status: 200, data: { users } };
  }
  async handleGetUser(id) {
    const user = this.service.getUser(id);
    if (!user) {
      return { status: 404, error: "User not found" };
    }
    return { status: 200, data: user };
  }
  async handleAddUser(body) {
    if (!body.id || !body.nome || !body.email || !body.seiUrl || !body.credentials) {
      return { status: 400, error: "Missing required fields" };
    }
    try {
      const user = await this.service.addUser(body);
      return { status: 201, data: user };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  async handleUpdateUser(id, body) {
    try {
      const user = await this.service.updateUser(id, body);
      return { status: 200, data: user };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  async handleDeleteUser(id) {
    try {
      await this.service.removeUser(id);
      return { status: 200, data: { message: "Deleted" } };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  async handleUpdateCredentials(id, body) {
    if (!body.usuario || !body.senha) {
      return { status: 400, error: "Missing credentials" };
    }
    try {
      await this.service.updateCredentials(id, body);
      return { status: 200, data: { message: "Credentials updated" } };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  async handleStartUser(id) {
    try {
      const started = await this.service.startUser(id);
      return { status: 200, data: { started } };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  async handleStopUser(id) {
    try {
      await this.service.stopUser(id);
      return { status: 200, data: { message: "Stopped" } };
    } catch (error) {
      return { status: 400, error: error instanceof Error ? error.message : "Error" };
    }
  }
  // ============================================
  // Handlers - Listagens
  // ============================================
  async handleListProcessTypes(client) {
    const tipos = await client.listProcessTypes();
    return { status: 200, data: { tipos } };
  }
  async handleListDocumentTypes(client) {
    const tipos = await client.listDocumentTypes();
    return { status: 200, data: { tipos } };
  }
  // ============================================
  // Handlers - Processos
  // ============================================
  async handleCreateProcess(client, body) {
    if (!body.tipoProcedimento || !body.especificacao || !body.assuntos?.length) {
      return { status: 400, error: "Missing required fields: tipoProcedimento, especificacao, assuntos" };
    }
    const result = await client.createProcess(body);
    return { status: 201, data: result };
  }
  async handleGetProcess(client, processNumber) {
    const process2 = await client.getProcess(processNumber);
    return { status: 200, data: process2 };
  }
  async handleForwardProcess(client, processNumber, body) {
    if (!body.unidadesDestino?.length) {
      return { status: 400, error: "Missing unidadesDestino" };
    }
    const success = await client.forwardProcess(processNumber, body);
    return { status: 200, data: { success } };
  }
  async handleConcludeProcess(client, processNumber) {
    const success = await client.concludeProcess(processNumber);
    return { status: 200, data: { success } };
  }
  async handleReopenProcess(client, processNumber) {
    const success = await client.reopenProcess(processNumber);
    return { status: 200, data: { success } };
  }
  async handleAnexarProcess(client, processNumber, body) {
    if (!body.processoAnexado) {
      return { status: 400, error: "Missing processoAnexado" };
    }
    const success = await client.anexarProcesso(processNumber, body.processoAnexado);
    return { status: 200, data: { success } };
  }
  async handleRelacionarProcess(client, processNumber, body) {
    if (!body.processoRelacionado) {
      return { status: 400, error: "Missing processoRelacionado" };
    }
    const success = await client.relacionarProcesso(processNumber, body.processoRelacionado);
    return { status: 200, data: { success } };
  }
  async handleAtribuirProcess(client, processNumber, body) {
    if (!body.usuario) {
      return { status: 400, error: "Missing usuario" };
    }
    const success = await client.atribuirProcesso(processNumber, body.usuario, body.reabrir);
    return { status: 200, data: { success } };
  }
  async handleListAndamentos(client, processNumber) {
    const andamentos = await client.listAndamentos(processNumber);
    return { status: 200, data: { andamentos } };
  }
  // ============================================
  // Handlers - Documentos
  // ============================================
  async handleListDocuments(client, processNumber) {
    await client.openProcess(processNumber);
    const documents = await client.listDocuments();
    return { status: 200, data: { documents } };
  }
  async handleCreateDocument(client, processNumber, body) {
    if (!body.idSerie) {
      return { status: 400, error: "Missing idSerie" };
    }
    const documentId = await client.createDocument(processNumber, body);
    return { status: 201, data: { documentId } };
  }
  async handleUploadDocument(client, processNumber, body) {
    if (!body.nomeArquivo || !body.conteudoBase64) {
      return { status: 400, error: "Missing nomeArquivo or conteudoBase64" };
    }
    const documentId = await client.uploadDocument(
      processNumber,
      body.nomeArquivo,
      body.conteudoBase64,
      body
    );
    return { status: 201, data: { documentId } };
  }
  async handleSignDocument(client, documentId, body) {
    if (!body.senha) {
      return { status: 400, error: "Missing senha" };
    }
    const browserClient = client.getBrowserClient();
    if (browserClient) {
      await browserClient.openDocument(documentId);
    }
    const success = await client.signDocument(body.senha, body.cargo);
    return { status: 200, data: { success } };
  }
  async handleCancelDocument(client, documentId, body) {
    if (!body.motivo) {
      return { status: 400, error: "Missing motivo" };
    }
    const success = await client.cancelDocument(documentId, body.motivo);
    return { status: 200, data: { success } };
  }
  // ============================================
  // Handlers - Blocos
  // ============================================
  async handleListBlocos(client) {
    const blocos = await client.listBlocos();
    return { status: 200, data: { blocos } };
  }
  async handleCreateBloco(client, body) {
    if (!body.descricao) {
      return { status: 400, error: "Missing descricao" };
    }
    const blocoId = await client.createBloco(
      body.descricao,
      body.tipo ?? "assinatura",
      body.unidades,
      body.documentos
    );
    return { status: 201, data: { blocoId } };
  }
  async handleGetBloco(client, blocoId) {
    const bloco = await client.getBloco(blocoId);
    if (!bloco) {
      return { status: 404, error: "Bloco not found" };
    }
    return { status: 200, data: bloco };
  }
  async handleAddDocumentoToBloco(client, blocoId, body) {
    if (!body.documentoId) {
      return { status: 400, error: "Missing documentoId" };
    }
    const success = await client.addDocumentoToBloco(blocoId, body.documentoId);
    return { status: 200, data: { success } };
  }
  async handleRemoveDocumentoFromBloco(client, blocoId, documentoId) {
    const success = await client.removeDocumentoFromBloco(blocoId, documentoId);
    return { status: 200, data: { success } };
  }
  async handleDisponibilizarBloco(client, blocoId, body) {
    const success = await client.disponibilizarBloco(blocoId, body.unidades);
    return { status: 200, data: { success } };
  }
  // ============================================
  // Handlers - Novos Endpoints (Paridade com MCP)
  // ============================================
  async handleListUnits(client, query) {
    const unidades = await client.listUnits();
    const filtered = query.filter ? unidades.filter((u) => {
      const filterLower = query.filter.toLowerCase();
      return u.Sigla.toLowerCase().includes(filterLower) || u.Descricao.toLowerCase().includes(filterLower);
    }) : unidades;
    return { status: 200, data: { unidades: filtered } };
  }
  async handleListUsuarios(client, query) {
    const browserClient = client.getBrowserClient();
    if (browserClient) {
      try {
        const usuarios = await browserClient.listUsuarios(query.filter);
        return { status: 200, data: { usuarios } };
      } catch {
        return { status: 200, data: { usuarios: [], message: "Funcionalidade n\xE3o dispon\xEDvel nesta vers\xE3o do SEI" } };
      }
    }
    return { status: 200, data: { usuarios: [] } };
  }
  async handleListHipotesesLegais(client) {
    const browserClient = client.getBrowserClient();
    if (browserClient) {
      try {
        const hipoteses = await browserClient.listHipotesesLegais();
        return { status: 200, data: { hipoteses } };
      } catch {
        return { status: 200, data: { hipoteses: [], message: "Funcionalidade n\xE3o dispon\xEDvel" } };
      }
    }
    return { status: 200, data: { hipoteses: [] } };
  }
  async handleListMarcadores(client) {
    const browserClient = client.getBrowserClient();
    if (browserClient) {
      try {
        const marcadores = await browserClient.listMarcadores();
        return { status: 200, data: { marcadores } };
      } catch {
        return { status: 200, data: { marcadores: [], message: "Funcionalidade n\xE3o dispon\xEDvel" } };
      }
    }
    return { status: 200, data: { marcadores: [] } };
  }
  async handleListMeusProcessos(client, query) {
    const browserClient = client.getBrowserClient();
    if (browserClient) {
      try {
        const processos = await browserClient.listMeusProcessos(
          query.status || "abertos",
          parseInt(query.limit) || 50
        );
        return { status: 200, data: { processos } };
      } catch {
        return { status: 200, data: { processos: [], message: "Funcionalidade n\xE3o dispon\xEDvel" } };
      }
    }
    return { status: 200, data: { processos: [] } };
  }
  async handleScreenshot(client, query) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const screenshot = await browserClient.screenshot(query.fullPage === "true");
    return { status: 200, data: { screenshot, format: "base64" } };
  }
  async handleSnapshot(client, query) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const snapshot = await browserClient.snapshot(query.includeHidden === "true");
    return { status: 200, data: { snapshot } };
  }
  async handleGetCurrentPage(client) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const page = browserClient.getPage();
    return { status: 200, data: { url: page?.url(), title: await page?.title() } };
  }
  async handleNavigate(client, body) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    await browserClient.navigate(body.target);
    return { status: 200, data: { success: true } };
  }
  async handleClick(client, body) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const page = browserClient.getPage();
    if (page) {
      await page.click(body.selector);
    }
    return { status: 200, data: { success: true } };
  }
  async handleType(client, body) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const page = browserClient.getPage();
    if (page) {
      if (body.clear) {
        await page.fill(body.selector, "");
      }
      await page.fill(body.selector, body.text);
    }
    return { status: 200, data: { success: true } };
  }
  async handleSelect(client, body) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const page = browserClient.getPage();
    if (page) {
      await page.selectOption(body.selector, body.value);
    }
    return { status: 200, data: { success: true } };
  }
  async handleWait(client, body) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    const page = browserClient.getPage();
    if (page) {
      await page.waitForSelector(body.selector, { timeout: body.timeout || 1e4 });
    }
    return { status: 200, data: { success: true } };
  }
  async handleSignMultiple(client, body) {
    if (!body.documentoIds?.length || !body.senha) {
      return { status: 400, error: "Missing documentoIds or senha" };
    }
    const results = [];
    const browserClient = client.getBrowserClient();
    for (const docId of body.documentoIds) {
      try {
        if (browserClient) {
          await browserClient.openDocument(docId);
        }
        const success = await client.signDocument(body.senha, body.cargo);
        results.push({ documentoId: docId, success });
      } catch (error) {
        results.push({ documentoId: docId, success: false, error: String(error) });
      }
    }
    return { status: 200, data: { results } };
  }
  async handleSearchProcess(client, query) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      const processos = await browserClient.searchProcessos(
        query.query,
        query.type || "numero",
        parseInt(query.limit) || 20
      );
      return { status: 200, data: { processos } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleOpenProcess(client, processNumber) {
    const success = await client.openProcess(processNumber);
    return { status: 200, data: { success } };
  }
  async handleGetProcessStatus(client, processNumber, query) {
    const process2 = await client.getProcess(processNumber);
    const includeHistory = query.includeHistory !== "false";
    const includeDocuments = query.includeDocuments !== "false";
    let andamentos = [];
    let documents = [];
    if (includeHistory) {
      andamentos = await client.listAndamentos(processNumber);
    }
    if (includeDocuments) {
      documents = await client.listDocuments();
    }
    return { status: 200, data: { ...process2, andamentos, documents } };
  }
  async handleDownloadProcess(client, processNumber, query) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      const result = await browserClient.downloadProcess(
        processNumber,
        query.includeAttachments !== "false",
        query.outputPath
      );
      return { status: 200, data: result };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleListAnnotations(client, processNumber) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 200, data: { annotations: [] } };
    }
    try {
      await client.openProcess(processNumber);
      const annotations = await browserClient.listAnnotations();
      return { status: 200, data: { annotations } };
    } catch {
      return { status: 200, data: { annotations: [] } };
    }
  }
  async handleAddAnnotation(client, processNumber, body) {
    if (!body.texto) {
      return { status: 400, error: "Missing texto" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.addAnnotation(body.texto, body.prioridade);
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleAddMarker(client, processNumber, body) {
    if (!body.marcador) {
      return { status: 400, error: "Missing marcador" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.addMarker(body.marcador, body.texto);
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleRemoveMarker(client, processNumber, marcador) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.removeMarker(marcador);
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleSetDeadline(client, processNumber, body) {
    if (!body.dias) {
      return { status: 400, error: "Missing dias" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.setDeadline(body.dias, body.tipo || "util");
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleGrantAccess(client, processNumber, body) {
    if (!body.usuario) {
      return { status: 400, error: "Missing usuario" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.grantAccess(body.usuario, body.tipo || "consulta");
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleRevokeAccess(client, processNumber, usuario) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await client.openProcess(processNumber);
      const success = await browserClient.revokeAccess(usuario);
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleGetDocument(client, documentId, query) {
    const document = await client.getDocumentDetails(documentId);
    if (query.includeContent === "true") {
      const browserClient = client.getBrowserClient();
      if (browserClient) {
        try {
          const content = await browserClient.getDocumentContent(documentId);
          return { status: 200, data: { ...document, content } };
        } catch {
        }
      }
    }
    return { status: 200, data: document };
  }
  async handleDownloadDocument(client, documentId, query) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      const result = await browserClient.downloadDocument(documentId, query.outputPath);
      return { status: 200, data: result };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleRegisterKnowledge(client, documentId) {
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await browserClient.openDocument(documentId);
      const success = await browserClient.registerKnowledge();
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleSchedulePublication(client, documentId, body) {
    if (!body.veiculo) {
      return { status: 400, error: "Missing veiculo" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      await browserClient.openDocument(documentId);
      const success = await browserClient.schedulePublication(
        body.veiculo,
        body.dataPublicacao,
        body.resumo
      );
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleUploadDocumentBase64(client, processNumber, body) {
    if (!body.conteudoBase64 || !body.nomeArquivo) {
      return { status: 400, error: "Missing conteudoBase64 or nomeArquivo" };
    }
    const documentId = await client.uploadDocument(
      processNumber,
      body.nomeArquivo,
      body.conteudoBase64,
      {
        idSerie: body.tipoDocumento,
        descricao: body.descricao,
        nivelAcesso: body.nivelAcesso === "publico" ? 0 : body.nivelAcesso === "restrito" ? 1 : 2
      }
    );
    return { status: 201, data: { documentId } };
  }
  async handleRelateProcess(client, processNumber, body) {
    if (!body.processoRelacionado) {
      return { status: 400, error: "Missing processoRelacionado" };
    }
    const success = await client.relacionarProcesso(processNumber, body.processoRelacionado);
    return { status: 200, data: { success } };
  }
  async handleReleaseBloco(client, blocoId) {
    const success = await client.disponibilizarBloco(blocoId);
    return { status: 200, data: { success } };
  }
  async handleSignBloco(client, blocoId, body) {
    if (!body.senha) {
      return { status: 400, error: "Missing senha" };
    }
    const browserClient = client.getBrowserClient();
    if (!browserClient) {
      return { status: 400, error: "Browser client n\xE3o dispon\xEDvel" };
    }
    try {
      const success = await browserClient.signBloco(blocoId, body.senha);
      return { status: 200, data: { success } };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  // ============================================
  // Daemon Handlers
  // ============================================
  handleDaemonStatus() {
    if (!this.daemon) {
      return {
        status: 200,
        data: {
          running: false,
          config: this.daemonConfig
        }
      };
    }
    return {
      status: 200,
      data: {
        running: this.daemon.running,
        config: this.daemonConfig
      }
    };
  }
  async handleDaemonStart(body) {
    if (this.daemon?.running) {
      return { status: 400, error: "Daemon j\xE1 est\xE1 rodando. Use /daemon/stop primeiro." };
    }
    if (!body.browser?.cdpEndpoint && !body.credentials?.usuario) {
      return {
        status: 400,
        error: "Forne\xE7a credentials (usuario/senha) ou browser.cdpEndpoint para modo CDP"
      };
    }
    try {
      const daemonConfig = {
        baseUrl: this.config.baseUrl,
        credentials: body.credentials,
        browser: {
          headless: body.browser?.headless ?? true,
          cdpEndpoint: body.browser?.cdpEndpoint,
          timeout: 6e4
        },
        watch: {
          types: body.watch?.types ?? ["processos_recebidos", "blocos_assinatura", "prazos"],
          interval: body.watch?.interval ?? 6e4
        },
        notifications: body.notifications ? {
          email: body.notifications.email,
          webhook: body.notifications.webhook,
          recipients: body.notifications.recipients
        } : void 0
      };
      this.daemonConfig = body;
      this.daemon = new SEIDaemon(daemonConfig);
      this.daemon.on("event", (event) => {
        console.log(`[Daemon] Evento: ${event.type} (${event.items.length} itens)`);
      });
      this.daemon.on("error", (error) => {
        console.error(`[Daemon] Erro: ${error.message}`);
      });
      await this.daemon.start();
      return {
        status: 200,
        data: {
          message: "Daemon iniciado",
          running: true,
          config: {
            mode: body.browser?.cdpEndpoint ? "CDP" : "headless",
            watchTypes: daemonConfig.watch?.types,
            interval: daemonConfig.watch?.interval
          }
        }
      };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  async handleDaemonStop() {
    if (!this.daemon) {
      return { status: 400, error: "Daemon n\xE3o est\xE1 rodando" };
    }
    try {
      await this.daemon.stop();
      this.daemon = null;
      return {
        status: 200,
        data: { message: "Daemon parado", running: false }
      };
    } catch (error) {
      return { status: 500, error: String(error) };
    }
  }
  handleDaemonGetConfig() {
    return {
      status: 200,
      data: {
        config: this.daemonConfig,
        defaults: {
          watchTypes: ["processos_recebidos", "blocos_assinatura", "prazos"],
          interval: 6e4,
          headless: true
        }
      }
    };
  }
  handleDaemonUpdateConfig(body) {
    if (this.daemon?.running) {
      return {
        status: 400,
        error: "Pare o daemon primeiro com /daemon/stop antes de atualizar a configura\xE7\xE3o"
      };
    }
    this.daemonConfig = { ...this.daemonConfig, ...body };
    return {
      status: 200,
      data: {
        message: "Configura\xE7\xE3o atualizada",
        config: this.daemonConfig
      }
    };
  }
};
export {
  SEIBrowserClient,
  SEIClient,
  SEIDaemon,
  SEINotificationService,
  SEIService,
  SEIServiceAPI,
  SEISoapClient,
  SEIUserManager,
  SEIWatcher,
  SEI_SELECTORS,
  SelectorStore,
  classifyError,
  createAgentFallback,
  decrypt,
  decryptJson,
  client_default as default,
  encrypt,
  failFast,
  generateSecurePassword,
  resolveResilienceConfig,
  withRetry
};
