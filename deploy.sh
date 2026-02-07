#!/bin/bash
HOST="93.127.142.144"
USER="root" # Assuming root, or we might need to try 'newuser'
PASS="Ay**772283228"

echo "Deploying to $HOST..."
# Create target directory if it doesn't exist
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$HOST "mkdir -p Ai.v3"

# Transfer files (excluding node_modules)
rsync -avz -e "sshpass -p '$PASS' ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' ./ $USER@$HOST:~/Ai.v3/
