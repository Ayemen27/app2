#!/bin/bash
HOST="93.127.142.144"
PASS='Ay**--772283228'

attempt_deploy() {
    local USER=$1
    echo "Attempting deployment with user: $USER"
    # Use sshpass with single quotes for password to avoid shell expansion
    # Use -tt to force tty if needed, but not usually for mkdir
    timeout 10s sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $USER@$HOST "mkdir -p Ai.v3" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Successfully connected with $USER. Starting file transfer..."
        rsync -avz -e "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
        return 0
    else
        echo "Failed to connect with $USER."
        return 1
    fi
}

attempt_deploy "root" || attempt_deploy "admin" || attempt_deploy "newuser"
