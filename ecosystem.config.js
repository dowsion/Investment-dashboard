module.exports = {
  apps: [{
    name: 'investment-dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    kill_timeout: 3000,
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-http-header-size=16384 --max-old-space-size=4096'
    },
    exp_backoff_restart_delay: 100
  }]
} 