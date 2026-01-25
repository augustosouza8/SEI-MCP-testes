# SEI-MCP Development Log

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
