module.exports = {
  apps: [{
    name: 'AI家教后端',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      GLM_API_KEY: process.env.GLM_API_KEY || 'your-api-key-here',
      UPLOAD_DIR: '/var/www/aitutor/uploads'
    },
    error_file: '/var/log/aitutor-error.log',
    out_file: '/var/log/aitutor-out.log',
    log_file: '/var/log/aitutor-combined.log',
    time: true
  }]
};