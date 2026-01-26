# SEI-MCP

MCP (Model Context Protocol) server + extensão Chrome para automação do sistema **SEI!** (Sistema Eletrônico de Informações) via Claude Code.

## Funcionalidades

- **sei_login** - Login automático no SEI
- **sei_search_process** - Busca de processos
- **sei_download_process** - Download de processos em PDF
- **sei_list_documents** - Listagem de documentos
- **sei_create_document** - Criação de documentos
- **sei_sign_document** - Assinatura eletrônica
- **sei_forward_process** - Tramitação de processos
- **sei_get_status** - Consulta de andamento
- **sei_screenshot** - Captura de tela
- **sei_snapshot** - Estado da página (ARIA)

## Arquitetura

```
Claude Code ←→ Servidor MCP ←→ WebSocket ←→ Extensão Chrome ←→ SEI
```

## Driver (Extensão vs Playwright)

Este projeto suporta dois modos de automação:

- `extension` (padrão): usa a extensão Chrome via WebSocket.
- `playwright`: usa Playwright diretamente (sem extensão). Ideal quando você quer abrir o SEI e automatizar sem depender do clique “Conectar”.

Para usar Playwright, defina `SEI_MCP_DRIVER=playwright`.

## Instalação

### Opção 1: Desktop Extension (Recomendado - Um Clique)

1. Baixe o arquivo `sei-mcp.mcpb` da [Releases](https://github.com/nicholasjacob/sei-mcp/releases)
2. No **Claude Desktop**: Settings > Extensions > Advanced settings
3. Clique em **"Install Extension..."**
4. Selecione o arquivo `sei-mcp.mcpb`
5. Pronto!

### Opção 2: Instalação Manual

#### 1. Servidor MCP

```bash
cd sei-mcp
pnpm install
pnpm build
```

#### 2. Configurar no Claude Code

Adicione ao `~/.claude.json`:

```json
{
  "mcpServers": {
    "sei-mcp": {
      "command": "node",
      "args": ["/caminho/para/sei-mcp/dist/index.js"],
      "env": {
        "SEI_MCP_WS_PORT": "19999"
      }
    }
  }
}
```

### Extensão Chrome (Necessária para ambas opções)

1. Abra `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `extension/`

## Uso

1. Inicie o Claude Code
2. Abra o SEI no Chrome
3. Clique no ícone da extensão "SEI-MCP Bridge"
4. Clique em "Conectar"
5. Use comandos no Claude Code:

```
Faça login no SEI com usuário joao.silva e senha 123456

Busque o processo 12345.678901/2024-00

Liste os documentos do processo

Crie um ofício de resposta com o texto: "Em atenção ao solicitado..."
```

### Dicas de navegação (estabilidade)

- Se você tiver mais de uma aba/janela do SEI aberta, use `sei_list_sessions` e passe `session_id` nas chamadas para garantir que os comandos vão para a aba certa.
- Para operações lentas (login, busca, download, assinatura), passe `timeout_ms` (por chamada) ou ajuste o padrão via `SEI_MCP_COMMAND_TIMEOUT_MS`.
- Se houver cliques “perdidos” por falta de foco, chame `sei_focus_window` antes do fluxo.
- Se o SEI ainda não estiver aberto no navegador, você pode usar `sei_open_url` para abrir a URL (não requer extensão; útil antes de conectar).

## Desenvolvimento

```bash
# Servidor (watch mode)
pnpm dev

# Testar conexão
npx @anthropic-ai/mcp-inspector

# Build
pnpm build

# Criar pacote .mcpb (Desktop Extension)
./scripts/build-mcpb.sh
# Ou manualmente:
npm install -g @anthropic-ai/mcpb
mcpb pack build-mcpb sei-mcp.mcpb
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| SEI_MCP_WS_PORT | Porta do WebSocket | 19999 |
| SEI_MCP_COMMAND_TIMEOUT_MS | Timeout padrão de comandos enviados à extensão | 30000 |
| SEI_MCP_LOG_LEVEL | Nível de log (debug/info/warn/error) | info |
| SEI_MCP_DRIVER | `extension` ou `playwright` | extension |
| SEI_MCP_PW_HEADLESS | Playwright headless (1/0) | 1 |
| SEI_MCP_PW_PERSISTENT | Manter perfil (1/0) | 1 |
| SEI_MCP_PW_CHANNEL | Canal do navegador (ex: `chrome`) | (vazio) |
| SEI_MCP_REQUIRE_AUTH | Exigir auth no HTTP (`true/false`) | true |
| SEI_MCP_BEARER_TOKEN | Token estático (Authorization Bearer) | (vazio) |
| SEI_MCP_JWT_SECRET | Segredo JWT para login Google | (vazio) |
| SEI_MCP_PUBLIC_BASE_URL | Base URL pública do servidor HTTP | http://localhost:3100 |
| SEI_MCP_GOOGLE_CLIENT_ID | Google OAuth Client ID | (vazio) |
| SEI_MCP_GOOGLE_CLIENT_SECRET | Google OAuth Client Secret | (vazio) |
| SEI_MCP_STRIPE_SECRET_KEY | Stripe Secret Key | (vazio) |
| SEI_MCP_STRIPE_PRICE_STARTER_MONTHLY | Stripe Price ID Starter | (vazio) |
| SEI_MCP_STRIPE_PRICE_PRO_MONTHLY | Stripe Price ID Pro | (vazio) |

## Segurança

- Senhas são transmitidas apenas localmente (localhost)
- Nenhum dado é enviado para servidores externos
- A extensão só funciona em páginas do SEI

## Compatibilidade

Testado com:
- SEI versão 4.x
- Chrome 120+
- Node.js 18+

## Licença

MIT
