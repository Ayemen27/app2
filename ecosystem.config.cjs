module.exports = {
  apps: [{
    name: 'construction-app',
    script: 'dist/index.js',
    cwd: '/home/administrator/app2',
    exec_mode: 'cluster',
    instances: 2,
    env: {
      NODE_ENV: 'production',
      PORT: 6000
    },
    node_args: '--max-old-space-size=512',
    max_memory_restart: '600M',
    max_restarts: 15,
    min_uptime: '10s',
    restart_delay: 3000,
    listen_timeout: 15000,
    kill_timeout: 8000,
    wait_ready: false,
    autorestart: true,
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/home/administrator/.pm2/logs/construction-app-error.log',
    out_file: '/home/administrator/.pm2/logs/construction-app-out.log',
    log_file: '/home/administrator/.pm2/logs/construction-app-combined.log'
  }]
};
