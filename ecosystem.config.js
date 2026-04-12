// PM2 process configuration for Hostinger Business Web Hosting.
//
// The 40-process ceiling is a hard OS limit on the shared hosting plan.
// This file keeps the Node.js footprint predictable and within budget.
// See src/app.js for the full process-budget breakdown.
//
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 reload ecosystem.config.js --env production   (zero-downtime reload)
//   pm2 save                                           (persist across reboots)

module.exports = {
  apps: [
    {
      name:      'cebusafetour',
      script:    'src/app.js',

      // Single instance — mysql2 connection pool is not shareable across
      // cluster workers without a Redis/Proxy intermediary.  Clustering
      // would also double the baseline process count.
      instances:  1,
      exec_mode: 'fork',

      // Restart if RSS exceeds 256 MB.  Allows in-flight requests to drain
      // before the new process starts (PM2 does a graceful reload).
      max_memory_restart: '256M',

      // Grace period for in-flight requests on SIGINT/SIGTERM
      kill_timeout:   10_000,   // ms before SIGKILL
      listen_timeout:  5_000,   // ms to wait for the app to bind its port

      // Log files — keep concise on shared hosting disk
      error_file:      'logs/pm2-error.log',
      out_file:        'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs:      true,

      // Exponential backoff on crashes — avoids hammering the OS on a bad
      // deploy while still recovering automatically from transient errors.
      exp_backoff_restart_delay: 1_000,  // starts at 1 s, doubles each time

      // Environment variables injected by PM2 (supplement .env on the host)
      env_production: {
        NODE_ENV:            'production',
        // WebSocket + SSE caps — keeps total connections below 100-process budget
        WS_MAX_CONNECTIONS:  '60',
        SSE_MAX_CONNECTIONS: '20',
      },
    },
  ],
};
