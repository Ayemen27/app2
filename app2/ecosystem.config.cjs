module.exports = {
  apps: [
    {
      name: 'construction-app',
      script: './dist/index.js',
      instances: 2,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      merge_logs: true
    }
  ]
};
