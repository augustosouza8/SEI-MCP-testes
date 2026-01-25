// SEI-MCP Bridge - Content Script
// Executa ações no DOM do SEI usando seletores ARIA semânticos
//
// REFATORADO: Usa locators baseados em roles ARIA e labels acessíveis
// em vez de seletores CSS frágeis. Isso torna a automação mais resiliente.

(function() {
  'use strict';

  console.log('[SEI-MCP] Content script loaded on:', window.location.href);

  // ============================================================
  // LOCATORS SEMÂNTICOS (ARIA)
  // ============================================================
  //
  // Em vez de seletores CSS como '#txtUsuario', usamos locators semânticos
  // baseados em roles ARIA e nomes acessíveis (aria-label, title, texto visível).
  //
  // Formato: { role: 'button', name: /padrão/i, fallback: 'seletor CSS' }
  //
  // A função getByRole() tenta primeiro o locator semântico,
  // e usa o fallback CSS apenas se necessário.

  const LOCATORS = {
    // ===== LOGIN =====
    login: {
      form: { role: 'form', name: /login/i, fallback: '#frmLogin, form[name="frmLogin"]' },
      username: { role: 'textbox', name: /usuário|usuario|login/i, fallback: '#txtUsuario, input[name="txtUsuario"]' },
      password: { role: 'textbox', name: /senha|password/i, fallback: '#pwdSenha, input[name="pwdSenha"]' },
      orgao: { role: 'combobox', name: /órgão|orgao|unidade/i, fallback: '#selOrgao, select[name="selOrgao"]' },
      submit: { role: 'button', name: /acessar|entrar|login/i, fallback: '#sbmLogin, input[type="submit"]' },
      error: { role: 'alert', fallback: '.erro, .infraExcecao' },
    },

    // ===== PROCESSO =====
    process: {
      number: { role: 'heading', name: /processo|número/i, fallback: '#txtProcedimentoFormatado, .infraNumeroProcesso' },
      tree: { role: 'tree', fallback: '#divArvore, .arvore' },
      documents: { role: 'row', fallback: '#tblDocumentos tbody tr, .documento-item' },
      menuIncluir: { role: 'link', name: /incluir.*documento/i, fallback: 'a[href*="documento_escolher_tipo"]' },
      menuTramitar: { role: 'link', name: /enviar.*processo|tramitar/i, fallback: 'a[href*="procedimento_enviar"]' },
      menuAndamento: { role: 'link', name: /consultar.*andamento|andamento/i, fallback: 'a[href*="procedimento_andamento"]' },
      menuPDF: { role: 'link', name: /gerar.*pdf|imprimir/i, fallback: 'a[href*="gerar_pdf"], a[href*="imprimir"]' },
      menuAnexar: { role: 'link', name: /anexar.*processo/i, fallback: 'a[href*="procedimento_anexar"]' },
      menuConcluir: { role: 'link', name: /concluir.*processo/i, fallback: 'a[href*="procedimento_concluir"]' },
      menuReabrir: { role: 'link', name: /reabrir.*processo/i, fallback: 'a[href*="procedimento_reabrir"]' },
      menuAtribuir: { role: 'link', name: /atribuir/i, fallback: 'a[href*="procedimento_atribuir"]' },
    },

    // ===== DOCUMENTO =====
    document: {
      typeSelect: { role: 'combobox', name: /tipo.*documento/i, fallback: '#selTipoDocumento' },
      description: { role: 'textbox', name: /descrição/i, fallback: '#txtDescricao' },
      nomeArvore: { role: 'textbox', name: /nome.*árvore/i, fallback: '#txtNomeArvore' },
      editor: { role: 'textbox', name: /editor|conteúdo/i, fallback: '#txaEditor, textarea[name="txaEditor"]' },
      ckeditor: { role: 'application', name: /editor/i, fallback: '.cke_wysiwyg_frame' },
      nivelAcesso: {
        publico: { role: 'radio', name: /público/i, fallback: '#optPublico, input[name="StaNivelAcesso"][value="0"]' },
        restrito: { role: 'radio', name: /restrito/i, fallback: '#optRestrito, input[name="StaNivelAcesso"][value="1"]' },
        sigiloso: { role: 'radio', name: /sigiloso/i, fallback: '#optSigiloso, input[name="StaNivelAcesso"][value="2"]' },
      },
      hipoteseLegal: { role: 'combobox', name: /hipótese.*legal/i, fallback: '#selHipoteseLegal' },
      submit: { role: 'button', name: /salvar|confirmar|gerar/i, fallback: '#btnSalvar, input[name="btnSalvar"]' },
      dataDocumento: { role: 'textbox', name: /data/i, fallback: '#txtDataElaboracao' },
      numeroDocumento: { role: 'textbox', name: /número/i, fallback: '#txtNumero' },

      // Texto inicial
      textoInicial: {
        modelo: { role: 'radio', name: /documento.*modelo|texto.*modelo/i, fallback: 'input[name="StaTextoInicial"][value="M"]' },
        padrao: { role: 'radio', name: /texto.*padrão/i, fallback: 'input[name="StaTextoInicial"][value="T"]' },
        nenhum: { role: 'radio', name: /nenhum|sem.*texto|documento.*branco/i, fallback: 'input[name="StaTextoInicial"][value="N"]' },
      },
      textoPadraoSelect: { role: 'combobox', name: /texto.*padrão/i, fallback: '#selTextoPadrao' },
      documentoModeloInput: { role: 'textbox', name: /protocolo|modelo/i, fallback: '#txtProtocolo' },

      // Interessados
      interessadosInput: { role: 'combobox', name: /interessado/i, fallback: '#txtInteressado' },
      interessadosBtn: { role: 'button', name: /adicionar.*interessado/i, fallback: '#btnAdicionarInteressado' },
      interessadosList: { role: 'listbox', name: /interessado/i, fallback: '#selInteressados' },

      // Destinatários
      destinatariosInput: { role: 'combobox', name: /destinatário/i, fallback: '#txtDestinatario' },
      destinatariosBtn: { role: 'button', name: /adicionar.*destinatário/i, fallback: '#btnAdicionarDestinatario' },

      // Assuntos
      assuntosBtn: { role: 'button', name: /pesquisar.*assunto|selecionar.*assunto/i, fallback: '#btnPesquisarAssunto' },
      assuntosInput: { role: 'textbox', name: /assunto|palavras.*pesquisa/i, fallback: '#txtPalavrasPesquisaAssuntos' },

      // Observações
      observacoes: { role: 'textbox', name: /observaç/i, fallback: '#txaObservacoes' },
    },

    // ===== DOCUMENTO EXTERNO =====
    documentExterno: {
      form: { role: 'form', name: /documento.*externo/i, fallback: '#frmDocumentoExternoGerar' },
      tipoSelect: { role: 'combobox', name: /tipo.*documento/i, fallback: '#selTipoDocumento' },
      formatoNato: { role: 'radio', name: /nato.*digital|nascido.*digital/i, fallback: 'input[value="N"]' },
      formatoDigitalizado: { role: 'radio', name: /digitalizado/i, fallback: 'input[value="D"]' },
      conferenciaCopiaAutenticada: { role: 'radio', name: /cópia.*autenticada/i, fallback: '#optCopiaAutenticada' },
      conferenciaCopiaSimples: { role: 'radio', name: /cópia.*simples/i, fallback: '#optCopiaSimples' },
      conferenciaOriginal: { role: 'radio', name: /documento.*original/i, fallback: '#optDocumentoOriginal' },
      fileInput: { fallback: '#filArquivo, input[type="file"][name="filArquivo"]' },
      anexarBtn: { role: 'button', name: /anexar/i, fallback: '#btnAnexar' },
      observacao: { role: 'textbox', name: /observaç/i, fallback: '#txaObservacoes' },
    },

    // ===== ASSINATURA =====
    signature: {
      modal: { role: 'dialog', name: /assinatura/i, fallback: '#divInfraModalAssinatura, .modal-assinatura' },
      password: { role: 'textbox', name: /senha/i, fallback: '#txtSenha, input[name="txtSenha"]' },
      cargo: { role: 'combobox', name: /cargo|função/i, fallback: '#selCargo' },
      submit: { role: 'button', name: /assinar/i, fallback: '#btnAssinar' },
      bloco: { role: 'link', name: /bloco.*assin/i, fallback: 'a[href*="bloco_assinar"]' },
    },

    // ===== TRAMITAÇÃO =====
    forward: {
      form: { role: 'form', name: /enviar.*processo/i, fallback: '#frmEnviarProcesso' },
      unitSearch: { role: 'combobox', name: /unidade|destino/i, fallback: '#txtUnidade' },
      unitSelect: { role: 'listbox', fallback: '#selUnidade' },
      unitSuggestions: { role: 'listbox', fallback: '#divInfraAjaxtxtUnidade, .autocomplete-results, .ui-autocomplete' },
      keepOpen: { role: 'checkbox', name: /manter.*aberto/i, fallback: '#chkManterAberto' },
      returnDate: { role: 'textbox', name: /data.*retorno/i, fallback: '#txtDataRetornoProgramado' },
      daysOpen: { role: 'textbox', name: /dias.*aberto/i, fallback: '#txtDiasAbertoUnidade' },
      deadline: { role: 'textbox', name: /prazo/i, fallback: '#txtPrazo' },
      observation: { role: 'textbox', name: /observação/i, fallback: '#txaObservacao' },
      sendEmail: { role: 'checkbox', name: /email|notificação/i, fallback: '#chkEnviarEmailNotificacao' },
      submit: { role: 'button', name: /enviar/i, fallback: '#btnEnviar' },
    },

    // ===== PESQUISA =====
    search: {
      input: { role: 'searchbox', name: /pesquisa/i, fallback: '#txtPesquisaRapida' },
      submit: { role: 'button', name: /pesquisar/i, fallback: '#btnPesquisar' },
      results: { role: 'row', fallback: '#tblResultados tbody tr, .resultado-pesquisa' },
      advanced: { role: 'link', name: /pesquisa.*avançada/i, fallback: '#lnkPesquisaAvancada' },
    },

    // ===== CRIAR PROCESSO =====
    createProcess: {
      form: { role: 'form', name: /gerar.*processo|iniciar.*processo/i, fallback: '#frmProcedimentoGerar' },
      tipoSelect: { role: 'combobox', name: /tipo.*processo/i, fallback: '#selTipoProcedimento' },
      especificacao: { role: 'textbox', name: /especificação/i, fallback: '#txtEspecificacao' },
      interessados: { role: 'textbox', name: /interessado/i, fallback: '#txtInteressados' },
      observacao: { role: 'textbox', name: /observaç/i, fallback: '#txaObservacoes' },
      nivelAcesso: {
        publico: { role: 'radio', name: /público/i, fallback: '#optPublico' },
        restrito: { role: 'radio', name: /restrito/i, fallback: '#optRestrito' },
        sigiloso: { role: 'radio', name: /sigiloso/i, fallback: '#optSigiloso' },
      },
      hipoteseLegal: { role: 'combobox', name: /hipótese/i, fallback: '#selHipoteseLegal' },
      submit: { role: 'button', name: /salvar|gerar/i, fallback: '#btnSalvar' },
    },

    // ===== CONCLUIR =====
    conclude: {
      form: { role: 'form', name: /concluir/i, fallback: '#frmConcluirProcesso' },
      submit: { role: 'button', name: /concluir/i, fallback: '#btnConcluir' },
    },

    // ===== ANEXAR =====
    attach: {
      form: { role: 'form', name: /anexar/i, fallback: '#frmAnexarProcesso' },
      processoAnexar: { role: 'textbox', name: /protocolo|processo.*anexar/i, fallback: '#txtProtocoloAnexar' },
      submit: { role: 'button', name: /anexar/i, fallback: '#btnAnexar' },
    },

    // ===== ATRIBUIÇÃO =====
    assign: {
      form: { role: 'form', name: /atribuir/i, fallback: '#frmAtribuirProcesso' },
      userSelect: { role: 'combobox', name: /usuário/i, fallback: '#selUsuario' },
      submit: { role: 'button', name: /atribuir/i, fallback: '#btnAtribuir' },
    },

    // ===== BLOCOS =====
    blocks: {
      list: { role: 'table', name: /bloco/i, fallback: '#tblBlocos tbody tr' },
      create: { role: 'link', name: /novo.*bloco|criar.*bloco/i, fallback: 'a[href*="bloco_cadastrar"]' },
      assignBtn: { role: 'button', name: /assinar.*bloco/i, fallback: 'a[href*="bloco_assinar"]' },
      releaseBtn: { role: 'button', name: /disponibilizar/i, fallback: 'a[href*="bloco_disponibilizar"]' },
      addDocBtn: { role: 'button', name: /incluir.*documento|adicionar/i, fallback: 'a[href*="bloco_protocolo_incluir"]' },
      removeDocBtn: { role: 'button', name: /excluir|remover/i, fallback: 'a[href*="bloco_protocolo_excluir"]' },
      form: {
        tipo: { role: 'combobox', name: /tipo/i, fallback: '#selTipoBloco' },
        descricao: { role: 'textbox', name: /descrição/i, fallback: '#txtDescricao' },
        unidadeInput: { role: 'combobox', name: /unidade/i, fallback: '#txtUnidade' },
        unidadeAdd: { role: 'button', name: /adicionar.*unidade/i, fallback: '#btnAdicionarUnidade' },
        documentoInput: { role: 'textbox', name: /protocolo|documento/i, fallback: '#txtProtocolo' },
        documentoAdd: { role: 'button', name: /adicionar.*protocolo|adicionar.*documento/i, fallback: '#btnAdicionarProtocolo' },
        submit: { role: 'button', name: /salvar/i, fallback: '#btnSalvar' },
      },
    },

    // ===== UPLOAD =====
    upload: {
      fileInput: { fallback: '#filArquivo, input[type="file"]' },
      formatoSelect: { role: 'combobox', name: /formato/i, fallback: '#selFormato' },
      submit: { role: 'button', name: /adicionar/i, fallback: '#btnAdicionar' },
    },

    // ===== COMUM =====
    common: {
      loading: { role: 'progressbar', fallback: '.infraLoading, #divInfraLoading' },
      success: { role: 'alert', fallback: '.infraMensagem, .sucesso' },
      error: { role: 'alert', fallback: '.infraExcecao, .erro' },
      iframe: { fallback: 'iframe#ifrVisualizacao' },
      menuPrincipal: { role: 'navigation', fallback: '#divArvoreAcoes, .menu-acoes' },
      userInfo: { role: 'status', fallback: '.infraAreaUsuario, #divInfraUsuario' },
      confirmYes: { role: 'button', name: /sim|confirmar|ok/i, fallback: '#btnSim, input[value="Sim"]' },
      confirmNo: { role: 'button', name: /não|cancelar/i, fallback: '#btnNao, input[value="Não"]' },
    },

    // ===== ANOTAÇÕES =====
    annotations: {
      list: { role: 'table', name: /anotaç/i, fallback: '#tblAnotacoes tbody tr' },
      add: { role: 'link', name: /nova.*anotação|adicionar.*anotação/i, fallback: 'a[href*="anotacao_cadastrar"]' },
      text: { role: 'textbox', name: /descrição|texto/i, fallback: '#txaDescricao' },
      priority: { role: 'checkbox', name: /prioridade/i, fallback: '#chkPrioridade' },
      submit: { role: 'button', name: /salvar/i, fallback: '#btnSalvar' },
    },

    // ===== MARCADORES =====
    markers: {
      list: { role: 'table', name: /marcador/i, fallback: '#tblMarcadores tbody tr' },
      add: { role: 'link', name: /adicionar.*marcador/i, fallback: 'a[href*="marcador_cadastrar"]' },
      select: { role: 'combobox', name: /marcador/i, fallback: '#selMarcador' },
      submit: { role: 'button', name: /salvar/i, fallback: '#btnSalvar' },
    },

    // ===== CIÊNCIA =====
    awareness: {
      btn: { role: 'link', name: /registrar.*ciência|dar.*ciência/i, fallback: 'a[href*="ciencia_cadastrar"]' },
      submit: { role: 'button', name: /salvar|confirmar/i, fallback: '#btnSalvar' },
    },

    // ===== CANCELAMENTO =====
    cancel: {
      btn: { role: 'link', name: /cancelar.*documento/i, fallback: 'a[href*="documento_cancelar"]' },
      motivo: { role: 'textbox', name: /motivo/i, fallback: '#txaMotivo' },
      submit: { role: 'button', name: /cancelar|confirmar/i, fallback: '#btnCancelar' },
    },

    // ===== RELACIONAMENTOS =====
    related: {
      list: { role: 'table', name: /relacionad/i, fallback: '#tblRelacionados tbody tr' },
      add: { role: 'link', name: /relacionar/i, fallback: 'a[href*="procedimento_relacionar"]' },
      processInput: { role: 'textbox', name: /protocolo/i, fallback: '#txtProtocolo' },
      submit: { role: 'button', name: /relacionar/i, fallback: '#btnRelacionar' },
    },

    // ===== PUBLICAÇÃO =====
    publish: {
      btn: { role: 'link', name: /agendar.*publicação|publicar/i, fallback: 'a[href*="publicacao_cadastrar"]' },
      veiculo: { role: 'combobox', name: /veículo/i, fallback: '#selVeiculo' },
      data: { role: 'textbox', name: /data/i, fallback: '#txtData' },
      resumo: { role: 'textbox', name: /resumo|ementa/i, fallback: '#txaResumo' },
      submit: { role: 'button', name: /salvar|publicar/i, fallback: '#btnSalvar' },
    },

    // ===== SOBRESTAMENTO =====
    suspend: {
      btn: { role: 'link', name: /sobrestar/i, fallback: 'a[href*="sobrestamento_cadastrar"]' },
      motivo: { role: 'textbox', name: /motivo/i, fallback: '#txaMotivo' },
      processoVinculado: { role: 'textbox', name: /processo.*vinculado/i, fallback: '#txtProtocoloVinculado' },
      submit: { role: 'button', name: /sobrestar/i, fallback: '#btnSobrestar' },
    },

    // ===== AUTOCOMPLETE =====
    autocomplete: {
      list: { role: 'listbox', fallback: '.ui-autocomplete, #divInfraAjax' },
      item: { role: 'option', fallback: '.ui-autocomplete li, #divInfraAjax li, .autocomplete-item' },
    },
  };

  // ============================================================
  // FUNÇÕES DE LOCATOR SEMÂNTICO
  // ============================================================

  /**
   * Encontra elemento usando locator semântico ARIA
   * Prioriza role + name acessível, com fallback para CSS
   */
  function getByRole(locator) {
    if (!locator) return null;

    // Se for string, trata como CSS selector direto (fallback)
    if (typeof locator === 'string') {
      return document.querySelector(locator);
    }

    const { role, name, fallback } = locator;

    // Mapear roles ARIA para elementos HTML correspondentes
    const roleToElements = {
      button: 'button, input[type="button"], input[type="submit"], [role="button"]',
      textbox: 'input[type="text"], input[type="password"], input[type="search"], input[type="email"], textarea, [role="textbox"]',
      searchbox: 'input[type="search"], [role="searchbox"]',
      combobox: 'select, input[list], [role="combobox"]',
      listbox: 'select[multiple], [role="listbox"], .ui-autocomplete',
      checkbox: 'input[type="checkbox"], [role="checkbox"]',
      radio: 'input[type="radio"], [role="radio"]',
      link: 'a[href], [role="link"]',
      option: 'option, [role="option"], li',
      dialog: 'dialog, [role="dialog"], .modal',
      alertdialog: '[role="alertdialog"], .modal-confirm',
      alert: '[role="alert"], .erro, .infraExcecao, .infraMensagem',
      form: 'form, [role="form"]',
      table: 'table, [role="table"]',
      row: 'tr, [role="row"]',
      tree: '[role="tree"], .arvore',
      treeitem: '[role="treeitem"]',
      navigation: 'nav, [role="navigation"]',
      status: '[role="status"]',
      progressbar: '[role="progressbar"], .loading',
      heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
      application: '[role="application"], iframe',
      document: '[role="document"], iframe',
    };

    // Obter seletor base para o role
    const baseSelector = roleToElements[role];

    if (baseSelector) {
      // Buscar todos os elementos com esse role
      const elements = document.querySelectorAll(baseSelector);

      // Filtrar por nome acessível se fornecido
      if (name) {
        for (const el of elements) {
          const accessibleName = getAccessibleName(el);
          if (matchesName(accessibleName, name)) {
            return el;
          }
        }
      } else if (elements.length > 0) {
        return elements[0];
      }
    }

    // Fallback para seletor CSS
    if (fallback) {
      const selectors = fallback.split(',').map(s => s.trim());
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) return el;
        } catch (e) {
          // Ignorar seletores inválidos
        }
      }
    }

    return null;
  }

  /**
   * Encontra todos os elementos que correspondem ao locator
   */
  function getAllByRole(locator) {
    if (!locator) return [];

    if (typeof locator === 'string') {
      return Array.from(document.querySelectorAll(locator));
    }

    const { role, name, fallback } = locator;

    const roleToElements = {
      button: 'button, input[type="button"], input[type="submit"], [role="button"]',
      textbox: 'input[type="text"], input[type="password"], textarea, [role="textbox"]',
      combobox: 'select, [role="combobox"]',
      checkbox: 'input[type="checkbox"], [role="checkbox"]',
      radio: 'input[type="radio"], [role="radio"]',
      link: 'a[href], [role="link"]',
      option: 'option, [role="option"], li',
      row: 'tr, [role="row"]',
      table: 'table, [role="table"]',
    };

    const baseSelector = roleToElements[role];
    let results = [];

    if (baseSelector) {
      const elements = document.querySelectorAll(baseSelector);
      if (name) {
        for (const el of elements) {
          const accessibleName = getAccessibleName(el);
          if (matchesName(accessibleName, name)) {
            results.push(el);
          }
        }
      } else {
        results = Array.from(elements);
      }
    }

    // Se não encontrou via role, usar fallback
    if (results.length === 0 && fallback) {
      results = Array.from(document.querySelectorAll(fallback));
    }

    return results;
  }

  /**
   * Obtém o nome acessível de um elemento
   * (aria-label > aria-labelledby > title > placeholder > texto visível)
   */
  function getAccessibleName(el) {
    if (!el) return '';

    // aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // aria-labelledby
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim() || '';
    }

    // title
    const title = el.getAttribute('title');
    if (title) return title;

    // placeholder
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    // label associado (para inputs)
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    // labels property
    if (el.labels && el.labels.length > 0) {
      return el.labels[0].textContent?.trim() || '';
    }

    // value para botões
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
      return el.value || '';
    }

    // Texto visível
    return el.textContent?.trim() || '';
  }

  /**
   * Verifica se o nome acessível corresponde ao padrão
   */
  function matchesName(accessibleName, pattern) {
    if (!accessibleName || !pattern) return false;

    if (pattern instanceof RegExp) {
      return pattern.test(accessibleName);
    }

    return accessibleName.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Aguarda elemento aparecer (usando locator semântico)
   */
  function waitFor(locator, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = getByRole(locator);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = getByRole(locator);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        const desc = typeof locator === 'string' ? locator : `role=${locator.role}, name=${locator.name}`;
        reject(new Error(`Timeout waiting for: ${desc}`));
      }, timeout);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Seleciona opção em select por texto
   */
  function selectOptionByText(selectEl, text) {
    if (!selectEl || !text) return false;
    const options = Array.from(selectEl.options || []);
    const option = options.find(o =>
      o.text.toLowerCase().includes(text.toLowerCase())
    );
    if (option) {
      selectEl.value = option.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  /**
   * Obtém número do processo atual
   */
  function getCurrentProcessNumber() {
    const el = getByRole(LOCATORS.process.number);
    if (el) {
      return el.textContent?.trim() || el.value?.trim() || '';
    }
    const urlMatch = window.location.href.match(/id_procedimento=(\d+)/);
    return urlMatch ? urlMatch[1] : '';
  }

  /**
   * Obtém informações da sessão
   */
  function getSessionInfo() {
    const userEl = getByRole(LOCATORS.common.userInfo);
    const unitEl = document.querySelector('[class*="unidade"], .infraUnidade');
    return {
      user: userEl?.textContent?.trim() || '',
      unit: unitEl?.textContent?.trim() || '',
      url: window.location.href,
    };
  }

  /**
   * Verifica se está logado
   */
  function isLoggedIn() {
    return !getByRole(LOCATORS.login.form) && getByRole(LOCATORS.common.userInfo);
  }

  /**
   * Clica no primeiro item do autocomplete
   */
  async function clickAutocompleteItem() {
    await delay(800);
    const item = getByRole(LOCATORS.autocomplete.item);
    if (item) {
      item.click();
      await delay(500);
      return true;
    }
    return false;
  }

  // ============================================================
  // AÇÕES DO SEI
  // ============================================================

  const actions = {
    // === AUTENTICAÇÃO ===

    async sei_login({ url, username, password, orgao }) {
      if (url && !window.location.href.includes(url)) {
        window.location.href = url + '/sei/controlador.php?acao=login';
        await delay(2000);
      }

      const form = getByRole(LOCATORS.login.form);
      if (!form) {
        if (isLoggedIn()) {
          return { success: true, message: 'Já está logado', session: getSessionInfo() };
        }
        throw new Error('Formulário de login não encontrado');
      }

      const userInput = getByRole(LOCATORS.login.username);
      const passInput = getByRole(LOCATORS.login.password);

      if (!userInput || !passInput) {
        throw new Error('Campos de login não encontrados');
      }

      userInput.value = username;
      passInput.value = password;

      if (orgao) {
        const orgaoSelect = getByRole(LOCATORS.login.orgao);
        if (orgaoSelect) {
          selectOptionByText(orgaoSelect, orgao);
        }
      }

      const submitBtn = getByRole(LOCATORS.login.submit);
      if (submitBtn) {
        submitBtn.click();
      }

      await delay(2000);

      const error = getByRole(LOCATORS.login.error);
      if (error && error.textContent.trim()) {
        throw new Error(`Login falhou: ${error.textContent.trim()}`);
      }

      return { success: true, message: 'Login realizado com sucesso', session: getSessionInfo() };
    },

    async sei_logout() {
      // Usar locator semântico para botão de logout
      const logoutBtn = getByRole({ role: 'link', name: /sair|logout/i, fallback: 'a[href*="logout"], a[href*="sair"]' });
      if (logoutBtn) {
        logoutBtn.click();
        await delay(1000);
      }
      return { success: true, message: 'Logout realizado' };
    },

    async sei_get_session() {
      return {
        logged_in: isLoggedIn(),
        ...getSessionInfo(),
      };
    },

    // === BUSCA E NAVEGAÇÃO ===

    async sei_search_process({ query, type = 'numero', limit = 10 }) {
      const searchInput = getByRole(LOCATORS.search.input);
      if (!searchInput) {
        throw new Error('Campo de pesquisa não encontrado');
      }

      searchInput.value = query;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      const submitBtn = getByRole(LOCATORS.search.submit);
      if (submitBtn) {
        submitBtn.click();
      } else {
        searchInput.form?.submit();
      }

      await delay(2000);

      const rows = getAllByRole(LOCATORS.search.results);
      const results = rows.slice(0, limit).map(row => {
        const cells = row.querySelectorAll('td');
        const link = row.querySelector('a');
        return {
          number: cells[0]?.textContent?.trim() || link?.textContent?.trim() || '',
          type: cells[1]?.textContent?.trim() || '',
          description: cells[2]?.textContent?.trim() || '',
          unit: cells[3]?.textContent?.trim() || '',
          href: link?.href || '',
        };
      });

      return { results, total: rows.length };
    },

    async sei_open_process({ process_number }) {
      const searchResult = await actions.sei_search_process({ query: process_number, limit: 1 });

      if (searchResult.results.length > 0) {
        const rows = getAllByRole(LOCATORS.search.results);
        const firstLink = rows[0]?.querySelector('a');
        if (firstLink) {
          firstLink.click();
          await delay(2000);
        }
      }

      return {
        success: true,
        process_number: getCurrentProcessNumber(),
        url: window.location.href,
      };
    },

    // === DOCUMENTOS ===

    async sei_list_documents({ process_number }) {
      const currentProcess = getCurrentProcessNumber();
      if (process_number && !currentProcess.includes(process_number)) {
        await actions.sei_open_process({ process_number });
        await delay(1000);
      }

      const tree = getByRole(LOCATORS.process.tree);
      const docElements = tree ? tree.querySelectorAll('a[href*="documento"]') : [];

      const documents = Array.from(docElements).map((el, index) => {
        const href = el.getAttribute('href') || '';
        const idMatch = href.match(/id_documento=(\d+)/);
        return {
          id: idMatch ? idMatch[1] : `doc_${index}`,
          number: el.textContent?.match(/\d+/)?.[0] || '',
          name: el.textContent?.trim() || '',
          type: el.title || el.textContent?.trim() || '',
          href: href,
        };
      });

      return { documents, process: currentProcess };
    },

    async sei_create_document({
      process_number,
      document_type,
      texto_inicial = 'nenhum',
      texto_padrao_id,
      documento_modelo_id,
      descricao,
      numero,
      nome_arvore,
      interessados = [],
      destinatarios = [],
      assuntos = [],
      observacoes,
      nivel_acesso = 'publico',
      hipotese_legal,
      content
    }) {
      // Navegar para criação de documento
      const newDocBtn = getByRole(LOCATORS.process.menuIncluir);
      if (newDocBtn) {
        newDocBtn.click();
        await delay(2000);
      }

      // Selecionar tipo de documento (por link com texto)
      const docLinks = getAllByRole({ role: 'link', fallback: 'a[href*="documento_gerar"]' });
      let docTypeLink = null;

      for (const link of docLinks) {
        const text = link.textContent?.trim().toLowerCase() || '';
        if (text.includes(document_type.toLowerCase())) {
          docTypeLink = link;
          break;
        }
      }

      if (!docTypeLink) {
        const typeSelect = getByRole(LOCATORS.document.typeSelect);
        if (typeSelect && document_type) {
          selectOptionByText(typeSelect, document_type);
          await delay(1000);
          const confirmTypeBtn = getByRole({ role: 'button', name: /confirmar/i, fallback: '#btnConfirmar' });
          if (confirmTypeBtn) {
            confirmTypeBtn.click();
            await delay(2000);
          }
        }
      } else {
        docTypeLink.click();
        await delay(2000);
      }

      // Texto inicial
      if (texto_inicial && texto_inicial !== 'nenhum') {
        const textoInicialRadio = getByRole(LOCATORS.document.textoInicial[texto_inicial]);
        if (textoInicialRadio) {
          textoInicialRadio.click();
          await delay(500);

          if (texto_inicial === 'padrao' && texto_padrao_id) {
            const textoPadraoSelect = getByRole(LOCATORS.document.textoPadraoSelect);
            if (textoPadraoSelect) {
              selectOptionByText(textoPadraoSelect, texto_padrao_id);
              await delay(500);
            }
          }

          if (texto_inicial === 'modelo' && documento_modelo_id) {
            const modeloInput = getByRole(LOCATORS.document.documentoModeloInput);
            if (modeloInput) {
              modeloInput.value = documento_modelo_id;
              modeloInput.dispatchEvent(new Event('change', { bubbles: true }));
              await delay(500);
            }
          }
        }
      } else {
        const nenhumRadio = getByRole(LOCATORS.document.textoInicial.nenhum);
        if (nenhumRadio) {
          nenhumRadio.click();
          await delay(300);
        }
      }

      // Descrição
      if (descricao) {
        const descInput = getByRole(LOCATORS.document.description);
        if (descInput) {
          descInput.value = descricao;
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // Número do documento
      if (numero) {
        const numInput = getByRole(LOCATORS.document.numeroDocumento);
        if (numInput) {
          numInput.value = numero;
          numInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // Nome na árvore
      if (nome_arvore) {
        const nomeInput = getByRole(LOCATORS.document.nomeArvore);
        if (nomeInput) {
          nomeInput.value = nome_arvore;
          nomeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // Interessados
      if (interessados && interessados.length > 0) {
        for (const interessado of interessados) {
          const intInput = getByRole(LOCATORS.document.interessadosInput);
          if (intInput) {
            intInput.value = interessado;
            intInput.dispatchEvent(new Event('input', { bubbles: true }));

            if (!await clickAutocompleteItem()) {
              const addBtn = getByRole(LOCATORS.document.interessadosBtn);
              if (addBtn) {
                addBtn.click();
                await delay(500);
              }
            }
          }
        }
      }

      // Destinatários
      if (destinatarios && destinatarios.length > 0) {
        for (const destinatario of destinatarios) {
          const destInput = getByRole(LOCATORS.document.destinatariosInput);
          if (destInput) {
            destInput.value = destinatario;
            destInput.dispatchEvent(new Event('input', { bubbles: true }));

            if (!await clickAutocompleteItem()) {
              const addBtn = getByRole(LOCATORS.document.destinatariosBtn);
              if (addBtn) {
                addBtn.click();
                await delay(500);
              }
            }
          }
        }
      }

      // Assuntos
      if (assuntos && assuntos.length > 0) {
        const assuntosBtn = getByRole(LOCATORS.document.assuntosBtn);
        if (assuntosBtn) {
          assuntosBtn.click();
          await delay(1500);

          for (const assunto of assuntos) {
            const searchInput = getByRole(LOCATORS.document.assuntosInput);
            if (searchInput) {
              searchInput.value = assunto;
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));

              const searchBtn = getByRole({ role: 'button', name: /pesquisar/i, fallback: '#btnPesquisar' });
              if (searchBtn) {
                searchBtn.click();
                await delay(1000);
              }

              const resultCheck = document.querySelector('input[type="checkbox"]');
              if (resultCheck) {
                resultCheck.checked = true;
                resultCheck.click();
                await delay(300);
              }
            }
          }

          const confirmBtn = getByRole({ role: 'button', name: /transportar|confirmar/i, fallback: '#btnTransportar' });
          if (confirmBtn) {
            confirmBtn.click();
            await delay(1000);
          }
        }
      }

      // Observações
      if (observacoes) {
        const obsInput = getByRole(LOCATORS.document.observacoes);
        if (obsInput) {
          obsInput.value = observacoes;
          obsInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      // Nível de acesso
      const nivelRadio = getByRole(LOCATORS.document.nivelAcesso[nivel_acesso]);
      if (nivelRadio) {
        nivelRadio.click();
        await delay(500);
      }

      // Hipótese legal
      if (nivel_acesso !== 'publico' && hipotese_legal) {
        const hipSelect = getByRole(LOCATORS.document.hipoteseLegal);
        if (hipSelect) {
          selectOptionByText(hipSelect, hipotese_legal);
          await delay(300);
        }
      }

      // Gerar documento
      const confirmBtn = getByRole(LOCATORS.document.submit);
      if (confirmBtn) {
        confirmBtn.click();
        await delay(2500);
      }

      // Verificar erro
      const errorMsgPre = getByRole(LOCATORS.common.error);
      if (errorMsgPre && errorMsgPre.textContent.trim() && !errorMsgPre.textContent.includes('sucesso')) {
        throw new Error(`Erro ao criar documento: ${errorMsgPre.textContent.trim()}`);
      }

      // Preencher conteúdo no editor
      if (content) {
        await delay(1000);

        const ckeFrame = getByRole(LOCATORS.document.ckeditor);
        if (ckeFrame) {
          try {
            const ckeDoc = ckeFrame.contentDocument || ckeFrame.contentWindow.document;
            ckeDoc.body.innerHTML = content;
          } catch (e) {
            console.log('[SEI-MCP] CKEditor iframe access error');
          }
        }

        if (window.CKEDITOR) {
          const editorInstance = Object.values(window.CKEDITOR.instances)[0];
          if (editorInstance) {
            editorInstance.setData(content);
          }
        }

        const editor = getByRole(LOCATORS.document.editor);
        if (editor) {
          if (editor.tagName === 'IFRAME') {
            try {
              editor.contentDocument.body.innerHTML = content;
            } catch (e) {}
          } else if (editor.tagName === 'TEXTAREA') {
            editor.value = content;
          }
        }

        await delay(500);

        const saveBtn = getByRole(LOCATORS.document.submit);
        if (saveBtn) {
          saveBtn.click();
          await delay(2000);
        }
      }

      const successMsg = getByRole(LOCATORS.common.success);
      const errorMsg = getByRole(LOCATORS.common.error);

      if (errorMsg && errorMsg.textContent.trim() && !errorMsg.textContent.includes('sucesso')) {
        throw new Error(`Erro ao criar documento: ${errorMsg.textContent.trim()}`);
      }

      const docId = window.location.href.match(/id_documento=(\d+)/)?.[1] || '';

      return {
        success: true,
        message: successMsg?.textContent?.trim() || 'Documento criado com sucesso',
        id: docId,
        document_type,
        numero,
        nome_arvore,
        nivel_acesso,
      };
    },

    // Upload de documento externo
    async sei_upload_document({ process_number, file_name, file_content_base64, mime_type, document_type, description, nivel_acesso = 'publico', hipotese_legal, formato = 'nato_digital', conferencia, observacao }) {
      if (window.seiMcpUpload && window.seiMcpUpload.uploadDocumentoExterno) {
        return await window.seiMcpUpload.uploadDocumentoExterno({
          file_name,
          file_content_base64,
          mime_type,
          document_type,
          description,
          data_documento: new Date().toLocaleDateString('pt-BR'),
          nivel_acesso,
          hipotese_legal,
          formato,
          conferencia,
          observacao,
        });
      }

      // Fallback manual usando locators semânticos
      const menuIncluir = getByRole(LOCATORS.process.menuIncluir);
      if (menuIncluir) {
        menuIncluir.click();
        await delay(2000);
      }

      const externoLink = getByRole({ role: 'link', name: /externo/i, fallback: 'a[href*="documento_externo"]' });
      if (externoLink) {
        externoLink.click();
        await delay(2000);
      }

      const typeSelect = getByRole(LOCATORS.documentExterno.tipoSelect);
      if (typeSelect && document_type) {
        selectOptionByText(typeSelect, document_type);
        await delay(500);
      }

      // Formato
      if (formato === 'nato_digital') {
        const natoRadio = getByRole(LOCATORS.documentExterno.formatoNato);
        if (natoRadio) natoRadio.click();
      } else {
        const digRadio = getByRole(LOCATORS.documentExterno.formatoDigitalizado);
        if (digRadio) digRadio.click();
      }
      await delay(300);

      // Nível de acesso
      const nivelRadio = getByRole(LOCATORS.document.nivelAcesso[nivel_acesso]);
      if (nivelRadio) {
        nivelRadio.click();
        await delay(300);
      }

      // Hipótese legal
      if (nivel_acesso !== 'publico' && hipotese_legal) {
        const hipSelect = getByRole(LOCATORS.document.hipoteseLegal);
        if (hipSelect) {
          selectOptionByText(hipSelect, hipotese_legal);
        }
      }

      // Nome na árvore
      const nomeInput = getByRole(LOCATORS.document.nomeArvore);
      if (nomeInput && description) {
        nomeInput.value = description;
      }

      // Upload do arquivo
      const fileInput = getByRole(LOCATORS.documentExterno.fileInput);
      if (!fileInput) {
        throw new Error('Campo de upload não encontrado');
      }

      const byteCharacters = atob(file_content_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime_type });
      const file = new File([blob], file_name, { type: mime_type });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(1000);

      // Anexar
      const anexarBtn = getByRole(LOCATORS.documentExterno.anexarBtn);
      if (anexarBtn) {
        anexarBtn.click();
        await delay(2000);
      }

      // Observações
      if (observacao) {
        const obsInput = getByRole(LOCATORS.documentExterno.observacao);
        if (obsInput) {
          obsInput.value = observacao;
        }
      }

      // Salvar
      const saveBtn = getByRole(LOCATORS.document.submit);
      if (saveBtn) {
        saveBtn.click();
        await delay(3000);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro no upload: ${errorEl.textContent.trim()}`);
      }

      const docId = window.location.href.match(/id_documento=(\d+)/)?.[1] || '';

      return {
        success: true,
        message: 'Documento incluído com sucesso',
        id: docId,
        fileName: file_name,
      };
    },

    async sei_download_document({ document_id }) {
      const downloadLink = getByRole({ role: 'link', name: /download/i, fallback: `a[href*="documento_download"][href*="${document_id}"]` });
      if (downloadLink) {
        downloadLink.click();
        await delay(1000);
      }
      return { success: true, message: 'Download iniciado' };
    },

    async sei_view_document({ document_id }) {
      const docLink = document.querySelector(`a[href*="id_documento=${document_id}"]`);
      if (docLink) {
        docLink.click();
        await delay(2000);
      }

      const iframe = getByRole(LOCATORS.common.iframe);
      let content = '';
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        content = iframeDoc?.body?.innerHTML || '';
      }

      return {
        success: true,
        document_id,
        url: window.location.href,
        content_preview: content.substring(0, 1000),
      };
    },

    // === ASSINATURA ===

    async sei_sign_document({ document_id, password, cargo }) {
      const signBtn = getByRole({ role: 'link', name: /assinar/i, fallback: `a[href*="documento_assinar"][href*="${document_id}"], a[href*="documento_assinar"]` });
      if (signBtn) {
        signBtn.click();
        await delay(1500);
      }

      try {
        await waitFor(LOCATORS.signature.modal, 5000);
      } catch {
        // Modal pode ter formato diferente
      }

      const passInput = getByRole(LOCATORS.signature.password);
      if (passInput) {
        passInput.value = password;
      }

      if (cargo) {
        const cargoSelect = getByRole(LOCATORS.signature.cargo);
        if (cargoSelect) {
          selectOptionByText(cargoSelect, cargo);
        }
      }

      const submitBtn = getByRole(LOCATORS.signature.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro na assinatura: ${errorEl.textContent.trim()}`);
      }

      return { success: true, message: 'Documento assinado com sucesso' };
    },

    async sei_sign_block({ block_id, password, cargo }) {
      const blocoLink = getByRole(LOCATORS.signature.bloco) ||
                       document.querySelector(`a[href*="bloco_assinar"][href*="${block_id}"]`);
      if (blocoLink) {
        blocoLink.click();
        await delay(2000);
      }

      const passInput = getByRole(LOCATORS.signature.password);
      if (passInput) {
        passInput.value = password;
      }

      if (cargo) {
        const cargoSelect = getByRole(LOCATORS.signature.cargo);
        if (cargoSelect) {
          selectOptionByText(cargoSelect, cargo);
        }
      }

      const submitBtn = getByRole(LOCATORS.signature.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(3000);
      }

      return { success: true, message: 'Bloco assinado com sucesso' };
    },

    // === TRAMITAÇÃO ===

    async sei_forward_process({ process_number, target_unit, keep_open = false, return_date, days_open, note, send_email = false }) {
      const forwardBtn = getByRole(LOCATORS.process.menuTramitar);
      if (forwardBtn) {
        forwardBtn.click();
        await delay(2000);
      }

      const unitInput = getByRole(LOCATORS.forward.unitSearch);
      if (unitInput) {
        unitInput.value = target_unit;
        unitInput.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(1500);

        await clickAutocompleteItem();
      }

      if (keep_open) {
        const keepOpenCheck = getByRole(LOCATORS.forward.keepOpen);
        if (keepOpenCheck) {
          keepOpenCheck.checked = true;
          keepOpenCheck.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (return_date) {
        const returnInput = getByRole(LOCATORS.forward.returnDate);
        if (returnInput) {
          returnInput.value = return_date;
        }
      }

      if (days_open) {
        const daysInput = getByRole(LOCATORS.forward.daysOpen);
        if (daysInput) {
          daysInput.value = days_open.toString();
        }
      }

      if (note) {
        const noteInput = getByRole(LOCATORS.forward.observation);
        if (noteInput) {
          noteInput.value = note;
        }
      }

      if (send_email) {
        const emailCheck = getByRole(LOCATORS.forward.sendEmail);
        if (emailCheck) {
          emailCheck.checked = true;
        }
      }

      const submitBtn = getByRole(LOCATORS.forward.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2500);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro na tramitação: ${errorEl.textContent.trim()}`);
      }

      return { success: true, message: `Processo tramitado para ${target_unit}` };
    },

    // === CRIAÇÃO DE PROCESSO ===

    async sei_create_process({ process_type, specification, stakeholders, observation, nivel_acesso = 'publico', hipotese_legal }) {
      const newProcessBtn = getByRole({ role: 'link', name: /iniciar.*processo|novo.*processo/i, fallback: 'a[href*="procedimento_gerar"]' });
      if (newProcessBtn) {
        newProcessBtn.click();
        await delay(2000);
      }

      const typeSelect = getByRole(LOCATORS.createProcess.tipoSelect);
      if (typeSelect && process_type) {
        selectOptionByText(typeSelect, process_type);
        await delay(1000);
      }

      const specInput = getByRole(LOCATORS.createProcess.especificacao);
      if (specInput && specification) {
        specInput.value = specification;
      }

      if (stakeholders) {
        const stakeholderInput = getByRole(LOCATORS.createProcess.interessados);
        if (stakeholderInput) {
          stakeholderInput.value = stakeholders;
        }
      }

      const nivelRadio = getByRole(LOCATORS.createProcess.nivelAcesso[nivel_acesso]);
      if (nivelRadio) {
        nivelRadio.click();
        await delay(300);
      }

      if (nivel_acesso !== 'publico' && hipotese_legal) {
        const hipSelect = getByRole(LOCATORS.createProcess.hipoteseLegal);
        if (hipSelect) {
          selectOptionByText(hipSelect, hipotese_legal);
        }
      }

      if (observation) {
        const obsInput = getByRole(LOCATORS.createProcess.observacao);
        if (obsInput) {
          obsInput.value = observation;
        }
      }

      const saveBtn = getByRole(LOCATORS.createProcess.submit);
      if (saveBtn) {
        saveBtn.click();
        await delay(3000);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro ao criar processo: ${errorEl.textContent.trim()}`);
      }

      const newNumber = getCurrentProcessNumber();
      const urlMatch = window.location.href.match(/id_procedimento=(\d+)/);

      return {
        success: true,
        message: 'Processo criado com sucesso',
        process_number: newNumber,
        process_id: urlMatch ? urlMatch[1] : '',
      };
    },

    // === STATUS E ANDAMENTO ===

    async sei_get_status({ process_number, include_history = true }) {
      if (process_number) {
        await actions.sei_open_process({ process_number });
        await delay(1000);
      }

      const statusBtn = getByRole(LOCATORS.process.menuAndamento);
      if (statusBtn) {
        statusBtn.click();
        await delay(2000);
      }

      const processEl = getByRole(LOCATORS.process.number);
      const status = {
        number: processEl?.textContent?.trim() || processEl?.value?.trim() || process_number,
        currentUnit: document.querySelector('[class*="unidade"]')?.textContent?.trim() || '',
        lastAction: document.querySelector('[class*="ultima"]')?.textContent?.trim() || '',
        open: !document.querySelector('.concluido, [class*="concluido"]'),
        history: [],
      };

      if (include_history) {
        const historyRows = getAllByRole({ role: 'row', fallback: '#tblHistorico tbody tr, .historicoTable tbody tr' });
        status.history = historyRows.slice(0, 50).map(row => {
          const cells = row.querySelectorAll('td');
          return {
            date: cells[0]?.textContent?.trim() || '',
            unit: cells[1]?.textContent?.trim() || '',
            action: cells[2]?.textContent?.trim() || '',
            user: cells[3]?.textContent?.trim() || '',
          };
        });
      }

      return status;
    },

    async sei_list_history({ process_number, limit = 50 }) {
      const status = await actions.sei_get_status({ process_number, include_history: true });
      return {
        process_number: status.number,
        history: status.history.slice(0, limit),
      };
    },

    // === OPERAÇÕES ADICIONAIS ===

    async sei_conclude_process({ process_number }) {
      const concludeBtn = getByRole(LOCATORS.process.menuConcluir);
      if (concludeBtn) {
        concludeBtn.click();
        await delay(1500);
      }

      const confirmBtn = getByRole(LOCATORS.conclude.submit);
      if (confirmBtn) {
        confirmBtn.click();
        await delay(2000);
      }

      return { success: true, message: 'Processo concluído' };
    },

    async sei_reopen_process({ process_number }) {
      const reopenBtn = getByRole(LOCATORS.process.menuReabrir);
      if (reopenBtn) {
        reopenBtn.click();
        await delay(1500);
      }

      const confirmBtn = getByRole({ role: 'button', name: /reabrir/i, fallback: '#btnReabrir' });
      if (confirmBtn) {
        confirmBtn.click();
        await delay(2000);
      }

      return { success: true, message: 'Processo reaberto' };
    },

    async sei_attach_process({ main_process, process_to_attach }) {
      await actions.sei_open_process({ process_number: main_process });

      const attachBtn = getByRole(LOCATORS.process.menuAnexar);
      if (attachBtn) {
        attachBtn.click();
        await delay(2000);
      }

      const inputAnexar = getByRole(LOCATORS.attach.processoAnexar);
      if (inputAnexar) {
        inputAnexar.value = process_to_attach;
      }

      const submitBtn = getByRole(LOCATORS.attach.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2500);
      }

      return { success: true, message: `Processo ${process_to_attach} anexado a ${main_process}` };
    },

    async sei_relate_process({ process_number, related_process }) {
      const relateBtn = getByRole(LOCATORS.related.add);
      if (relateBtn) {
        relateBtn.click();
        await delay(1500);
      }

      const input = getByRole(LOCATORS.related.processInput);
      if (input) {
        input.value = related_process;
      }

      const submitBtn = getByRole(LOCATORS.related.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      return { success: true, message: `Processo ${related_process} relacionado` };
    },

    async sei_assign_process({ process_number, user }) {
      const assignBtn = getByRole(LOCATORS.process.menuAtribuir);
      if (assignBtn) {
        assignBtn.click();
        await delay(1500);
      }

      const userSelect = getByRole(LOCATORS.assign.userSelect);
      if (userSelect) {
        selectOptionByText(userSelect, user);
      }

      const submitBtn = getByRole(LOCATORS.assign.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      return { success: true, message: `Processo atribuído a ${user}` };
    },

    async sei_add_annotation({ process_number, text, priority = false }) {
      const addBtn = getByRole(LOCATORS.annotations.add);
      if (addBtn) {
        addBtn.click();
        await delay(1500);
      }

      const textInput = getByRole(LOCATORS.annotations.text);
      if (textInput) {
        textInput.value = text;
      }

      if (priority) {
        const priorityCheck = getByRole(LOCATORS.annotations.priority);
        if (priorityCheck) {
          priorityCheck.checked = true;
        }
      }

      const submitBtn = getByRole(LOCATORS.annotations.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      return { success: true, message: 'Anotação adicionada' };
    },

    async sei_register_awareness({ document_id }) {
      const awarenessBtn = getByRole(LOCATORS.awareness.btn);
      if (awarenessBtn) {
        awarenessBtn.click();
        await delay(1500);
      }

      const submitBtn = getByRole(LOCATORS.awareness.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      return { success: true, message: 'Ciência registrada' };
    },

    async sei_cancel_document({ document_id, motivo }) {
      const cancelBtn = getByRole(LOCATORS.cancel.btn) ||
                       document.querySelector(`a[href*="documento_cancelar"][href*="${document_id}"]`);
      if (cancelBtn) {
        cancelBtn.click();
        await delay(1500);
      }

      const motivoInput = getByRole(LOCATORS.cancel.motivo);
      if (motivoInput) {
        motivoInput.value = motivo;
        motivoInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const submitBtn = getByRole(LOCATORS.cancel.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro ao cancelar documento: ${errorEl.textContent.trim()}`);
      }

      return { success: true, message: 'Documento cancelado', document_id };
    },

    // === BLOCOS DE ASSINATURA ===

    async sei_create_block({ tipo, descricao, unidades_disponibilizacao = [], documentos = [], disponibilizar = false }) {
      const createBtn = getByRole(LOCATORS.blocks.create);
      if (createBtn) {
        createBtn.click();
        await delay(2000);
      }

      const tipoSelect = getByRole(LOCATORS.blocks.form.tipo);
      if (tipoSelect) {
        const tipoMap = { assinatura: 'A', interno: 'I', reuniao: 'R' };
        const tipoValue = tipoMap[tipo] || tipo;
        for (const opt of tipoSelect.options) {
          if (opt.value === tipoValue || opt.text.toLowerCase().includes(tipo.toLowerCase())) {
            tipoSelect.value = opt.value;
            tipoSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
        await delay(500);
      }

      const descInput = getByRole(LOCATORS.blocks.form.descricao);
      if (descInput) {
        descInput.value = descricao;
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      for (const unidade of unidades_disponibilizacao) {
        const unidadeInput = getByRole(LOCATORS.blocks.form.unidadeInput);
        if (unidadeInput) {
          unidadeInput.value = unidade;
          unidadeInput.dispatchEvent(new Event('input', { bubbles: true }));

          if (!await clickAutocompleteItem()) {
            const addBtn = getByRole(LOCATORS.blocks.form.unidadeAdd);
            if (addBtn) {
              addBtn.click();
              await delay(500);
            }
          }
        }
      }

      for (const doc of documentos) {
        const docInput = getByRole(LOCATORS.blocks.form.documentoInput);
        if (docInput) {
          docInput.value = doc;
          docInput.dispatchEvent(new Event('input', { bubbles: true }));
          await delay(500);

          const addBtn = getByRole(LOCATORS.blocks.form.documentoAdd);
          if (addBtn) {
            addBtn.click();
            await delay(500);
          }
        }
      }

      const submitBtn = getByRole(LOCATORS.blocks.form.submit);
      if (submitBtn) {
        submitBtn.click();
        await delay(2000);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro ao criar bloco: ${errorEl.textContent.trim()}`);
      }

      const blockId = window.location.href.match(/id_bloco=(\d+)/)?.[1] || '';

      if (disponibilizar && blockId) {
        await actions.sei_release_block({ block_id: blockId });
      }

      return {
        success: true,
        message: 'Bloco criado com sucesso',
        block_id: blockId,
        tipo,
        descricao,
      };
    },

    async sei_get_block({ block_id, include_documents = true }) {
      const blockLink = document.querySelector(`a[href*="id_bloco=${block_id}"]`);
      if (blockLink) {
        blockLink.click();
        await delay(2000);
      }

      const descricao = document.querySelector('[class*="descricao"], #txtDescricao')?.textContent?.trim() || '';
      const tipo = document.querySelector('[class*="tipo"], #txtTipo')?.textContent?.trim() || '';
      const estado = document.querySelector('[class*="estado"], [class*="situacao"]')?.textContent?.trim() || '';

      const block = {
        id: block_id,
        descricao,
        tipo,
        estado,
        documentos: [],
      };

      if (include_documents) {
        const docRows = getAllByRole({ role: 'row', fallback: '#tblDocumentos tbody tr, .bloco-documento-item' });
        block.documentos = docRows.map(row => {
          const cells = row.querySelectorAll('td');
          const link = row.querySelector('a');
          return {
            id: link?.href?.match(/id_documento=(\d+)/)?.[1] || '',
            numero: cells[0]?.textContent?.trim() || link?.textContent?.trim() || '',
            tipo: cells[1]?.textContent?.trim() || '',
            assinado: row.querySelector('[class*="assinado"], img[title*="Assinado"]') !== null,
          };
        });
      }

      return block;
    },

    async sei_remove_from_block({ block_id, document_id }) {
      await actions.sei_get_block({ block_id, include_documents: false });
      await delay(500);

      const removeBtn = document.querySelector(`a[href*="bloco_protocolo_excluir"][href*="${document_id}"]`) ||
                        getByRole(LOCATORS.blocks.removeDocBtn);

      if (removeBtn) {
        removeBtn.click();
        await delay(1500);

        const confirmBtn = getByRole(LOCATORS.common.confirmYes);
        if (confirmBtn) {
          confirmBtn.click();
          await delay(1500);
        }
      } else {
        throw new Error(`Documento ${document_id} não encontrado no bloco ${block_id}`);
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro ao remover documento: ${errorEl.textContent.trim()}`);
      }

      return { success: true, message: `Documento ${document_id} removido do bloco ${block_id}` };
    },

    async sei_release_block({ block_id }) {
      let releaseBtn = document.querySelector(`a[href*="bloco_disponibilizar"][href*="${block_id}"]`) ||
                       getByRole(LOCATORS.blocks.releaseBtn);

      if (!releaseBtn) {
        await actions.sei_get_block({ block_id, include_documents: false });
        await delay(500);
        releaseBtn = getByRole(LOCATORS.blocks.releaseBtn);
      }

      if (releaseBtn) {
        releaseBtn.click();
        await delay(2000);

        const confirmBtn = getByRole({ role: 'button', name: /confirmar|disponibilizar/i, fallback: '#btnConfirmar' });
        if (confirmBtn) {
          confirmBtn.click();
          await delay(2000);
        }
      }

      const errorEl = getByRole(LOCATORS.common.error);
      if (errorEl && errorEl.textContent.trim()) {
        throw new Error(`Erro ao disponibilizar bloco: ${errorEl.textContent.trim()}`);
      }

      return { success: true, message: `Bloco ${block_id} disponibilizado com sucesso` };
    },

    async sei_list_users({ filter = '' }) {
      const assignBtn = getByRole(LOCATORS.process.menuAtribuir);
      if (assignBtn) {
        assignBtn.click();
        await delay(2000);
      }

      const select = getByRole(LOCATORS.assign.userSelect);
      if (select) {
        const users = Array.from(select.options || [])
          .filter(o => o.value && (!filter || o.text.toLowerCase().includes(filter.toLowerCase())))
          .map(o => ({
            id: o.value,
            nome: o.text.trim(),
            sigla: o.text.match(/\(([^)]+)\)/)?.[1] || '',
          }));

        return { users };
      }

      const userRows = getAllByRole({ role: 'row', fallback: '#tblUsuarios tbody tr, .usuario-item' });
      const users = userRows
        .map(row => {
          const cells = row.querySelectorAll('td');
          const link = row.querySelector('a');
          return {
            id: link?.href?.match(/id_usuario=(\d+)/)?.[1] || '',
            nome: cells[0]?.textContent?.trim() || link?.textContent?.trim() || '',
            sigla: cells[1]?.textContent?.trim() || '',
            cargo: cells[2]?.textContent?.trim() || '',
          };
        })
        .filter(u => !filter || u.nome.toLowerCase().includes(filter.toLowerCase()));

      return { users };
    },

    // === LISTAGENS ===

    async sei_list_document_types() {
      const menuIncluir = getByRole(LOCATORS.process.menuIncluir);
      if (menuIncluir) {
        menuIncluir.click();
        await delay(2000);
      }

      const typeSelect = getByRole(LOCATORS.document.typeSelect);
      if (!typeSelect) {
        return { types: [] };
      }

      const types = Array.from(typeSelect.options || [])
        .filter(o => o.value)
        .map(o => ({
          id: o.value,
          name: o.text.trim(),
        }));

      return { types };
    },

    async sei_list_legal_hypotheses() {
      const nivelRestrito = getByRole(LOCATORS.document.nivelAcesso.restrito);
      if (nivelRestrito) {
        nivelRestrito.click();
        await delay(500);
      }

      const hipSelect = getByRole(LOCATORS.document.hipoteseLegal);
      if (!hipSelect) {
        return { hypotheses: [] };
      }

      const hypotheses = Array.from(hipSelect.options || [])
        .filter(o => o.value)
        .map(o => ({
          id: o.value,
          name: o.text.trim(),
        }));

      const nivelPublico = getByRole(LOCATORS.document.nivelAcesso.publico);
      if (nivelPublico) nivelPublico.click();

      return { hypotheses };
    },

    async sei_list_units({ search = '' }) {
      const forwardBtn = getByRole(LOCATORS.process.menuTramitar);
      if (forwardBtn) {
        forwardBtn.click();
        await delay(2000);
      }

      const unitInput = getByRole(LOCATORS.forward.unitSearch);
      if (unitInput && search) {
        unitInput.value = search;
        unitInput.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(1500);
      }

      const suggestions = getAllByRole(LOCATORS.autocomplete.item);
      const units = suggestions.map(el => ({
        name: el.textContent?.trim() || '',
        value: el.dataset?.value || el.textContent?.trim() || '',
      }));

      return { units };
    },

    async sei_list_processes({ status = 'recebidos', limit = 50 }) {
      const controlLink = getByRole({ role: 'link', name: /controle.*processos/i, fallback: 'a[href*="procedimento_controlar"]' });
      if (controlLink) {
        controlLink.click();
        await delay(2000);
      }

      const rows = getAllByRole({ role: 'row', fallback: '#tblProcessos tbody tr, .processo-item' });
      const processes = rows.slice(0, limit).map(row => {
        const cells = row.querySelectorAll('td');
        const link = row.querySelector('a');
        return {
          number: cells[0]?.textContent?.trim() || link?.textContent?.trim() || '',
          type: cells[1]?.textContent?.trim() || '',
          date: cells[2]?.textContent?.trim() || '',
          annotation: cells[3]?.textContent?.trim() || '',
          href: link?.href || '',
        };
      });

      return { processes, total: rows.length };
    },

    // === DOWNLOAD ===

    async sei_download_process({ process_number, include_attachments = true }) {
      if (process_number) {
        await actions.sei_open_process({ process_number });
        await delay(1000);
      }

      const pdfBtn = getByRole(LOCATORS.process.menuPDF);
      if (pdfBtn) {
        pdfBtn.click();
        await delay(2000);
      }

      if (include_attachments) {
        const attachCheck = getByRole({ role: 'checkbox', name: /anexo/i, fallback: '#chkAnexos' });
        if (attachCheck) {
          attachCheck.checked = true;
        }
      }

      const generateBtn = getByRole({ role: 'button', name: /gerar/i, fallback: '#btnGerar' });
      if (generateBtn) {
        generateBtn.click();
        await delay(3000);
      }

      return {
        success: true,
        message: 'PDF gerado. O download deve iniciar automaticamente.',
      };
    },

    // === CAPTURA DE TELA ===

    async sei_screenshot({ selector, full_page = false }) {
      return {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        html: document.documentElement.outerHTML.substring(0, 50000),
        note: 'Para screenshot visual, use html2canvas ou extensão dedicada',
      };
    },

    async sei_snapshot({ include_hidden = false }) {
      function buildTree(element, depth = 0) {
        if (!element || depth > 10) return null;

        const style = window.getComputedStyle(element);
        const isHidden = style.display === 'none' || style.visibility === 'hidden';

        if (isHidden && !include_hidden) return null;

        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const label = getAccessibleName(element);

        const node = {
          role,
          name: label.substring(0, 100),
        };

        if (element.id) node.id = element.id;
        if (element.href) node.href = element.href;
        if (element.value && element.type !== 'password') node.value = element.value;
        if (element.checked !== undefined) node.checked = element.checked;
        if (element.disabled) node.disabled = true;

        const children = Array.from(element.children)
          .map(child => buildTree(child, depth + 1))
          .filter(Boolean);

        if (children.length > 0) {
          node.children = children;
        }

        return node;
      }

      const tree = buildTree(document.body);

      return {
        url: window.location.href,
        title: document.title,
        tree,
      };
    },

    // === NAVEGAÇÃO ===

    async sei_navigate({ url }) {
      window.location.href = url;
      await delay(2000);
      return { success: true, url: window.location.href };
    },

    async sei_click({ selector, text }) {
      let el = null;

      if (text) {
        // Buscar por texto usando locator semântico
        el = getByRole({ role: 'button', name: new RegExp(text, 'i') }) ||
             getByRole({ role: 'link', name: new RegExp(text, 'i') });
      }

      if (!el && selector) {
        el = document.querySelector(selector);
      }

      if (el) {
        el.click();
        await delay(1000);
        return { success: true, clicked: text || selector };
      }
      throw new Error(`Elemento não encontrado: ${selector || text}`);
    },

    async sei_fill({ selector, value }) {
      const el = document.querySelector(selector);
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      throw new Error(`Campo não encontrado: ${selector}`);
    },

    async sei_select({ selector, value, by = 'text' }) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Select não encontrado: ${selector}`);

      if (by === 'text') {
        selectOptionByText(el, value);
      } else {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { success: true };
    },
  };

  // ============================================================
  // LISTENER DE MENSAGENS
  // ============================================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[SEI-MCP] Received message:', message);

    if (message.type === 'execute') {
      const { action, params } = message;

      if (actions[action]) {
        actions[action](params || {})
          .then(result => {
            console.log('[SEI-MCP] Action result:', result);
            sendResponse({ success: true, data: result });
          })
          .catch(error => {
            console.error('[SEI-MCP] Action error:', error);
            sendResponse({ success: false, error: { message: error.message } });
          });

        return true; // Indica resposta assíncrona
      } else {
        sendResponse({ success: false, error: { message: `Ação desconhecida: ${action}` } });
      }
    }

    return false;
  });

  // Notificar mudança de página
  window.addEventListener('load', () => {
    chrome.runtime.sendMessage({
      type: 'pageChanged',
      data: {
        url: window.location.href,
        title: document.title,
        processNumber: getCurrentProcessNumber(),
        loggedIn: isLoggedIn(),
      },
    }).catch(() => {});
  });

  // Expor função para verificação
  window.seiMcpBridgeLoaded = true;

  console.log('[SEI-MCP] Bridge fully loaded with ARIA semantic locators,', Object.keys(actions).length, 'actions');
})();
