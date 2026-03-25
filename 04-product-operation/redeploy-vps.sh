#!/usr/bin/env bash
# ============================================================================
#  ECP Digital Food — Re-deploy (atualizacao)
#
#  USO: bash /root/redeploy-vps.sh
#
#  Faz: git pull -> copia arquivos -> instala deps -> build -> reload PM2
#  NAO altera: .env, banco de dados, Nginx, SSL
# ============================================================================

set -euo pipefail

APP_DIR="/opt/foodflow"
REPO_DIR="/opt/foodflow-repo"
APP_NAME="foodflow"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}=== ECP Digital Food — Re-deploy ===${NC}"
echo ""

# 1. Pull
echo -e "  [1/5] Git pull..."
cd "$REPO_DIR"
git pull origin main 2>/dev/null || git pull origin master
echo -e "  ${GREEN}OK${NC}"

# 2. Copiar arquivos
echo -e "  [2/5] Copiando arquivos..."
cp -r "$REPO_DIR/03-product-delivery/server" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package.json" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp -r "$REPO_DIR/03-product-delivery/client/src" "$APP_DIR/client/"
cp -r "$REPO_DIR/03-product-delivery/client/public" "$APP_DIR/client/" 2>/dev/null || true
cp "$REPO_DIR/03-product-delivery/client/package.json" "$APP_DIR/client/"
cp "$REPO_DIR/03-product-delivery/client/vite.config.js" "$APP_DIR/client/"
cp "$REPO_DIR/03-product-delivery/client/index.html" "$APP_DIR/client/" 2>/dev/null || true
echo -e "  ${GREEN}OK${NC}"

# 3. Dependencias
echo -e "  [3/5] Instalando dependencias..."
cd "$APP_DIR" && npm install --production --silent 2>&1 | tail -1
cd "$APP_DIR/client" && npm install --silent 2>&1 | tail -1
echo -e "  ${GREEN}OK${NC}"

# 4. Build frontend
echo -e "  [4/5] Build do frontend..."
cd "$APP_DIR/client" && npm run build 2>&1 | tail -1
echo -e "  ${GREEN}OK${NC}"

# 5. Reload PM2
echo -e "  [5/5] Reload PM2..."
pm2 reload "$APP_NAME"
sleep 2

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "  ${GREEN}OK${NC} — API respondendo"
else
    echo -e "  AVISO — API retornou HTTP ${HEALTH}"
    pm2 logs "$APP_NAME" --lines 10 --nostream
fi

echo ""
echo -e "${GREEN}${BOLD}Re-deploy concluido!${NC}"
echo ""
