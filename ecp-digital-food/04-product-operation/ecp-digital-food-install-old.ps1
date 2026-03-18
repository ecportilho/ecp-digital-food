# ============================================================================
#  ECP Food v1.0  -  Script de Instalacao Completo
#  Windows 11 | PowerShell 5.1+
#  Executar: PowerShell -ExecutionPolicy Bypass -File .\ecp-digital-food-install.ps1
# ============================================================================

# --- Configuracao ---
$ErrorActionPreference = "Continue"
$HOST_API = "http://localhost:3000"
$HOST_WEB = "http://localhost:5174"

# --- Cores e formatacao ---
function Write-Banner($text) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkMagenta
    Write-Host "  $text" -ForegroundColor Magenta
    Write-Host ("=" * 70) -ForegroundColor DarkMagenta
    Write-Host ""
}

function Write-Step($number, $text) {
    Write-Host ""
    Write-Host "  [$number] $text" -ForegroundColor White -BackgroundColor DarkMagenta
    Write-Host ("  " + ("-" * 60)) -ForegroundColor DarkGray
}

function Write-SubStep($text) {
    Write-Host "      > $text" -ForegroundColor Gray
}

function Write-Ok($text) {
    Write-Host "      [OK] $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "      [FALHA] $text" -ForegroundColor Red
}

function Write-Warn($text) {
    Write-Host "      [AVISO] $text" -ForegroundColor Yellow
}

function Write-Info($text) {
    Write-Host "      [INFO] $text" -ForegroundColor DarkMagenta
}

function Pause-Step($message) {
    Write-Host ""
    Write-Host "  >> $message" -ForegroundColor Yellow
    Write-Host "     Pressione ENTER para continuar ou Ctrl+C para abortar..." -ForegroundColor DarkYellow
    Read-Host
}

function Test-Command($cmd) {
    try {
        $null = Get-Command $cmd -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
#  INICIO
# ============================================================================

Clear-Host
Write-Banner "ECP Food v1.0  -  Instalacao Completa"
Write-Host "  Sistema:   Windows 11 + PowerShell" -ForegroundColor Gray
Write-Host "  Stack:     Node.js + Fastify + SQLite3 + React + Vite" -ForegroundColor Gray
Write-Host "  Tema:      Midnight Express (Dark Mode Premium)" -ForegroundColor Gray
Write-Host "  Data:      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# --- Detectar diretorio do projeto ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Se o script esta em 04-product-operation, o projeto esta um nivel acima
if (Test-Path "$projectRoot\package.json") {
    $PROJECT_DIR = $projectRoot
} elseif (Test-Path ".\package.json") {
    $PROJECT_DIR = (Get-Location).Path
} else {
    # Tentar o caminho padrao
    $PROJECT_DIR = "C:\Users\$env:USERNAME\projetos_git\ecp-digital-food"
}

Write-Host "  Projeto:   $PROJECT_DIR" -ForegroundColor Gray

if (-not (Test-Path "$PROJECT_DIR\package.json")) {
    Write-Fail "Diretorio do projeto nao encontrado em: $PROJECT_DIR"
    Write-Host "     Verifique o caminho e tente novamente." -ForegroundColor Red
    exit 1
}

Set-Location $PROJECT_DIR
Write-Ok "Diretorio do projeto localizado"
Write-Host ""

# ============================================================================
#  FASE 1  -  VERIFICACAO DE PRE-REQUISITOS
# ============================================================================

Write-Banner "FASE 1 / 6  -  Verificacao de Pre-requisitos"

$prereqOk = $true

# --- 1.1 Node.js ---
Write-Step "1.1" "Node.js (requerido: >= 20)"

if (Test-Command "node") {
    $nodeVersion = (node --version 2>$null)
    Write-SubStep "Versao encontrada: $nodeVersion"

    $major = [int]($nodeVersion -replace 'v','').Split('.')[0]
    if ($major -ge 20) {
        Write-Ok "Node.js $nodeVersion  -  compativel"
    } else {
        Write-Fail "Node.js $nodeVersion  -  versao muito antiga (minimo: 20)"
        $prereqOk = $false
    }
} else {
    Write-Fail "Node.js nao encontrado no PATH"
    Write-Info "Instale com: winget install OpenJS.NodeJS.LTS"
    $prereqOk = $false
}

# --- 1.2 npm ---
Write-Step "1.2" "npm"

if (Test-Command "npm") {
    $npmVersion = (npm --version 2>$null)
    Write-Ok "npm $npmVersion"
} else {
    Write-Fail "npm nao encontrado (deveria vir com o Node.js)"
    $prereqOk = $false
}

# --- 1.3 Python ---
Write-Step "1.3" "Python 3 (requerido para compilar better-sqlite3)"

$pythonCmd = $null
if (Test-Command "python") {
    $pyVer = (python --version 2>$null)
    if ($pyVer -match "Python 3") {
        $pythonCmd = "python"
        Write-Ok "$pyVer"
    }
}
if (-not $pythonCmd -and (Test-Command "python3")) {
    $pyVer = (python3 --version 2>$null)
    if ($pyVer -match "Python 3") {
        $pythonCmd = "python3"
        Write-Ok "$pyVer"
    }
}
if (-not $pythonCmd) {
    Write-Fail "Python 3 nao encontrado no PATH"
    Write-Info "Instale com: winget install Python.Python.3.12"
    Write-Info "Marque 'Add Python to PATH' durante a instalacao"
    $prereqOk = $false
}

# --- 1.4 Git ---
Write-Step "1.4" "Git"

if (Test-Command "git") {
    $gitVersion = (git --version 2>$null)
    Write-Ok "$gitVersion"
} else {
    Write-Fail "Git nao encontrado"
    Write-Info "Instale com: winget install Git.Git"
    $prereqOk = $false
}

# --- 1.5 Visual Studio Build Tools ---
Write-Step "1.5" "Visual Studio Build Tools (compilador C++)"

$vsInstalls = @(
    @{ Year = "2026"; InternalVer = "18"; Editions = @("BuildTools","Professional","Community","Enterprise") },
    @{ Year = "2022"; InternalVer = "2022"; Editions = @("BuildTools","Professional","Community","Enterprise") }
)
$detectedVsYear = $null
$detectedVsPath = $null

foreach ($vs in $vsInstalls) {
    foreach ($edition in $vs.Editions) {
        $p86 = "C:\Program Files (x86)\Microsoft Visual Studio\$($vs.InternalVer)\$edition"
        $p64 = "C:\Program Files\Microsoft Visual Studio\$($vs.InternalVer)\$edition"
        if (Test-Path $p86) { $detectedVsYear = $vs.Year; $detectedVsPath = $p86; break }
        if (Test-Path $p64) { $detectedVsYear = $vs.Year; $detectedVsPath = $p64; break }
    }
    if ($detectedVsYear) { break }
}

if ($detectedVsYear) {
    Write-Ok "Visual Studio $detectedVsYear encontrado em: $detectedVsPath"
    $msbuildPath = Get-ChildItem -Path $detectedVsPath -Recurse -Filter "MSBuild.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($msbuildPath) {
        Write-Ok "MSBuild encontrado: $($msbuildPath.DirectoryName)"
    } else {
        Write-Warn "MSBuild nao localizado - workload C++ pode nao estar instalado"
        Write-Info "Abra o Visual Studio Installer e instale 'Desktop development with C++'"
    }
} else {
    Write-Warn "Visual Studio Build Tools nao encontrado no caminho padrao"
    Write-Info "Instale com: winget install Microsoft.VisualStudio.2022.BuildTools"
    Write-Info "Depois instale o workload 'Desktop development with C++'"
}

# --- 1.6 npm config ---
Write-Step "1.6" "Configuracao do npm (msvs_version)"

$targetMsvs = if ($detectedVsYear) { $detectedVsYear } else { "2022" }
$currentMsvs = (npm config get msvs_version 2>$null)
if ($currentMsvs -eq $targetMsvs) {
    Write-Ok "npm msvs_version ja configurado: $targetMsvs"
} else {
    Write-SubStep "Configurando npm msvs_version = $targetMsvs..."
    npm config set msvs_version $targetMsvs 2>$null
    Write-Ok "npm msvs_version configurado para $targetMsvs"
}

if ($pythonCmd) {
    Write-SubStep "Configurando npm python = $pythonCmd..."
    npm config set python $pythonCmd 2>$null
    Write-Ok "npm python configurado para $pythonCmd"
}

# --- 1.7 Estrutura do projeto ---
Write-Step "1.7" "Estrutura do projeto ECP Food"

$requiredFiles = @(
    "package.json",
    "server\index.mjs",
    "server\database.mjs",
    "server\seed.mjs",
    "server\config.mjs",
    "server\auth.mjs",
    "server\routes\auth.routes.mjs",
    "server\routes\restaurant.routes.mjs",
    "server\routes\cart.routes.mjs",
    "server\routes\order.routes.mjs",
    "server\routes\payment.routes.mjs",
    "server\services\payment.service.mjs",
    "server\services\bank-integration.mjs",
    "server\services\webhook-handler.mjs",
    "server\services\sse-manager.mjs",
    "client\package.json",
    "client\index.html",
    "client\vite.config.js",
    "client\src\main.jsx",
    "client\src\App.jsx"
)

$missingFiles = @()
foreach ($f in $requiredFiles) {
    if (Test-Path "$PROJECT_DIR\$f") {
        Write-SubStep "$f"
    } else {
        Write-Fail "Arquivo nao encontrado: $f"
        $missingFiles += $f
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Ok "Todos os $($requiredFiles.Count) arquivos criticos presentes"
} else {
    Write-Fail "$($missingFiles.Count) arquivo(s) faltando  -  o projeto pode estar incompleto"
    $prereqOk = $false
}

# --- Resumo pre-requisitos ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta
if ($prereqOk) {
    Write-Host "  RESULTADO: Todos os pre-requisitos atendidos" -ForegroundColor Green
} else {
    Write-Host "  RESULTADO: Ha pre-requisitos pendentes (veja acima)" -ForegroundColor Red
    Write-Host "  Corrija os itens marcados [FALHA] e execute o script novamente." -ForegroundColor Yellow
}
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta

Pause-Step "Revise os pre-requisitos acima"

if (-not $prereqOk) {
    Write-Host ""
    Write-Warn "Pre-requisitos nao atendidos. Deseja continuar mesmo assim? (S/N)"
    $resp = Read-Host "  Resposta"
    if ($resp -notmatch "^[sS]") {
        Write-Host "  Instalacao cancelada pelo usuario." -ForegroundColor Yellow
        exit 1
    }
}

# ============================================================================
#  FASE 2  -  INSTALACAO DE DEPENDENCIAS
# ============================================================================

Write-Banner "FASE 2 / 6  -  Instalacao de Dependencias"

# --- 2.1 Server ---
Write-Step "2.1" "Dependencias do server (Fastify, better-sqlite3, bcryptjs, JWT)"
Write-SubStep "Executando: npm install"
Write-Warn "Este passo compila better-sqlite3 com node-gyp  -  pode levar 1-2 min"

Set-Location $PROJECT_DIR

# Garantir pasta data/ existe
if (-not (Test-Path "$PROJECT_DIR\data")) {
    New-Item -ItemType Directory -Path "$PROJECT_DIR\data" -Force | Out-Null
    Write-SubStep "Pasta data/ criada"
}

Write-Host ""
npm install 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""

# Verificacoes do server
$serverChecks = @(
    @{ name = "better-sqlite3 (binario nativo)"; path = "node_modules\better-sqlite3\build\Release\better_sqlite3.node" },
    @{ name = "fastify";                          path = "node_modules\fastify" },
    @{ name = "@fastify/cors";                    path = "node_modules\@fastify\cors" },
    @{ name = "@fastify/helmet";                  path = "node_modules\@fastify\helmet" },
    @{ name = "@fastify/rate-limit";              path = "node_modules\@fastify\rate-limit" },
    @{ name = "@fastify/static";                  path = "node_modules\@fastify\static" },
    @{ name = "@sinclair/typebox";                path = "node_modules\@sinclair\typebox" },
    @{ name = "bcryptjs";                         path = "node_modules\bcryptjs" },
    @{ name = "jsonwebtoken";                     path = "node_modules\jsonwebtoken" }
)

$serverOk = $true
foreach ($check in $serverChecks) {
    if (Test-Path $check.path) {
        Write-Ok $check.name
    } else {
        Write-Fail "$($check.name)  -  nao encontrado"
        $serverOk = $false
    }
}

if (-not $serverOk) {
    Write-Fail "Algumas dependencias do server nao foram instaladas corretamente"
    Write-Info "Verifique os erros acima. Problema mais comum: node-gyp sem Build Tools C++"
}

# --- 2.2 Client ---
Write-Step "2.2" "Dependencias do client (React, Vite, React Router, Lucide)"
Write-SubStep "Executando: npm install (client/)"
Write-Host ""

Set-Location "$PROJECT_DIR\client"
npm install 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""

$webChecks = @(
    @{ name = "react";             path = "node_modules\react" },
    @{ name = "react-dom";         path = "node_modules\react-dom" },
    @{ name = "react-router-dom";  path = "node_modules\react-router-dom" },
    @{ name = "lucide-react";      path = "node_modules\lucide-react" },
    @{ name = "vite";              path = "node_modules\vite" },
    @{ name = "@vitejs/plugin-react"; path = "node_modules\@vitejs\plugin-react" }
)

$webOk = $true
foreach ($check in $webChecks) {
    if (Test-Path $check.path) {
        Write-Ok $check.name
    } else {
        Write-Fail "$($check.name)  -  nao encontrado"
        $webOk = $false
    }
}

Set-Location $PROJECT_DIR

# --- Resumo ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta
Write-Host "  node_modules raiz:   $(if (Test-Path 'node_modules') { 'OK' } else { 'FALHA' })" -ForegroundColor $(if (Test-Path 'node_modules') { 'Green' } else { 'Red' })
Write-Host "  node_modules client: $(if (Test-Path 'client\node_modules') { 'OK' } else { 'FALHA' })" -ForegroundColor $(if (Test-Path 'client\node_modules') { 'Green' } else { 'Red' })
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta

Pause-Step "Revise a instalacao de dependencias"

# ============================================================================
#  FASE 3  -  CONFIGURACAO DE AMBIENTE
# ============================================================================

Write-Banner "FASE 3 / 6  -  Configuracao de Ambiente"

Write-Step "3.1" "Arquivo .env"

$envFile = "$PROJECT_DIR\.env"

if (Test-Path $envFile) {
    Write-Warn "Arquivo .env ja existe  -  mantendo o existente"
    Write-SubStep "Conteudo atual:"
    Get-Content $envFile | ForEach-Object { Write-Host "      | $_" -ForegroundColor DarkGray }
} else {
    Write-SubStep "Criando .env com valores de desenvolvimento..."

    $envContent = @"
# ECP Food  -  Variaveis de Ambiente (Desenvolvimento)
# Gerado automaticamente pelo script de instalacao em $(Get-Date -Format 'yyyy-MM-dd HH:mm')

# Servidor
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# JWT (NUNCA use estes valores em producao!)
JWT_SECRET=foodflow-dev-jwt-secret-change-in-production-64chars-minimum
JWT_REFRESH_SECRET=foodflow-dev-refresh-secret-change-in-production-64chars-min

# Banco de Dados
DB_PATH=./data/foodflow.db

# CORS
CORS_ORIGIN=http://localhost:5174

# ECP Digital Bank Integration
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=dev-webhook-secret
FOODFLOW_PUBLIC_URL=http://localhost:3000
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $envContent, $utf8NoBom)
    Write-Ok "Arquivo .env criado"
    Write-SubStep "Conteudo:"
    Get-Content $envFile | ForEach-Object { Write-Host "      | $_" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Step "3.2" "Resumo da configuracao"
Write-Info "API:        $HOST_API"
Write-Info "Frontend:   $HOST_WEB"
Write-Info "Banco:      data/foodflow.db (arquivo local SQLite)"
Write-Info "JWT:        Secret de desenvolvimento (trocar em producao!)"
Write-Info "Proxy:      Vite redireciona /api/* para a API automaticamente"
Write-Info "Banco ECP:  https://bank.ecportilho.com (integracao PIX + Cartao)"

# ============================================================================
#  FASE 4  -  BANCO DE DADOS
# ============================================================================

Write-Banner "FASE 4 / 6  -  Banco de Dados (SQLite3)"

# --- 4.1 Limpar banco existente ---
Write-Step "4.1" "Verificar banco existente"

$dbFile = "$PROJECT_DIR\data\foodflow.db"
if (Test-Path $dbFile) {
    $dbSize = [math]::Round((Get-Item $dbFile).Length / 1KB, 1)
    Write-Warn "Banco ja existe ($dbSize KB)"
    Write-Host ""
    Write-Host "      Deseja recriar o banco do zero? (S/N)" -ForegroundColor Yellow
    $resp = Read-Host "      Resposta"
    if ($resp -match "^[sS]") {
        Write-SubStep "Removendo banco existente..."
        Remove-Item "$PROJECT_DIR\data\foodflow.db" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\data\foodflow.db-wal" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\data\foodflow.db-shm" -ErrorAction SilentlyContinue
        Write-Ok "Banco removido"
    } else {
        Write-Info "Mantendo banco existente"
    }
} else {
    Write-Info "Nenhum banco existente  -  sera criado agora"
}

# --- 4.2 Migrations (criacao de tabelas) ---
Write-Step "4.2" "Executar migrations (criar 12 tabelas e indices)"
Write-SubStep "Executando: npm run migrate"
Write-Host ""

Set-Location $PROJECT_DIR
$migrateOutput = npm run migrate 2>&1
$migrateOutput | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""

if (Test-Path $dbFile) {
    $dbSize = [math]::Round((Get-Item $dbFile).Length / 1KB, 1)
    Write-Ok "Banco criado: data/foodflow.db ($dbSize KB)"
} else {
    Write-Fail "Banco nao foi criado  -  verifique erros acima"
}

# --- 4.3 Seed ---
Write-Step "4.3" "Popular banco com dados de demonstracao (seed)"
Write-SubStep "Executando: npm run seed"
Write-SubStep "Criando: 7 categorias, 6 restaurantes, 41 itens, 2 cupons, 3 usuarios"
Write-Host ""

Set-Location $PROJECT_DIR
$seedOutput = npm run seed 2>&1
$seedOutput | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""

$seedOutputStr = $seedOutput -join "`n"
if ($seedOutputStr -match "Seed complete|seed.*success|seeded") {
    Write-Ok "Seed executado com sucesso"
} else {
    Write-Warn "Verifique a saida acima  -  seed pode ter falhado"
}

Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta
Write-Host "  DADOS DE TESTE" -ForegroundColor Magenta
Write-Host "" -ForegroundColor White
Write-Host "  Consumidor:   user@foodflow.com / Us3r$Food!2026" -ForegroundColor White
Write-Host "  Restaurante:  pasta@foodflow.com / P@sta&Fogo#2026" -ForegroundColor White
Write-Host "  Admin:        admin@foodflow.com / Adm!nF00d@2026" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "  Restaurantes: Pasta & Fogo, Sushi Wave, Burger Lab," -ForegroundColor Gray
Write-Host "                Green Bowl Co., Pizza Club 24h, Brasa & Lenha" -ForegroundColor Gray
Write-Host "  Cupons:       MVP10 (10%), FRETEGRATIS" -ForegroundColor Gray
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta

Pause-Step "Banco de dados configurado  -  revise os dados acima"

# ============================================================================
#  FASE 5  -  SUBIR A APLICACAO
# ============================================================================

Write-Banner "FASE 5 / 6  -  Subir a Aplicacao"

# --- Verificar portas ---
Write-Step "5.1" "Verificar portas disponiveis"

$port3000 = netstat -ano 2>$null | Select-String ":3000\s" | Select-String "LISTENING"
$port5174 = netstat -ano 2>$null | Select-String ":5174\s" | Select-String "LISTENING"

if ($port3000) {
    Write-Warn "Porta 3000 ja esta em uso!"
    Write-SubStep ($port3000 | Out-String).Trim()
    Write-Info "Mate o processo ou altere PORT no .env"
} else {
    Write-Ok "Porta 3000 disponivel"
}

if ($port5174) {
    Write-Warn "Porta 5174 ja esta em uso!"
    Write-SubStep ($port5174 | Out-String).Trim()
} else {
    Write-Ok "Porta 5174 disponivel"
}

# --- Iniciar servidor API ---
Write-Step "5.2" "Iniciando API Fastify (porta 3000)"
Write-SubStep "Executando: npm run dev (em background)"

Set-Location $PROJECT_DIR
$serverJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm","run","dev" `
    -WorkingDirectory $PROJECT_DIR `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$PROJECT_DIR\server-stdout.log" `
    -RedirectStandardError "$PROJECT_DIR\server-stderr.log"

Write-SubStep "Processo iniciado (PID: $($serverJob.Id))"
Write-SubStep "Aguardando API ficar pronta..."

$apiReady = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r      Tentativa $i/30..." -NoNewline -ForegroundColor DarkGray
    try {
        $health = Invoke-RestMethod "$HOST_API/health" -TimeoutSec 2 -ErrorAction Stop
        if ($health.status -eq "ok" -or $health) {
            $apiReady = $true
            break
        }
    } catch {
        # API ainda nao esta pronta
    }
}
Write-Host ""

if ($apiReady) {
    Write-Ok "API Fastify rodando em $HOST_API"
    Write-Ok "Health check: OK"
} else {
    Write-Fail "API nao respondeu em 30 segundos"

    if (Test-Path "$PROJECT_DIR\server-stderr.log") {
        $errLog = Get-Content "$PROJECT_DIR\server-stderr.log" -Raw -ErrorAction SilentlyContinue
        if ($errLog) {
            Write-Host ""
            Write-SubStep "Ultimas linhas do log de erro:"
            ($errLog -split "`n" | Select-Object -Last 10) | ForEach-Object { Write-Host "      | $_" -ForegroundColor Red }
        }
    }
    Write-Info "Verifique os logs:"
    Write-Info "  Get-Content server-stdout.log"
    Write-Info "  Get-Content server-stderr.log"
}

# --- Iniciar frontend ---
Write-Step "5.3" "Iniciando Frontend Vite (porta 5174)"
Write-SubStep "Executando: npm run dev (client/) em background"

$webJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","cd","client","&&","npm","run","dev" `
    -WorkingDirectory $PROJECT_DIR `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$PROJECT_DIR\client-stdout.log" `
    -RedirectStandardError "$PROJECT_DIR\client-stderr.log"

Write-SubStep "Processo iniciado (PID: $($webJob.Id))"
Write-SubStep "Aguardando frontend ficar pronto..."

$webReady = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r      Tentativa $i/30..." -NoNewline -ForegroundColor DarkGray
    try {
        $null = Invoke-WebRequest "$HOST_WEB" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $webReady = $true
        break
    } catch {
        # Frontend ainda nao esta pronto
    }
}
Write-Host ""

if ($webReady) {
    Write-Ok "Frontend Vite rodando em $HOST_WEB"
} else {
    Write-Warn "Frontend nao respondeu em 30 segundos  -  pode estar compilando"
    Write-Info "Verifique: Get-Content client-stdout.log"
}

# --- Resumo ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta
Write-Host "  API:      $HOST_API $(if ($apiReady) { '[ ONLINE ]' } else { '[ OFFLINE ]' })" -ForegroundColor $(if ($apiReady) { 'Green' } else { 'Red' })
Write-Host "  Frontend: $HOST_WEB $(if ($webReady) { '[ ONLINE ]' } else { '[ AGUARDANDO ]' })" -ForegroundColor $(if ($webReady) { 'Green' } else { 'Yellow' })
Write-Host "  API PID:  $($serverJob.Id)" -ForegroundColor Gray
Write-Host "  Web PID:  $($webJob.Id)" -ForegroundColor Gray
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkMagenta

Pause-Step "Aplicacao iniciada  -  revise o status acima"

# ============================================================================
#  FASE 6  -  SMOKE TEST
# ============================================================================

Write-Banner "FASE 6 / 6  -  Smoke Test (Validacao Completa)"

$passed = 0
$failed = 0
$total = 12

function Test-Endpoint($name, $scriptBlock) {
    try {
        $result = & $scriptBlock
        if ($result) {
            Write-Ok $name
            return $true
        } else {
            Write-Fail $name
            return $false
        }
    } catch {
        Write-Fail "$name  -  $($_.Exception.Message)"
        return $false
    }
}

# --- 6.1 Health ---
Write-Step "6.1" "Health Check"
if (Test-Endpoint "GET /health" {
    $r = Invoke-RestMethod "$HOST_API/health" -TimeoutSec 5 -ErrorAction Stop
    Write-SubStep "Resposta recebida com sucesso"
    return $true
}) { $passed++ } else { $failed++ }

# --- 6.2 Login consumidor ---
Write-Step "6.2" "Autenticacao (Login Consumidor)"
$token = $null
if (Test-Endpoint "POST /api/auth/login (user@foodflow.com)" {
    $body = '{"email":"user@foodflow.com","password":"Us3r$Food!2026"}'
    $r = Invoke-RestMethod "$HOST_API/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
    if ($r.data -and $r.data.token) {
        $script:token = $r.data.token
    } elseif ($r.token) {
        $script:token = $r.token
    }
    Write-SubStep "Token obtido com sucesso"
    return $null -ne $script:token
}) { $passed++ } else { $failed++ }

if (-not $token) {
    Write-Fail "Sem token JWT  -  nao e possivel testar endpoints protegidos"
    Write-Info "Verifique se o seed foi executado corretamente"
    $failed += 10
} else {
    $headers = @{ Authorization = "Bearer $token" }

    # --- 6.3 Categorias ---
    Write-Step "6.3" "Categorias"
    if (Test-Endpoint "GET /api/categories" {
        $r = Invoke-RestMethod "$HOST_API/api/categories" -TimeoutSec 5 -ErrorAction Stop
        $data = if ($r.data) { $r.data } else { $r }
        $count = if ($data -is [array]) { $data.Count } else { 1 }
        Write-SubStep "Categorias encontradas: $count"
        return $count -ge 6
    }) { $passed++ } else { $failed++ }

    # --- 6.4 Restaurantes ---
    Write-Step "6.4" "Restaurantes"
    if (Test-Endpoint "GET /api/restaurants" {
        $r = Invoke-RestMethod "$HOST_API/api/restaurants" -TimeoutSec 5 -ErrorAction Stop
        $data = if ($r.data) { $r.data } else { $r }
        $items = if ($data.restaurants) { $data.restaurants } elseif ($data -is [array]) { $data } else { @($data) }
        Write-SubStep "Restaurantes encontrados: $($items.Count)"
        return $items.Count -ge 5
    }) { $passed++ } else { $failed++ }

    # --- 6.5 Detalhe restaurante ---
    Write-Step "6.5" "Detalhe Restaurante + Cardapio"
    if (Test-Endpoint "GET /api/restaurants/rest_pasta" {
        $r = Invoke-RestMethod "$HOST_API/api/restaurants/rest_pasta" -TimeoutSec 5 -ErrorAction Stop
        $data = if ($r.data) { $r.data } else { $r }
        $name = if ($data.name) { $data.name } else { "desconhecido" }
        Write-SubStep "Restaurante: $name"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.6 Carrinho ---
    Write-Step "6.6" "Carrinho (adicionar item)"
    if (Test-Endpoint "POST /api/cart/items" {
        $body = '{"menu_item_id":"item_pasta_01","quantity":2}'
        $r = Invoke-RestMethod "$HOST_API/api/cart/items" -Method POST `
            -ContentType "application/json" -Body $body -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Item adicionado ao carrinho"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.7 Ver carrinho ---
    Write-Step "6.7" "Carrinho (consultar)"
    if (Test-Endpoint "GET /api/cart" {
        $r = Invoke-RestMethod "$HOST_API/api/cart" -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Carrinho consultado com sucesso"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.8 Favoritos ---
    Write-Step "6.8" "Favoritos"
    if (Test-Endpoint "GET /api/favorites" {
        $r = Invoke-RestMethod "$HOST_API/api/favorites" -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Favoritos consultados com sucesso"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.9 Cupom ---
    Write-Step "6.9" "Validacao de Cupom (MVP10)"
    if (Test-Endpoint "POST /api/coupons/validate" {
        $body = '{"code":"MVP10","subtotal":5000}'
        $r = Invoke-RestMethod "$HOST_API/api/coupons/validate" -Method POST `
            -ContentType "application/json" -Body $body -Headers $headers -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Cupom MVP10 validado"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.10 Login admin ---
    Write-Step "6.10" "Login Admin"
    if (Test-Endpoint "POST /api/auth/login (admin@foodflow.com)" {
        $body = '{"email":"admin@foodflow.com","password":"Adm!nF00d@2026"}'
        $r = Invoke-RestMethod "$HOST_API/api/auth/login" -Method POST `
            -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Admin autenticado com sucesso"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.11 Login restaurante ---
    Write-Step "6.11" "Login Restaurante"
    if (Test-Endpoint "POST /api/auth/login (pasta@foodflow.com)" {
        $body = '{"email":"pasta@foodflow.com","password":"P@sta&Fogo#2026"}'
        $r = Invoke-RestMethod "$HOST_API/api/auth/login" -Method POST `
            -ContentType "application/json" -Body $body -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Restaurante autenticado com sucesso"
        return $true
    }) { $passed++ } else { $failed++ }

    # --- 6.12 Frontend ---
    Write-Step "6.12" "Frontend (React SPA)"
    if (Test-Endpoint "GET $HOST_WEB" {
        $r = Invoke-WebRequest "$HOST_WEB" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-SubStep "Status: $($r.StatusCode) | Tamanho: $($r.Content.Length) bytes"
        return $r.StatusCode -eq 200
    }) { $passed++ } else { $failed++ }
}

# ============================================================================
#  RESULTADO FINAL
# ============================================================================

Write-Host ""
Write-Host ""
Write-Banner "RESULTADO FINAL"

Write-Host "  Smoke Test: $passed/$total testes passaram" -ForegroundColor $(if ($failed -eq 0) { 'Green' } elseif ($failed -le 2) { 'Yellow' } else { 'Red' })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "  INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
} else {
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host "  INSTALACAO CONCLUIDA COM $failed FALHA(S)" -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Acesse a aplicacao:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    Frontend:  $HOST_WEB" -ForegroundColor White
Write-Host "    API:       $HOST_API" -ForegroundColor White
Write-Host "    Health:    $HOST_API/health" -ForegroundColor White
Write-Host ""
Write-Host "  Logins de teste:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    Consumidor:   user@foodflow.com / Us3r$Food!2026" -ForegroundColor White
Write-Host "    Restaurante:  pasta@foodflow.com / P@sta&Fogo#2026" -ForegroundColor White
Write-Host "    Admin:        admin@foodflow.com / Adm!nF00d@2026" -ForegroundColor White
Write-Host ""
Write-Host "  Dados de teste:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    6 restaurantes, 41 itens, 7 categorias" -ForegroundColor Gray
Write-Host "    Cupons: MVP10 (10% off), FRETEGRATIS (frete gratis)" -ForegroundColor Gray
Write-Host "    Frete gratis para pedidos acima de R`$ 120" -ForegroundColor Gray
Write-Host ""
Write-Host "  Processos em execucao:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    API PID:   $($serverJob.Id)" -ForegroundColor Gray
Write-Host "    Web PID:   $($webJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para parar:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    Stop-Process -Id $($serverJob.Id),$($webJob.Id) -Force" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Logs:" -ForegroundColor Magenta
Write-Host ""
Write-Host "    Get-Content server-stdout.log -Tail 20" -ForegroundColor Gray
Write-Host "    Get-Content client-stdout.log -Tail 20" -ForegroundColor Gray
Write-Host ""

# Abrir no browser
Write-Host "  Deseja abrir o ECP Food no navegador? (S/N)" -ForegroundColor Yellow
$resp = Read-Host "  Resposta"
if ($resp -match "^[sS]") {
    Start-Process "$HOST_WEB"
    Write-Host ""
    Write-Ok "Navegador aberto em $HOST_WEB"
}

# Limpar logs temporarios ao sair
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor DarkMagenta
Write-Host "  Script finalizado. Bom apetite!" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor DarkMagenta
Write-Host ""
