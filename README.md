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

## Instalação

### 1. Servidor MCP

```bash
cd sei-mcp
pnpm install
pnpm build
```

### 2. Extensão Chrome

1. Abra `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `extension/`

### 3. Configurar no Claude Code

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

## Desenvolvimento

```bash
# Servidor (watch mode)
pnpm dev

# Testar conexão
npx @anthropic-ai/mcp-inspector

# Build
pnpm build
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| SEI_MCP_WS_PORT | Porta do WebSocket | 19999 |
| SEI_MCP_LOG_LEVEL | Nível de log (debug/info/warn/error) | info |

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
