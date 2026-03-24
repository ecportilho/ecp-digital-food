# Guia de Instalacao — ECP Digital Food (Windows)

## Pre-requisitos

- **Node.js 20 LTS** ou superior
- **Git** instalado e configurado
- **PowerShell** (Windows Terminal recomendado)
- **ecp-digital-bank** rodando localmente em http://localhost:3001 (necessario para pagamentos)

## Instalacao Rapida (Script PowerShell)

Se disponivel, execute o script de instalacao automatizado:

```powershell
.\scripts\install-ecp-digital-food-win.ps1
```

## Instalacao Manual

### 1. Clonar o Repositorio

```powershell
git clone https://github.com/ecportilho/ecp-digital-food.git
cd ecp-digital-food
```

### 2. Instalar Dependencias

```powershell
npm install
```

> **Nota:** O pacote `better-sqlite3` requer compilacao nativa. No Windows, pode ser necessario instalar o Visual Studio Build Tools:
> ```powershell
> npm install --global windows-build-tools
> ```

### 3. Configurar Variaveis de Ambiente

Copie o arquivo de exemplo e edite:

```powershell
Copy-Item .env.example .env
```

Edite o arquivo `.env` com as configuracoes locais:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
JWT_SECRET=sua-chave-secreta-jwt-aqui
JWT_REFRESH_SECRET=sua-chave-refresh-aqui
DB_PATH=./data/foodflow.db
CORS_ORIGIN=http://localhost:5173
ECP_BANK_API_URL=http://localhost:3001
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=foodflow123
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=sua-chave-webhook-aqui
FOODFLOW_PUBLIC_URL=http://localhost:3000
```

### 4. Criar Banco de Dados e Popular com Seeds

```powershell
npm run seed
```

Isso cria o banco SQLite em `./data/foodflow.db` com:
- 7 categorias (Todos, Hamburguer, Japones, Pizza, Saudavel, Massas, Brasileira)
- 6 restaurantes (Pasta & Fogo, Sushi Wave, Burger Lab, Green Bowl Co., Pizza Club 24h, Brasa & Lenha)
- 24 itens de cardapio (4 por restaurante)
- 1 cupom (MVP10: R$ 10 de desconto, pedido minimo R$ 80)
- 3 usuarios demo:
  - Admin: admin@foodflow.com / admin123
  - Restaurante: pasta@foodflow.com / pasta123
  - Consumidor: user@foodflow.com / user123

### 5. Registrar Webhook (Opcional — necessario para PIX)

Se o ecp-digital-bank estiver rodando:

```powershell
npm run register-webhook
```

### 6. Iniciar em Modo Desenvolvimento

```powershell
npm run dev
```

Isso inicia:
- **Backend (Fastify):** http://localhost:3000
- **Frontend (Vite HMR):** http://localhost:5173

### 7. Build para Producao (Opcional)

```powershell
npm run build
npm start
```

A aplicacao estara disponivel em http://localhost:3000 (API + SPA).

## Verificacao

Apos iniciar, verifique:

```powershell
# API respondendo
curl http://localhost:3000/api/categories

# Login com usuario demo
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"user@foodflow.com","password":"user123"}'
```

## Resolucao de Problemas

### Erro: better-sqlite3 falha na compilacao
Instale o Visual Studio Build Tools e tente novamente:
```powershell
npm install --global windows-build-tools
npm rebuild better-sqlite3
```

### Erro: EADDRINUSE (porta ja em uso)
Altere a variavel `PORT` no `.env` ou finalize o processo usando a porta.

### Erro: Conexao com ecp-digital-bank falhou
Verifique se o banco esta rodando em `ECP_BANK_API_URL` e que as credenciais de plataforma estao corretas no `.env`.
