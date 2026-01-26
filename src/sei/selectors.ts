/**
 * Seletores Semânticos ARIA do sistema SEI
 *
 * REFATORADO: Usa locators semânticos baseados em ARIA roles e labels
 * em vez de seletores CSS frágeis. Isso torna a automação mais resiliente
 * a mudanças de layout e classes CSS.
 *
 * Padrão de nomenclatura:
 * - role: ARIA role do elemento (button, textbox, link, etc.)
 * - name: Nome acessível (aria-label, title, texto visível)
 * - patterns: Padrões regex para match flexível
 */

// Tipos para seletores semânticos
export interface SemanticSelector {
  role: string;
  name?: string | RegExp;
  description?: string;
  // Fallback CSS para casos onde ARIA não está disponível
  fallbackCss?: string;
}

// Helpers para criar seletores
export const role = (r: string, name?: string | RegExp, fallback?: string): SemanticSelector => ({
  role: r,
  name,
  fallbackCss: fallback,
});

export const SEI_SELECTORS = {
  // ===== LOGIN =====
  login: {
    form: role('form', /login/i, '#frmLogin'),
    username: role('textbox', /usuário|usuario|login/i, '#txtUsuario'),
    password: role('textbox', /senha|password/i, '#pwdSenha'),
    orgao: role('combobox', /órgão|orgao|unidade/i, '#selOrgao'),
    submitButton: role('button', /acessar|entrar|login/i, '#sbmLogin'),
    errorMessage: role('alert', undefined, '.erro, .infraExcecao'),
  },

  // ===== MENU PRINCIPAL =====
  menu: {
    controleProcessos: role('link', /controle.*processos|página.*inicial/i),
    pesquisa: role('link', /pesquisa/i),
    iniciarProcesso: role('link', /iniciar.*processo|novo.*processo/i),
    blocoAssinatura: role('link', /bloco.*assinatura/i),
    incluirDocumento: role('link', /incluir.*documento/i),
  },

  // ===== ÁRVORE DE PROCESSOS =====
  processTree: {
    container: role('tree', undefined, '#divArvore'),
    processItem: role('treeitem', undefined, '.arvoreNo'),
    documentItem: role('link', undefined, '.arvoreNo a'),
    selectedProcess: role('treeitem', undefined, '.arvoreNoSelecionado'),
  },

  // ===== DETALHES DO PROCESSO =====
  processDetail: {
    number: role('heading', /processo|número/i, '#txtProcedimentoFormatado'),
    type: role('text', /tipo/i, '.infraTipoProcesso'),
    description: role('text', /descrição|especificação/i, '.infraDescricao'),
    status: role('status', undefined, '.infraSituacao'),
    unit: role('text', /unidade/i, '.infraUnidade'),
    interessados: role('text', /interessado/i, '.infraInteressados'),
  },

  // ===== LISTA DE DOCUMENTOS =====
  documentList: {
    container: role('table', /documentos/i, '#tblDocumentos'),
    rows: role('row', undefined, '#tblDocumentos tbody tr'),
  },

  // ===== FORMULÁRIO DE NOVO DOCUMENTO =====
  newDocument: {
    form: role('form', /gerar.*documento|novo.*documento/i),
    typeSelect: role('combobox', /tipo.*documento/i, '#selTipoDocumento'),
    description: role('textbox', /descrição/i, '#txtDescricao'),
    content: role('textbox', /conteúdo|editor/i, '#txaEditor'),
    ckeditor: role('application', /editor/i, '.cke_wysiwyg_frame'),
    nivelAcesso: {
      publico: role('radio', /público/i, '#optPublico'),
      restrito: role('radio', /restrito/i, '#optRestrito'),
      sigiloso: role('radio', /sigiloso/i, '#optSigiloso'),
    },
    hipoteseLegal: role('combobox', /hipótese.*legal/i, '#selHipoteseLegal'),
    submitButton: role('button', /salvar|confirmar|gerar/i, '#btnSalvar'),
    nomeArvore: role('textbox', /nome.*árvore/i, '#txtNomeArvore'),
    numeroDocumento: role('textbox', /número/i, '#txtNumero'),
    dataDocumento: role('textbox', /data/i, '#txtDataElaboracao'),

    // Texto inicial
    textoInicial: {
      modelo: role('radio', /documento.*modelo|texto.*modelo/i),
      padrao: role('radio', /texto.*padrão/i),
      nenhum: role('radio', /nenhum|sem.*texto|documento.*branco/i),
    },
    textoPadraoSelect: role('combobox', /texto.*padrão/i, '#selTextoPadrao'),
    documentoModeloInput: role('textbox', /protocolo|modelo/i, '#txtProtocolo'),

    // Interessados
    interessadosInput: role('combobox', /interessado/i, '#txtInteressado'),
    interessadosBtn: role('button', /adicionar.*interessado/i),

    // Destinatários
    destinatariosInput: role('combobox', /destinatário/i, '#txtDestinatario'),
    destinatariosBtn: role('button', /adicionar.*destinatário/i),

    // Assuntos
    assuntosBtn: role('button', /pesquisar.*assunto|selecionar.*assunto/i),
    assuntosInput: role('textbox', /assunto|palavras.*pesquisa/i),

    // Observações
    observacoes: role('textbox', /observaç/i, '#txaObservacoes'),
  },

  // ===== DOCUMENTO EXTERNO =====
  documentExterno: {
    form: role('form', /documento.*externo/i),
    tipoSelect: role('combobox', /tipo.*documento/i),
    formatoNato: role('radio', /nato.*digital|nascido.*digital/i),
    formatoDigitalizado: role('radio', /digitalizado/i),
    conferenciaCopiaAutenticada: role('radio', /cópia.*autenticada/i),
    conferenciaCopiaSimples: role('radio', /cópia.*simples/i),
    conferenciaOriginal: role('radio', /documento.*original/i),
    fileInput: role('textbox', /arquivo|selecione/i, 'input[type="file"]'),
    anexarBtn: role('button', /anexar/i),
    observacao: role('textbox', /observaç/i),
  },

  // ===== ASSINATURA =====
  signature: {
    modal: role('dialog', /assinatura/i, '.modal-assinatura'),
    password: role('textbox', /senha/i, '#txtSenha'),
    cargo: role('combobox', /cargo|função/i, '#selCargo'),
    submitButton: role('button', /assinar/i, '#btnAssinar'),
    cancelButton: role('button', /cancelar/i, '#btnCancelar'),
    bloco: role('link', /bloco.*assin/i),
  },

  // ===== TRAMITAÇÃO =====
  forward: {
    form: role('form', /enviar.*processo|tramitar/i),
    unitSearch: role('combobox', /unidade|destino/i, '#txtUnidade'),
    unitSelect: role('listbox', /unidade/i),
    unitSuggestions: role('listbox', undefined, '.ui-autocomplete'),
    keepOpen: role('checkbox', /manter.*aberto/i),
    deadline: role('textbox', /prazo/i),
    observation: role('textbox', /observação/i),
    sendEmail: role('checkbox', /email|notificação/i),
    submitButton: role('button', /enviar/i, '#btnEnviar'),
  },

  // ===== PESQUISA =====
  search: {
    input: role('searchbox', /pesquisa/i, '#txtPesquisaRapida'),
    submitButton: role('button', /pesquisar/i, '#btnPesquisar'),
    results: role('table', /resultado/i, '#tblResultados'),
    resultRows: role('row', undefined, '#tblResultados tbody tr'),
    advanced: role('link', /pesquisa.*avançada/i),
  },

  // ===== CRIAR PROCESSO =====
  createProcess: {
    form: role('form', /gerar.*processo|iniciar.*processo/i),
    tipoSelect: role('combobox', /tipo.*processo/i, '#selTipoProcedimento'),
    especificacao: role('textbox', /especificação/i, '#txtEspecificacao'),
    interessados: role('textbox', /interessado/i, '#txtInteressados'),
    observacao: role('textbox', /observaç/i),
    nivelAcesso: {
      publico: role('radio', /público/i),
      restrito: role('radio', /restrito/i),
      sigiloso: role('radio', /sigiloso/i),
    },
    hipoteseLegal: role('combobox', /hipótese/i),
    submitButton: role('button', /salvar|gerar/i),
  },

  // ===== CONCLUIR PROCESSO =====
  conclude: {
    form: role('form', /concluir/i),
    submitButton: role('button', /concluir/i),
  },

  // ===== ANEXAR PROCESSOS =====
  attach: {
    form: role('form', /anexar/i),
    processoAnexar: role('textbox', /protocolo|processo.*anexar/i),
    submitButton: role('button', /anexar/i),
  },

  // ===== ATRIBUIÇÃO =====
  assign: {
    form: role('form', /atribuir/i),
    userSelect: role('combobox', /usuário/i, '#selUsuario'),
    submitButton: role('button', /atribuir/i),
  },

  // ===== BLOCOS =====
  blocks: {
    list: role('table', /bloco/i),
    create: role('link', /novo.*bloco|criar.*bloco/i),
    assignBtn: role('button', /assinar.*bloco/i),
    releaseBtn: role('button', /disponibilizar/i),
    addDocBtn: role('button', /incluir.*documento|adicionar/i),
    removeDocBtn: role('button', /excluir|remover/i),
    form: {
      tipo: role('combobox', /tipo/i),
      descricao: role('textbox', /descrição/i),
      unidadeInput: role('combobox', /unidade/i),
      unidadeAdd: role('button', /adicionar.*unidade/i),
      documentoInput: role('textbox', /protocolo|documento/i),
      documentoAdd: role('button', /adicionar.*protocolo|adicionar.*documento/i),
      submitButton: role('button', /salvar/i),
    },
  },

  // ===== UPLOAD =====
  upload: {
    fileInput: role('textbox', /arquivo/i, 'input[type="file"]'),
    formatoSelect: role('combobox', /formato/i),
    submitButton: role('button', /adicionar/i),
  },

  // ===== ELEMENTOS COMUNS =====
  common: {
    loading: role('progressbar', undefined, '.infraLoading'),
    successMessage: role('alert', undefined, '.infraMensagem'),
    errorMessage: role('alert', undefined, '.infraExcecao, .erro'),
    confirmDialog: role('alertdialog', /confirm/i),
    confirmYes: role('button', /sim|confirmar|ok/i),
    confirmNo: role('button', /não|cancelar/i),
    iframe: role('document', undefined, 'iframe#ifrVisualizacao'),
    userInfo: role('status', undefined, '.infraAreaUsuario'),
  },

  // ===== ANOTAÇÕES =====
  annotations: {
    list: role('table', /anotaç/i),
    add: role('link', /nova.*anotação|adicionar.*anotação/i),
    text: role('textbox', /descrição|texto/i),
    priority: role('checkbox', /prioridade/i),
    submitButton: role('button', /salvar/i),
  },

  // ===== MARCADORES =====
  markers: {
    list: role('table', /marcador/i),
    add: role('link', /adicionar.*marcador/i),
    select: role('combobox', /marcador/i),
    submitButton: role('button', /salvar/i),
  },

  // ===== CIÊNCIA =====
  awareness: {
    btn: role('link', /registrar.*ciência|dar.*ciência/i),
    submitButton: role('button', /salvar|confirmar/i),
  },

  // ===== CANCELAMENTO =====
  cancel: {
    btn: role('link', /cancelar.*documento/i),
    motivo: role('textbox', /motivo/i),
    submitButton: role('button', /cancelar|confirmar/i),
  },

  // ===== RELACIONAMENTOS =====
  related: {
    list: role('table', /relacionad/i),
    add: role('link', /relacionar/i),
    processInput: role('textbox', /protocolo/i),
    submitButton: role('button', /relacionar/i),
  },

  // ===== PUBLICAÇÃO =====
  publish: {
    btn: role('link', /agendar.*publicação|publicar/i),
    veiculo: role('combobox', /veículo/i),
    data: role('textbox', /data/i),
    resumo: role('textbox', /resumo|ementa/i),
    submitButton: role('button', /salvar|publicar/i),
  },

  // ===== SOBRESTAMENTO =====
  suspend: {
    btn: role('link', /sobrestar/i),
    motivo: role('textbox', /motivo/i),
    processoVinculado: role('textbox', /processo.*vinculado/i),
    submitButton: role('button', /sobrestar/i),
  },

  // ===== PROCESSO - AÇÕES DO MENU =====
  processActions: {
    incluir: role('link', /incluir.*documento/i),
    tramitar: role('link', /enviar.*processo|tramitar/i),
    andamento: role('link', /consultar.*andamento|andamento/i),
    pdf: role('link', /gerar.*pdf|imprimir/i),
    anexar: role('link', /anexar.*processo/i),
    concluir: role('link', /concluir.*processo/i),
    reabrir: role('link', /reabrir.*processo/i),
    atribuir: role('link', /atribuir/i),
  },
};

// URLs padrão do SEI
export const SEI_URLS = {
  login: '/sei/controlador.php?acao=login',
  logout: '/sei/controlador.php?acao=usuario_logout',
  home: '/sei/controlador.php?acao=procedimento_controlar',
  search: '/sei/controlador.php?acao=protocolo_pesquisar',
  newProcess: '/sei/controlador.php?acao=procedimento_gerar',
};

// Detectar página atual do SEI
export function detectSeiPage(url: string): string {
  if (url.includes('acao=login')) return 'login';
  if (url.includes('acao=procedimento_controlar')) return 'home';
  if (url.includes('acao=protocolo_pesquisar')) return 'search';
  if (url.includes('acao=procedimento_gerar')) return 'newProcess';
  if (url.includes('acao=documento_gerar')) return 'newDocument';
  if (url.includes('acao=procedimento_enviar')) return 'forward';
  if (url.includes('acao=documento_assinar')) return 'signature';
  if (url.includes('acao=procedimento_visualizar')) return 'viewProcess';
  return 'unknown';
}

/**
 * Cache para seletores Playwright com TTL de 5 minutos
 * Evita recompilação de seletores frequentes
 */
const SELECTOR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const selectorCache = new Map<string, { value: string; expires: number }>();

/**
 * Gera chave única para cache do seletor
 */
function getSelectorCacheKey(selector: SemanticSelector): string {
  const nameStr = selector.name instanceof RegExp
    ? selector.name.toString()
    : (selector.name || '');
  return `${selector.role}:${nameStr}:${selector.fallbackCss || ''}`;
}

/**
 * Limpa entradas expiradas do cache (chamado periodicamente)
 */
function cleanupSelectorCache(): void {
  const now = Date.now();
  for (const [key, entry] of selectorCache) {
    if (entry.expires < now) {
      selectorCache.delete(key);
    }
  }
}

// Limpar cache a cada 5 minutos
setInterval(cleanupSelectorCache, SELECTOR_CACHE_TTL);

/**
 * Converte SemanticSelector para código Playwright
 * Usado para gerar instruções para a extensão/content script
 *
 * OTIMIZADO: Usa cache memoizado para evitar recompilação
 */
export function toPlaywrightLocator(selector: SemanticSelector): string {
  const cacheKey = getSelectorCacheKey(selector);
  const now = Date.now();

  // Check cache
  const cached = selectorCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.value;
  }

  // Generate locator
  const { role, name } = selector;
  let result: string;

  if (name instanceof RegExp) {
    result = `getByRole('${role}', { name: ${name} })`;
  } else if (name) {
    result = `getByRole('${role}', { name: '${name}' })`;
  } else {
    result = `getByRole('${role}')`;
  }

  // Store in cache
  selectorCache.set(cacheKey, {
    value: result,
    expires: now + SELECTOR_CACHE_TTL,
  });

  return result;
}

/**
 * Get cache stats for debugging
 */
export function getSelectorCacheStats(): { size: number; ttlMs: number } {
  return {
    size: selectorCache.size,
    ttlMs: SELECTOR_CACHE_TTL,
  };
}

/**
 * Clear selector cache (for testing or forced refresh)
 */
export function clearSelectorCache(): void {
  selectorCache.clear();
}
