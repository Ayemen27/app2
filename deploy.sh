#!/bin/bash
HOST="93.127.142.144"
USER="administrator"

if [ -z "$SSHPASS" ]; then
    echo "ERROR: SSHPASS environment variable is required for deployment."
    echo "Set it via: export SSHPASS=your_password"
    exit 1
fi

echo "Attempting deployment with user: $USER"
sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 $USER@$HOST "mkdir -p Ai.v3" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Successfully connected with $USER. Starting file transfer..."
    rsync -avz -e "sshpass -e ssh -o StrictHostKeyChecking=accept-new" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
    echo "Deployment complete."
else
    echo "Failed to connect with $USER on port 22. Trying port 2222 (common alternative)..."
    sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 -p 2222 $USER@$HOST "mkdir -p Ai.v3" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Successfully connected on port 2222. Starting file transfer..."
        rsync -avz -e "sshpass -e ssh -o StrictHostKeyChecking=accept-new -p 2222" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
        echo "Deployment complete."
    else
        echo "ERROR: Connection refused for user $USER on both ports 22 and 2222."
        exit 1
    fi
fi
