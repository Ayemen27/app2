#!/bin/bash
HOST="93.127.142.144"
PASS='Ay**--772283228'
USER="administrator"

echo "Attempting deployment with user: $USER"
# We'll try connection even though port 22 seemed closed, maybe it's intermittent or needs specific config
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $USER@$HOST "mkdir -p Ai.v3" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Successfully connected with $USER. Starting file transfer..."
    rsync -avz -e "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
    echo "Deployment complete."
else
    # If standard port fails, check if we should try a different port (common for Windows/Custom SSH)
    echo "Failed to connect with $USER on port 22. Trying port 2222 (common alternative)..."
    sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -p 2222 $USER@$HOST "mkdir -p Ai.v3" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Successfully connected on port 2222. Starting file transfer..."
        rsync -avz -e "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no -p 2222" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
        echo "Deployment complete."
    else
        echo "ERROR: Connection refused for user $USER on both ports 22 and 2222."
        exit 1
    fi
fi
