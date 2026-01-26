import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ===== SCHEMAS DE TODAS AS FERRAMENTAS =====

const COMMON_FIELDS = {
  session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  timeout_ms: z.number().optional().describe('Timeout do comando em ms (server-side; padrão via SEI_MCP_COMMAND_TIMEOUT_MS)'),
};

const COMMON_EXCEPTIONS = new Set<string>([
  // Estes schemas precisam manter session_id obrigatório
  'sei_close_session',
  'sei_switch_session',
]);

function withCommonFields(name: string, schema: z.ZodTypeAny): z.ZodTypeAny {
  if (COMMON_EXCEPTIONS.has(name)) return schema;
  if (schema instanceof z.ZodObject) {
    return schema.extend(COMMON_FIELDS);
  }
  return schema;
}

const baseSchemas = {
  // === AUTENTICAÇÃO ===
  sei_login: z.object({
    url: z.string().url().describe('URL base do SEI (ex: https://sei.sp.gov.br)'),
    username: z.string().describe('Nome de usuário'),
    password: z.string().describe('Senha do usuário'),
    orgao: z.string().optional().describe('Órgão/Unidade (se necessário selecionar)'),
  }),

  sei_logout: z.object({}),

  sei_get_session: z.object({}).describe('Retorna informações da sessão atual'),

  // === PROCESSOS ===
  sei_search_process: z.object({
    query: z.string().describe('Termo de busca (número do processo ou texto)'),
    type: z.enum(['numero', 'texto', 'interessado', 'assunto', 'unidade']).default('numero'),
    unidade: z.string().optional().describe('Filtrar por unidade'),
    tipo_processo: z.string().optional().describe('Filtrar por tipo de processo'),
    data_inicio: z.string().optional().describe('Data inicial (YYYY-MM-DD)'),
    data_fim: z.string().optional().describe('Data final (YYYY-MM-DD)'),
    limit: z.number().default(20).describe('Máximo de resultados'),
    offset: z.number().default(0).describe('Pular N resultados'),
  }),

  sei_open_process: z.object({
    process_number: z.string().describe('Número do processo (ex: 12345.678901/2024-00)'),
  }),

  sei_create_process: z.object({
    tipo_processo: z.string().describe('ID ou nome do tipo de processo'),
    especificacao: z.string().describe('Especificação/resumo do processo'),
    interessados: z.array(z.string()).optional().describe('Lista de interessados'),
    assuntos: z.array(z.string()).optional().describe('Códigos dos assuntos'),
    observacao: z.string().optional().describe('Observações'),
    nivel_acesso: z.enum(['publico', 'restrito', 'sigiloso']).default('publico'),
    hipotese_legal: z.string().optional().describe('ID da hipótese legal (obrigatório se não público)'),
  }),

  sei_get_status: z.object({
    process_number: z.string().describe('Número do processo'),
    include_history: z.boolean().default(true).describe('Incluir histórico completo'),
    include_documents: z.boolean().default(true).describe('Incluir lista de documentos'),
  }),

  sei_forward_process: z.object({
    process_number: z.string().describe('Número do processo'),
    target_unit: z.string().describe('Unidade de destino (sigla ou nome)'),
    keep_open: z.boolean().default(false).describe('Manter aberto na unidade atual'),
    deadline: z.number().optional().describe('Prazo em dias'),
    urgente: z.boolean().default(false).describe('Marcar como urgente'),
    note: z.string().optional().describe('Observação/despacho'),
  }),

  sei_conclude_process: z.object({
    process_number: z.string().describe('Número do processo'),
  }),

  sei_reopen_process: z.object({
    process_number: z.string().describe('Número do processo'),
  }),

  sei_relate_processes: z.object({
    process_number: z.string().describe('Número do processo principal'),
    related_process: z.string().describe('Número do processo relacionado'),
    tipo_relacao: z.enum(['anexacao', 'apensacao', 'relacionamento']).default('relacionamento'),
  }),

  // === DOCUMENTOS ===
  sei_list_documents: z.object({
    process_number: z.string().describe('Número do processo'),
  }),

  sei_get_document: z.object({
    document_id: z.string().describe('ID do documento'),
    include_content: z.boolean().default(false).describe('Incluir conteúdo do documento'),
  }),

  sei_create_document: z.object({
    process_number: z.string().describe('Número do processo'),
    document_type: z.string().describe('Tipo do documento (ex: Ofício, Despacho, Nota Técnica, Parecer Jurídico, Comunicação Interna, Anexo)'),

    // Texto inicial
    texto_inicial: z.enum(['modelo', 'padrao', 'nenhum']).default('nenhum').describe('Origem do texto: modelo existente, texto padrão ou em branco'),
    texto_padrao_id: z.string().optional().describe('ID do texto padrão (se texto_inicial=padrao)'),
    documento_modelo_id: z.string().optional().describe('ID do documento modelo (se texto_inicial=modelo)'),

    // Campos básicos
    descricao: z.string().optional().describe('Descrição do documento'),
    numero: z.string().optional().describe('Número do documento (ex: 29/2026) - alguns tipos como Parecer, Anexo'),
    nome_arvore: z.string().optional().describe('Nome exibido na árvore do processo'),

    // Interessados e destinatários
    interessados: z.array(z.string()).optional().describe('Lista de interessados (nome ou ID de contatos)'),
    destinatarios: z.array(z.string()).optional().describe('Lista de destinatários - para Despacho, CI (nome ou ID de contatos)'),

    // Classificação
    assuntos: z.array(z.string()).optional().describe('Códigos ou nomes dos assuntos para classificação'),

    // Observações
    observacoes: z.string().optional().describe('Observações desta unidade'),

    // Nível de acesso
    nivel_acesso: z.enum(['publico', 'restrito', 'sigiloso']).default('publico'),
    hipotese_legal: z.string().optional().describe('Hipótese legal (obrigatório se restrito/sigiloso)'),

    // Conteúdo (preenchido após criar o documento)
    content: z.string().optional().describe('Conteúdo HTML do documento (preenchido no editor após criação)'),
  }),

  // === UPLOAD DE ARQUIVO (DOCUMENTO EXTERNO) ===
  sei_upload_document: z.object({
    process_number: z.string().describe('Número do processo'),
    file_path: z.string().describe('Caminho absoluto do arquivo a enviar'),
    file_name: z.string().optional().describe('Nome do arquivo (se diferente do original)'),
    document_type: z.string().describe('Tipo do documento externo'),
    description: z.string().optional().describe('Descrição do documento'),
    data_documento: z.string().optional().describe('Data do documento (YYYY-MM-DD)'),
    nivel_acesso: z.enum(['publico', 'restrito', 'sigiloso']).default('publico'),
    hipotese_legal: z.string().optional().describe('ID da hipótese legal'),
    formato: z.enum(['nato_digital', 'digitalizado']).default('nato_digital'),
    conferencia: z.enum(['copia_autenticada', 'copia_simples', 'documento_original']).optional(),
    observacao: z.string().optional(),
  }),

  sei_upload_document_base64: z.object({
    process_number: z.string().describe('Número do processo'),
    file_content_base64: z.string().describe('Conteúdo do arquivo em Base64'),
    file_name: z.string().describe('Nome do arquivo com extensão'),
    mime_type: z.string().describe('Tipo MIME (ex: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)'),
    document_type: z.string().describe('Tipo do documento externo'),
    description: z.string().optional().describe('Descrição do documento'),
    nivel_acesso: z.enum(['publico', 'restrito', 'sigiloso']).default('publico'),
    hipotese_legal: z.string().optional(),
  }),

  // === ASSINATURA ===
  sei_sign_document: z.object({
    document_id: z.string().describe('ID do documento'),
    password: z.string().describe('Senha para assinatura'),
    cargo: z.string().optional().describe('Cargo (se diferente do padrão)'),
  }),

  sei_sign_multiple: z.object({
    document_ids: z.array(z.string()).describe('Lista de IDs de documentos'),
    password: z.string().describe('Senha para assinatura'),
    cargo: z.string().optional(),
  }),

  sei_sign_block: z.object({
    block_id: z.string().describe('ID do bloco de assinatura'),
    password: z.string().describe('Senha para assinatura'),
  }),

  // === DOWNLOAD ===
  sei_download_process: z.object({
    process_number: z.string().describe('Número do processo'),
    include_attachments: z.boolean().default(true).describe('Incluir anexos'),
    output_path: z.string().optional().describe('Caminho para salvar'),
    format: z.enum(['pdf', 'zip']).default('pdf'),
  }),

  sei_download_document: z.object({
    document_id: z.string().describe('ID do documento'),
    output_path: z.string().optional().describe('Caminho para salvar'),
  }),

  // === ANOTAÇÕES ===
  sei_add_annotation: z.object({
    process_number: z.string().describe('Número do processo'),
    text: z.string().describe('Texto da anotação'),
    prioridade: z.enum(['normal', 'alta']).default('normal'),
  }),

  sei_list_annotations: z.object({
    process_number: z.string().describe('Número do processo'),
  }),

  // === BLOCOS ===
  sei_list_blocks: z.object({
    tipo: z.enum(['assinatura', 'interno', 'reuniao']).optional(),
  }),

  sei_create_block: z.object({
    tipo: z.enum(['assinatura', 'interno', 'reuniao']).describe('Tipo do bloco: A=Assinatura, I=Interno, R=Reunião'),
    descricao: z.string().describe('Descrição do bloco'),
    unidades_disponibilizacao: z.array(z.string()).optional().describe('Unidades para disponibilizar o bloco'),
    documentos: z.array(z.string()).optional().describe('IDs de documentos para incluir no bloco'),
    disponibilizar: z.boolean().default(false).describe('Disponibilizar imediatamente'),
  }),

  sei_get_block: z.object({
    block_id: z.string().describe('ID do bloco'),
    include_documents: z.boolean().default(true).describe('Incluir lista de documentos'),
  }),

  sei_add_to_block: z.object({
    block_id: z.string().describe('ID do bloco'),
    process_number: z.string().optional(),
    document_id: z.string().optional(),
  }),

  sei_remove_from_block: z.object({
    block_id: z.string().describe('ID do bloco'),
    document_id: z.string().describe('ID do documento a remover'),
  }),

  sei_release_block: z.object({
    block_id: z.string().describe('ID do bloco'),
  }),

  // === MARCADORES ===
  sei_add_marker: z.object({
    process_number: z.string().describe('Número do processo'),
    marker: z.string().describe('Nome ou ID do marcador'),
    text: z.string().optional().describe('Texto do marcador'),
  }),

  sei_remove_marker: z.object({
    process_number: z.string().describe('Número do processo'),
    marker: z.string().describe('Nome ou ID do marcador'),
  }),

  // === PRAZOS ===
  sei_set_deadline: z.object({
    process_number: z.string().describe('Número do processo'),
    days: z.number().describe('Prazo em dias'),
    tipo: z.enum(['util', 'corrido']).default('util'),
  }),

  // === CIÊNCIA ===
  sei_register_knowledge: z.object({
    document_id: z.string().describe('ID do documento'),
  }),

  sei_cancel_document: z.object({
    document_id: z.string().describe('ID do documento a cancelar'),
    motivo: z.string().describe('Motivo do cancelamento'),
  }),

  // === PUBLICAÇÃO ===
  sei_schedule_publication: z.object({
    document_id: z.string().describe('ID do documento'),
    veiculo: z.string().describe('Veículo de publicação'),
    data_publicacao: z.string().optional().describe('Data desejada (YYYY-MM-DD)'),
    resumo: z.string().optional().describe('Resumo/ementa'),
  }),

  // === CONSULTAS/LISTAGENS ===
  sei_list_document_types: z.object({
    filter: z.string().optional().describe('Filtrar por nome'),
  }),

  sei_list_process_types: z.object({
    filter: z.string().optional().describe('Filtrar por nome'),
  }),

  sei_list_units: z.object({
    filter: z.string().optional().describe('Filtrar por nome/sigla'),
  }),

  sei_list_users: z.object({
    filter: z.string().optional().describe('Filtrar por nome/sigla do usuário'),
  }),

  sei_list_hipoteses_legais: z.object({}),

  sei_list_marcadores: z.object({}),

  sei_list_my_processes: z.object({
    status: z.enum(['recebidos', 'gerados', 'abertos', 'todos']).default('abertos'),
    limit: z.number().default(50),
  }),

  // === CONTROLE DE ACESSO ===
  sei_grant_access: z.object({
    process_number: z.string().describe('Número do processo'),
    user: z.string().describe('Usuário ou unidade'),
    tipo: z.enum(['consulta', 'acompanhamento']).default('consulta'),
  }),

  sei_revoke_access: z.object({
    process_number: z.string().describe('Número do processo'),
    user: z.string().describe('Usuário ou unidade'),
  }),

  // === VISUALIZAÇÃO ===
  sei_screenshot: z.object({
    full_page: z.boolean().default(false),
    output_path: z.string().optional(),
  }),

  sei_snapshot: z.object({
    include_hidden: z.boolean().default(false),
  }),

  sei_get_current_page: z.object({}).describe('Retorna informações da página atual'),

  // === SISTEMA (SERVER-SIDE) ===
  sei_open_url: z.object({
    url: z.string().url().describe('URL para abrir no navegador (http/https)'),
  }).describe('Abre uma URL no navegador do sistema (não requer extensão)'),

  // === NAVEGAÇÃO ===
  sei_navigate: z.object({
    target: z.enum([
      'home', 'search', 'new_process', 'signature_block',
      'received', 'generated', 'inbox', 'control'
    ]).describe('Página de destino'),
  }),

  sei_click: z.object({
    selector: z.string().describe('Seletor CSS ou XPath do elemento'),
  }),

  sei_type: z.object({
    selector: z.string().describe('Seletor do campo'),
    text: z.string().describe('Texto a digitar'),
    clear: z.boolean().default(true).describe('Limpar campo antes'),
  }),

  sei_select: z.object({
    selector: z.string().describe('Seletor do select'),
    value: z.string().describe('Valor ou texto da opção'),
  }),

  sei_wait: z.object({
    selector: z.string().optional().describe('Aguardar elemento'),
    timeout: z.number().default(10000).describe('Timeout em ms'),
  }),

  // === SESSÕES ===
  sei_list_sessions: z.object({}).describe('Lista todas as sessões ativas'),

  sei_get_session_info: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Retorna informações detalhadas de uma sessão'),

  sei_close_session: z.object({
    session_id: z.string().describe('ID da sessão a fechar'),
  }).describe('Fecha uma sessão específica'),

  sei_switch_session: z.object({
    session_id: z.string().describe('ID da sessão para ativar'),
  }).describe('Troca para uma sessão específica'),

  // === CONTROLE DE JANELA ===
  sei_minimize_window: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Minimiza a janela do navegador'),

  sei_restore_window: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Restaura a janela do navegador'),

  sei_focus_window: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Traz a janela para frente (foco)'),

  sei_get_window_state: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Retorna estado atual da janela (posição, tamanho, estado)'),

  sei_set_window_bounds: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
    left: z.number().optional().describe('Posição X'),
    top: z.number().optional().describe('Posição Y'),
    width: z.number().optional().describe('Largura'),
    height: z.number().optional().describe('Altura'),
  }).describe('Define posição e tamanho da janela'),

  // === CONEXÃO ===
  sei_get_connection_status: z.object({
    session_id: z.string().optional().describe('ID da sessão (usa default se omitido)'),
  }).describe('Retorna status da conexão WebSocket'),
};

export const schemas = Object.fromEntries(
  Object.entries(baseSchemas).map(([name, schema]) => [name, withCommonFields(name, schema)])
) as typeof baseSchemas;

// ===== DEFINIÇÕES DAS FERRAMENTAS =====

export const allTools = [
  // Autenticação
  { name: 'sei_login', description: 'Faz login no sistema SEI', inputSchema: zodToJsonSchema(schemas.sei_login) },
  { name: 'sei_logout', description: 'Faz logout do sistema SEI', inputSchema: zodToJsonSchema(schemas.sei_logout) },
  { name: 'sei_get_session', description: 'Retorna informações da sessão atual (usuário, unidade, etc)', inputSchema: zodToJsonSchema(schemas.sei_get_session) },

  // Processos
  { name: 'sei_search_process', description: 'Busca processos no SEI por número, texto, interessado ou assunto', inputSchema: zodToJsonSchema(schemas.sei_search_process) },
  { name: 'sei_open_process', description: 'Abre/navega para um processo específico', inputSchema: zodToJsonSchema(schemas.sei_open_process) },
  { name: 'sei_create_process', description: 'Cria um novo processo no SEI', inputSchema: zodToJsonSchema(schemas.sei_create_process) },
  { name: 'sei_get_status', description: 'Consulta andamento, histórico e documentos do processo', inputSchema: zodToJsonSchema(schemas.sei_get_status) },
  { name: 'sei_forward_process', description: 'Tramita processo para outra unidade', inputSchema: zodToJsonSchema(schemas.sei_forward_process) },
  { name: 'sei_conclude_process', description: 'Conclui processo na unidade atual', inputSchema: zodToJsonSchema(schemas.sei_conclude_process) },
  { name: 'sei_reopen_process', description: 'Reabre processo concluído', inputSchema: zodToJsonSchema(schemas.sei_reopen_process) },
  { name: 'sei_relate_processes', description: 'Relaciona, anexa ou apensa processos', inputSchema: zodToJsonSchema(schemas.sei_relate_processes) },

  // Documentos
  { name: 'sei_list_documents', description: 'Lista todos os documentos de um processo', inputSchema: zodToJsonSchema(schemas.sei_list_documents) },
  { name: 'sei_get_document', description: 'Obtém detalhes de um documento específico', inputSchema: zodToJsonSchema(schemas.sei_get_document) },
  { name: 'sei_create_document', description: 'Cria documento interno no SEI (Despacho, Parecer, CI, Nota Técnica, Anexo, etc.) com todos os campos: texto inicial, descrição, número, nome na árvore, interessados, destinatários, assuntos, observações e nível de acesso', inputSchema: zodToJsonSchema(schemas.sei_create_document) },

  // Upload de arquivos (preserva formatação)
  { name: 'sei_upload_document', description: 'Envia arquivo externo (PDF, Word, etc) para o processo PRESERVANDO FORMATAÇÃO ORIGINAL', inputSchema: zodToJsonSchema(schemas.sei_upload_document) },
  { name: 'sei_upload_document_base64', description: 'Envia arquivo em Base64 para o processo (para integração com apps)', inputSchema: zodToJsonSchema(schemas.sei_upload_document_base64) },

  // Assinatura
  { name: 'sei_sign_document', description: 'Assina documento eletronicamente', inputSchema: zodToJsonSchema(schemas.sei_sign_document) },
  { name: 'sei_sign_multiple', description: 'Assina múltiplos documentos de uma vez', inputSchema: zodToJsonSchema(schemas.sei_sign_multiple) },
  { name: 'sei_sign_block', description: 'Assina todos documentos de um bloco', inputSchema: zodToJsonSchema(schemas.sei_sign_block) },

  // Download
  { name: 'sei_download_process', description: 'Baixa processo completo em PDF ou ZIP', inputSchema: zodToJsonSchema(schemas.sei_download_process) },
  { name: 'sei_download_document', description: 'Baixa documento específico', inputSchema: zodToJsonSchema(schemas.sei_download_document) },

  // Anotações
  { name: 'sei_add_annotation', description: 'Adiciona anotação ao processo', inputSchema: zodToJsonSchema(schemas.sei_add_annotation) },
  { name: 'sei_list_annotations', description: 'Lista anotações do processo', inputSchema: zodToJsonSchema(schemas.sei_list_annotations) },

  // Blocos
  { name: 'sei_list_blocks', description: 'Lista blocos de assinatura/interno/reunião', inputSchema: zodToJsonSchema(schemas.sei_list_blocks) },
  { name: 'sei_create_block', description: 'Cria novo bloco de assinatura/interno/reunião', inputSchema: zodToJsonSchema(schemas.sei_create_block) },
  { name: 'sei_get_block', description: 'Consulta detalhes de um bloco', inputSchema: zodToJsonSchema(schemas.sei_get_block) },
  { name: 'sei_add_to_block', description: 'Adiciona processo ou documento a um bloco', inputSchema: zodToJsonSchema(schemas.sei_add_to_block) },
  { name: 'sei_remove_from_block', description: 'Remove documento de um bloco', inputSchema: zodToJsonSchema(schemas.sei_remove_from_block) },
  { name: 'sei_release_block', description: 'Disponibiliza bloco para outras unidades assinarem', inputSchema: zodToJsonSchema(schemas.sei_release_block) },

  // Marcadores
  { name: 'sei_add_marker', description: 'Adiciona marcador ao processo', inputSchema: zodToJsonSchema(schemas.sei_add_marker) },
  { name: 'sei_remove_marker', description: 'Remove marcador do processo', inputSchema: zodToJsonSchema(schemas.sei_remove_marker) },

  // Prazos
  { name: 'sei_set_deadline', description: 'Define prazo para o processo', inputSchema: zodToJsonSchema(schemas.sei_set_deadline) },

  // Ciência
  { name: 'sei_register_knowledge', description: 'Registra ciência em documento', inputSchema: zodToJsonSchema(schemas.sei_register_knowledge) },

  // Cancelamento
  { name: 'sei_cancel_document', description: 'Cancela documento no processo', inputSchema: zodToJsonSchema(schemas.sei_cancel_document) },

  // Publicação
  { name: 'sei_schedule_publication', description: 'Agenda publicação de documento', inputSchema: zodToJsonSchema(schemas.sei_schedule_publication) },

  // Consultas/Listagens
  { name: 'sei_list_document_types', description: 'Lista tipos de documentos disponíveis', inputSchema: zodToJsonSchema(schemas.sei_list_document_types) },
  { name: 'sei_list_process_types', description: 'Lista tipos de processos disponíveis', inputSchema: zodToJsonSchema(schemas.sei_list_process_types) },
  { name: 'sei_list_units', description: 'Lista unidades/setores disponíveis', inputSchema: zodToJsonSchema(schemas.sei_list_units) },
  { name: 'sei_list_users', description: 'Lista usuários da unidade atual', inputSchema: zodToJsonSchema(schemas.sei_list_users) },
  { name: 'sei_list_hipoteses_legais', description: 'Lista hipóteses legais para documentos restritos/sigilosos', inputSchema: zodToJsonSchema(schemas.sei_list_hipoteses_legais) },
  { name: 'sei_list_marcadores', description: 'Lista marcadores disponíveis', inputSchema: zodToJsonSchema(schemas.sei_list_marcadores) },
  { name: 'sei_list_my_processes', description: 'Lista processos do usuário (recebidos, gerados, abertos)', inputSchema: zodToJsonSchema(schemas.sei_list_my_processes) },

  // Controle de Acesso
  { name: 'sei_grant_access', description: 'Concede acesso a processo para usuário/unidade', inputSchema: zodToJsonSchema(schemas.sei_grant_access) },
  { name: 'sei_revoke_access', description: 'Revoga acesso a processo', inputSchema: zodToJsonSchema(schemas.sei_revoke_access) },

  // Visualização
  { name: 'sei_screenshot', description: 'Captura screenshot da página atual', inputSchema: zodToJsonSchema(schemas.sei_screenshot) },
  { name: 'sei_snapshot', description: 'Captura estado da página (árvore de acessibilidade)', inputSchema: zodToJsonSchema(schemas.sei_snapshot) },
  { name: 'sei_get_current_page', description: 'Retorna URL e informações da página atual', inputSchema: zodToJsonSchema(schemas.sei_get_current_page) },
  { name: 'sei_open_url', description: 'Abre uma URL no navegador do sistema (server-side; não requer extensão)', inputSchema: zodToJsonSchema(schemas.sei_open_url) },

  // Navegação
  { name: 'sei_navigate', description: 'Navega para página específica do SEI', inputSchema: zodToJsonSchema(schemas.sei_navigate) },
  { name: 'sei_click', description: 'Clica em elemento na página', inputSchema: zodToJsonSchema(schemas.sei_click) },
  { name: 'sei_type', description: 'Digita texto em campo', inputSchema: zodToJsonSchema(schemas.sei_type) },
  { name: 'sei_select', description: 'Seleciona opção em dropdown', inputSchema: zodToJsonSchema(schemas.sei_select) },
  { name: 'sei_wait', description: 'Aguarda elemento ou tempo', inputSchema: zodToJsonSchema(schemas.sei_wait) },

  // Sessões
  { name: 'sei_list_sessions', description: 'Lista todas as sessões ativas conectadas', inputSchema: zodToJsonSchema(schemas.sei_list_sessions) },
  { name: 'sei_get_session_info', description: 'Retorna informações detalhadas de uma sessão', inputSchema: zodToJsonSchema(schemas.sei_get_session_info) },
  { name: 'sei_close_session', description: 'Fecha uma sessão específica', inputSchema: zodToJsonSchema(schemas.sei_close_session) },
  { name: 'sei_switch_session', description: 'Troca para uma sessão específica (traz para foco)', inputSchema: zodToJsonSchema(schemas.sei_switch_session) },

  // Controle de Janela
  { name: 'sei_minimize_window', description: 'Minimiza a janela do navegador', inputSchema: zodToJsonSchema(schemas.sei_minimize_window) },
  { name: 'sei_restore_window', description: 'Restaura a janela do navegador (de minimizado)', inputSchema: zodToJsonSchema(schemas.sei_restore_window) },
  { name: 'sei_focus_window', description: 'Traz a janela para frente (foco)', inputSchema: zodToJsonSchema(schemas.sei_focus_window) },
  { name: 'sei_get_window_state', description: 'Retorna estado atual da janela (posição, tamanho, estado)', inputSchema: zodToJsonSchema(schemas.sei_get_window_state) },
  { name: 'sei_set_window_bounds', description: 'Define posição e tamanho da janela', inputSchema: zodToJsonSchema(schemas.sei_set_window_bounds) },

  // Conexão
  { name: 'sei_get_connection_status', description: 'Retorna status da conexão WebSocket', inputSchema: zodToJsonSchema(schemas.sei_get_connection_status) },
];

export const toolCount = allTools.length;
