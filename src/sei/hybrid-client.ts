/**
 * Cliente Híbrido SEI
 *
 * Combina três métodos de integração:
 * 1. API SOAP (nativa) - Para operações críticas quando disponível
 * 2. API REST (mod-wssei) - Quando o módulo está instalado
 * 3. DOM via Extensão Chrome - Fallback universal
 *
 * Prioridade: REST > SOAP > DOM
 */

import { logger } from '../utils/logger.js';
import { SeiSoapClient, type SeiSoapConfig } from './soap-client.js';
import type { SeiWebSocketServer } from '../websocket/server.js';

export interface SeiHybridConfig {
  // URL base do SEI
  baseUrl: string;

  // Credenciais para API (SOAP/REST)
  apiKey?: string;           // Chave de acesso para SOAP
  jwtToken?: string;         // Token JWT para REST (mod-wssei)

  // Identificação do sistema externo
  siglaSistema?: string;
  siglaUnidade?: string;

  // Preferências
  preferApi: boolean;        // Preferir API quando disponível
  fallbackToDom: boolean;    // Usar DOM se API falhar
}

export interface UploadDocumentParams {
  processNumber: string;
  fileContent: Buffer | string;  // Buffer ou Base64
  fileName: string;
  mimeType: string;
  documentType: string;
  description?: string;
  nivelAcesso: 'publico' | 'restrito' | 'sigiloso';
  hipoteseLegal?: string;
  preserveFormatting: boolean;   // Manter formatação original
}

export class SeiHybridClient {
  private soapClient: SeiSoapClient | null = null;
  private restBaseUrl: string | null = null;
  private wsServer: SeiWebSocketServer;
  private config: SeiHybridConfig;

  constructor(config: SeiHybridConfig, wsServer: SeiWebSocketServer) {
    this.config = config;
    this.wsServer = wsServer;

    // Inicializar cliente SOAP se tiver chave de acesso
    if (config.apiKey) {
      this.soapClient = new SeiSoapClient({
        baseUrl: config.baseUrl,
        identificacao: config.apiKey,
        siglaOrgao: config.siglaUnidade,
      });
      logger.info('SOAP client initialized');
    }

    // Configurar REST se tiver token
    if (config.jwtToken) {
      this.restBaseUrl = `${config.baseUrl}/api/v1`;
      logger.info('REST client configured');
    }
  }

  /**
   * Verifica qual método de integração está disponível
   */
  async checkAvailability(): Promise<{
    soap: boolean;
    rest: boolean;
    dom: boolean;
  }> {
    const result = { soap: false, rest: false, dom: false };

    // Verificar SOAP
    if (this.soapClient) {
      try {
        await this.soapClient.listarTiposDocumento();
        result.soap = true;
      } catch {
        logger.warn('SOAP API not available');
      }
    }

    // Verificar REST
    if (this.restBaseUrl && this.config.jwtToken) {
      try {
        const response = await fetch(`${this.restBaseUrl}/versao`, {
          headers: { 'Authorization': `Bearer ${this.config.jwtToken}` },
        });
        result.rest = response.ok;
      } catch {
        logger.warn('REST API not available');
      }
    }

    // Verificar DOM (extensão conectada)
    result.dom = this.wsServer.isConnected();

    logger.info('Availability check', result);
    return result;
  }

  /**
   * Upload de documento preservando formatação
   *
   * IMPORTANTE: Para manter a formatação do Word/PDF:
   * - O arquivo é enviado em Base64 como documento EXTERNO
   * - O SEI armazena o arquivo original
   * - NÃO é convertido para o editor do SEI
   */
  async uploadDocument(params: UploadDocumentParams): Promise<{ id: string; numero: string }> {
    const {
      processNumber,
      fileContent,
      fileName,
      mimeType,
      documentType,
      description,
      nivelAcesso,
      hipoteseLegal,
      preserveFormatting,
    } = params;

    // Converter para Base64 se for Buffer
    const base64Content = Buffer.isBuffer(fileContent)
      ? fileContent.toString('base64')
      : fileContent;

    // Tentar via API primeiro (se configurada e preferir)
    if (this.config.preferApi) {
      // Tentar REST
      if (this.restBaseUrl && this.config.jwtToken) {
        try {
          return await this.uploadViaRest(params, base64Content);
        } catch (error) {
          logger.warn('REST upload failed, trying SOAP', { error });
        }
      }

      // Tentar SOAP
      if (this.soapClient) {
        try {
          return await this.uploadViaSoap(params, base64Content);
        } catch (error) {
          logger.warn('SOAP upload failed, trying DOM', { error });
        }
      }
    }

    // Fallback para DOM (via extensão)
    if (this.config.fallbackToDom || !this.config.preferApi) {
      return await this.uploadViaDom(params, base64Content);
    }

    throw new Error('Nenhum método de upload disponível');
  }

  /**
   * Upload via API REST (mod-wssei)
   */
  private async uploadViaRest(
    params: UploadDocumentParams,
    base64Content: string
  ): Promise<{ id: string; numero: string }> {
    if (!this.restBaseUrl || !this.config.jwtToken) {
      throw new Error('REST API not configured');
    }

    const response = await fetch(`${this.restBaseUrl}/documento/externo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocoloProcedimento: params.processNumber,
        idTipoDocumento: params.documentType,
        descricao: params.description || params.fileName,
        nomeArquivo: params.fileName,
        conteudo: base64Content,
        nivelAcesso: params.nivelAcesso === 'publico' ? 0 : params.nivelAcesso === 'restrito' ? 1 : 2,
        idHipoteseLegal: params.hipoteseLegal,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`REST API error: ${error}`);
    }

    const result = await response.json() as { idDocumento?: string; id?: string; protocoloDocumento?: string; numero?: string };
    return {
      id: result.idDocumento || result.id || '',
      numero: result.protocoloDocumento || result.numero || '',
    };
  }

  /**
   * Upload via API SOAP
   */
  private async uploadViaSoap(
    params: UploadDocumentParams,
    base64Content: string
  ): Promise<{ id: string; numero: string }> {
    if (!this.soapClient) {
      throw new Error('SOAP client not configured');
    }

    return await this.soapClient.incluirDocumento({
      ProtocoloProcedimento: params.processNumber,
      IdTipoDocumento: params.documentType,
      NomeArquivo: params.fileName,
      Conteudo: base64Content,
      Descricao: params.description,
      NivelAcesso: params.nivelAcesso,
      IdHipoteseLegal: params.hipoteseLegal,
    });
  }

  /**
   * Upload via DOM (extensão Chrome)
   *
   * Este método simula o upload manual do usuário:
   * 1. Navega para incluir documento externo
   * 2. Preenche o formulário
   * 3. Faz upload do arquivo via input[type=file]
   */
  private async uploadViaDom(
    params: UploadDocumentParams,
    base64Content: string
  ): Promise<{ id: string; numero: string }> {
    if (!this.wsServer.isConnected()) {
      throw new Error('Chrome extension not connected');
    }

    // Enviar comando para extensão
    const response = await this.wsServer.sendCommand('sei_upload_document', {
      process_number: params.processNumber,
      file_name: params.fileName,
      file_content_base64: base64Content,
      mime_type: params.mimeType,
      document_type: params.documentType,
      description: params.description,
      nivel_acesso: params.nivelAcesso,
      hipotese_legal: params.hipoteseLegal,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'DOM upload failed');
    }

    const data = response.data as { id?: string; numero?: string };
    return {
      id: data.id || '',
      numero: data.numero || '',
    };
  }

  /**
   * Executa operação usando o melhor método disponível
   */
  async execute(operation: string, params: Record<string, unknown>): Promise<unknown> {
    const availability = await this.checkAvailability();

    // Operações que funcionam melhor via API
    const apiPreferredOps = [
      'incluirDocumento', 'gerarProcedimento', 'consultarProcedimento',
      'consultarDocumento', 'listarAndamentos', 'enviarProcesso',
    ];

    // Operações que só funcionam via DOM
    const domOnlyOps = [
      'screenshot', 'snapshot', 'click', 'type', 'select',
      'sign_document', 'sign_block',
    ];

    const isApiPreferred = apiPreferredOps.includes(operation);
    const isDomOnly = domOnlyOps.includes(operation);

    // Determinar método
    if (isDomOnly) {
      if (!availability.dom) {
        throw new Error(`Operation ${operation} requires Chrome extension`);
      }
      return this.executeViaDom(operation, params);
    }

    if (this.config.preferApi && isApiPreferred) {
      // Tentar REST
      if (availability.rest) {
        try {
          return await this.executeViaRest(operation, params);
        } catch (error) {
          logger.warn(`REST failed for ${operation}`, { error });
        }
      }

      // Tentar SOAP
      if (availability.soap) {
        try {
          return await this.executeViaSoap(operation, params);
        } catch (error) {
          logger.warn(`SOAP failed for ${operation}`, { error });
        }
      }
    }

    // Fallback para DOM
    if (availability.dom) {
      return this.executeViaDom(operation, params);
    }

    throw new Error(`No method available for operation: ${operation}`);
  }

  private async executeViaRest(operation: string, params: Record<string, unknown>): Promise<unknown> {
    // Implementar chamadas REST específicas
    throw new Error('REST operation not implemented: ' + operation);
  }

  private async executeViaSoap(operation: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.soapClient) throw new Error('SOAP not configured');
    return this.soapClient.call(operation, params);
  }

  private async executeViaDom(operation: string, params: Record<string, unknown>): Promise<unknown> {
    const response = await this.wsServer.sendCommand(operation, params);
    if (!response.success) {
      throw new Error(response.error?.message || 'DOM operation failed');
    }
    return response.data;
  }
}

/**
 * Detecta tipo MIME a partir do nome do arquivo
 */
export function detectMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf',
    html: 'text/html',
    htm: 'text/html',
    xml: 'application/xml',
    json: 'application/json',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Valida se o arquivo é suportado pelo SEI
 *
 * Conforme padrões ePING e recomendações do SEI:
 * - Preferir formatos abertos (PDF-A, ODF)
 * - Evitar formatos proprietários quando possível
 */
export function validateFileFormat(fileName: string): {
  valid: boolean;
  warning?: string;
  recommended?: string;
} {
  const ext = fileName.toLowerCase().split('.').pop();

  // Formatos recomendados
  const recommended = ['pdf', 'odt', 'ods', 'odp', 'xml', 'txt', 'html'];

  // Formatos aceitos mas não recomendados
  const accepted = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf'];

  // Formatos de imagem aceitos
  const images = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif'];

  if (recommended.includes(ext || '')) {
    return { valid: true };
  }

  if (accepted.includes(ext || '')) {
    return {
      valid: true,
      warning: `Formato proprietário detectado (.${ext}). Considere converter para PDF-A.`,
      recommended: 'pdf',
    };
  }

  if (images.includes(ext || '')) {
    return { valid: true };
  }

  return {
    valid: false,
    warning: `Formato .${ext} pode não ser aceito pelo SEI`,
  };
}
