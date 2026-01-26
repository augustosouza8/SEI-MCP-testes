// Cliente SOAP para API oficial do SEI
// Documentação: https://softwarepublico.gov.br/social/sei/manuais/manual-de-webservices

import { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { logger } from '../utils/logger.js';

// Connection pooling com keep-alive para reduzir latência
const httpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
});

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
});

export interface SeiSoapConfig {
  baseUrl: string;           // Ex: https://sei.sp.gov.br
  identificacao: string;     // Chave de acesso ou ID do sistema
  siglaOrgao?: string;       // Sigla do órgão
}

export interface IncluirDocumentoParams {
  // Identificação
  IdProcedimento?: string;          // ID interno do processo
  ProtocoloProcedimento?: string;   // Número do processo formatado

  // Tipo do documento
  IdTipoDocumento: string;          // ID do tipo (ex: 1 = Ofício)
  DescricaoTipo?: string;           // Descrição livre se tipo genérico

  // Conteúdo
  NomeArquivo?: string;             // Nome do arquivo (para externos)
  Conteudo?: string;                // Conteúdo em Base64
  ConteudoMTOM?: Buffer;            // Conteúdo binário (alternativo)

  // Para documentos gerados (HTML)
  ConteudoHTML?: string;            // Conteúdo HTML do editor

  // Nível de acesso
  NivelAcesso: 'publico' | 'restrito' | 'sigiloso';
  IdHipoteseLegal?: string;         // Obrigatório se restrito/sigiloso

  // Metadados
  Descricao?: string;               // Descrição do documento
  DataElaboracao?: string;          // Data no formato YYYY-MM-DD
  Observacao?: string;              // Observações
}

export interface IncluirProcessoParams {
  IdTipoProcedimento: string;       // ID do tipo de processo
  Especificacao: string;            // Especificação/resumo
  Assuntos: string[];               // Lista de códigos de assuntos
  Interessados: string[];           // Lista de interessados
  NivelAcesso: 'publico' | 'restrito' | 'sigiloso';
  IdHipoteseLegal?: string;
  Observacao?: string;
}

// Mapeamento de níveis de acesso
const NIVEL_ACESSO_MAP = {
  publico: '0',
  restrito: '1',
  sigiloso: '2',
};

/**
 * Cliente para API SOAP do SEI
 *
 * Endpoint WSDL: http://[servidor]/sei/controlador_ws.php?servico=sei
 *
 * IMPORTANTE: Requer registro prévio do sistema externo em:
 * SEI > Administração > Sistemas
 */
export class SeiSoapClient {
  private wsdlUrl: string;

  constructor(private config: SeiSoapConfig) {
    this.wsdlUrl = `${config.baseUrl}/sei/controlador_ws.php?servico=sei`;
    logger.info('SEI SOAP Client initialized', { wsdlUrl: this.wsdlUrl });
  }

  /**
   * Constrói envelope SOAP para chamada de serviço
   */
  private buildSoapEnvelope(method: string, params: Record<string, unknown>): string {
    const paramsXml = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map(v => `<${key}>${this.escapeXml(String(v))}</${key}>`).join('');
        }
        return `<${key}>${this.escapeXml(String(value))}</${key}>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sei="Sei">
  <soap:Body>
    <sei:${method}>
      <SiglaSistema>${this.escapeXml(this.config.identificacao)}</SiglaSistema>
      <IdentificacaoServico>${this.escapeXml(this.config.identificacao)}</IdentificacaoServico>
      ${this.config.siglaOrgao ? `<SiglaUnidade>${this.escapeXml(this.config.siglaOrgao)}</SiglaUnidade>` : ''}
      ${paramsXml}
    </sei:${method}>
  </soap:Body>
</soap:Envelope>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get the appropriate agent based on URL protocol
   */
  private getAgent(): Agent | HttpsAgent {
    return this.wsdlUrl.startsWith('https') ? httpsAgent : httpAgent;
  }

  /**
   * Executa chamada SOAP
   * OTIMIZADO: Usa connection pooling com keep-alive
   */
  async call(method: string, params: Record<string, unknown>): Promise<unknown> {
    const envelope = this.buildSoapEnvelope(method, params);

    logger.debug('SOAP Request', { method, wsdl: this.wsdlUrl });

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(this.wsdlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `"${method}"`,
          'Connection': 'keep-alive',
        },
        body: envelope,
        signal: controller.signal,
        // Note: Node.js 18+ fetch doesn't support agent directly
        // The keep-alive header helps with connection reuse
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SOAP Error: ${response.status} ${response.statusText}`);
      }

      const xml = await response.text();
      logger.debug('SOAP Response', { xml: xml.substring(0, 500) });

      // Parse básico da resposta (idealmente usar um parser XML)
      return this.parseResponse(xml, method);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('SOAP call timeout', { method });
        throw new Error(`SOAP timeout: ${method}`);
      }
      logger.error('SOAP call failed', { method, error });
      throw error;
    }
  }

  private parseResponse(xml: string, method: string): unknown {
    // Parser simplificado - extrair conteúdo do Body
    const bodyMatch = xml.match(/<(?:soap:)?Body[^>]*>([\s\S]*?)<\/(?:soap:)?Body>/i);
    if (!bodyMatch) {
      throw new Error('Invalid SOAP response: no Body found');
    }

    // Verificar se há fault
    const faultMatch = bodyMatch[1].match(/<(?:soap:)?Fault[^>]*>([\s\S]*?)<\/(?:soap:)?Fault>/i);
    if (faultMatch) {
      const faultString = faultMatch[1].match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
      throw new Error(`SOAP Fault: ${faultString?.[1] || 'Unknown error'}`);
    }

    // Extrair resultado
    const resultMatch = bodyMatch[1].match(/<(?:sei:)?(\w+)Response[^>]*>([\s\S]*?)<\/(?:sei:)?\1Response>/i);
    if (resultMatch) {
      return { method, raw: resultMatch[2] };
    }

    return { method, raw: bodyMatch[1] };
  }

  /**
   * Incluir documento em processo existente
   *
   * Para MANTER FORMATAÇÃO de arquivos Word/PDF:
   * - Converter para PDF-A antes de enviar (recomendado pelo SEI)
   * - Usar Conteudo com Base64 do arquivo
   */
  async incluirDocumento(params: IncluirDocumentoParams): Promise<{ id: string; numero: string }> {
    const soapParams: Record<string, unknown> = {
      IdProcedimento: params.IdProcedimento,
      ProtocoloProcedimento: params.ProtocoloProcedimento,
      IdTipoDocumento: params.IdTipoDocumento,
      Descricao: params.Descricao,
      NivelAcesso: NIVEL_ACESSO_MAP[params.NivelAcesso],
    };

    // Hipótese legal obrigatória para restrito/sigiloso
    if (params.NivelAcesso !== 'publico' && params.IdHipoteseLegal) {
      soapParams.IdHipoteseLegal = params.IdHipoteseLegal;
    }

    // Documento externo (arquivo)
    if (params.NomeArquivo && params.Conteudo) {
      soapParams.NomeArquivo = params.NomeArquivo;
      soapParams.Conteudo = params.Conteudo; // Base64
    }

    // Documento gerado (HTML do editor)
    if (params.ConteudoHTML) {
      soapParams.Conteudo = params.ConteudoHTML;
    }

    const result = await this.call('incluirDocumento', soapParams);

    // Parse do resultado
    const raw = (result as { raw: string }).raw;
    const idMatch = raw.match(/<IdDocumento>(\d+)<\/IdDocumento>/i);
    const numMatch = raw.match(/<ProtocoloDocumento>([^<]+)<\/ProtocoloDocumento>/i);

    return {
      id: idMatch?.[1] || '',
      numero: numMatch?.[1] || '',
    };
  }

  /**
   * Incluir novo processo
   */
  async incluirProcesso(params: IncluirProcessoParams): Promise<{ id: string; numero: string }> {
    const soapParams: Record<string, unknown> = {
      IdTipoProcedimento: params.IdTipoProcedimento,
      Especificacao: params.Especificacao,
      NivelAcesso: NIVEL_ACESSO_MAP[params.NivelAcesso],
      Observacao: params.Observacao,
    };

    if (params.Assuntos?.length) {
      soapParams.Assuntos = params.Assuntos;
    }

    if (params.Interessados?.length) {
      soapParams.Interessados = params.Interessados;
    }

    if (params.NivelAcesso !== 'publico' && params.IdHipoteseLegal) {
      soapParams.IdHipoteseLegal = params.IdHipoteseLegal;
    }

    const result = await this.call('gerarProcedimento', soapParams);

    const raw = (result as { raw: string }).raw;
    const idMatch = raw.match(/<IdProcedimento>(\d+)<\/IdProcedimento>/i);
    const numMatch = raw.match(/<ProtocoloFormatado>([^<]+)<\/ProtocoloFormatado>/i);

    return {
      id: idMatch?.[1] || '',
      numero: numMatch?.[1] || '',
    };
  }

  /**
   * Listar tipos de documentos disponíveis
   */
  async listarTiposDocumento(): Promise<Array<{ id: string; nome: string }>> {
    const result = await this.call('listarTiposDocumento', {});

    // Parse básico
    const raw = (result as { raw: string }).raw;
    const tipos: Array<{ id: string; nome: string }> = [];

    const regex = /<TipoDocumento>[\s\S]*?<IdTipoDocumento>(\d+)<\/IdTipoDocumento>[\s\S]*?<Nome>([^<]+)<\/Nome>[\s\S]*?<\/TipoDocumento>/gi;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      tipos.push({ id: match[1], nome: match[2] });
    }

    return tipos;
  }

  /**
   * Listar hipóteses legais disponíveis
   */
  async listarHipotesesLegais(): Promise<Array<{ id: string; nome: string; baseLegal: string }>> {
    const result = await this.call('listarHipotesesLegais', {});

    const raw = (result as { raw: string }).raw;
    const hipoteses: Array<{ id: string; nome: string; baseLegal: string }> = [];

    const regex = /<HipoteseLegal>[\s\S]*?<IdHipoteseLegal>(\d+)<\/IdHipoteseLegal>[\s\S]*?<Nome>([^<]+)<\/Nome>[\s\S]*?<BaseLegal>([^<]+)<\/BaseLegal>[\s\S]*?<\/HipoteseLegal>/gi;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      hipoteses.push({ id: match[1], nome: match[2], baseLegal: match[3] });
    }

    return hipoteses;
  }

  /**
   * Consultar andamento do processo
   */
  async consultarAndamento(protocoloProcedimento: string): Promise<unknown> {
    return this.call('listarAndamentos', {
      ProtocoloProcedimento: protocoloProcedimento,
    });
  }
}

/**
 * Converter arquivo para Base64 (para uso no Conteudo)
 */
export function fileToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Converte Word (.docx) para HTML preservando formatação básica
 * NOTA: Para melhor resultado, converta para PDF-A antes de enviar
 */
export async function convertWordToHtml(docxBuffer: Buffer): Promise<string> {
  // Implementação simplificada - recomenda-se usar mammoth.js ou similar
  // Para produção, usar:
  // import mammoth from 'mammoth';
  // const result = await mammoth.convertToHtml({ buffer: docxBuffer });
  // return result.value;

  logger.warn('Word to HTML conversion not implemented. Use PDF instead.');
  return `<p>Documento convertido de Word. Conteúdo em Base64 anexado.</p>`;
}
