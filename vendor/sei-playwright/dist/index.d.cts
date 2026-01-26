import { Page, BrowserContext, Browser } from 'playwright';
import { EventEmitter } from 'events';

/**
 * Tipos baseados na documentação SEI WebServices v4.0
 * Fonte: SEI-WebServices-v4.0-2.txt
 */
/** Nível de acesso do documento/processo */
type NivelAcesso = 0 | 1 | 2;
/** Tipo de documento */
type TipoDocumento = 'G' | 'R';
/** Andamento/histórico de um processo */
interface Andamento {
    IdAndamento: string;
    IdTarefa: string;
    IdTarefaModulo: string;
    Descricao: string;
    DataHora: string;
    Unidade: Unidade;
    Usuario: Usuario;
    Atributos?: AtributoAndamento[];
}
/** Atributo de andamento */
interface AtributoAndamento {
    Nome: string;
    Valor: string;
    IdOrigem?: string;
}
/** Documento do SEI */
interface Documento {
    Tipo: TipoDocumento;
    IdProcedimento?: string;
    IdSerie: string;
    Numero?: string;
    Data?: string;
    Descricao?: string;
    Remetente?: Remetente;
    Interessados?: Interessado[];
    Destinatarios?: Destinatario[];
    Observacao?: string;
    NomeArquivo?: string;
    Conteudo?: string;
    ConteudoMTOM?: string;
    IdArquivo?: string;
    NivelAcesso: NivelAcesso;
    IdHipoteseLegal?: string;
    IdTipoConferencia?: string;
    Campos?: Campo[];
}
/** Retorno da consulta de documento */
interface RetornoConsultaDocumento {
    IdProcedimento: string;
    ProcedimentoFormatado: string;
    IdDocumento: string;
    DocumentoFormatado: string;
    LinkAcesso: string;
    Serie: Serie;
    Numero?: string;
    Data: string;
    UnidadeElaboradora: Unidade;
    AndamentoGeracao: Andamento;
    Assinaturas?: Assinatura[];
    Campos?: Campo[];
}
/** Assinatura de documento */
interface Assinatura {
    Nome: string;
    CargoFuncao: string;
    DataHora: string;
    IdUsuario: string;
    IdOrigem: string;
    IdOrgao: string;
    Sigla: string;
}
/** Processo/Procedimento do SEI */
interface Procedimento {
    IdTipoProcedimento: string;
    Especificacao: string;
    Assuntos: Assunto[];
    Interessados?: Interessado[];
    Observacao?: string;
    NivelAcesso: NivelAcesso;
    IdHipoteseLegal?: string;
}
/** Retorno da consulta de procedimento */
interface RetornoConsultaProcedimento {
    IdProcedimento: string;
    ProcedimentoFormatado: string;
    Especificacao: string;
    DataAutuacao: string;
    LinkAcesso: string;
    TipoProcedimento: TipoProcedimento;
    AndamentoGeracao: Andamento;
    AndamentoConclusao?: Andamento;
    UltimoAndamento: Andamento;
    UnidadesProcedimentoAberto: Unidade[];
    Assuntos: Assunto[];
    Interessados: Interessado[];
    Observacoes?: Observacao[];
    ProcedimentosRelacionados?: ProcedimentoRelacionado[];
    ProcedimentosAnexados?: ProcedimentoAnexado[];
}
/** Retorno de geração de procedimento */
interface RetornoGerarProcedimento {
    IdProcedimento: string;
    ProcedimentoFormatado: string;
    LinkAcesso: string;
    RetornoInclusaoDocumentos?: RetornoInclusaoDocumento[];
}
/** Retorno de inclusão de documento */
interface RetornoInclusaoDocumento {
    IdDocumento: string;
    DocumentoFormatado: string;
    LinkAcesso: string;
}
/** Série/Tipo de documento */
interface Serie {
    IdSerie: string;
    Nome: string;
    Aplicabilidade?: 'T' | 'I' | 'E' | 'F';
}
/** Tipo de procedimento/processo */
interface TipoProcedimento {
    IdTipoProcedimento: string;
    Nome: string;
}
/** Unidade organizacional */
interface Unidade {
    IdUnidade: string;
    Sigla: string;
    Descricao: string;
}
/** Usuário do SEI */
interface Usuario {
    IdUsuario: string;
    Sigla: string;
    Nome: string;
}
/** Interessado do processo */
interface Interessado {
    Sigla: string;
    Nome: string;
}
/** Destinatário do documento */
interface Destinatario {
    Sigla: string;
    Nome: string;
}
/** Remetente do documento externo */
interface Remetente {
    Sigla: string;
    Nome: string;
}
/** Assunto do processo */
interface Assunto {
    CodigoEstruturado: string;
    Descricao?: string;
}
/** Campo de formulário */
interface Campo {
    Nome: string;
    Valor: string;
}
/** Observação do processo */
interface Observacao {
    Descricao: string;
    Unidade: Unidade;
}
/** Procedimento relacionado */
interface ProcedimentoRelacionado {
    IdProcedimento: string;
    ProcedimentoFormatado: string;
}
/** Procedimento anexado */
interface ProcedimentoAnexado {
    IdProcedimento: string;
    ProcedimentoFormatado: string;
}
/** Bloco de assinatura */
interface Bloco {
    IdBloco: string;
    Descricao: string;
    UnidadesDisponibilizacao?: Unidade[];
    Documentos?: DocumentoBloco[];
}
/** Documento em bloco de assinatura */
interface DocumentoBloco {
    IdProtocolo: string;
    ProtocoloFormatado: string;
}
/** Configuração do SEI Client */
interface SEIConfig {
    /** URL base do SEI (ex: https://sei.mg.gov.br) */
    baseUrl: string;
    /** Credenciais de autenticação via WebServices */
    soap?: {
        /** Sigla do sistema cadastrado no SEI */
        siglaSistema: string;
        /** Identificação do serviço */
        identificacaoServico: string;
    };
    /** Credenciais de autenticação via browser */
    browser?: {
        /** Usuário para login */
        usuario?: string;
        /** Senha para login */
        senha?: string;
        /** Órgão (se necessário) */
        orgao?: string;
    };
    /** Opções do Playwright */
    playwright?: {
        /** Executar em modo headless */
        headless?: boolean;
        /** Timeout padrão em ms */
        timeout?: number;
        /** Habilita persistent context - mantém sessão entre execuções */
        persistent?: boolean;
        /** Diretório para persistir sessão (default: ~/.sei-playwright/chrome-profile) */
        userDataDir?: string;
        /** Canal do navegador: 'chrome' usa Chrome instalado, 'chromium' usa Chromium do Playwright */
        channel?: 'chrome' | 'chromium' | 'msedge';
        /** Endpoint CDP para conectar a Chrome já aberto (ex: http://localhost:9222) */
        cdpEndpoint?: string;
        /** Porta para servidor CDP - permite reconexão futura */
        cdpPort?: number;
        /** Manter navegador aberto após close() - útil para sessões longas */
        keepAlive?: boolean;
    };
}
/** Opções para criação de processo */
interface CreateProcessOptions {
    tipoProcedimento: string;
    especificacao: string;
    assuntos: string[];
    interessados?: string[];
    observacao?: string;
    nivelAcesso?: NivelAcesso;
    hipoteseLegal?: string;
    documentos?: CreateDocumentOptions[];
}
/** Opções para criação de documento */
interface CreateDocumentOptions {
    tipo?: TipoDocumento;
    idSerie: string;
    numero?: string;
    descricao?: string;
    interessados?: string[];
    destinatarios?: string[];
    observacao?: string;
    nivelAcesso?: NivelAcesso;
    hipoteseLegal?: string;
    /** Para documento gerado (tipo G) */
    conteudoHtml?: string;
    /** Para documento externo (tipo R) */
    nomeArquivo?: string;
    conteudoBase64?: string;
    /** Para upload em partes (arquivos grandes) */
    idArquivo?: string;
}
/** Opções para tramitação */
interface ForwardOptions {
    unidadesDestino: string[];
    manterAberto?: boolean;
    removerAnotacoes?: boolean;
    enviarEmailNotificacao?: boolean;
    dataRetornoProgramado?: string;
    diasRetornoProgramado?: number;
    sinReabrir?: boolean;
    sinEnviarEmailNotificacao?: boolean;
}
/** Opções para bloco de assinatura */
interface BlockOptions {
    descricao: string;
    unidadesDisponibilizacao?: string[];
    documentos?: string[];
}

/**
 * Cliente SOAP para SEI WebServices
 * Baseado na documentação SEI-WebServices-v4.0-2.txt
 */

interface SOAPConfig {
    /** URL base do SEI (ex: https://sei.mg.gov.br) */
    baseUrl: string;
    /** Sigla do sistema cadastrado no SEI */
    siglaSistema: string;
    /** Identificação do serviço */
    identificacaoServico: string;
}
interface SOAPAuth {
    siglaSistema: string;
    identificacaoServico: string;
    idUnidade: string;
}
/**
 * Cliente SOAP para SEI WebServices
 *
 * @example
 * ```typescript
 * const client = new SEISoapClient({
 *   baseUrl: 'https://sei.mg.gov.br',
 *   siglaSistema: 'MEU_SISTEMA',
 *   identificacaoServico: 'MinhaChave123',
 * });
 *
 * await client.connect();
 * const tipos = await client.listarTiposProcedimento('110000001');
 * ```
 */
declare class SEISoapClient {
    private config;
    private client;
    constructor(config: SOAPConfig);
    /** URL do WSDL do SEI */
    private get wsdlUrl();
    /** Conecta ao serviço SOAP */
    connect(): Promise<void>;
    /** Verifica se está conectado */
    get isConnected(): boolean;
    /** Autentica requisição */
    private auth;
    /** Executa chamada SOAP */
    private call;
    /** Lista séries/tipos de documento */
    listarSeries(idUnidade: string, idTipoProcedimento?: string): Promise<Serie[]>;
    /** Lista tipos de procedimento/processo */
    listarTiposProcedimento(idUnidade: string): Promise<TipoProcedimento[]>;
    /** Lista unidades */
    listarUnidades(idUnidade: string, idTipoProcedimento?: string): Promise<Unidade[]>;
    /** Lista usuários da unidade */
    listarUsuarios(idUnidade: string): Promise<Usuario[]>;
    /** Lista hipóteses legais */
    listarHipotesesLegais(idUnidade: string, nivelAcesso?: number): Promise<unknown[]>;
    /** Gera novo procedimento/processo */
    gerarProcedimento(idUnidade: string, procedimento: Procedimento, documentos?: Documento[], procedimentosRelacionados?: string[], unidadesEnvio?: string[], sinManterAbertoUnidade?: boolean, sinEnviarEmailNotificacao?: boolean, dataRetornoProgramado?: string, idMarcador?: string, textoMarcador?: string): Promise<RetornoGerarProcedimento>;
    /** Consulta procedimento/processo */
    consultarProcedimento(idUnidade: string, protocoloProcedimento: string, sinRetornarAssuntos?: boolean, sinRetornarInteressados?: boolean, sinRetornarObservacoes?: boolean, sinRetornarAndamentoGeracao?: boolean, sinRetornarAndamentoConclusao?: boolean, sinRetornarUltimoAndamento?: boolean, sinRetornarUnidadesProcedimentoAberto?: boolean, sinRetornarProcedimentosRelacionados?: boolean, sinRetornarProcedimentosAnexados?: boolean): Promise<RetornoConsultaProcedimento>;
    /** Envia processo para outras unidades */
    enviarProcesso(idUnidade: string, protocoloProcedimento: string, unidadesDestino: string[], sinManterAbertoUnidade?: boolean, sinRemoverAnotacao?: boolean, sinEnviarEmailNotificacao?: boolean, dataRetornoProgramado?: string, diasRetornoProgramado?: number, sinDiasUteisRetornoProgramado?: boolean, sinReabrir?: boolean): Promise<boolean>;
    /** Conclui processo na unidade */
    concluirProcesso(idUnidade: string, protocoloProcedimento: string): Promise<boolean>;
    /** Reabre processo na unidade */
    reabrirProcesso(idUnidade: string, protocoloProcedimento: string): Promise<boolean>;
    /** Atribui processo a um usuário */
    atribuirProcesso(idUnidade: string, protocoloProcedimento: string, idUsuario: string, sinReabrir?: boolean): Promise<boolean>;
    /** Anexa processo a outro */
    anexarProcesso(idUnidade: string, protocoloProcedimentoPrincipal: string, protocoloProcedimentoAnexado: string): Promise<boolean>;
    /** Relaciona processos */
    relacionarProcesso(idUnidade: string, protocoloProcedimento1: string, protocoloProcedimento2: string): Promise<boolean>;
    /** Inclui documento em processo */
    incluirDocumento(idUnidade: string, documento: Documento): Promise<RetornoInclusaoDocumento>;
    /** Consulta documento */
    consultarDocumento(idUnidade: string, protocoloDocumento: string, sinRetornarAndamentoGeracao?: boolean, sinRetornarAssinaturas?: boolean, sinRetornarPublicacao?: boolean, sinRetornarCampos?: boolean): Promise<RetornoConsultaDocumento>;
    /** Cancela documento */
    cancelarDocumento(idUnidade: string, protocoloDocumento: string, motivo: string): Promise<boolean>;
    /** Adiciona arquivo para upload em partes (arquivos grandes) */
    adicionarArquivo(idUnidade: string, nome: string, tamanho: number, hash: string, conteudo: string): Promise<string>;
    /** Gera bloco de assinatura */
    gerarBloco(idUnidade: string, tipo: 'A' | 'R' | 'I', // A=Assinatura, R=Reunião, I=Interno
    descricao: string, unidadesDisponibilizacao?: string[], documentos?: string[], sinDisponibilizar?: boolean): Promise<Bloco>;
    /** Consulta bloco */
    consultarBloco(idUnidade: string, idBloco: string, sinRetornarProtocolos?: boolean): Promise<Bloco>;
    /** Inclui documento em bloco */
    incluirDocumentoBloco(idUnidade: string, idBloco: string, protocoloDocumento: string): Promise<boolean>;
    /** Exclui documento de bloco */
    excluirDocumentoBloco(idUnidade: string, idBloco: string, protocoloDocumento: string): Promise<boolean>;
    /** Disponibiliza bloco para outras unidades */
    disponibilizarBloco(idUnidade: string, idBloco: string): Promise<boolean>;
    /** Lista andamentos */
    listarAndamentos(idUnidade: string, protocoloProcedimento: string, sinRetornarAtributos?: boolean, andamentos?: string[]): Promise<Andamento[]>;
}

/**
 * Cliente Playwright para automacao do SEI via navegador
 *
 * Refatorado para usar locators semanticos ARIA em vez de seletores CSS
 */

/**
 * Cliente de automacao do SEI usando Playwright
 *
 * @example
 * ```typescript
 * const client = new SEIBrowserClient({
 *   baseUrl: 'https://sei.mg.gov.br',
 *   browser: { usuario: 'meu.usuario', senha: 'minhaSenha' },
 *   playwright: { headless: true },
 * });
 *
 * await client.init();
 * await client.login();
 * const docs = await client.listDocuments('5030.01.0002527/2025-32');
 * await client.close();
 * ```
 */
declare class SEIBrowserClient {
    private config;
    private browser;
    private context;
    private page;
    /** Endpoint CDP para reconexão */
    private cdpEndpoint;
    constructor(config: SEIConfig);
    /** URL base do SEI */
    private get baseUrl();
    /** Timeout padrao */
    private get timeout();
    /** Diretório padrão para persistent context */
    private get defaultUserDataDir();
    /** Inicializa o navegador */
    init(): Promise<void>;
    /** Verifica se esta inicializado */
    get isReady(): boolean;
    /** Obtem a pagina atual */
    getPage(): Page;
    /** Fecha o navegador */
    close(): Promise<void>;
    /**
     * Retorna o endpoint CDP para reconexão futura
     * Útil para manter sessão entre execuções
     */
    getCdpEndpoint(): string | null;
    /**
     * Minimiza a janela do navegador (via CDP)
     * Útil quando se quer manter o navegador aberto mas fora do caminho
     */
    minimizeWindow(): Promise<void>;
    /**
     * Restaura a janela do navegador (via CDP)
     */
    restoreWindow(): Promise<void>;
    /**
     * Traz a janela para frente
     */
    bringToFront(): Promise<void>;
    /**
     * Obtém as dimensões e posição da janela
     */
    getWindowBounds(): Promise<{
        left: number;
        top: number;
        width: number;
        height: number;
        windowState: string;
    } | null>;
    /**
     * Define as dimensões e posição da janela
     */
    setWindowBounds(bounds: {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        windowState?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
    }): Promise<void>;
    /**
     * Maximiza a janela do navegador
     */
    maximizeWindow(): Promise<void>;
    /**
     * Coloca a janela em tela cheia
     */
    fullscreenWindow(): Promise<void>;
    /**
     * Verifica se a sessão ainda está ativa
     */
    isSessionActive(): Promise<boolean>;
    /**
     * Obtém o contexto atual do browser
     */
    getContext(): BrowserContext | null;
    /**
     * Obtém o browser atual
     */
    getBrowser(): Browser | null;
    /** Aguarda carregamento */
    private waitForLoad;
    /** Navega para URL */
    navigate(path: string): Promise<void>;
    /** Obtem locator para campo de texto por label */
    private getTextbox;
    /** Obtem locator para botao por nome */
    private getButton;
    /** Obtem locator para link por nome */
    private getLink;
    /** Obtem locator para combobox/select */
    private getCombobox;
    /** Obtem locator para checkbox por nome */
    private getCheckbox;
    /** Obtem locator para radio button por nome */
    private getRadio;
    /** Obtem frame locator para iframe da arvore */
    private getTreeFrame;
    /** Obtem frame locator para iframe de visualizacao */
    private getViewFrame;
    /** Obtem frame locator para editor */
    private getEditorFrame;
    /** Clica em elemento: tenta ARIA primeiro, fallback CSS */
    private clickSmart;
    /** Preenche campo: tenta ARIA primeiro, fallback CSS */
    private fillSmart;
    /** Seleciona opção: tenta ARIA primeiro, fallback CSS */
    private selectSmart;
    /** Marca checkbox/radio: tenta ARIA primeiro, fallback CSS */
    private checkSmart;
    /** Aguarda elemento: tenta ARIA primeiro, fallback CSS */
    private waitForSmart;
    /** Obtém texto de elemento: tenta ARIA primeiro, fallback CSS */
    private getTextSmart;
    /** Verifica se elemento existe: tenta ARIA primeiro, fallback CSS */
    private existsSmart;
    /** Realiza login no SEI */
    login(usuario?: string, senha?: string, orgao?: string): Promise<boolean>;
    /** Verifica se está logado */
    isLoggedIn(): Promise<boolean>;
    /** Realiza logout */
    logout(): Promise<void>;
    /** Abre processo pelo numero */
    openProcess(numeroProcesso: string): Promise<boolean>;
    /** Lista documentos do processo atual */
    listDocuments(): Promise<Array<{
        id: string;
        titulo: string;
        tipo: string;
    }>>;
    /** Tramita processo para unidades */
    forwardProcess(options: ForwardOptions): Promise<boolean>;
    /** Conclui processo */
    concludeProcess(): Promise<boolean>;
    /** Reabre processo */
    reopenProcess(): Promise<boolean>;
    /** Cria novo processo */
    createProcess(options: {
        tipoProcedimento: string;
        especificacao: string;
        assuntos?: string[];
        interessados?: string[];
        observacao?: string;
        nivelAcesso?: 0 | 1 | 2;
        hipoteseLegal?: string;
    }): Promise<{
        id: string;
        numero: string;
    } | null>;
    /** Gera PDF do processo */
    downloadProcessPdf(): Promise<string | null>;
    /** Abre documento pelo ID */
    openDocument(idDocumento: string): Promise<boolean>;
    /** Cria documento interno */
    createDocument(options: CreateDocumentOptions): Promise<string | null>;
    /** Upload de documento externo */
    uploadDocument(nomeArquivo: string, conteudoBase64: string, options?: Partial<CreateDocumentOptions>): Promise<string | null>;
    /** Assina documento */
    signDocument(senha: string, cargo?: string): Promise<boolean>;
    /** Lista tipos de processo disponiveis */
    listProcessTypes(): Promise<Array<{
        id: string;
        nome: string;
    }>>;
    /** Lista tipos de documento (series) */
    listDocumentTypes(): Promise<Array<{
        id: string;
        nome: string;
    }>>;
    /** Lista unidades do orgao */
    listUnits(): Promise<Array<{
        id: string;
        sigla: string;
        descricao: string;
    }>>;
    /** Consulta andamentos/historico do processo */
    listAndamentos(numeroProcesso?: string): Promise<Array<{
        data: string;
        unidade: string;
        usuario: string;
        descricao: string;
    }>>;
    /** Consulta detalhes do processo */
    getProcessDetails(numeroProcesso?: string): Promise<{
        id: string;
        numero: string;
        tipo: string;
        especificacao: string;
        interessados: string[];
        unidadesAbertas: string[];
        dataAutuacao: string;
    } | null>;
    /** Anexa processo a outro */
    anexarProcesso(processoPrincipal: string, processoAnexado: string): Promise<boolean>;
    /** Relaciona dois processos */
    relacionarProcesso(processo1: string, processo2: string): Promise<boolean>;
    /** Atribui processo a um usuario */
    atribuirProcesso(numeroProcesso: string, nomeUsuario: string): Promise<boolean>;
    /** Consulta detalhes do documento */
    getDocumentDetails(idDocumento: string): Promise<{
        id: string;
        numero: string;
        tipo: string;
        data: string;
        assinaturas: Array<{
            nome: string;
            cargo: string;
            data: string;
        }>;
    } | null>;
    /** Cancela documento */
    cancelDocument(idDocumento: string, motivo: string): Promise<boolean>;
    /** Lista blocos de assinatura */
    listBlocos(): Promise<Array<{
        id: string;
        descricao: string;
        quantidade: number;
        unidade: string;
    }>>;
    /** Cria bloco de assinatura */
    createBloco(descricao: string, tipo?: 'assinatura' | 'reuniao' | 'interno'): Promise<string | null>;
    /** Adiciona documento ao bloco */
    addDocumentoToBloco(idBloco: string, idDocumento: string): Promise<boolean>;
    /** Remove documento do bloco */
    removeDocumentoFromBloco(idBloco: string, idDocumento: string): Promise<boolean>;
    /** Disponibiliza bloco para outras unidades */
    disponibilizarBloco(idBloco: string, unidades?: string[]): Promise<boolean>;
    /** Captura screenshot */
    screenshot(fullPage?: boolean): Promise<string>;
    /** Captura arvore de acessibilidade (ARIA snapshot) */
    snapshot(_includeHidden?: boolean): Promise<string>;
    /** Obtem arvore de acessibilidade completa */
    getAriaSnapshot(): Promise<object | null>;
    /** Obtem texto visivel da pagina */
    getVisibleText(): Promise<string>;
    /** Executa JavaScript na pagina */
    evaluate<T>(fn: () => T): Promise<T>;
    /** Lista usuarios do SEI */
    listUsuarios(filter?: string): Promise<Array<{
        id: string;
        nome: string;
        sigla: string;
    }>>;
    /** Lista hipoteses legais */
    listHipotesesLegais(): Promise<Array<{
        id: string;
        nome: string;
    }>>;
    /** Lista marcadores disponiveis */
    listMarcadores(): Promise<Array<{
        id: string;
        nome: string;
        cor: string;
    }>>;
    /** Lista processos do usuario */
    listMeusProcessos(status?: 'abertos' | 'fechados', limit?: number): Promise<Array<{
        numero: string;
        tipo: string;
        especificacao: string;
    }>>;
    /** Busca processos */
    searchProcessos(query: string, type?: 'numero' | 'texto' | 'interessado', limit?: number): Promise<Array<{
        numero: string;
        tipo: string;
        especificacao: string;
    }>>;
    /** Faz download do processo completo */
    downloadProcess(numeroProcesso: string, _includeAttachments?: boolean, outputPath?: string): Promise<{
        filePath: string;
        size: number;
    }>;
    /** Faz download de documento especifico */
    downloadDocument(idDocumento: string, outputPath?: string): Promise<{
        filePath: string;
        size: number;
    }>;
    /** Lista anotacoes do processo */
    listAnnotations(): Promise<Array<{
        texto: string;
        data: string;
        usuario: string;
    }>>;
    /** Adiciona anotacao ao processo */
    addAnnotation(texto: string, prioridade?: 'normal' | 'alta'): Promise<boolean>;
    /** Adiciona marcador ao processo */
    addMarker(marcador: string, texto?: string): Promise<boolean>;
    /** Remove marcador do processo */
    removeMarker(marcador: string): Promise<boolean>;
    /** Define prazo no processo */
    setDeadline(dias: number, tipo?: 'util' | 'corrido'): Promise<boolean>;
    /** Concede acesso ao processo */
    grantAccess(usuario: string, tipo?: 'consulta' | 'acompanhamento'): Promise<boolean>;
    /** Revoga acesso ao processo */
    revokeAccess(usuario: string): Promise<boolean>;
    /** Obtem conteudo HTML do documento */
    getDocumentContent(idDocumento: string): Promise<string>;
    /** Registra ciencia no documento */
    registerKnowledge(): Promise<boolean>;
    /** Agenda publicacao do documento */
    schedulePublication(veiculo: string, dataPublicacao?: string, resumo?: string): Promise<boolean>;
    /** Assina todos os documentos de um bloco */
    signBloco(idBloco: string, senha: string): Promise<boolean>;
    /** Obtem informacoes do bloco */
    getBloco(idBloco: string): Promise<{
        id: string;
        descricao: string;
        tipo: string;
        documentos: Array<{
            id: string;
            numero: string;
            processo: string;
        }>;
    } | null>;
}

/**
 * Cliente híbrido SEI - usa SOAP quando disponível, fallback para browser
 */

type SEIClientMode = 'auto' | 'soap' | 'browser';
interface SEIClientOptions extends SEIConfig {
    /** Modo de operação: auto (tenta SOAP, fallback browser), soap, browser */
    mode?: SEIClientMode;
}
/**
 * Cliente principal do SEI - híbrido (SOAP + Browser)
 *
 * @example
 * ```typescript
 * // Modo automático (recomendado)
 * const sei = new SEIClient({
 *   baseUrl: 'https://sei.mg.gov.br',
 *   soap: {
 *     siglaSistema: 'MEU_SISTEMA',
 *     identificacaoServico: 'MinhaChave123',
 *   },
 *   browser: {
 *     usuario: 'meu.usuario',
 *     senha: 'minhaSenha',
 *   },
 *   playwright: { headless: true },
 * });
 *
 * await sei.init();
 *
 * // Operações - usa SOAP quando possível, browser como fallback
 * const tipos = await sei.listProcessTypes();
 * await sei.openProcess('5030.01.0002527/2025-32');
 * await sei.createDocument({ idSerie: 'Despacho', descricao: 'Teste' });
 *
 * await sei.close();
 * ```
 */
declare class SEIClient {
    private config;
    private soapClient;
    private browserClient;
    private soapAvailable;
    private currentIdUnidade;
    constructor(config: SEIClientOptions);
    /** Modo de operação atual */
    get mode(): SEIClientMode;
    /** SOAP está disponível */
    get hasSoap(): boolean;
    /** Browser está disponível */
    get hasBrowser(): boolean;
    /** Inicializa clientes */
    init(): Promise<void>;
    /** Fecha todos os clientes */
    close(): Promise<void>;
    /** Define a unidade atual para operações SOAP */
    setUnidade(idUnidade: string): void;
    /** Login no SEI via browser */
    login(usuario?: string, senha?: string, orgao?: string): Promise<boolean>;
    /** Logout do SEI */
    logout(): Promise<void>;
    /** Verifica se está logado */
    isLoggedIn(): Promise<boolean>;
    /** Lista tipos de processo */
    listProcessTypes(): Promise<TipoProcedimento[]>;
    /** Lista tipos de documento (séries) */
    listDocumentTypes(idTipoProcedimento?: string): Promise<Serie[]>;
    /** Lista unidades */
    listUnits(idTipoProcedimento?: string): Promise<Unidade[]>;
    /** Lista usuários da unidade */
    listUsers(): Promise<Usuario[]>;
    /** Lista andamentos do processo */
    listAndamentos(numeroProcesso: string, options?: {
        retornarAtributos?: boolean;
    }): Promise<Array<{
        data: string;
        unidade: string;
        usuario: string;
        descricao: string;
    }>>;
    /** Abre processo */
    openProcess(numeroProcesso: string): Promise<boolean>;
    /** Consulta processo */
    getProcess(protocoloProcedimento: string, options?: {
        assuntos?: boolean;
        interessados?: boolean;
        observacoes?: boolean;
        andamentos?: boolean;
        relacionados?: boolean;
    }): Promise<RetornoConsultaProcedimento>;
    /** Cria processo */
    createProcess(options: CreateProcessOptions): Promise<RetornoGerarProcedimento | null>;
    /** Tramita processo */
    forwardProcess(numeroProcesso: string, options: ForwardOptions): Promise<boolean>;
    /** Conclui processo */
    concludeProcess(numeroProcesso: string): Promise<boolean>;
    /** Reabre processo */
    reopenProcess(numeroProcesso: string): Promise<boolean>;
    /** Anexa processo a outro */
    anexarProcesso(processoPrincipal: string, processoAnexado: string): Promise<boolean>;
    /** Relaciona dois processos */
    relacionarProcesso(processo1: string, processo2: string): Promise<boolean>;
    /** Atribui processo a um usuário */
    atribuirProcesso(numeroProcesso: string, usuario: string, sinReabrir?: boolean): Promise<boolean>;
    /** Lista documentos do processo atual */
    listDocuments(): Promise<Array<{
        id: string;
        titulo: string;
        tipo: string;
    }>>;
    /** Cria documento interno */
    createDocument(numeroProcesso: string, options: CreateDocumentOptions): Promise<string | null>;
    /** Upload de documento externo */
    uploadDocument(numeroProcesso: string, nomeArquivo: string, conteudoBase64: string, options?: Partial<CreateDocumentOptions>): Promise<string | null>;
    /** Assina documento */
    signDocument(senha: string, cargo?: string): Promise<boolean>;
    /** Cancela documento */
    cancelDocument(idDocumento: string, motivo: string): Promise<boolean>;
    /** Consulta detalhes do documento */
    getDocumentDetails(idDocumento: string): Promise<{
        id: string;
        numero: string;
        tipo: string;
        data: string;
        assinaturas: Array<{
            nome: string;
            cargo: string;
            data: string;
        }>;
    } | null>;
    /** Lista blocos de assinatura */
    listBlocos(): Promise<Array<{
        id: string;
        descricao: string;
        quantidade: number;
        unidade: string;
    }>>;
    /** Cria bloco de assinatura */
    createBloco(descricao: string, tipo?: 'assinatura' | 'reuniao' | 'interno', unidades?: string[], documentos?: string[]): Promise<string | null>;
    /** Consulta bloco */
    getBloco(idBloco: string): Promise<{
        id: string;
        descricao: string;
        documentos: string[];
    } | null>;
    /** Adiciona documento ao bloco */
    addDocumentoToBloco(idBloco: string, idDocumento: string): Promise<boolean>;
    /** Remove documento do bloco */
    removeDocumentoFromBloco(idBloco: string, idDocumento: string): Promise<boolean>;
    /** Disponibiliza bloco para outras unidades */
    disponibilizarBloco(idBloco: string, unidades?: string[]): Promise<boolean>;
    /** Captura screenshot (retorna base64) */
    screenshot(fullPage?: boolean): Promise<string>;
    /** Acesso direto ao cliente browser */
    getBrowserClient(): SEIBrowserClient | null;
    /** Acesso direto ao cliente SOAP */
    getSoapClient(): SEISoapClient | null;
    /**
     * Retorna o endpoint CDP para reconexão futura
     * Útil para manter sessão entre execuções do agente
     */
    getCdpEndpoint(): string | null;
    /**
     * Minimiza a janela do navegador (via CDP)
     * Útil quando se quer manter o navegador aberto mas fora do caminho
     */
    minimizeWindow(): Promise<void>;
    /**
     * Restaura a janela do navegador (via CDP)
     */
    restoreWindow(): Promise<void>;
    /**
     * Traz a janela para frente
     */
    bringToFront(): Promise<void>;
    /**
     * Maximiza a janela do navegador
     */
    maximizeWindow(): Promise<void>;
    /**
     * Obtém as dimensões e posição da janela
     */
    getWindowBounds(): Promise<{
        left: number;
        top: number;
        width: number;
        height: number;
        windowState: string;
    } | null>;
    /**
     * Define as dimensões e posição da janela
     */
    setWindowBounds(bounds: {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        windowState?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
    }): Promise<void>;
    /**
     * Verifica se a sessão ainda está ativa
     */
    isSessionActive(): Promise<boolean>;
}

/**
 * Seletores CSS para o SEI!
 * Compatível com SEI 4.x (baseado em sei-mcp)
 */
declare const SEI_SELECTORS: {
    login: {
        form: string;
        usuario: string;
        senha: string;
        orgao: string;
        submit: string;
        error: string;
    };
    nav: {
        menu: string;
        pesquisa: string;
        btnPesquisa: string;
        controleProcessos: string;
        iniciarProcesso: string;
        usuario: string;
        unidade: string;
        logout: string;
    };
    processList: {
        container: string;
        rows: string;
        link: string;
        numero: string;
        tipo: string;
        especificacao: string;
    };
    processTree: {
        container: string;
        root: string;
        documents: string;
        documentLink: string;
        selected: string;
    };
    processActions: {
        container: string;
        incluirDocumento: string;
        enviarProcesso: string;
        concluirProcesso: string;
        reabrirProcesso: string;
        anexarProcesso: string;
        relacionarProcesso: string;
        atribuirProcesso: string;
        gerarPdf: string;
        anotacoes: string;
        ciencia: string;
        consultarAndamento: string;
        blocoAssinatura: string;
    };
    newProcess: {
        form: string;
        tipo: string;
        tipoSearch: string;
        especificacao: string;
        interessado: string;
        interessadoAdd: string;
        observacao: string;
        nivelAcesso: {
            publico: string;
            restrito: string;
            sigiloso: string;
        };
        hipoteseLegal: string;
        salvar: string;
    };
    newDocument: {
        form: string;
        tipoContainer: string;
        tipoSearch: string;
        tipoSelect: string;
        tipoLinks: string;
        textoInicial: {
            nenhum: string;
            modelo: string;
            padrao: string;
        };
        textoPadraoSelect: string;
        documentoModeloInput: string;
        descricao: string;
        numero: string;
        nomeArvore: string;
        interessadoInput: string;
        interessadoAdd: string;
        interessadosList: string;
        destinatarioInput: string;
        destinatarioAdd: string;
        destinatariosList: string;
        assuntoBtn: string;
        assuntoInput: string;
        observacao: string;
        nivelAcesso: {
            publico: string;
            restrito: string;
            sigiloso: string;
        };
        hipoteseLegal: string;
        salvar: string;
        confirmar: string;
    };
    upload: {
        form: string;
        arquivo: string;
        formato: string;
        tipoConferencia: string;
        salvar: string;
    };
    editor: {
        frame: string;
        ckeditor: string;
        textarea: string;
        salvar: string;
    };
    signature: {
        form: string;
        senha: string;
        cargo: string;
        assinar: string;
        confirmar: string;
    };
    forward: {
        form: string;
        unidadeInput: string;
        unidadeSelect: string;
        unidadeAdd: string;
        manterAberto: string;
        removerAnotacoes: string;
        enviarEmail: string;
        dataRetorno: string;
        enviar: string;
    };
    block: {
        container: string;
        novo: string;
        lista: string;
        incluirDocumento: string;
        disponibilizar: string;
        assinar: string;
        formNovo: {
            descricao: string;
            unidadeInput: string;
            salvar: string;
        };
    };
    history: {
        container: string;
        table: string;
        rows: string;
        data: string;
        unidade: string;
        usuario: string;
        descricao: string;
    };
    common: {
        loading: string;
        modal: string;
        alert: string;
        success: string;
        iframe: string;
        close: string;
        confirm: string;
        cancel: string;
    };
};

/**
 * SEI Watcher - Monitor de novos processos, documentos e comunicações
 * Usa SOAP quando disponível, fallback para Playwright
 */

interface WatcherOptions {
    /** Intervalo de polling em ms (padrão: 30000 = 30s) */
    interval?: number;
    /** Tipos para monitorar */
    types?: WatchType[];
    /** Máximo de itens para comparar por tipo */
    maxItems?: number;
    /** Usar SOAP quando disponível */
    preferSoap?: boolean;
}
type WatchType = 'processos_recebidos' | 'processos_gerados' | 'documentos' | 'blocos_assinatura' | 'retornos_programados' | 'prazos';
interface WatchEvent {
    type: WatchType;
    timestamp: Date;
    items: WatchItem[];
    source: 'soap' | 'browser';
}
interface WatchItem {
    id: string;
    numero?: string;
    tipo?: string;
    descricao?: string;
    unidade?: string;
    data?: string;
    urgente?: boolean;
    metadata?: Record<string, unknown>;
}
interface ProcessoRecebido extends WatchItem {
    remetente: string;
    dataRecebimento: string;
    anotacao?: string;
}
interface DocumentoNovo extends WatchItem {
    processoNumero: string;
    processoId: string;
    tipoDocumento: string;
    assinado: boolean;
}
interface BlocoAssinatura extends WatchItem {
    quantidadeDocumentos: number;
    unidadeOrigem: string;
}
type WatcherEvents = {
    'processos_recebidos': (event: WatchEvent) => void;
    'processos_gerados': (event: WatchEvent) => void;
    'documentos': (event: WatchEvent) => void;
    'blocos_assinatura': (event: WatchEvent) => void;
    'retornos_programados': (event: WatchEvent) => void;
    'prazos': (event: WatchEvent) => void;
    'error': (error: Error) => void;
    'started': () => void;
    'stopped': () => void;
    'check': (type: WatchType, source: 'soap' | 'browser') => void;
};
/**
 * Monitor de eventos do SEI
 *
 * @example
 * ```typescript
 * const sei = new SEIClient({ ... });
 * await sei.init();
 * await sei.login();
 *
 * const watcher = new SEIWatcher(sei, {
 *   interval: 30000, // 30 segundos
 *   types: ['processos_recebidos', 'blocos_assinatura'],
 * });
 *
 * watcher.on('processos_recebidos', (event) => {
 *   console.log('Novos processos:', event.items);
 *   // Enviar notificação, atualizar UI, etc.
 * });
 *
 * watcher.on('blocos_assinatura', (event) => {
 *   console.log('Blocos para assinar:', event.items);
 * });
 *
 * watcher.start();
 *
 * // Parar quando necessário
 * // watcher.stop();
 * ```
 */
declare class SEIWatcher extends EventEmitter {
    private client;
    private options;
    private intervalId;
    private isRunning;
    private lastState;
    constructor(client: SEIClient, options?: WatcherOptions);
    /** Inicia o monitoramento */
    start(): void;
    /** Para o monitoramento */
    stop(): void;
    /** Verifica se está rodando */
    get running(): boolean;
    /** Força uma verificação imediata */
    check(): Promise<void>;
    /** Verifica um tipo específico */
    private checkType;
    /** Busca dados via SOAP */
    private fetchViaSoap;
    /** Busca dados via Playwright/Browser */
    private fetchViaBrowser;
    /** Busca processos recebidos */
    private fetchProcessosRecebidos;
    /** Busca processos gerados */
    private fetchProcessosGerados;
    /** Busca blocos de assinatura */
    private fetchBlocosAssinatura;
    /** Busca documentos novos (requer processo aberto) */
    private fetchDocumentosNovos;
    /** Busca retornos programados */
    private fetchRetornosProgramados;
    /** Busca processos com prazo */
    private fetchPrazos;
    /** Constrói URL do SEI */
    private buildUrl;
    on<K extends keyof WatcherEvents>(event: K, listener: WatcherEvents[K]): this;
    emit<K extends keyof WatcherEvents>(event: K, ...args: Parameters<WatcherEvents[K]>): boolean;
}

/**
 * Gerenciador de Usuários SEI
 * Armazena credenciais criptografadas e configurações de notificação
 */
interface SEIUserConfig {
    /** ID único do usuário */
    id: string;
    /** Nome do usuário */
    nome: string;
    /** Email para notificações */
    email: string;
    /** URL do SEI (ex: https://sei.mg.gov.br) */
    seiUrl: string;
    /** Órgão (se necessário) */
    orgao?: string;
    /** Configurações de notificação */
    notifications: NotificationConfig;
    /** Ativo */
    active: boolean;
    /** Data de criação */
    createdAt: string;
    /** Última verificação */
    lastCheck?: string;
}
interface SEICredentials {
    usuario: string;
    senha: string;
}
interface NotificationConfig {
    /** Enviar email */
    email: boolean;
    /** Enviar push (webhook) */
    push: boolean;
    /** URL do webhook para push */
    webhookUrl?: string;
    /** Tipos de eventos para notificar */
    events: {
        processos_recebidos: boolean;
        blocos_assinatura: boolean;
        prazos: boolean;
        retornos_programados: boolean;
    };
    /** Incluir teor do documento no email */
    includeContent: boolean;
    /** Anexar documentos ao email */
    attachDocuments: boolean;
    /** Baixar processo completo */
    downloadProcess: boolean;
}
/**
 * Gerenciador de usuários do SEI
 *
 * @example
 * ```typescript
 * const manager = new SEIUserManager({
 *   storagePath: './data',
 *   masterPassword: process.env.MASTER_PASSWORD!,
 * });
 *
 * await manager.init();
 *
 * // Adicionar usuário
 * await manager.addUser({
 *   id: 'user-123',
 *   nome: 'João Silva',
 *   email: 'joao@email.com',
 *   seiUrl: 'https://sei.mg.gov.br',
 *   credentials: { usuario: 'joao.silva', senha: 'senha123' },
 * });
 *
 * // Listar usuários ativos
 * const users = await manager.getActiveUsers();
 *
 * // Obter credenciais para uso
 * const creds = await manager.getCredentials('user-123');
 * ```
 */
declare class SEIUserManager {
    private storagePath;
    private masterPassword;
    private store;
    private storeFile;
    constructor(options: {
        storagePath: string;
        masterPassword: string;
    });
    /** Inicializa o gerenciador */
    init(): Promise<void>;
    /** Salva o store em disco */
    private save;
    /** Adiciona um novo usuário */
    addUser(options: {
        id: string;
        nome: string;
        email: string;
        seiUrl: string;
        orgao?: string;
        credentials: SEICredentials;
        notifications?: Partial<NotificationConfig>;
    }): Promise<SEIUserConfig>;
    /** Atualiza um usuário existente */
    updateUser(id: string, updates: Partial<Omit<SEIUserConfig, 'id' | 'createdAt'>>): Promise<SEIUserConfig>;
    /** Atualiza credenciais de um usuário */
    updateCredentials(id: string, credentials: SEICredentials): Promise<void>;
    /** Remove um usuário */
    removeUser(id: string): Promise<void>;
    /** Obtém configuração de um usuário */
    getUser(id: string): SEIUserConfig | null;
    /** Obtém credenciais descriptografadas */
    getCredentials(id: string): SEICredentials | null;
    /** Lista todos os usuários */
    getAllUsers(): SEIUserConfig[];
    /** Lista usuários ativos */
    getActiveUsers(): SEIUserConfig[];
    /** Atualiza timestamp da última verificação */
    updateLastCheck(id: string): Promise<void>;
    /** Ativa/desativa um usuário */
    setActive(id: string, active: boolean): Promise<void>;
}

/**
 * Serviço de Notificações SEI
 * Envia emails e webhooks com informações de processos/documentos
 */

interface EmailConfig {
    /** Host SMTP */
    host: string;
    /** Porta SMTP */
    port: number;
    /** Usar SSL/TLS */
    secure: boolean;
    /** Credenciais */
    auth: {
        user: string;
        pass: string;
    };
    /** Email do remetente */
    from: string;
    /** Nome do remetente */
    fromName?: string;
}
interface NotificationPayload {
    /** Tipo do evento */
    type: string;
    /** Usuário destinatário */
    userId: string;
    /** Email do destinatário */
    email: string;
    /** Nome do destinatário */
    nome: string;
    /** Itens do evento */
    items: EnrichedItem[];
    /** Timestamp */
    timestamp: Date;
    /** URL base do SEI */
    seiUrl: string;
}
interface EnrichedItem extends WatchItem {
    /** Teor/conteúdo do documento */
    teor?: string;
    /** Prazo (se existir) */
    prazo?: PrazoInfo;
    /** Documentos para download */
    documentos?: DocumentoDownload[];
    /** Link para o processo */
    linkProcesso?: string;
}
interface PrazoInfo {
    /** Data limite */
    dataLimite: string;
    /** Dias restantes (negativo = vencido) */
    diasRestantes: number;
    /** Tipo: úteis ou corridos */
    tipo: 'util' | 'corrido';
    /** Status */
    status: 'normal' | 'proximo' | 'vencendo_hoje' | 'vencido';
}
interface DocumentoDownload {
    /** ID do documento */
    id: string;
    /** Nome do documento */
    nome: string;
    /** Tipo */
    tipo: string;
    /** Data */
    data: string;
    /** Caminho do arquivo baixado */
    filePath?: string;
    /** Conteúdo em base64 */
    base64?: string;
}
/**
 * Serviço de notificações
 *
 * @example
 * ```typescript
 * const notifier = new SEINotificationService({
 *   email: {
 *     host: 'smtp.gmail.com',
 *     port: 587,
 *     secure: false,
 *     auth: { user: 'x', pass: 'y' },
 *     from: 'noreply@iudex.com',
 *   },
 * });
 *
 * await notifier.send({
 *   type: 'processos_recebidos',
 *   userId: 'user-123',
 *   email: 'joao@email.com',
 *   nome: 'João',
 *   items: [...],
 *   timestamp: new Date(),
 *   seiUrl: 'https://sei.mg.gov.br',
 * });
 * ```
 */
declare class SEINotificationService {
    private emailConfig?;
    private transporter?;
    constructor(options: {
        email?: EmailConfig;
    });
    /** Envia notificação por email */
    sendEmail(payload: NotificationPayload): Promise<boolean>;
    /** Envia notificação via webhook */
    sendWebhook(url: string, payload: NotificationPayload): Promise<boolean>;
    /** Constrói assunto do email */
    private buildSubject;
    /** Constrói HTML do email */
    private buildEmailHtml;
    /** Constrói HTML de um item */
    private buildItemHtml;
    /** Título do header por tipo */
    private getHeaderTitle;
    /** Texto introdutório */
    private getIntroText;
    /** Verifica conexão com servidor de email */
    verify(): Promise<boolean>;
}

/**
 * SEI Service - Serviço completo de monitoramento e notificações
 * Integra: Usuários + Watcher + Notificações + Download
 */

interface SEIServiceConfig {
    /** Diretório para dados (usuários, downloads) */
    dataPath: string;
    /** Senha mestre para criptografia */
    masterPassword: string;
    /** Configuração de email (opcional) */
    email?: EmailConfig;
    /** Intervalo de polling em ms (padrão: 60000 = 1 min) */
    pollInterval?: number;
    /** Tipos para monitorar */
    watchTypes?: WatchType[];
    /** Opções do Playwright */
    playwright?: {
        headless?: boolean;
        timeout?: number;
    };
}
type ServiceEvents = {
    'user:added': (user: SEIUserConfig) => void;
    'user:removed': (userId: string) => void;
    'user:error': (userId: string, error: Error) => void;
    'notification:sent': (userId: string, type: string) => void;
    'notification:error': (userId: string, error: Error) => void;
    'started': () => void;
    'stopped': () => void;
};
/**
 * Serviço completo de monitoramento SEI
 *
 * @example
 * ```typescript
 * const service = new SEIService({
 *   dataPath: './data',
 *   masterPassword: process.env.MASTER_PASSWORD!,
 *   email: {
 *     host: 'smtp.gmail.com',
 *     port: 587,
 *     secure: false,
 *     auth: { user: 'x', pass: 'y' },
 *     from: 'noreply@iudex.com',
 *   },
 *   pollInterval: 60000,
 *   watchTypes: ['processos_recebidos', 'blocos_assinatura', 'prazos'],
 * });
 *
 * await service.init();
 *
 * // Adicionar usuário
 * await service.addUser({
 *   id: 'user-123',
 *   nome: 'João Silva',
 *   email: 'joao@email.com',
 *   seiUrl: 'https://sei.mg.gov.br',
 *   credentials: { usuario: 'joao.silva', senha: 'senha123' },
 * });
 *
 * // Iniciar monitoramento de todos os usuários
 * await service.startAll();
 * ```
 */
declare class SEIService extends EventEmitter {
    private config;
    private userManager;
    private notifier;
    private sessions;
    private isRunning;
    constructor(config: SEIServiceConfig);
    /** Inicializa o serviço */
    init(): Promise<void>;
    /** Adiciona um novo usuário */
    addUser(options: {
        id: string;
        nome: string;
        email: string;
        seiUrl: string;
        orgao?: string;
        credentials: SEICredentials;
        notifications?: Partial<SEIUserConfig['notifications']>;
    }): Promise<SEIUserConfig>;
    /** Remove um usuário */
    removeUser(userId: string): Promise<void>;
    /** Obtém configuração de usuário */
    getUser(userId: string): SEIUserConfig | null;
    /** Lista todos os usuários */
    getAllUsers(): SEIUserConfig[];
    /** Atualiza configurações de usuário */
    updateUser(userId: string, updates: Partial<Omit<SEIUserConfig, 'id' | 'createdAt'>>): Promise<SEIUserConfig>;
    /** Atualiza credenciais */
    updateCredentials(userId: string, credentials: SEICredentials): Promise<void>;
    /** Inicia monitoramento de um usuário */
    startUser(userId: string): Promise<boolean>;
    /** Para monitoramento de um usuário */
    stopUser(userId: string): Promise<void>;
    /** Inicia monitoramento de todos os usuários ativos */
    startAll(): Promise<void>;
    /** Para monitoramento de todos os usuários */
    stopAll(): Promise<void>;
    /** Verifica se está rodando */
    get running(): boolean;
    /** Lista sessões ativas */
    getActiveSessions(): string[];
    private setupWatcherHandlers;
    /** Processa evento do watcher */
    private handleWatchEvent;
    /** Enriquece itens com informações adicionais */
    private enrichItems;
    /** Extrai informações de prazo */
    private extractPrazo;
    /** Extrai teor do documento */
    private extractTeor;
    /** Baixa documentos */
    private downloadDocuments;
    /** Baixa processo completo */
    private downloadProcess;
    on<K extends keyof ServiceEvents>(event: K, listener: ServiceEvents[K]): this;
    emit<K extends keyof ServiceEvents>(event: K, ...args: Parameters<ServiceEvents[K]>): boolean;
}

/**
 * API HTTP completa para SEI
 * Expõe TODAS as funcionalidades da biblioteca via REST
 */

interface APIConfig extends SEIServiceConfig {
    /** URL base do SEI (ex: https://sei.mg.gov.br) */
    baseUrl: string;
    /** Porta da API (padrão: 3001) */
    port?: number;
    /** Host (padrão: localhost) */
    host?: string;
    /** API Key para autenticação */
    apiKey?: string;
}
/**
 * API HTTP completa para SEI
 *
 * ## Endpoints
 *
 * ### Sessões
 * - `POST /sessions` - Criar sessão (login)
 * - `DELETE /sessions/:sessionId` - Encerrar sessão
 *
 * ### Usuários (monitoramento)
 * - `GET /users` - Lista usuários cadastrados
 * - `POST /users` - Cadastra usuário
 * - `GET /users/:id` - Obtém usuário
 * - `PUT /users/:id` - Atualiza usuário
 * - `DELETE /users/:id` - Remove usuário
 * - `POST /users/:id/start` - Inicia monitoramento
 * - `POST /users/:id/stop` - Para monitoramento
 *
 * ### Processos
 * - `GET /process/:number` - Consulta processo
 * - `POST /process` - Cria processo
 * - `POST /process/:number/forward` - Tramita processo
 * - `POST /process/:number/conclude` - Conclui processo
 * - `POST /process/:number/reopen` - Reabre processo
 * - `POST /process/:number/anexar` - Anexa processo
 * - `POST /process/:number/relacionar` - Relaciona processos
 * - `POST /process/:number/atribuir` - Atribui processo
 * - `GET /process/:number/andamentos` - Lista andamentos
 * - `GET /process/:number/documents` - Lista documentos
 * - `POST /process/:number/documents` - Cria documento
 * - `POST /process/:number/upload` - Upload documento
 *
 * ### Documentos
 * - `GET /document/:id` - Consulta documento
 * - `POST /document/:id/sign` - Assina documento
 * - `POST /document/:id/cancel` - Cancela documento
 *
 * ### Blocos
 * - `GET /blocos` - Lista blocos
 * - `POST /blocos` - Cria bloco
 * - `GET /bloco/:id` - Consulta bloco
 * - `POST /bloco/:id/documentos` - Adiciona documento
 * - `DELETE /bloco/:id/documentos/:docId` - Remove documento
 * - `POST /bloco/:id/disponibilizar` - Disponibiliza bloco
 *
 * ### Listagens
 * - `GET /tipos-processo` - Tipos de processo
 * - `GET /tipos-documento` - Tipos de documento
 * - `GET /unidades` - Unidades
 *
 * ### Status
 * - `GET /status` - Status do serviço
 * - `POST /start` - Inicia todos
 * - `POST /stop` - Para todos
 *
 * ### Daemon (Monitoramento Contínuo)
 * - `GET /daemon/status` - Status do daemon
 * - `POST /daemon/start` - Inicia daemon (headless ou CDP)
 * - `POST /daemon/stop` - Para daemon
 * - `GET /daemon/config` - Configuração atual
 * - `PUT /daemon/config` - Atualiza configuração
 *
 * ### Downloads
 * - `GET /process/:number/download` - Baixar processo (PDF/ZIP)
 * - `GET /document/:id/download` - Baixar documento
 *
 * ### Anotações
 * - `GET /process/:number/annotations` - Lista anotações
 * - `POST /process/:number/annotations` - Adiciona anotação
 *
 * ### Marcadores
 * - `POST /process/:number/markers` - Adiciona marcador
 * - `DELETE /process/:number/markers/:marcador` - Remove marcador
 *
 * ### Prazos
 * - `POST /process/:number/deadline` - Define prazo
 *
 * ### Acesso
 * - `POST /process/:number/access` - Concede acesso
 * - `DELETE /process/:number/access/:usuario` - Revoga acesso
 *
 * ### Ciência e Publicação
 * - `POST /document/:id/knowledge` - Registra ciência
 * - `POST /document/:id/publish` - Agenda publicação
 *
 * ### Assinatura em Lote
 * - `POST /documents/sign-multiple` - Assina múltiplos
 * - `POST /bloco/:id/sign` - Assina bloco inteiro
 *
 * ### Listagens Adicionais
 * - `GET /usuarios` - Lista usuários SEI
 * - `GET /hipoteses-legais` - Hipóteses legais
 * - `GET /marcadores` - Marcadores disponíveis
 * - `GET /meus-processos` - Processos do usuário
 *
 * ### Navegação/Debug
 * - `GET /screenshot` - Captura tela
 * - `GET /snapshot` - Estado ARIA
 * - `GET /current-page` - Página atual
 * - `POST /navigate` - Navega para destino
 * - `POST /click` - Clica em elemento
 * - `POST /type` - Digita texto
 * - `POST /select` - Seleciona opção
 * - `POST /wait` - Aguarda elemento
 */
declare class SEIServiceAPI {
    private config;
    private service;
    private server;
    private sessions;
    private sessionTimeout;
    private daemon;
    private daemonConfig;
    constructor(config: APIConfig);
    /** Inicia a API */
    start(): Promise<void>;
    /** Para a API */
    stop(): Promise<void>;
    /** Acesso ao serviço interno */
    getService(): SEIService;
    /** Limpa sessões expiradas */
    private cleanupSessions;
    /** Obtém ou cria sessão para usuário */
    private getSession;
    /** Parse da requisição */
    private parseRequest;
    /** Parse do body JSON */
    private parseBody;
    /** Envia resposta */
    private sendResponse;
    /** Roteamento de requisições */
    private handleRequest;
    /** Executa handler com sessão */
    private handleWithSession;
    private handleGetStatus;
    private handleStartAll;
    private handleStopAll;
    private handleCreateSession;
    private handleDeleteSession;
    private handleListUsers;
    private handleGetUser;
    private handleAddUser;
    private handleUpdateUser;
    private handleDeleteUser;
    private handleUpdateCredentials;
    private handleStartUser;
    private handleStopUser;
    private handleListProcessTypes;
    private handleListDocumentTypes;
    private handleCreateProcess;
    private handleGetProcess;
    private handleForwardProcess;
    private handleConcludeProcess;
    private handleReopenProcess;
    private handleAnexarProcess;
    private handleRelacionarProcess;
    private handleAtribuirProcess;
    private handleListAndamentos;
    private handleListDocuments;
    private handleCreateDocument;
    private handleUploadDocument;
    private handleSignDocument;
    private handleCancelDocument;
    private handleListBlocos;
    private handleCreateBloco;
    private handleGetBloco;
    private handleAddDocumentoToBloco;
    private handleRemoveDocumentoFromBloco;
    private handleDisponibilizarBloco;
    private handleListUnits;
    private handleListUsuarios;
    private handleListHipotesesLegais;
    private handleListMarcadores;
    private handleListMeusProcessos;
    private handleScreenshot;
    private handleSnapshot;
    private handleGetCurrentPage;
    private handleNavigate;
    private handleClick;
    private handleType;
    private handleSelect;
    private handleWait;
    private handleSignMultiple;
    private handleSearchProcess;
    private handleOpenProcess;
    private handleGetProcessStatus;
    private handleDownloadProcess;
    private handleListAnnotations;
    private handleAddAnnotation;
    private handleAddMarker;
    private handleRemoveMarker;
    private handleSetDeadline;
    private handleGrantAccess;
    private handleRevokeAccess;
    private handleGetDocument;
    private handleDownloadDocument;
    private handleRegisterKnowledge;
    private handleSchedulePublication;
    private handleUploadDocumentBase64;
    private handleRelateProcess;
    private handleReleaseBloco;
    private handleSignBloco;
    private handleDaemonStatus;
    private handleDaemonStart;
    private handleDaemonStop;
    private handleDaemonGetConfig;
    private handleDaemonUpdateConfig;
}

/**
 * SEI Daemon - Serviço de monitoramento contínuo
 *
 * Mantém o browser aberto em background e monitora:
 * - Novos processos recebidos
 * - Blocos de assinatura pendentes
 * - Prazos vencendo
 * - Retornos programados
 *
 * @example
 * ```typescript
 * const daemon = new SEIDaemon({
 *   baseUrl: 'https://sei.mg.gov.br',
 *   credentials: {
 *     usuario: 'meu.usuario',
 *     senha: 'minhaSenha',
 *     orgao: 'CODEMGE',
 *   },
 *   watch: {
 *     types: ['processos_recebidos', 'blocos_assinatura', 'prazos'],
 *     interval: 60000, // 1 minuto
 *   },
 *   notifications: {
 *     email: { ... },
 *     webhook: 'https://meu-sistema.com/webhook/sei',
 *   },
 * });
 *
 * await daemon.start();
 * // Roda indefinidamente...
 * ```
 */

interface DaemonConfig {
    /** URL base do SEI */
    baseUrl: string;
    /** Credenciais de login (não necessário se usar CDP com sessão já autenticada) */
    credentials?: {
        usuario: string;
        senha: string;
        orgao?: string;
    };
    /** Configurações de monitoramento */
    watch?: {
        /** Tipos para monitorar */
        types?: WatchType[];
        /** Intervalo de polling em ms (padrão: 60000 = 1 min) */
        interval?: number;
        /** Máximo de itens */
        maxItems?: number;
    };
    /** Configurações de notificação */
    notifications?: {
        /** Configuração de email */
        email?: EmailConfig;
        /** URL do webhook */
        webhook?: string;
        /** Destinatários (para email) */
        recipients?: Array<{
            userId: string;
            email: string;
            nome: string;
        }>;
    };
    /** Configurações do browser */
    browser?: {
        /** Executar headless (ignorado se usar CDP) */
        headless?: boolean;
        /** Timeout */
        timeout?: number;
        /** Endpoint CDP para conectar ao Chrome já aberto */
        cdpEndpoint?: string;
        /** Tentar reconectar automaticamente se perder conexão CDP */
        cdpAutoReconnect?: boolean;
    };
    /** Intervalo para verificar sessão (padrão: 5 min) */
    sessionCheckInterval?: number;
    /** Intervalo para manter sessão ativa (padrão: 2 min, desabilitado em CDP) */
    keepAliveInterval?: number;
}
type DaemonEvents = {
    started: () => void;
    stopped: () => void;
    login: () => void;
    relogin: () => void;
    sessionExpired: () => void;
    event: (event: WatchEvent) => void;
    notification: (payload: NotificationPayload) => void;
    error: (error: Error) => void;
};
/**
 * Daemon de monitoramento contínuo do SEI
 */
declare class SEIDaemon extends EventEmitter {
    private config;
    private client;
    private watcher;
    private notifier;
    private isRunning;
    private sessionCheckTimer;
    private keepAliveTimer;
    private loginAttempts;
    private maxLoginAttempts;
    constructor(config: DaemonConfig);
    /** Modo CDP ativo */
    private isCdpMode;
    /** Inicia o daemon */
    start(): Promise<void>;
    /** Para o daemon */
    stop(): Promise<void>;
    /** Realiza login */
    private doLogin;
    /** Configura handlers de eventos do watcher */
    private setupEventHandlers;
    /** Envia notificações */
    private sendNotifications;
    /** Inicia verificação periódica de sessão */
    private startSessionCheck;
    /** Inicia keep-alive (mantém sessão ativa) */
    private startKeepAlive;
    /** Verifica se está rodando */
    get running(): boolean;
    /** Acesso ao cliente */
    getClient(): SEIClient | null;
    /** Acesso ao watcher */
    getWatcher(): SEIWatcher | null;
    /** Sleep helper */
    private sleep;
    on<K extends keyof DaemonEvents>(event: K, listener: DaemonEvents[K]): this;
    emit<K extends keyof DaemonEvents>(event: K, ...args: Parameters<DaemonEvents[K]>): boolean;
}

/**
 * Módulo de criptografia para credenciais
 * Usa AES-256-GCM para armazenamento seguro
 */
interface EncryptedData {
    /** Dados criptografados em base64 */
    encrypted: string;
    /** IV em base64 */
    iv: string;
    /** Auth tag em base64 */
    tag: string;
    /** Salt em base64 */
    salt: string;
}
/**
 * Criptografa dados sensíveis
 *
 * @param data - Dados a criptografar (string ou objeto)
 * @param masterPassword - Senha mestre para derivar a chave
 * @returns Dados criptografados
 */
declare function encrypt(data: string | object, masterPassword: string): EncryptedData;
/**
 * Descriptografa dados
 *
 * @param encryptedData - Dados criptografados
 * @param masterPassword - Senha mestre
 * @returns Dados originais
 */
declare function decrypt(encryptedData: EncryptedData, masterPassword: string): string;
/**
 * Descriptografa e faz parse de JSON
 */
declare function decryptJson<T = unknown>(encryptedData: EncryptedData, masterPassword: string): T;
/**
 * Gera uma senha aleatória segura
 */
declare function generateSecurePassword(length?: number): string;

export { type APIConfig, type Andamento, type Assinatura, type Assunto, type AtributoAndamento, type BlockOptions, type Bloco, type BlocoAssinatura, type Campo, type CreateDocumentOptions, type CreateProcessOptions, type DaemonConfig, type Destinatario, type Documento, type DocumentoBloco, type DocumentoDownload, type DocumentoNovo, type EmailConfig, type EnrichedItem, type ForwardOptions, type Interessado, type NivelAcesso, type NotificationConfig, type NotificationPayload, type Observacao, type PrazoInfo, type Procedimento, type ProcedimentoAnexado, type ProcedimentoRelacionado, type ProcessoRecebido, type Remetente, type RetornoConsultaDocumento, type RetornoConsultaProcedimento, type RetornoGerarProcedimento, type RetornoInclusaoDocumento, SEIBrowserClient, SEIClient, type SEIClientMode, type SEIClientOptions, type SEIConfig, type SEICredentials, SEIDaemon, SEINotificationService, SEIService, SEIServiceAPI, type SEIServiceConfig, SEISoapClient, type SEIUserConfig, SEIUserManager, SEIWatcher, SEI_SELECTORS, type SOAPAuth, type SOAPConfig, type Serie, type TipoDocumento, type TipoProcedimento, type Unidade, type Usuario, type WatchEvent, type WatchItem, type WatchType, type WatcherOptions, decrypt, decryptJson, SEIClient as default, encrypt, generateSecurePassword };
