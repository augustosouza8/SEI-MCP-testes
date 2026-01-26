#!/bin/bash
# Script para empacotar sei-mcp como Desktop Extension (.mcpb)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build-mcpb"
OUTPUT_FILE="$PROJECT_DIR/sei-mcp.mcpb"

echo "=== Empacotando SEI-MCP como Desktop Extension ==="
echo ""

# Limpar build anterior
rm -rf "$BUILD_DIR"
rm -f "$OUTPUT_FILE"

# Criar estrutura de diretórios
mkdir -p "$BUILD_DIR/server"

# 1. Copiar manifest.json
echo "[1/5] Copiando manifest.json..."
cp "$PROJECT_DIR/manifest.json" "$BUILD_DIR/"

# 2. Compilar TypeScript
echo "[2/5] Compilando TypeScript..."
cd "$PROJECT_DIR"
pnpm run build

# 3. Copiar arquivos do servidor
echo "[3/5] Copiando arquivos do servidor..."
cp -r "$PROJECT_DIR/dist/"* "$BUILD_DIR/server/"

# 4. Instalar dependências de produção
echo "[4/5] Instalando dependências de produção..."
cd "$BUILD_DIR/server"
cp "$PROJECT_DIR/package.json" .
npm install --production --ignore-scripts 2>/dev/null || pnpm install --prod --ignore-scripts

# Limpar arquivos desnecessários
rm -f package.json pnpm-lock.yaml package-lock.json

# 5. Criar arquivo .mcpb (ZIP)
echo "[5/5] Criando arquivo .mcpb..."
cd "$BUILD_DIR"
zip -r "$OUTPUT_FILE" . -x "*.DS_Store" -x "__MACOSX/*"

# Limpar
rm -rf "$BUILD_DIR"

echo ""
echo "=== Empacotamento concluído! ==="
echo ""
echo "Arquivo gerado: $OUTPUT_FILE"
echo "Tamanho: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Para instalar no Claude Desktop:"
echo "  1. Abra Claude Desktop"
echo "  2. Vá em Settings > Extensions > Advanced settings"
echo "  3. Clique em 'Install Extension...'"
echo "  4. Selecione o arquivo: sei-mcp.mcpb"
echo ""
