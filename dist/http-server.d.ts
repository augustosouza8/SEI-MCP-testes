/**
 * HTTP Server com Streamable HTTP Transport
 *
 * Expõe o MCP via HTTP para conexão com extensões Chrome (mcp-chrome)
 * e outros clientes que usam Streamable HTTP.
 */
declare function runHttpServer(): Promise<void>;

export { runHttpServer };
