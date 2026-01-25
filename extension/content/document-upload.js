// SEI-MCP - Módulo de Upload de Documentos
// Preserva formatação original dos arquivos
//
// REFATORADO: Usa locators semânticos ARIA em vez de seletores CSS

(function() {
  'use strict';

  // ============================================================
  // LOCATORS SEMÂNTICOS (ARIA)
  // ============================================================

  const UPLOAD_LOCATORS = {
    // Navegação para incluir documento
    menuIncluirDocumento: { role: 'link', name: /incluir.*documento/i, fallback: 'a[href*="documento_escolher_tipo"]' },
    tipoDocumentoExterno: { role: 'link', name: /externo/i, fallback: 'a[href*="documento_externo"]' },

    // Formulário de documento externo
    form: { role: 'form', name: /documento.*externo/i, fallback: '#frmDocumentoExternoGerar' },
    tipoSelect: { role: 'combobox', name: /tipo.*documento/i, fallback: '#selTipoDocumento' },
    dataDocumento: { role: 'textbox', name: /data/i, fallback: '#txtDataElaboracao' },
    numeroDocumento: { role: 'textbox', name: /número/i, fallback: '#txtNumero' },
    nomeArvore: { role: 'textbox', name: /nome.*árvore/i, fallback: '#txtNomeArvore' },

    // Formato e conferência
    formatoNato: { role: 'radio', name: /nato.*digital|nascido.*digital/i, fallback: 'input[value="N"]' },
    formatoDigitalizado: { role: 'radio', name: /digitalizado/i, fallback: 'input[value="D"]' },
    conferenciaCopiaAutenticada: { role: 'radio', name: /cópia.*autenticada/i, fallback: '#optCopiaAutenticada' },
    conferenciaCopiaSimples: { role: 'radio', name: /cópia.*simples/i, fallback: '#optCopiaSimples' },
    conferenciaOriginal: { role: 'radio', name: /documento.*original/i, fallback: '#optDocumentoOriginal' },

    // Nível de acesso
    nivelPublico: { role: 'radio', name: /público/i, fallback: '#optPublico, input[name="StaNivelAcesso"][value="0"]' },
    nivelRestrito: { role: 'radio', name: /restrito/i, fallback: '#optRestrito, input[name="StaNivelAcesso"][value="1"]' },
    nivelSigiloso: { role: 'radio', name: /sigiloso/i, fallback: '#optSigiloso, input[name="StaNivelAcesso"][value="2"]' },
    hipoteseLegal: { role: 'combobox', name: /hipótese.*legal/i, fallback: '#selHipoteseLegal' },

    // Upload de arquivo (input[type=file] não tem role ARIA)
    fileInput: { fallback: '#filArquivo, input[type="file"][name="filArquivo"]' },
    anexarBtn: { role: 'button', name: /anexar/i, fallback: '#btnAnexar' },

    // Observações
    observacao: { role: 'textbox', name: /observaç/i, fallback: '#txaObservacoes' },

    // Submit
    submitBtn: { role: 'button', name: /salvar|confirmar|gerar/i, fallback: '#btnSalvar' },

    // Mensagens
    success: { role: 'alert', fallback: '.infraMensagem, .sucesso' },
    error: { role: 'alert', fallback: '.infraExcecao, .erro' },
  };

  // ============================================================
  // FUNÇÕES DE LOCATOR SEMÂNTICO
  // ============================================================

  /**
   * Obtém o nome acessível de um elemento
   */
  function getAccessibleName(el) {
    if (!el) return '';

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent?.trim() || '';
    }

    const title = el.getAttribute('title');
    if (title) return title;

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    if (el.labels && el.labels.length > 0) {
      return el.labels[0].textContent?.trim() || '';
    }

    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
      return el.value || '';
    }

    return el.textContent?.trim() || '';
  }

  /**
   * Verifica se o nome corresponde ao padrão
   */
  function matchesName(accessibleName, pattern) {
    if (!accessibleName || !pattern) return false;
    if (pattern instanceof RegExp) return pattern.test(accessibleName);
    return accessibleName.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Encontra elemento usando locator semântico ARIA
   */
  function getByRole(locator) {
    if (!locator) return null;

    if (typeof locator === 'string') {
      return document.querySelector(locator);
    }

    const { role, name, fallback } = locator;

    const roleToElements = {
      button: 'button, input[type="button"], input[type="submit"], [role="button"]',
      textbox: 'input[type="text"], input[type="password"], input[type="search"], textarea, [role="textbox"]',
      combobox: 'select, input[list], [role="combobox"]',
      checkbox: 'input[type="checkbox"], [role="checkbox"]',
      radio: 'input[type="radio"], [role="radio"]',
      link: 'a[href], [role="link"]',
      form: 'form, [role="form"]',
      alert: '[role="alert"], .erro, .infraExcecao, .infraMensagem',
    };

    const baseSelector = roleToElements[role];

    if (baseSelector) {
      const elements = document.querySelectorAll(baseSelector);

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
   * Converte Base64 para Blob/File
   */
  function base64ToFile(base64, fileName, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
  }

  /**
   * Simula seleção de arquivo no input file
   */
  function setFileInput(input, file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    // Disparar eventos
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Aguarda elemento aparecer (usando locator semântico)
   */
  function waitForElement(locator, timeout = 10000) {
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
        reject(new Error(`Timeout: ${desc}`));
      }, timeout);
    });
  }

  /**
   * Delay
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Seleciona opção em select por texto parcial
   */
  function selectOptionByText(selectEl, text) {
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
   * Upload de documento externo preservando formatação
   */
  async function uploadDocumentoExterno(params) {
    const {
      file_name,
      file_content_base64,
      mime_type,
      document_type,
      description,
      data_documento,
      nivel_acesso = 'publico',
      hipotese_legal,
      formato = 'nato_digital',
      conferencia,
      observacao,
    } = params;

    console.log('[SEI-MCP] Iniciando upload de documento externo:', file_name);

    // 1. Navegar para incluir documento (se não estiver na página)
    if (!getByRole(UPLOAD_LOCATORS.form)) {
      const menuBtn = getByRole(UPLOAD_LOCATORS.menuIncluirDocumento);
      if (menuBtn) {
        menuBtn.click();
        await delay(2000);
      }

      // Selecionar tipo "Externo"
      const externoBtn = getByRole(UPLOAD_LOCATORS.tipoDocumentoExterno);
      if (externoBtn) {
        externoBtn.click();
        await delay(2000);
      }
    }

    // 2. Aguardar formulário
    await waitForElement(UPLOAD_LOCATORS.form);
    await delay(500);

    // 3. Selecionar tipo de documento
    const tipoSelect = getByRole(UPLOAD_LOCATORS.tipoSelect);
    if (tipoSelect && document_type) {
      selectOptionByText(tipoSelect, document_type);
      await delay(500);
    }

    // 4. Data do documento
    if (data_documento) {
      const dataInput = getByRole(UPLOAD_LOCATORS.dataDocumento);
      if (dataInput) {
        dataInput.value = data_documento;
      }
    }

    // 5. Número/Nome na árvore
    if (description) {
      const nomeInput = getByRole(UPLOAD_LOCATORS.nomeArvore);
      if (nomeInput) {
        nomeInput.value = description;
      }
    }

    // 6. Formato (nato-digital ou digitalizado)
    if (formato === 'nato_digital') {
      const natoRadio = getByRole(UPLOAD_LOCATORS.formatoNato);
      if (natoRadio) natoRadio.click();
    } else {
      const digRadio = getByRole(UPLOAD_LOCATORS.formatoDigitalizado);
      if (digRadio) digRadio.click();
    }
    await delay(300);

    // 7. Conferência (se digitalizado)
    if (formato === 'digitalizado' && conferencia) {
      const confMap = {
        'copia_autenticada': UPLOAD_LOCATORS.conferenciaCopiaAutenticada,
        'copia_simples': UPLOAD_LOCATORS.conferenciaCopiaSimples,
        'documento_original': UPLOAD_LOCATORS.conferenciaOriginal,
      };
      const confRadio = getByRole(confMap[conferencia]);
      if (confRadio) confRadio.click();
    }

    // 8. Nível de acesso
    const nivelMap = {
      'publico': UPLOAD_LOCATORS.nivelPublico,
      'restrito': UPLOAD_LOCATORS.nivelRestrito,
      'sigiloso': UPLOAD_LOCATORS.nivelSigiloso,
    };
    const nivelRadio = getByRole(nivelMap[nivel_acesso]);
    if (nivelRadio) {
      nivelRadio.click();
      await delay(300);
    }

    // 9. Hipótese legal (se não público)
    if (nivel_acesso !== 'publico' && hipotese_legal) {
      const hipSelect = getByRole(UPLOAD_LOCATORS.hipoteseLegal);
      if (hipSelect) {
        selectOptionByText(hipSelect, hipotese_legal);
      }
    }

    // 10. Upload do arquivo (PRESERVANDO FORMATAÇÃO)
    const fileInput = getByRole(UPLOAD_LOCATORS.fileInput);
    if (!fileInput) {
      throw new Error('Campo de upload não encontrado');
    }

    // Converter Base64 para File
    const file = base64ToFile(file_content_base64, file_name, mime_type);
    console.log('[SEI-MCP] Arquivo criado:', file.name, file.size, 'bytes');

    // Setar arquivo no input
    setFileInput(fileInput, file);
    await delay(1000);

    // Clicar em Anexar (se existir)
    const anexarBtn = getByRole(UPLOAD_LOCATORS.anexarBtn);
    if (anexarBtn) {
      anexarBtn.click();
      await delay(2000);
    }

    // 11. Observações
    if (observacao) {
      const obsInput = getByRole(UPLOAD_LOCATORS.observacao);
      if (obsInput) {
        obsInput.value = observacao;
      }
    }

    // 12. Salvar
    const saveBtn = getByRole(UPLOAD_LOCATORS.submitBtn);
    if (saveBtn) {
      saveBtn.click();
      await delay(3000);
    }

    // 13. Verificar resultado
    const errorEl = getByRole(UPLOAD_LOCATORS.error);
    if (errorEl && errorEl.textContent.trim()) {
      throw new Error(`Erro no upload: ${errorEl.textContent.trim()}`);
    }

    const successEl = getByRole(UPLOAD_LOCATORS.success);
    const successMsg = successEl?.textContent?.trim() || 'Documento incluído com sucesso';

    // Tentar extrair ID do documento
    const docId = extractDocumentId();

    return {
      success: true,
      message: successMsg,
      id: docId,
      fileName: file_name,
    };
  }

  /**
   * Extrai ID do documento da página/URL
   */
  function extractDocumentId() {
    // Tentar da URL
    const urlMatch = window.location.href.match(/id_documento=(\d+)/i);
    if (urlMatch) return urlMatch[1];

    // Tentar da mensagem de sucesso
    const msgEl = getByRole(UPLOAD_LOCATORS.success);
    if (msgEl) {
      const numMatch = msgEl.textContent.match(/documento\s+(\d+)/i);
      if (numMatch) return numMatch[1];
    }

    // Tentar do último item da árvore
    const treeItems = document.querySelectorAll('#divArvore a[href*="documento"]');
    if (treeItems.length > 0) {
      const lastItem = treeItems[treeItems.length - 1];
      const hrefMatch = lastItem.href.match(/id_documento=(\d+)/i);
      if (hrefMatch) return hrefMatch[1];
    }

    return null;
  }

  /**
   * Lista tipos de documentos disponíveis
   */
  async function listarTiposDocumento() {
    // Se estiver na página de novo documento
    let tipoSelect = getByRole(UPLOAD_LOCATORS.tipoSelect);

    // Se não, tentar navegar
    if (!tipoSelect) {
      const menuBtn = getByRole(UPLOAD_LOCATORS.menuIncluirDocumento);
      if (menuBtn) {
        menuBtn.click();
        await delay(2000);
      }
      tipoSelect = getByRole(UPLOAD_LOCATORS.tipoSelect);
    }

    if (!tipoSelect) {
      throw new Error('Select de tipos não encontrado');
    }

    const tipos = Array.from(tipoSelect.options || [])
      .filter(o => o.value)
      .map(o => ({
        id: o.value,
        nome: o.text.trim(),
      }));

    return { tipos };
  }

  /**
   * Lista hipóteses legais disponíveis
   */
  async function listarHipotesesLegais() {
    // Precisamos estar na página de documento com nível restrito/sigiloso
    const nivelRestrito = getByRole(UPLOAD_LOCATORS.nivelRestrito);
    if (nivelRestrito) {
      nivelRestrito.click();
      await delay(500);
    }

    const hipSelect = getByRole(UPLOAD_LOCATORS.hipoteseLegal);
    if (!hipSelect) {
      return { hipoteses: [] };
    }

    const hipoteses = Array.from(hipSelect.options || [])
      .filter(o => o.value)
      .map(o => ({
        id: o.value,
        nome: o.text.trim(),
      }));

    // Voltar para público
    const nivelPublico = getByRole(UPLOAD_LOCATORS.nivelPublico);
    if (nivelPublico) nivelPublico.click();

    return { hipoteses };
  }

  // Exportar funções para uso pelo sei-bridge.js
  window.seiMcpUpload = {
    uploadDocumentoExterno,
    listarTiposDocumento,
    listarHipotesesLegais,
    base64ToFile,
    setFileInput,
  };

  console.log('[SEI-MCP] Document upload module loaded with ARIA semantic locators');
})();
