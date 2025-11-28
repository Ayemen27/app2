#!/bin/bash

# قراءة متغيرات الاتصال من .env
SSH_HOST="93.127.142.144"
SSH_PORT="22"
SSH_USER="administrator"
SSH_PASS="Ay**772283228"

echo "🚀 نشر التطبيق على السيرفر..."
echo "📍 الهدف: $SSH_USER@$SSH_HOST"
echo ""

# الخطوة 1: إنشاء المجلد
echo "📂 الخطوة 1: إنشاء المجلد على السيرفر..."
expect << 'EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no -p 22 administrator@93.127.142.144 "mkdir -p /home/administrator/construction-app"
expect "password:"
send "Ay**772283228\r"
expect eof
puts "✅ تم إنشاء المجلد"
EOF

echo ""
echo "📦 الخطوة 2: نسخ حزمة النشر..."
# Using scp with expect
expect << 'EOF'
set timeout 60
spawn scp -o StrictHostKeyChecking=no -P 22 deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/
expect "password:"
send "Ay**772283228\r"
expect eof
puts "✅ تم نسخ الحزمة"
EOF

echo ""
echo "📂 الخطوة 3: فك الضغط والتحضير..."
# فك الضغط على السيرفر
expect << 'EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no -p 22 administrator@93.127.142.144 \
  "cd /home/administrator/construction-app && tar -xzf deployment-package.tar.gz && rm deployment-package.tar.gz && ls -lah"
expect "password:"
send "Ay**772283228\r"
expect eof
puts "✅ انتهى فك الضغط"
EOF

echo ""
echo "✅ اكتملت عملية النشر!"
echo ""
echo "🔧 الخطوات التالية:"
echo "   1. تشغيل التطبيق:"
echo "      ssh administrator@93.127.142.144"
echo "      cd /home/administrator/construction-app"
echo "      pm2 start ecosystem.config.js"
echo ""
echo "   2. التحقق من الحالة:"
echo "      pm2 status"
echo "      pm2 logs construction-app"

