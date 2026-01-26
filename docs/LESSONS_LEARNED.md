# SEI-MCP Lessons Learned

## 2026-01-26 — Servidor MCP crashava no Claude Desktop

### Problema
Ao instalar a extensão `.mcpb` no Claude Desktop, aparecia o erro:
> "Não foi possível conectar ao servidor da extensão. Tente desativar e reativar a extensão."

### Causa Raiz
O servidor SEI-MCP tentava abrir um servidor WebSocket na porta 19999 durante a inicialização. Se a porta estivesse em uso (por outra instância ou processo), o servidor lançava um erro `EADDRINUSE` e crashava completamente, impedindo o MCP de funcionar.

O código original rejeitava a Promise no erro:
```typescript
this.wss.on('error', (err) => {
  reject(err);  // Crashava o servidor inteiro
});
```

### Solução
Modificar o tratamento de erro para:
1. Detectar especificamente `EADDRINUSE`
2. Logar um aviso em vez de crashar
3. Continuar funcionando (WebSocket desabilitado, mas MCP operacional)

```typescript
this.wss.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${this.port} already in use...`);
    this.wss = null;
    resolve();  // Não crasha
  }
});
```

### Prevenção
- Sempre tratar erros de rede graciosamente em servidores MCP
- Servidores MCP devem funcionar via stdio mesmo se funcionalidades extras (WebSocket, HTTP) falharem
- Testar instalação do `.mcpb` com várias instâncias rodando simultaneamente

### Arquivos Relacionados
- `src/websocket/server.ts:33-55` (método `start()`)
