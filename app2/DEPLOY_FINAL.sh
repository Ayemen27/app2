#!/bin/bash

echo "📦 نشر التطبيق الإصدار النهائي..."

# نسخ
scp deployment-package.tar.gz administrator@93.127.142.144:/home/administrator/construction-app/

# تشغيل على السيرفر
ssh administrator@93.127.142.144 << 'REMOTE'
cd /home/administrator/construction-app

# فك الحزمة
tar -xzf deployment-package.tar.gz 2>/dev/null || echo "Extracting..."
rm -f deployment-package.tar.gz

# تثبيت ALL dependencies (ليس --production فقط)
echo "📦 Installing dependencies..."
npm install

# تشغيل/إعادة تشغيل
pm2 restart construction-app

# التحقق
echo ""
echo "✅ Status:"
pm2 status
echo ""
echo "📊 Logs:"
pm2 logs construction-app --lines 20

REMOTE

echo ""
echo "✅ تم النشر! الرابط: http://93.127.142.144:5000"
