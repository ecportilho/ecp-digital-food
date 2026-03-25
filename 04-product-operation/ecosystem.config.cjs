/**
 * PM2 Ecosystem Config — ECP Food
 *
 * Producao (VPS Linux):
 *   O deploy copia 03-product-delivery/ para /opt/foodflow/
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Desenvolvimento local (Windows):
 *   cd ecp-digital-food/04-product-operation
 *   pm2 start ecosystem.config.cjs --env development
 *   (cwd aponta para ../03-product-delivery automaticamente)
 *
 * Comandos:
 *   pm2 reload ecosystem.config.cjs   (zero-downtime reload)
 *   pm2 stop ecosystem.config.cjs
 *   pm2 delete ecosystem.config.cjs
 *   pm2 logs foodflow
 *   pm2 monit
 */

const path = require('path');

// Em dev, este arquivo esta em 04-product-operation/, o codigo em 03-product-delivery/
const devCwd = path.resolve(__dirname, '..', '03-product-delivery');
// Em producao, o deploy copia para /opt/foodflow/
const prodCwd = '/opt/foodflow';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  apps: [
    {
      name: 'foodflow',
      script: 'server/index.mjs',
      cwd: isProduction ? prodCwd : devCwd,

      // Node.js interpreter
      interpreter: 'node',
      node_args: '--experimental-modules',

      // Instâncias e modo
      instances: 1,           // SQLite não suporta concorrência de escrita — 1 instância
      exec_mode: 'fork',      // fork mode (não cluster) por causa do SQLite

      // Variáveis de ambiente — produção
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },

      // Variáveis de ambiente — development
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '127.0.0.1'
      },

      // Restart automático
      watch: false,                    // Não usar watch em produção
      max_restarts: 10,                // Máximo de restarts em janela de tempo
      min_uptime: '10s',               // Tempo mínimo de uptime para considerar estável
      restart_delay: 4000,             // 4 segundos entre restarts
      autorestart: true,               // Reiniciar automaticamente em crash

      // Limites de memória
      max_memory_restart: '512M',      // Restart se memória exceder 512MB

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/root/.pm2/logs/foodflow-error.log',
      out_file: '/root/.pm2/logs/foodflow-out.log',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,              // 5 segundos para shutdown graceful
      listen_timeout: 10000,           // 10 segundos para a app ficar ready
      shutdown_with_message: true,

      // Cron restart (opcional — restart diário às 04:00 para limpar memória)
      cron_restart: '0 4 * * *',

      // Source map
      source_map_support: true
    }
  ]
};
