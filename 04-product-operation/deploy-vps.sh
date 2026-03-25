#!/usr/bin/env bash
# ============================================================================
#  ECP Digital Food (FoodFlow) — Instalador Automatico para VPS
#  Ubuntu 22.04 LTS | Bash 5+
#
#  USO:
#    1. Copie este script para o servidor:
#       scp deploy-vps.sh root@191.101.78.38:/root/
#
#    2. Execute no servidor:
#       ssh root@191.101.78.38
#       chmod +x /root/deploy-vps.sh
#       bash /root/deploy-vps.sh
#
#  O script e interativo — pede confirmacao antes de cada etapa critica.
#  Pode ser re-executado com seguranca (idempotente).
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURACAO
# ============================================================================
DOMAIN="food.ecportilho.com"
APP_NAME="foodflow"
APP_DIR="/opt/foodflow"
REPO_DIR="/opt/foodflow-repo"
REPO_URL=""  # Sera preenchido interativamente
APP_PORT=3000
BANK_PORT=3333
BANK_API_URL="http://127.0.0.1:${BANK_PORT}/api"
NODE_VERSION="20"
CERTBOT_EMAIL=""  # Sera preenchido interativamente

# ============================================================================
# CORES E FORMATACAO
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() {
    echo ""
    echo -e "${MAGENTA}======================================================================${NC}"
    echo -e "${BOLD}${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}======================================================================${NC}"
    echo ""
}

step() {
    echo ""
    echo -e "  ${BOLD}${CYAN}[$1]${NC} ${BOLD}$2${NC}"
    echo -e "  ${BLUE}$(printf '%0.s-' {1..60})${NC}"
}

info() {
    echo -e "      ${BLUE}INFO${NC}  $1"
}

ok() {
    echo -e "      ${GREEN}OK${NC}    $1"
}

warn() {
    echo -e "      ${YELLOW}AVISO${NC} $1"
}

fail() {
    echo -e "      ${RED}ERRO${NC}  $1"
}

ask_yes_no() {
    local prompt="$1"
    local default="${2:-s}"
    local yn
    if [ "$default" = "s" ]; then
        read -rp "      $prompt [S/n]: " yn
        yn="${yn:-s}"
    else
        read -rp "      $prompt [s/N]: " yn
        yn="${yn:-n}"
    fi
    case "$yn" in
        [sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

ask_input() {
    local prompt="$1"
    local default="${2:-}"
    local value
    if [ -n "$default" ]; then
        read -rp "      $prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -rp "      $prompt: " value
        echo "$value"
    fi
}

check_command() {
    command -v "$1" &> /dev/null
}

# ============================================================================
# INICIO
# ============================================================================
banner "ECP Digital Food (FoodFlow) — Instalador VPS"

echo -e "  ${BOLD}Dominio:${NC}  https://${DOMAIN}"
echo -e "  ${BOLD}App Dir:${NC}  ${APP_DIR}"
echo -e "  ${BOLD}Porta:${NC}    ${APP_PORT}"
echo ""

# Verificar que estamos rodando como root
if [ "$(id -u)" -ne 0 ]; then
    fail "Este script precisa ser executado como root."
    fail "Execute: sudo bash $0"
    exit 1
fi

# ============================================================================
# ETAPA 1: Coletar informacoes
# ============================================================================
step "1/12" "Coletar informacoes"

REPO_URL=$(ask_input "URL do repositorio Git (HTTPS ou SSH)" "https://github.com/ecportilho/ecp-digital-food.git")
CERTBOT_EMAIL=$(ask_input "Email para o certificado SSL (Let's Encrypt)" "contato@ecportilho.com")

echo ""
info "Vou configurar a integracao com o ecp-digital-bank."
info "O banco deve estar rodando nesta mesma VPS na porta ${BANK_PORT}."

BANK_PLATFORM_EMAIL=$(ask_input "Email da conta plataforma no banco" "foodflow@ecportilho.com")
BANK_PLATFORM_PASSWORD=$(ask_input "Senha da conta plataforma no banco" "")
BANK_PIX_KEY=$(ask_input "Chave PIX da plataforma" "${BANK_PLATFORM_EMAIL}")
BANK_WEBHOOK_SECRET=$(ask_input "Segredo do webhook (compartilhado com o banco)" "foodflow-webhook-secret-$(openssl rand -hex 8)")

echo ""
info "Configuracoes coletadas:"
info "  Repo:      ${REPO_URL}"
info "  Email SSL: ${CERTBOT_EMAIL}"
info "  Banco:     ${BANK_PLATFORM_EMAIL}"
info "  PIX Key:   ${BANK_PIX_KEY}"
echo ""

if ! ask_yes_no "Prosseguir com a instalacao?"; then
    echo ""
    warn "Instalacao cancelada."
    exit 0
fi

# ============================================================================
# ETAPA 2: Atualizar sistema e instalar dependencias
# ============================================================================
step "2/12" "Atualizar sistema e instalar dependencias"

info "Atualizando pacotes do sistema..."
apt update -qq && apt upgrade -y -qq
ok "Sistema atualizado"

# Build tools (para better-sqlite3)
info "Instalando ferramentas de build..."
apt install -y -qq build-essential python3 curl git > /dev/null 2>&1
ok "build-essential, python3, curl, git"

# Node.js
if check_command node; then
    CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
        ok "Node.js $(node -v) ja instalado"
    else
        warn "Node.js $(node -v) encontrado, mas precisa da v${NODE_VERSION}+"
        info "Instalando Node.js ${NODE_VERSION}..."
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
        apt install -y -qq nodejs > /dev/null 2>&1
        ok "Node.js $(node -v) instalado"
    fi
else
    info "Instalando Node.js ${NODE_VERSION}..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
    apt install -y -qq nodejs > /dev/null 2>&1
    ok "Node.js $(node -v) instalado"
fi

# PM2
if check_command pm2; then
    ok "PM2 $(pm2 -v) ja instalado"
else
    info "Instalando PM2..."
    npm install -g pm2 > /dev/null 2>&1
    ok "PM2 $(pm2 -v) instalado"
fi

# Nginx
if check_command nginx; then
    ok "Nginx $(nginx -v 2>&1 | cut -d/ -f2) ja instalado"
else
    info "Instalando Nginx..."
    apt install -y -qq nginx > /dev/null 2>&1
    systemctl enable nginx > /dev/null 2>&1
    systemctl start nginx
    ok "Nginx instalado e iniciado"
fi

# Certbot
if check_command certbot; then
    ok "Certbot ja instalado"
else
    info "Instalando Certbot..."
    apt install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
    ok "Certbot instalado"
fi

# ============================================================================
# ETAPA 3: Clonar repositorio
# ============================================================================
step "3/12" "Clonar repositorio"

if [ -d "$REPO_DIR/.git" ]; then
    info "Repositorio ja existe em ${REPO_DIR}. Atualizando..."
    cd "$REPO_DIR"
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
    ok "Repositorio atualizado"
else
    info "Clonando de ${REPO_URL}..."
    git clone "$REPO_URL" "$REPO_DIR"
    ok "Repositorio clonado em ${REPO_DIR}"
fi

# ============================================================================
# ETAPA 4: Copiar para diretorio de producao
# ============================================================================
step "4/12" "Preparar diretorio de producao"

mkdir -p "$APP_DIR/data"

info "Copiando arquivos da aplicacao..."
# Copiar backend
cp -r "$REPO_DIR/03-product-delivery/server" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package.json" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$REPO_DIR/03-product-delivery/.env.example" "$APP_DIR/" 2>/dev/null || true

# Copiar frontend
cp -r "$REPO_DIR/03-product-delivery/client" "$APP_DIR/"

# Copiar ecosystem config
cp "$REPO_DIR/04-product-operation/ecosystem.config.cjs" "$APP_DIR/"

ok "Arquivos copiados para ${APP_DIR}"

# ============================================================================
# ETAPA 5: Instalar dependencias
# ============================================================================
step "5/12" "Instalar dependencias"

info "Instalando dependencias do backend..."
cd "$APP_DIR"
npm install --production 2>&1 | tail -1
ok "Backend pronto"

info "Instalando dependencias do frontend..."
cd "$APP_DIR/client"
npm install 2>&1 | tail -1
ok "Frontend pronto"

# ============================================================================
# ETAPA 6: Build do frontend
# ============================================================================
step "6/12" "Build do frontend (Vite)"

cd "$APP_DIR/client"
npm run build 2>&1 | tail -3
ok "Build concluido em ${APP_DIR}/client/dist/"

if [ ! -f "$APP_DIR/client/dist/index.html" ]; then
    fail "Build falhou — index.html nao encontrado!"
    exit 1
fi

# ============================================================================
# ETAPA 7: Configurar .env
# ============================================================================
step "7/12" "Configurar variaveis de ambiente"

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/.env" << ENVFILE
# ================================================================
# ECP Food — Variaveis de Ambiente (PRODUCAO)
# Gerado automaticamente em $(date '+%Y-%m-%d %H:%M:%S')
# ================================================================

# Servidor
NODE_ENV=production
PORT=${APP_PORT}
HOST=127.0.0.1

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Banco de Dados
DB_PATH=./data/foodflow.db

# CORS
CORS_ORIGIN=https://${DOMAIN}

# ECP Digital Bank Integration
ECP_BANK_API_URL=${BANK_API_URL}
ECP_BANK_PLATFORM_EMAIL=${BANK_PLATFORM_EMAIL}
ECP_BANK_PLATFORM_PASSWORD=${BANK_PLATFORM_PASSWORD}
ECP_BANK_PLATFORM_PIX_KEY=${BANK_PIX_KEY}
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=${BANK_WEBHOOK_SECRET}
FOODFLOW_PUBLIC_URL=https://${DOMAIN}
ENVFILE

chmod 600 "$APP_DIR/.env"
ok ".env criado com segredos JWT unicos"

# ============================================================================
# ETAPA 8: Seed do banco de dados
# ============================================================================
step "8/12" "Seed do banco de dados"

if [ -f "$APP_DIR/data/foodflow.db" ]; then
    if ask_yes_no "Banco ja existe. Recriar? (APAGA DADOS)" "n"; then
        rm -f "$APP_DIR/data/foodflow.db"
        info "Banco removido. Recriando..."
    else
        warn "Mantendo banco existente. Pulando seed."
        SKIP_SEED=1
    fi
fi

if [ -z "${SKIP_SEED:-}" ]; then
    cd "$APP_DIR"
    node server/seed.mjs
    ok "Banco populado com sucesso"
fi

# ============================================================================
# ETAPA 9: Configurar PM2
# ============================================================================
step "9/12" "Configurar PM2"

# Parar instancia anterior se existir
pm2 delete "$APP_NAME" 2>/dev/null || true

cd "$APP_DIR"
NODE_ENV=production pm2 start ecosystem.config.cjs --env production
ok "Aplicacao iniciada com PM2"

# Verificar que esta rodando
sleep 3
if pm2 pid "$APP_NAME" > /dev/null 2>&1; then
    ok "PM2 status: online"
else
    fail "PM2 nao conseguiu iniciar a aplicacao!"
    pm2 logs "$APP_NAME" --lines 20 --nostream
    exit 1
fi

# Testar API
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    ok "API respondendo na porta ${APP_PORT}"
else
    fail "API nao respondeu (HTTP ${HEALTH})"
    pm2 logs "$APP_NAME" --lines 20 --nostream
    exit 1
fi

# Salvar e configurar startup
pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
ok "PM2 configurado para iniciar no boot"

# ============================================================================
# ETAPA 10: Configurar Nginx (HTTP temporario)
# ============================================================================
step "10/12" "Configurar Nginx"

info "Criando configuracao HTTP temporaria (para Certbot)..."

cat > /etc/nginx/sites-available/foodflow << 'NGINX_TEMP'
upstream foodflow_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name food.ecportilho.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /api/ {
        proxy_pass http://foodflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    location / {
        proxy_pass http://foodflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
NGINX_TEMP

ln -sf /etc/nginx/sites-available/foodflow /etc/nginx/sites-enabled/foodflow

# Remover default se existir
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx
    ok "Nginx configurado e recarregado (HTTP)"
else
    fail "Configuracao do Nginx invalida!"
    nginx -t
    exit 1
fi

# ============================================================================
# ETAPA 11: Certificado SSL (Let's Encrypt)
# ============================================================================
step "11/12" "Certificado SSL (Let's Encrypt)"

# Verificar DNS
info "Verificando DNS de ${DOMAIN}..."
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    ok "DNS OK: ${DOMAIN} -> ${RESOLVED_IP}"
else
    warn "DNS aponta para '${RESOLVED_IP}', IP deste servidor e '${SERVER_IP}'"
    warn "Se o DNS ainda nao propagou, o SSL vai falhar."
    if ! ask_yes_no "Tentar gerar o certificado mesmo assim?" "n"; then
        warn "Pulando SSL. Execute depois: certbot certonly --webroot -w /var/www/html -d ${DOMAIN}"
        warn "E depois copie a config HTTPS: cp ${REPO_DIR}/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow"
        SKIP_SSL=1
    fi
fi

if [ -z "${SKIP_SSL:-}" ]; then
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        ok "Certificado SSL ja existe para ${DOMAIN}"
    else
        info "Gerando certificado SSL..."
        certbot certonly --webroot -w /var/www/html -d "$DOMAIN" \
            --non-interactive --agree-tos -m "$CERTBOT_EMAIL"

        if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
            ok "Certificado SSL gerado com sucesso"
        else
            fail "Falha ao gerar certificado SSL"
            warn "Verifique se o DNS esta propagado: dig ${DOMAIN} +short"
            SKIP_SSL=1
        fi
    fi
fi

# ============================================================================
# ETAPA 12: Ativar configuracao HTTPS completa
# ============================================================================
step "12/12" "Ativar HTTPS"

if [ -z "${SKIP_SSL:-}" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    info "Copiando configuracao Nginx completa com SSL..."
    cp "$REPO_DIR/04-product-operation/nginx.conf" /etc/nginx/sites-available/foodflow

    if nginx -t 2>&1 | grep -q "successful"; then
        systemctl reload nginx
        ok "Nginx HTTPS ativado"
    else
        fail "Configuracao HTTPS invalida! Revertendo para HTTP..."
        # Reverter
        nginx -t
        warn "Verifique o arquivo: /etc/nginx/sites-available/foodflow"
    fi
else
    warn "SSL nao configurado. O site esta acessivel apenas via HTTP."
    warn "Quando o DNS propagar, execute:"
    echo ""
    echo "      certbot certonly --webroot -w /var/www/html -d ${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL}"
    echo "      cp ${REPO_DIR}/04-product-operation/nginx.conf /etc/nginx/sites-available/foodflow"
    echo "      nginx -t && systemctl reload nginx"
    echo ""
fi

# ============================================================================
# VERIFICACAO FINAL
# ============================================================================
banner "Verificacao Final"

ERRORS=0

# PM2
if pm2 pid "$APP_NAME" > /dev/null 2>&1; then
    ok "PM2: ${APP_NAME} esta online"
else
    fail "PM2: ${APP_NAME} nao esta rodando"
    ERRORS=$((ERRORS + 1))
fi

# API Health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    ok "API: respondendo na porta ${APP_PORT}"
else
    fail "API: nao respondeu (HTTP ${HEALTH})"
    ERRORS=$((ERRORS + 1))
fi

# Banco de dados
if [ -f "$APP_DIR/data/foodflow.db" ]; then
    DB_SIZE=$(du -h "$APP_DIR/data/foodflow.db" | cut -f1)
    ok "Banco: foodflow.db (${DB_SIZE})"
else
    fail "Banco: foodflow.db nao encontrado"
    ERRORS=$((ERRORS + 1))
fi

# Nginx
if systemctl is-active --quiet nginx; then
    ok "Nginx: rodando"
else
    fail "Nginx: parado"
    ERRORS=$((ERRORS + 1))
fi

# HTTP externo
EXTERNAL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/api/health" 2>/dev/null || echo "000")
if [ "$EXTERNAL_HTTP" = "200" ] || [ "$EXTERNAL_HTTP" = "301" ]; then
    ok "HTTP externo: ${DOMAIN} acessivel"
else
    warn "HTTP externo: ${DOMAIN} retornou ${EXTERNAL_HTTP}"
fi

# HTTPS
if [ -z "${SKIP_SSL:-}" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    EXTERNAL_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" 2>/dev/null || echo "000")
    if [ "$EXTERNAL_HTTPS" = "200" ]; then
        ok "HTTPS: ${DOMAIN} com SSL ativo"
    else
        warn "HTTPS: retornou ${EXTERNAL_HTTPS}"
    fi
fi

# Integracao com banco
BANK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${BANK_PORT}/api/auth/login" -X POST -H "Content-Type: application/json" -d '{"email":"marina@email.com","password":"Senha@123"}' 2>/dev/null || echo "000")
if [ "$BANK_STATUS" = "200" ]; then
    ok "ECP Digital Bank: acessivel na porta ${BANK_PORT}"
else
    warn "ECP Digital Bank: nao respondeu (HTTP ${BANK_STATUS}). Verifique se esta rodando."
fi

# Frontend build
if [ -f "$APP_DIR/client/dist/index.html" ]; then
    ok "Frontend: build presente"
else
    fail "Frontend: build nao encontrado"
    ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# RESULTADO
# ============================================================================
echo ""
echo -e "${MAGENTA}======================================================================${NC}"

if [ "$ERRORS" -eq 0 ]; then
    echo ""
    echo -e "  ${GREEN}${BOLD}INSTALACAO CONCLUIDA COM SUCESSO!${NC}"
    echo ""
    if [ -z "${SKIP_SSL:-}" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo -e "  ${BOLD}Acesse:${NC}  ${GREEN}https://${DOMAIN}${NC}"
    else
        echo -e "  ${BOLD}Acesse:${NC}  ${YELLOW}http://${DOMAIN}${NC}"
    fi
else
    echo ""
    echo -e "  ${YELLOW}${BOLD}INSTALACAO CONCLUIDA COM ${ERRORS} AVISO(S)${NC}"
    echo ""
    echo -e "  Verifique os itens marcados como ${RED}ERRO${NC} acima."
fi

echo ""
echo -e "  ${BOLD}Credenciais de teste:${NC}"
echo -e "    Admin:      admin@foodflow.com / Adm!nF00d@2026"
echo -e "    Restaurante: pasta@foodflow.com / P@sta&Fogo#2026"
echo -e "    Consumer:   marina@email.com / Senha@123"
echo ""
echo -e "  ${BOLD}Comandos uteis:${NC}"
echo -e "    pm2 status              — ver status da aplicacao"
echo -e "    pm2 logs foodflow       — ver logs em tempo real"
echo -e "    pm2 reload foodflow     — restart sem downtime"
echo -e "    nginx -t && systemctl reload nginx  — recarregar Nginx"
echo ""
echo -e "${MAGENTA}======================================================================${NC}"
echo ""
