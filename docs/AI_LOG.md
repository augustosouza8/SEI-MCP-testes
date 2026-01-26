# SEI-MCP Development Log

## 2026-01-26 — Deploy Render Corrigido + 84 Ferramentas

### Resumo
Deploy do sei-mcp no Render corrigido após dois erros: build falhava porque `tsup` não estava disponível em produção, e o CMD do Dockerfile estava errado.

### Problemas e Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| `tsup: not found` | devDependencies não instaladas em production | Copiar `dist/` pré-buildado ao invés de buildar no container |
| `Application exited early` | CMD usava `http-server.js` que só exporta função | Usar `index.js http` que executa o servidor |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `.gitignore` | Removido `dist/` para incluir no repo |
| `Dockerfile` | Removido build step, copia `dist/` pré-buildado, CMD correto |

### Dockerfile Final

```dockerfile
FROM mcr.microsoft.com/playwright:v1.58.0-jammy
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile --prod
COPY dist ./dist
EXPOSE 10000
CMD ["node", "dist/index.js", "http"]
```

### Status do Deploy

- **URL**: https://sei-mcp-d1w0.onrender.com
- **Health**: `/health` → `{"status":"ok","tools":84}`
- **Driver**: playwright
- **Ferramentas**: 84 (63 SEI + 21 browser)

### Commits

1. `8846c42` - fix: copy pre-built dist for Render deployment
2. `db0ecb0` - fix: use correct CMD to start HTTP server

---

## 2026-01-26 — Mapeamento Completo de Ícones do SEI via Playwright

### Resumo
Exploração detalhada da interface do SEI usando Playwright para mapear todos os ícones e ações disponíveis. Este mapeamento é essencial para melhorar a navegação automatizada do sei-mcp.

### Estrutura de iframes do SEI

O SEI utiliza uma estrutura de iframes aninhados:
- **Página principal**: Header, menu lateral, busca rápida
- **`iframe[name="ifrArvore"]`**: Árvore de documentos (lado esquerdo)
- **`iframe[name="ifrVisualizacao"]`**: Área de ações/visualização (lado direito)

### Ícones do PROCESSO (Barra de Ações - iframe ifrVisualizacao)

| Ícone | Ação URL | Parâmetros |
|-------|----------|------------|
| Incluir Documento | `documento_escolher_tipo` | `id_procedimento` |
| Iniciar Processo Relacionado | `procedimento_escolher_tipo_relacionado` | `id_procedimento_destino` |
| Consultar/Alterar Processo | `procedimento_alterar` | `id_procedimento` |
| Acompanhamento Especial | `acompanhamento_gerenciar` | `id_procedimento` |
| Ciência | JavaScript popup | - |
| Enviar Processo | `procedimento_enviar` | `id_procedimento` |
| Atualizar Andamento | `procedimento_atualizar_andamento` | `id_procedimento` |
| Atribuir Processo | `procedimento_atribuicao_cadastrar` | `id_procedimento` |
| Adicionar aos Favoritos | `protocolo_modelo_gerenciar` | `id_protocolo` |
| Duplicar Processo | `procedimento_duplicar` | `id_procedimento` |
| Enviar Correspondência Eletrônica | JavaScript popup | - |
| Relacionamentos do Processo | `procedimento_relacionar` | `id_procedimento` |
| Incluir em Bloco | JavaScript popup | - |
| Gerenciar Acesso Externo | `acesso_externo_gerenciar` | `id_procedimento` |
| Anotações | `anotacao_registrar` | `id_procedimento` |
| Sobrestar Processo | `procedimento_sobrestar` | `id_procedimento` |
| Anexar Processo | `procedimento_anexar` | `id_procedimento` |
| Concluir Processo | JavaScript popup | - |
| Gerar PDF do Processo | `procedimento_gerar_pdf` | `id_procedimento` |
| Gerar ZIP do Processo | `procedimento_gerar_zip` | `id_procedimento` |
| Comentários | `comentario_listar` | `id_procedimento` |
| Gerenciar Marcador | `andamento_marcador_gerenciar` | `id_procedimento` |
| Controle de Prazo | `controle_prazo_definir` | `id_procedimento` |
| Pesquisar no Processo | `procedimento_pesquisar` | `id_procedimento` |
| Ferramentas de IA | JavaScript popup | - |

### Ícones do DOCUMENTO (Barra de Ações quando documento selecionado)

| Ícone | Ação URL | Parâmetros |
|-------|----------|------------|
| Incluir Documento | `documento_escolher_tipo` | `id_procedimento` |
| Consultar/Alterar Documento | `documento_alterar` | `id_procedimento`, `id_documento` |
| **Assinar Documento** | JavaScript popup | - |
| Gerenciar Assinatura Externa | `assinatura_externa_gerenciar` | `id_procedimento`, `id_documento` |
| Incluir em Bloco de Assinatura | `bloco_escolher` | `id_procedimento`, `id_documento` |
| Versões do Documento | `documento_versao_listar` | `id_procedimento`, `id_documento` |
| Imprimir Web | `documento_imprimir_web` | `id_documento` |
| Gerar PDF do Documento | `procedimento_gerar_pdf` | `id_procedimento`, `id_documento` |
| Abrir em nova aba | `documento_visualizar` | `id_documento` |

### Ícones na Árvore de Documentos (iframe ifrArvore)

**Na linha do número do processo:**
- Menu cópia protocolo (popup com opções de cópia)
- Adicionar aos Favoritos
- Filtrar Linha Direta
- Ícone de Acesso Restrito (indica nível: Restrito, Sigiloso)
- Ícone de Acompanhamento Especial
- Marcador (ex: "Marcador Nicholas")

**Por documento:**
- Ícone de pasta (expandir/colapsar)
- Menu cópia protocolo (ícone "≡" antes do nome)
- Link do documento (nome + número SEI entre parênteses)
- Ícone de checkbox (seleção para ações em lote)
- Unidade de origem (link com tooltip do nome completo)
- Ícone de Acesso Restrito (tipo de restrição no tooltip)
- Ícone de Assinatura (nome do assinante no tooltip via `javascript:alert()`)

### Menu de Contexto do Documento

Ao clicar no menu "≡" do documento:
- Copiar número SEI
- Copiar nome do documento
- Copiar link do documento
- Duplicar documento
- Copiar para...

**Tooltip adicional:**
- Copiar texto (número SEI ou nome completo)
- Copiar link editor (número SEI ou nome completo)
- Link para Acesso Direto

### Menu de Contexto do Processo

Ao clicar no menu "≡" do número do processo:
- Copiar número do processo
- Copiar link do processo
- Enviar Documento Externo
- Ações em lote
- Atribuir Processo
- Personalizar Menu

### Formulário Enviar Processo

Elementos mapeados:
- `listbox "Processos:"` - Processos selecionados
- `combobox "Órgão das Unidades:"` - Filtro por órgão (CODEMGE, SEF, etc.)
- `textbox` (id=`#txtUnidade`) - Busca de unidades com autocomplete
- `listbox "Unidades:"` - Unidades selecionadas
- `checkbox "Manter processo aberto na unidade atual"`
- `checkbox "Remover anotação"`
- `checkbox "Enviar e-mail de notificação"`
- `radio "Data certa"` / `radio "Prazo em dias"` - Retorno Programado
- `button "Enviar"`

### Implicações para o sei-mcp

1. **Navegação em iframes**: Todas as ações requerem navegar para o iframe correto antes de interagir
2. **Ações JavaScript**: Muitas ações usam popups JS (`javascript:void(0)`) ao invés de URLs diretas
3. **IDs dinâmicos**: Os parâmetros `id_procedimento` e `id_documento` são extraídos da URL
4. **Autocomplete**: Campos como "Unidades" usam autocomplete assíncrono
5. **Documentos em rascunho**: Documentos não assinados têm URL `about:blank` e retornam "Acesso não permitido"

---

## 2026-01-26 — Ferramentas Genéricas de Playwright Adicionadas

### Resumo
Adicionadas 21 ferramentas genéricas de Playwright/Browser ao sei-mcp, totalizando 84 ferramentas.

### Ferramentas Adicionadas

| Ferramenta | Descrição |
|------------|-----------|
| `browser_navigate` | Navega para uma URL |
| `browser_navigate_back` | Volta para página anterior |
| `browser_close` | Fecha o navegador |
| `browser_click` | Clica em elemento |
| `browser_type` | Digita texto |
| `browser_fill_form` | Preenche múltiplos campos |
| `browser_select_option` | Seleciona opção em dropdown |
| `browser_hover` | Hover sobre elemento |
| `browser_drag` | Drag and drop |
| `browser_press_key` | Pressiona tecla |
| `browser_snapshot` | Snapshot de acessibilidade |
| `browser_take_screenshot` | Captura screenshot |
| `browser_resize` | Redimensiona janela |
| `browser_tabs` | Gerencia abas |
| `browser_handle_dialog` | Lida com diálogos |
| `browser_file_upload` | Upload de arquivos |
| `browser_evaluate` | Executa JavaScript |
| `browser_run_code` | Executa código Playwright |
| `browser_console_messages` | Mensagens do console |
| `browser_network_requests` | Requisições de rede |
| `browser_wait_for` | Aguarda texto/elemento/tempo |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/tools/all-tools.ts` | +21 schemas e definições de ferramentas |
| `src/playwright/manager.ts` | +21 implementações de ferramentas |

### Total de Ferramentas: 84
- 63 ferramentas SEI-específicas
- 21 ferramentas genéricas de browser

### Servidor Remoto
Testado e funcionando corretamente:
- URL: `https://sei-tribunais-licensing-api.onrender.com/mcp`
- Protocol: `2025-06-18` ✓
- Tools: 12 ferramentas SEI

**Nota**: O Claude Desktop não suporta nativamente servidores MCP HTTP remotos. Para usar o servidor remoto, seria necessário um proxy local.

---

## 2026-01-26 — Bundle .mcpb Atualizado + Debug MCP Remoto

### Resumo
Atualizado bundle `.mcpb` com suporte a Playwright e diagnosticado problema de conexão do MCP remoto no Claude Desktop.

### Problema Identificado
O Claude Desktop não conseguia manter conexão com o MCP remoto (`https://sei-tribunais-licensing-api.onrender.com/mcp`):
- Erro: "Server transport closed unexpectedly"
- Causa: Incompatibilidade de protocolo (cliente usa `2025-06-18`, servidor retornava `2024-11-05`)

### Correção Aplicada
```python
# app/api/endpoints/mcp_server.py
async def handle_initialize(params: dict) -> dict:
    client_version = params.get("protocolVersion", "2024-11-05")
    supported_versions = ["2024-11-05", "2025-06-18"]
    protocol_version = client_version if client_version in supported_versions else "2024-11-05"
    return {"protocolVersion": protocol_version, ...}
```

### Bundle .mcpb Atualizado

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `sei-mcp.mcpb` | 30KB | Bundle com Playwright driver |
| `manifest.json` | 1.7KB | Manifest v0.3 com env vars |

**Localização**: `~/Desktop/sei-mcp.mcpb`

**Configuração incluída**:
```json
{
  "env": {
    "SEI_MCP_DRIVER": "playwright",
    "SEI_MCP_REQUIRE_AUTH": "false",
    "SEI_MCP_PW_HEADLESS": "0",
    "SEI_MCP_PW_PERSISTENT": "1",
    "SEI_MCP_PW_USER_DATA_DIR": "${HOME}/.sei-mcp-profile"
  }
}
```

### Como Instalar o .mcpb

1. Abrir **Claude Desktop**
2. Settings > Extensions > Advanced settings
3. Clicar em **"Install Extension..."**
4. Selecionar `~/Desktop/sei-mcp.mcpb`

### Status

- [x] Bundle .mcpb criado com Playwright
- [x] Correção de protocolo enviada para Render
- [ ] Aguardando deploy no Render (Docker rebuild)

---

## 2026-01-26 — 5 Melhorias de Performance

### Resumo
Implementadas 5 otimizações de performance identificadas via duelo Claude vs Codex.

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/websocket/server.ts` | Retry com backoff exponencial (3x, 500→1000→2000ms) |
| `src/sei/selectors.ts` | Cache de seletores com TTL 5min |
| `src/sei/soap-client.ts` | Connection pooling com keep-alive |
| `src/tools/index.ts` | Smart Wait para estabilidade de página |

### Impacto Esperado

| Melhoria | Impacto |
|----------|---------|
| Retry com Backoff | +80% sucesso em erros transitórios |
| Cache de Seletores | -50% buscas DOM |
| Connection Pooling | -40% latência SOAP |
| Smart Wait | -70% tempo de wait |

### Variáveis de Ambiente Novas

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| SEI_MCP_SMART_WAIT | Habilitar smart wait | true |
| SEI_MCP_STABILITY_MS | Tempo de estabilidade | 300 |
| SEI_MCP_MAX_WAIT_MS | Timeout máximo do wait | 5000 |

---

## 2026-01-26 — Empacotamento como Desktop Extension (.mcpb)

### Resumo
Criado pacote `.mcpb` para instalação "um clique" no Claude Desktop. Também corrigido bug crítico onde o servidor crashava se a porta WebSocket estivesse em uso.

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `manifest.json` | Manifest para Desktop Extension (formato 0.3) |
| `scripts/build-mcpb.sh` | Script para empacotar como .mcpb |
| `sei-mcp.mcpb` | Pacote final (~3MB) |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/websocket/server.ts` | Tratamento gracioso de erro `EADDRINUSE` - não crasha mais |
| `README.md` | Instruções de instalação via Desktop Extension |

### Correção Crítica

**Problema**: Servidor crashava com `EADDRINUSE` quando porta 19999 estava em uso.

**Antes**:
```typescript
this.wss.on('error', (err) => {
  logger.error('WebSocket server error', err);
  reject(err);  // CRASHAVA o servidor MCP
});
```

**Depois**:
```typescript
this.wss.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${this.port} already in use...`);
    this.wss = null;
    resolve();  // Continua funcionando via MCP
  } else {
    logger.error('WebSocket server error', err);
    resolve();  // Não crasha
  }
});
```

### Como Instalar (.mcpb)

1. No **Claude Desktop**: Settings > Extensions > Advanced settings
2. Clique em **"Install Extension..."**
3. Selecione `sei-mcp.mcpb`

### Como Empacotar

```bash
# Instalar CLI
npm install -g @anthropic-ai/mcpb

# Validar manifest
mcpb validate manifest.json

# Preparar bundle
mkdir -p build-mcpb/server
cp manifest.json build-mcpb/
cp -r dist/* build-mcpb/server/
cd build-mcpb/server && npm install --omit=dev --ignore-scripts
rm package.json package-lock.json
cd ../..

# Empacotar
mcpb pack build-mcpb sei-mcp.mcpb

# Limpar
rm -rf build-mcpb
```

### Detalhes do Bundle

- Tamanho: ~3.0 MB
- Arquivos: 2150
- Node.js runtime: Incluído no Claude Desktop

---

## 2026-01-25 — Suporte a Múltiplas Sessões, Controle de Janela e Heartbeat

### Resumo
Implementado suporte completo a múltiplas sessões WebSocket, controle de janela via Chrome Extension, e heartbeat para monitoramento de conexão.

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/sessions/session-manager.ts` | Gerenciador de múltiplas sessões com Map de conexões |
| `src/sessions/index.ts` | Export do módulo |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/types/index.ts` | Adicionados tipos: `SessionInfo`, `SessionContext`, `SessionStatus`, `WindowState`, `WindowBounds`, `ReconnectConfig` |
| `src/websocket/server.ts` | Refatorado para suporte a múltiplos clientes, heartbeat, e sessionId em comandos |
| `src/tools/all-tools.ts` | Adicionadas 10 novas ferramentas de sessão e janela |
| `src/tools/index.ts` | Handler para ferramentas de sessão (server-side) |
| `src/server.ts` | Atualizado para usar `allTools` (51+ ferramentas) |

### Novas Ferramentas MCP

| Ferramenta | Tipo | Descrição |
|------------|------|-----------|
| `sei_list_sessions` | Server | Lista todas as sessões ativas |
| `sei_get_session_info` | Server | Info detalhada de sessão |
| `sei_close_session` | Server | Fecha sessão específica |
| `sei_switch_session` | Server | Troca sessão ativa |
| `sei_minimize_window` | Extension | Minimiza janela do navegador |
| `sei_restore_window` | Extension | Restaura janela |
| `sei_focus_window` | Extension | Traz janela para frente |
| `sei_get_window_state` | Extension | Estado atual da janela |
| `sei_set_window_bounds` | Extension | Define posição/tamanho |
| `sei_get_connection_status` | Server | Status da conexão WebSocket |

### Arquitetura SessionManager

```
SessionManager
├── sessions: Map<sessionId, SessionContext>
│   └── SessionContext: { id, status, windowId, metadata }
├── clients: Map<sessionId, ClientConnection>
│   └── ClientConnection: { ws, sessionId, windowId, connectedAt, lastActivity }
│
├── createSession(windowId?, url?)
├── registerClient(ws, sessionId, windowId)
├── unregisterClient(sessionId)
├── getSession(sessionId) / getDefaultSession()
├── getClient(sessionId) / getDefaultClient()
├── listSessions() → SessionInfo[]
├── closeSession(sessionId)
├── isConnected(sessionId?)
└── getConnectedCount()
```

### WebSocket Refatorado

**Antes:**
```typescript
private client: WebSocket | null = null;
```

**Depois:**
```typescript
// Via SessionManager
private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

sendCommand(action, params, sessionId?)  // sessionId opcional
isConnected(sessionId?)                   // sessionId opcional
listSessions()                            // Lista todas
closeSession(sessionId)                   // Fecha específica
```

### Heartbeat

- Intervalo: 30s
- Atualiza `lastActivity` no pong
- Remove heartbeat quando cliente desconecta
- Limpa pending commands da sessão desconectada

### Compatibilidade

- **Backwards compatible**: `session_id` opcional em todas ferramentas
- Se omitido, usa primeira sessão conectada (comportamento original)
- Extensão Chrome existente continua funcionando

### Verificação

```bash
pnpm tsc --noEmit  # OK
```

### Total de Ferramentas

- Antes: 42 ferramentas
- Agora: **52 ferramentas**

---

## 2026-01-25 — Correção de Erros TypeScript

### Problema
Build falhava com 5 erros de TypeScript:
```
src/sei/hybrid-client.ts(201,11): error TS18046: 'result' is of type 'unknown'.
src/sei/hybrid-client.ts(201,33): error TS18046: 'result' is of type 'unknown'.
src/sei/hybrid-client.ts(202,15): error TS18046: 'result' is of type 'unknown'.
src/sei/hybrid-client.ts(202,44): error TS18046: 'result' is of type 'unknown'.
src/websocket/server.ts(76,48): error TS2339: Property 'type' does not exist on type 'never'.
```

### Correções

1. **`src/types/index.ts`** — Ajustado tipo `WSResponse` para aceitar `type: 'response' | 'error'` (antes era só `'response'`)

2. **`src/sei/hybrid-client.ts`** — Adicionado type assertion para `response.json()`:
```typescript
const result = await response.json() as { idDocumento?: string; id?: string; protocoloDocumento?: string; numero?: string };
```

### Verificação
```bash
pnpm tsc --noEmit  # OK
pnpm build         # OK
```

---

## 2026-01-24 — Implementação Completa do SEI-MCP

### Resumo
Criado sistema completo de automação do SEI! (Sistema Eletrônico de Informações) com:
- Servidor MCP para integração com Claude Code
- Extensão Chrome para manipulação do DOM do SEI
- Cliente híbrido (SOAP + REST + DOM)
- Suporte a upload de documentos preservando formatação original

### Arquivos Criados

#### Servidor MCP (Node.js/TypeScript)
- `src/index.ts` — Entry point do servidor
- `src/server.ts` — Servidor MCP principal (stdio)
- `src/websocket/server.ts` — Servidor WebSocket para comunicação com extensão
- `src/tools/index.ts` — Tools básicas do MCP
- `src/tools/all-tools.ts` — Definição completa de 45+ ferramentas
- `src/sei/selectors.ts` — Seletores CSS do SEI
- `src/sei/soap-client.ts` — Cliente SOAP para API nativa
- `src/sei/hybrid-client.ts` — Cliente híbrido (REST > SOAP > DOM)
- `src/types/index.ts` — Tipos TypeScript
- `src/utils/logger.ts` — Logger configurável

#### Extensão Chrome (Manifest V3)
- `extension/manifest.json` — Manifest da extensão
- `extension/background/service-worker.js` — Service worker (WebSocket client)
- `extension/content/sei-bridge.js` — Content script principal (40+ ações)
- `extension/content/document-upload.js` — Módulo de upload preservando formatação
- `extension/popup/popup.html` — UI de conexão
- `extension/popup/popup.js` — Lógica do popup

#### Documentação
- `README.md` — Documentação principal
- `docs/SEI-API.md` — Documentação da API do SEI

### Funcionalidades Implementadas

#### Autenticação
- `sei_login` — Login com usuário/senha
- `sei_logout` — Logout
- `sei_get_session` — Verificar sessão atual

#### Processos
- `sei_search_process` — Buscar processos
- `sei_open_process` — Abrir processo
- `sei_create_process` — Criar novo processo
- `sei_forward_process` — Tramitar processo
- `sei_conclude_process` — Concluir processo
- `sei_reopen_process` — Reabrir processo
- `sei_attach_process` — Anexar processo a outro
- `sei_relate_process` — Relacionar processos
- `sei_assign_process` — Atribuir a usuário
- `sei_get_status` — Consultar andamento
- `sei_list_history` — Listar histórico
- `sei_download_process` — Baixar como PDF

#### Documentos
- `sei_list_documents` — Listar documentos
- `sei_create_document` — Criar documento interno (editor SEI)
- `sei_upload_document` — Upload documento externo (PRESERVA FORMATAÇÃO)
- `sei_view_document` — Visualizar documento
- `sei_download_document` — Baixar documento
- `sei_sign_document` — Assinar documento
- `sei_sign_block` — Assinar bloco de documentos

#### Listagens
- `sei_list_document_types` — Tipos de documentos
- `sei_list_legal_hypotheses` — Hipóteses legais
- `sei_list_units` — Unidades para tramitação
- `sei_list_processes` — Processos na unidade

#### Outros
- `sei_add_annotation` — Adicionar anotação
- `sei_register_awareness` — Registrar ciência
- `sei_screenshot` — Capturar tela
- `sei_snapshot` — Estado ARIA da página
- `sei_navigate`, `sei_click`, `sei_fill`, `sei_select` — Navegação genérica

### Decisões Técnicas

1. **Upload preservando formatação**: Documentos são enviados como "documento externo" via Base64, mantendo formatação original (Word, PDF, etc.)

2. **Abordagem híbrida**: O sistema tenta REST > SOAP > DOM, priorizando APIs quando disponíveis

3. **Compatibilidade**: Seletores CSS com fallbacks para múltiplas versões do SEI

4. **WebSocket**: Comunicação bidirecional entre servidor MCP e extensão Chrome na porta 19999

### Próximos Passos

- [ ] Testar com instância real do SEI
- [ ] Adicionar suporte a certificado digital para assinatura
- [ ] Implementar cache de sessão
- [ ] Adicionar logs estruturados
- [ ] Testes automatizados

### Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Build
pnpm build

# Iniciar servidor (após configurar no Claude Code)
node dist/index.js

# Instalar extensão no Chrome
# 1. Abrir chrome://extensions
# 2. Ativar "Modo de desenvolvedor"
# 3. "Carregar sem compactação" → pasta extension/
```

---

## 2026-01-24 — Suporte Completo a Campos de Documento

### Resumo
Atualizado `sei_create_document` para suportar TODOS os campos disponíveis na criação de documentos internos do SEI, independentemente do tipo de documento.

### Campos Agora Suportados

| Campo | Parâmetro | Tipos de Documento |
|-------|-----------|-------------------|
| Texto Inicial | `texto_inicial` | Todos (modelo/padrao/nenhum) |
| Texto Padrão | `texto_padrao_id` | Quando texto_inicial=padrao |
| Documento Modelo | `documento_modelo_id` | Quando texto_inicial=modelo |
| Descrição | `descricao` | Todos |
| Número | `numero` | Parecer, Anexo, etc. |
| Nome na Árvore | `nome_arvore` | Todos |
| Interessados | `interessados[]` | Parecer, Despacho, CI, Nota Técnica |
| Destinatários | `destinatarios[]` | Despacho, CI |
| Assuntos | `assuntos[]` | Todos |
| Observações | `observacoes` | Todos |
| Nível de Acesso | `nivel_acesso` | Todos (publico/restrito/sigiloso) |
| Hipótese Legal | `hipotese_legal` | Quando restrito/sigiloso |
| Conteúdo | `content` | Todos (HTML para editor) |

### Arquivos Modificados

1. **`src/tools/all-tools.ts`**
   - Schema `sei_create_document` expandido com todos os campos
   - Descrição atualizada

2. **`extension/content/sei-bridge.js`**
   - Novos seletores para todos os campos (interessados, destinatários, assuntos, etc.)
   - Função `sei_create_document` reescrita para preencher todos os campos
   - Suporte a autocomplete para interessados/destinatários
   - Suporte a pesquisa e seleção de assuntos

### Exemplo de Uso Completo

```javascript
sei_create_document({
  process_number: "5030.01.0002527/2025-32",
  document_type: "Parecer Jurídico",

  // Texto inicial
  texto_inicial: "nenhum",  // ou "modelo" ou "padrao"

  // Identificação
  descricao: "Parecer sobre alienação de bens",
  numero: "29/2026",
  nome_arvore: "Parecer Jurídico Nº 29/2026",

  // Partes
  interessados: ["EUROFARMA LABORATÓRIOS S.A."],
  destinatarios: ["Gerência de Patrimônio"],  // Para Despacho/CI

  // Classificação
  assuntos: ["Alienação de bens"],

  // Observações
  observacoes: "Análise jurídica conforme solicitado",

  // Acesso
  nivel_acesso: "restrito",
  hipotese_legal: "Documento Preparatório (Art. 7º, § 3º, da Lei nº 12.527/2011)",

  // Conteúdo (opcional - preenchido no editor)
  content: "<p>Texto do parecer...</p>"
})
```

### Compatibilidade por Tipo de Documento

| Tipo | Número | Interessados | Destinatários |
|------|--------|--------------|---------------|
| Parecer Jurídico | ✅ | ✅ | ❌ |
| Despacho | ❌ | ✅ | ✅ |
| Comunicação Interna | ❌ | ✅ | ✅ |
| Nota Técnica | ❌ | ✅ | ❌ |
| Anexo | ✅ | ❌ | ❌ |
| Ofício | ❌ | ✅ | ✅ |

---

### Configuração no Claude Code

Adicionar em `~/.claude.json`:
```json
{
  "mcpServers": {
    "sei-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/nicholasjacob/Documents/Aplicativos/sei-mcp/dist/index.js"],
      "env": {
        "SEI_MCP_WS_PORT": "19999"
      }
    }
  }
}
```

---

## 2026-01-24 — Análise SEI WebServices + Criação sei-playwright

### Resumo
Analisada documentação completa dos SEI WebServices (SOAP) e criada biblioteca standalone `sei-playwright` para uso em agentes automatizados.

### Documentos Analisados

1. **SEI-WebServices-v4.0-2.txt** (113KB)
   - Documentação completa da API SOAP do SEI
   - Todas as estruturas de dados (Andamento, Documento, Procedimento, Bloco, etc.)
   - Todos os métodos disponíveis com parâmetros

2. **Serviços Disponibilizados para outros Sistemas**
   - Configuração de sistemas externos no SEI
   - Validação de IP/hostname
   - Permissões de operações

### Métodos SOAP Descobertos (ainda não implementados no SEI-MCP)

| Método | Descrição |
|--------|-----------|
| `listarTiposProcedimento` | Lista tipos de processo |
| `listarUsuarios` | Lista usuários da unidade |
| `gerarBloco` | Cria bloco de assinatura |
| `consultarBloco` | Consulta bloco |
| `incluirDocumentoBloco` | Adiciona documento ao bloco |
| `excluirDocumentoBloco` | Remove documento do bloco |
| `disponibilizarBloco` | Disponibiliza bloco |
| `cancelarDocumento` | Cancela documento |
| `adicionarArquivo` | Upload em partes (arquivos grandes) |
| `listarAndamentosMarcadores` | Lista andamentos com marcadores |

### Biblioteca sei-playwright Criada

Nova biblioteca em `~/Documents/Aplicativos/sei-playwright/` para automação headless do SEI.

#### Estrutura

```
sei-playwright/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts           # Exports principais
│   ├── types.ts           # Tipos baseados na documentação SOAP
│   ├── client.ts          # Cliente híbrido (SOAP + Browser)
│   ├── soap/
│   │   └── client.ts      # Cliente SOAP nativo
│   └── browser/
│       ├── client.ts      # Cliente Playwright
│       └── selectors.ts   # Seletores CSS do SEI
└── examples/
    └── basic.ts           # Exemplo de uso
```

#### Características

- **Híbrido**: Usa SOAP quando disponível, fallback para Playwright
- **Headless**: Pode rodar sem interface gráfica
- **Containerizável**: Ideal para Docker/Kubernetes
- **Tipos completos**: TypeScript com todas as estruturas do SEI
- **Build**: ESM + CJS + DTS

#### Comparação SEI-MCP vs sei-playwright

| Aspecto | sei-mcp | sei-playwright |
|---------|---------|----------------|
| Execução | Extensão Chrome + MCP | Standalone/Container |
| Headless | ❌ | ✅ |
| Sessão existente | ✅ | ❌ |
| Ideal para | Uso interativo (Claude Code) | Agentes automatizados |
| Dependência | Chrome + Extensão | Playwright apenas |

### Comandos

```bash
# sei-playwright
cd ~/Documents/Aplicativos/sei-playwright
pnpm install
pnpm build

# Exemplo
SEI_USUARIO=x SEI_SENHA=y pnpm example
```

### Próximos Passos

- [x] Adicionar métodos SOAP faltantes ao SEI-MCP ✅
- [ ] Implementar operações de bloco no sei-playwright
- [ ] Testes com instância real do SEI
- [ ] Integrar sei-playwright ao app de minutas

---

## 2026-01-24 — Métodos SOAP Adicionados ao SEI-MCP

### Resumo
Adicionados 7 novos métodos ao SEI-MCP baseados na documentação SOAP WebServices.

### Novos Schemas (`src/tools/all-tools.ts`)

| Método | Descrição |
|--------|-----------|
| `sei_create_block` | Criar bloco de assinatura/interno/reunião |
| `sei_get_block` | Consultar detalhes de um bloco |
| `sei_remove_from_block` | Remover documento de um bloco |
| `sei_release_block` | Disponibilizar bloco para outras unidades |
| `sei_list_users` | Listar usuários da unidade atual |
| `sei_cancel_document` | Cancelar documento no processo |

### Novos Seletores (`extension/content/sei-bridge.js`)

- Seletores de bloco expandidos:
  - `blocks.releaseBtn` — botão disponibilizar
  - `blocks.addDocBtn` — adicionar documento
  - `blocks.removeDocBtn` — remover documento
  - `blocks.form.*` — campos do formulário de bloco

- Seletor de cancelamento:
  - `cancel.btn`, `cancel.motivo`, `cancel.submit`

### Novas Ações no Content Script

1. **`sei_cancel_document`** — Cancela documento com motivo
2. **`sei_create_block`** — Cria bloco completo com:
   - Tipo (assinatura/interno/reunião)
   - Descrição
   - Unidades de disponibilização
   - Documentos iniciais
   - Opção de disponibilizar imediatamente

3. **`sei_get_block`** — Consulta bloco com lista de documentos
4. **`sei_remove_from_block`** — Remove documento do bloco
5. **`sei_release_block`** — Disponibiliza bloco
6. **`sei_list_users`** — Lista usuários da unidade

### Total de Ferramentas

- Antes: ~45 ferramentas
- Agora: **51 ferramentas**

### Arquivos Modificados

- `src/tools/all-tools.ts` — Schemas e definições
- `extension/content/sei-bridge.js` — Seletores e ações

---

## 2026-01-24 — Refatoração para Locators Semânticos ARIA

### Resumo
Refatorado todo o sistema de seletores do SEI-MCP de CSS para locators semânticos baseados em ARIA. Esta mudança torna a automação mais resiliente a mudanças de layout/CSS no SEI.

### Motivação

- Seletores CSS são frágeis (quebram com mudanças de classe/ID)
- Locators semânticos baseados em roles ARIA são mais estáveis
- Compatibilidade com padrão Playwright `getByRole()`
- Melhor acessibilidade e manutenibilidade

### Arquivos Refatorados

1. **`src/sei/selectors.ts`** (TypeScript)
   - Nova interface `SemanticSelector` com `role`, `name`, `fallbackCss`
   - Função helper `role()` para criar locators
   - Todos os seletores convertidos para formato semântico

2. **`extension/content/sei-bridge.js`** (~2100 linhas)
   - Nova função `getByRole(locator)` que implementa busca semântica
   - Nova função `getAllByRole(locator)` para múltiplos elementos
   - Nova função `getAccessibleName(el)` para extrair nome acessível
   - Nova função `matchesName(name, pattern)` para matching com regex
   - Nova função `waitFor(locator, timeout)` para aguardar elementos
   - Todas as 51 ações convertidas para usar locators semânticos

3. **`extension/content/document-upload.js`** (~500 linhas)
   - Mesmas funções `getByRole`, `getAllByRole`, `getAccessibleName`
   - Upload de documentos externos usando locators semânticos

### Padrão de Locator Semântico

```javascript
// Estrutura do locator
const locator = {
  role: 'button',           // ARIA role
  name: /acessar|entrar/i,  // Regex para nome acessível
  fallback: '#sbmLogin'     // CSS fallback (último recurso)
};

// Uso
const el = getByRole(locator);
```

### Roles ARIA Suportados

| Role | Elementos HTML Mapeados |
|------|------------------------|
| `button` | `button`, `input[type="button"]`, `input[type="submit"]`, `[role="button"]` |
| `textbox` | `input[type="text"]`, `input[type="password"]`, `textarea`, `[role="textbox"]` |
| `link` | `a[href]`, `[role="link"]` |
| `combobox` | `select`, `[role="combobox"]` |
| `radio` | `input[type="radio"]`, `[role="radio"]` |
| `checkbox` | `input[type="checkbox"]`, `[role="checkbox"]` |
| `option` | `option`, `[role="option"]` |
| `listbox` | `[role="listbox"]`, `ul`, `ol` |
| `row` | `tr`, `[role="row"]` |
| `cell` | `td`, `th`, `[role="cell"]` |
| `table` | `table`, `[role="table"]` |
| `heading` | `h1-h6`, `[role="heading"]` |
| `dialog` | `dialog`, `[role="dialog"]` |
| `tree` | `[role="tree"]` |
| `treeitem` | `[role="treeitem"]` |
| `menu` | `[role="menu"]`, `nav ul` |
| `menuitem` | `[role="menuitem"]` |
| `tab` | `[role="tab"]` |
| `tabpanel` | `[role="tabpanel"]` |
| `img` | `img`, `[role="img"]` |

### Extração de Nome Acessível

Ordem de prioridade:
1. `aria-label`
2. `aria-labelledby` (texto do elemento referenciado)
3. `title`
4. `placeholder`
5. `<label>` associado (via `for` ou wrapper)
6. `textContent` (para buttons, links)
7. `alt` (para imagens)

### Exemplos de Conversão

**Antes (CSS):**
```javascript
const SEL = {
  login: {
    username: '#txtUsuario',
    password: '#pwdSenha',
    submit: '#sbmLogin'
  }
};
document.querySelector(SEL.login.username);
```

**Depois (ARIA):**
```javascript
const SEL = {
  login: {
    username: { role: 'textbox', name: /usuário|usuario|login/i, fallback: '#txtUsuario' },
    password: { role: 'textbox', name: /senha|password/i, fallback: '#pwdSenha' },
    submit: { role: 'button', name: /acessar|entrar|login/i, fallback: '#sbmLogin' }
  }
};
getByRole(SEL.login.username);
```

### Build Verificado

```bash
pnpm build
# ESM Build success in 114ms
# DTS Build success in 1747ms

node --check extension/content/sei-bridge.js     # OK
node --check extension/content/document-upload.js # OK
```

### Benefícios

1. **Resiliência**: Mudanças de CSS/classes não quebram a automação
2. **Legibilidade**: Código mais declarativo e auto-documentado
3. **Manutenibilidade**: Fácil entender o que cada locator busca
4. **Compatibilidade**: Alinhado com padrões Playwright/Testing Library
5. **Fallback**: CSS ainda disponível como último recurso

### Próximos Passos

- [ ] Testar com instância real do SEI para validar locators
- [ ] Ajustar patterns de nome conforme necessário
- [ ] Remover fallbacks CSS após validação completa
