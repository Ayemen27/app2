#!/bin/bash

if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass غير مثبت"
    echo ""
    echo "🔧 الرجاء تثبيت sshpass:"
    echo "  macOS: brew install sshpass"
    echo "  Ubuntu: sudo apt-get install sshpass"
    exit 1
fi

./DEPLOY_CUSTOM_DOMAIN.sh
