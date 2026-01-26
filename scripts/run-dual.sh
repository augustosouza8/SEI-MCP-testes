#!/bin/bash
# Roda ambos os servidores: Playwright (3100) + Extension (3101)

cd "$(dirname "$0")/.."

echo "=== SEI-MCP Dual Mode ==="
echo "Playwright: http://localhost:3100"
echo "Extension:  http://localhost:3101 (WS: 19999)"
echo ""

# Verifica se .env existe
if [ ! -f .env ]; then
    echo "ERRO: .env não encontrado. Copie .env.example para .env e configure."
    exit 1
fi

# Carrega .env
set -a
source .env
set +a

# Instância Playwright (porta 3100)
echo "[1/2] Iniciando Playwright (porta 3100)..."
SEI_MCP_DRIVER=playwright \
SEI_MCP_HTTP_PORT=3100 \
SEI_MCP_PUBLIC_BASE_URL=http://localhost:3100 \
pnpm start:http &
PID_PW=$!

sleep 2

# Instância Extension (porta 3101, WS 19999)
echo "[2/2] Iniciando Extension (porta 3101, WS 19999)..."
SEI_MCP_DRIVER=extension \
SEI_MCP_HTTP_PORT=3101 \
SEI_MCP_PUBLIC_BASE_URL=http://localhost:3101 \
SEI_MCP_WS_PORT=19999 \
pnpm start:http &
PID_EXT=$!

echo ""
echo "=== Servidores rodando ==="
echo "Playwright PID: $PID_PW"
echo "Extension PID:  $PID_EXT"
echo ""
echo "Para parar: kill $PID_PW $PID_EXT"
echo ""
echo "Configure a extensão Chrome para ws://localhost:19999"
echo ""

# Aguarda qualquer processo terminar
wait -n
echo "Um dos servidores parou. Encerrando..."
kill $PID_PW $PID_EXT 2>/dev/null
