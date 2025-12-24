#!/bin/bash
# Script to build and deploy on remote server via SSH

HOST="${SSH_HOST}"
PORT="${SSH_PORT:-22}"
USER="${SSH_USER}"
PASSWORD="${SSH_PASSWORD}"

echo "🚀 Connecting to remote server ${USER}@${HOST}:${PORT}..."

# 1. Transfer current code (excluding node_modules and dot files)
echo "📦 Packing and transferring codebase..."
tar -czf project.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' .
sshpass -p "${PASSWORD}" scp -P "${PORT}" -o StrictHostKeyChecking=no project.tar.gz "${USER}@${HOST}:~/app.tar.gz"
rm project.tar.gz

# 2. Execute build commands on remote server
echo "🛠️  Starting remote build process..."
sshpass -p "${PASSWORD}" ssh -p "${PORT}" -o StrictHostKeyChecking=no "${USER}@${HOST}" << 'REMOTECMD'
  mkdir -p ~/app
  tar -xzf ~/app.tar.gz -C ~/app
  cd ~/app
  
  echo "📥 Installing dependencies..."
  npm install --production=false
  
  echo "🏗️  Building frontend..."
  npm run build:client
  
  echo "♻️  Restarting application..."
  # Assuming PM2 or similar is used, or just backgrounding it
  if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
  else
    pkill -f "tsx server/index.ts" || true
    nohup npm run start > app.log 2>&1 &
  fi
  
  echo "✅ Remote build and deploy finished."
REMOTECMD

if [ $? -eq 0 ]; then
    echo "✨ Process completed successfully!"
else
    echo "❌ Process failed."
    exit 1
fi
