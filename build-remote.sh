#!/bin/bash

# 📦 سكريبت البناء على السيرفر الخارجي
# الاتصال عبر SSH ببيانات من Secrets

set -e

# 🔐 قراءة بيانات الاتصال من متغيرات البيئة
SSH_USER="${SSH_USER}"
SSH_HOST="${SSH_HOST}"
SSH_PORT="${SSH_PORT}"
SSH_PASSWORD="${SSH_PASSWORD}"

# 📍 المسارات
LOCAL_PROJECT_DIR="$(pwd)"
REMOTE_PROJECT_DIR="/tmp/binarjoin-build-$(date +%s)"
BUILD_OUTPUT_DIR="$(pwd)/dist"

# ✅ التحقق من المتغيرات
if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_PORT" ]; then
    echo "❌ خطأ: بيانات SSH غير مكتملة"
    echo "تأكد من إضافة المتغيرات إلى Secrets:"
    echo "  - SSH_USER"
    echo "  - SSH_HOST"
    echo "  - SSH_PORT"
    exit 1
fi

echo "📝 معلومات الاتصال:"
echo "  👤 User: $SSH_USER"
echo "  🖥️  Host: $SSH_HOST"
echo "  🔌 Port: $SSH_PORT"
echo "  📂 Remote Dir: $REMOTE_PROJECT_DIR"
echo ""

# 🔄 إنشاء اتصال SSH باستخدام sshpass
export SSHPASS="$SSH_PASSWORD"

echo "🔗 الاتصال بالسيرفر..."
sshpass -e ssh -o StrictHostKeyChecking=no \
    -p $SSH_PORT \
    $SSH_USER@$SSH_HOST \
    "
    echo '✅ متصل بالسيرفر'
    
    # إنشاء المجلد
    mkdir -p $REMOTE_PROJECT_DIR
    cd $REMOTE_PROJECT_DIR
    
    echo '📥 جاري التحضير...'
    
    # التحقق من Node.js
    node --version || (echo '❌ Node.js غير مثبت' && exit 1)
    npm --version || (echo '❌ npm غير مثبت' && exit 1)
    
    echo '✅ Node.js و npm متوفران'
    "

echo ""
echo "📤 جاري نقل الملفات..."

# نقل المشروع
sshpass -e scp -r -P $SSH_PORT \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=android \
    . $SSH_USER@$SSH_HOST:$REMOTE_PROJECT_DIR/

echo "✅ تم نقل الملفات"
echo ""

echo "🔨 جاري البناء على السيرفر..."

# بناء التطبيق
sshpass -e ssh -o StrictHostKeyChecking=no \
    -p $SSH_PORT \
    $SSH_USER@$SSH_HOST \
    "
    cd $REMOTE_PROJECT_DIR
    
    echo '📦 تثبيت المتطلبات...'
    npm install --legacy-peer-deps 2>&1 | tail -20
    
    echo ''
    echo '🔨 بناء العميل (Vite)...'
    NODE_OPTIONS='--max-old-space-size=4096' npm run build:client
    
    echo ''
    echo '🔨 بناء السيرفر (esbuild)...'
    npm run build:server
    
    echo ''
    echo '✅ اكتمل البناء'
    ls -lh dist/
    "

echo ""
echo "📥 جاري تحميل الملفات المبنية..."

# تحميل الملفات المبنية
mkdir -p $BUILD_OUTPUT_DIR
sshpass -e scp -r -P $SSH_PORT \
    $SSH_USER@$SSH_HOST:$REMOTE_PROJECT_DIR/dist/* \
    $BUILD_OUTPUT_DIR/

echo "✅ تم تحميل الملفات"
echo ""

echo "🧹 جاري التنظيف على السيرفر..."

# تنظيف
sshpass -e ssh -o StrictHostKeyChecking=no \
    -p $SSH_PORT \
    $SSH_USER@$SSH_HOST \
    "
    rm -rf $REMOTE_PROJECT_DIR
    echo '✅ تم التنظيف'
    "

echo ""
echo "🎉 اكتمل البناء بنجاح!"
echo "📂 المخرجات في: $BUILD_OUTPUT_DIR"
echo ""
echo "📊 حجم البناء:"
du -sh $BUILD_OUTPUT_DIR || echo "لم يتمكن من حساب الحجم"
echo ""
echo "✨ يمكنك الآن نشر الملفات من dist/"
