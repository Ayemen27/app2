#!/bin/bash

# 📦 سكريبت البناء على السيرفر الخارجي (باستخدام SSH Key)
# الاتصال عبر SSH ببيانات من Secrets

set -e

# 🔐 قراءة بيانات الاتصال من متغيرات البيئة
SSH_USER="${SSH_USER}"
SSH_HOST="${SSH_HOST}"
SSH_PORT="${SSH_PORT}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY}"

# 📍 المسارات
LOCAL_PROJECT_DIR="$(pwd)"
REMOTE_PROJECT_DIR="/tmp/binarjoin-build-$(date +%s)"
BUILD_OUTPUT_DIR="$(pwd)/dist"
SSH_KEY_FILE="/tmp/ssh_key_$$"

# ✅ التحقق من المتغيرات
if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_PORT" ]; then
    echo "❌ خطأ: بيانات SSH غير مكتملة"
    echo "تأكد من إضافة المتغيرات إلى Secrets:"
    echo "  - SSH_USER"
    echo "  - SSH_HOST"
    echo "  - SSH_PORT"
    echo "  - SSH_PUBLIC_KEY"
    exit 1
fi

echo "📝 معلومات الاتصال:"
echo "  👤 User: $SSH_USER"
echo "  🖥️  Host: $SSH_HOST"
echo "  🔌 Port: $SSH_PORT"
echo "  🔑 Using SSH Key"
echo "  📂 Remote Dir: $REMOTE_PROJECT_DIR"
echo ""

# 🔑 إنشاء ملف SSH Key مؤقت
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "$SSH_PUBLIC_KEY" > $SSH_KEY_FILE
    chmod 600 $SSH_KEY_FILE
    SSH_KEY_OPTION="-i $SSH_KEY_FILE"
else
    SSH_KEY_OPTION=""
fi

cleanup() {
    if [ -f "$SSH_KEY_FILE" ]; then
        rm -f $SSH_KEY_FILE
    fi
}

trap cleanup EXIT

echo "🔗 الاتصال بالسيرفر..."
ssh -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    -p $SSH_PORT \
    $SSH_KEY_OPTION \
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
scp -r -P $SSH_PORT \
    $SSH_KEY_OPTION \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=android \
    . $SSH_USER@$SSH_HOST:$REMOTE_PROJECT_DIR/

echo "✅ تم نقل الملفات"
echo ""

echo "🔨 جاري البناء على السيرفر..."

# بناء التطبيق
ssh -o StrictHostKeyChecking=no \
    -p $SSH_PORT \
    $SSH_KEY_OPTION \
    $SSH_USER@$SSH_HOST \
    "
    cd $REMOTE_PROJECT_DIR
    
    echo '📦 تثبيت المتطلبات...'
    npm install --legacy-peer-deps 2>&1 | tail -20
    
    echo ''
    echo '🔨 بناء العميل (Vite)...'
    NODE_OPTIONS='--max-old-space-size=4096' npm run build:client 2>&1 | tail -30
    
    echo ''
    echo '🔨 بناء السيرفر (esbuild)...'
    npm run build:server 2>&1 | tail -20
    
    echo ''
    echo '✅ اكتمل البناء'
    echo ''
    echo '📊 محتويات مجلد dist:'
    ls -lh dist/ | head -20
    echo ''
    echo '📦 حجم البناء:'
    du -sh dist/
    "

echo ""
echo "📥 جاري تحميل الملفات المبنية..."

# تحميل الملفات المبنية
mkdir -p $BUILD_OUTPUT_DIR
scp -r -P $SSH_PORT \
    $SSH_KEY_OPTION \
    $SSH_USER@$SSH_HOST:$REMOTE_PROJECT_DIR/dist/* \
    $BUILD_OUTPUT_DIR/

echo "✅ تم تحميل الملفات"
echo ""

echo "🧹 جاري التنظيف على السيرفر..."

# تنظيف
ssh -o StrictHostKeyChecking=no \
    -p $SSH_PORT \
    $SSH_KEY_OPTION \
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
du -sh $BUILD_OUTPUT_DIR 2>/dev/null || echo "لم يتمكن من حساب الحجم"
echo ""
echo "✨ يمكنك الآن نشر الملفات من dist/"
