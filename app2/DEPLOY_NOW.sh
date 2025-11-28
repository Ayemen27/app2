#!/bin/bash

# نسخ الحزمة
scp deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/

# فك الضغط وتشغيل على السيرفر
ssh administrator@93.127.142.144 << 'REMOTE'
cd /home/administrator/construction-app

# فك الحزمة
tar -xzf deployment-package.tar.gz
rm deployment-package.tar.gz

# تثبيت dependencies
echo "📦 جاري تثبيت dependencies..."
npm install --production

# إعادة تشغيل التطبيق
pm2 restart construction-app

# التحقق
pm2 status
pm2 logs construction-app --lines 20
REMOTE
