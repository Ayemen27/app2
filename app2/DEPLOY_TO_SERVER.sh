#!/bin/bash

###############################################################################
# 🚀 سكريبت نشر التطبيق على السيرفر الخارجي
# 
# الاستخدام: ./DEPLOY_TO_SERVER.sh
###############################################################################

set -e  # إيقاف السكريبت عند أي خطأ

# ألوان للطباعة
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# إعدادات الاتصال من متغيرات البيئة
SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_APP_DIR="/home/administrator/construction-app"
PORT="6000"

# دوال مساعدة
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_separator() {
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

# التحقق من المتغيرات المطلوبة
check_environment() {
    print_separator
    log_info "فحص متغيرات البيئة..."
    
    if [ -z "$SSH_HOST" ]; then
        log_error "SSH_HOST غير مُعرّف"
        exit 1
    fi
    
    if [ -z "$SSH_USER" ]; then
        log_error "SSH_USER غير مُعرّف"
        exit 1
    fi
    
    if [ -z "$SSH_PASSWORD" ]; then
        log_error "SSH_PASSWORD غير مُعرّف"
        exit 1
    fi
    
    log_success "جميع متغيرات البيئة موجودة"
}

# بناء التطبيق
build_application() {
    print_separator
    log_info "🔨 جاري بناء التطبيق..."
    
    if npm run build > /dev/null 2>&1; then
        log_success "تم بناء التطبيق بنجاح"
    else
        log_error "فشل بناء التطبيق"
        exit 1
    fi
}

# إنشاء حزمة النشر
create_deployment_package() {
    print_separator
    log_info "📦 جاري إنشاء حزمة النشر..."
    
    rm -f deployment-package.tar.gz
    
    tar -czf deployment-package.tar.gz \
        dist/ \
        ecosystem.config.cjs \
        package.json \
        package-lock.json \
        .env.production \
        2>/dev/null
    
    if [ -f deployment-package.tar.gz ]; then
        log_success "تم إنشاء حزمة النشر ($(du -h deployment-package.tar.gz | cut -f1))"
    else
        log_error "فشل في إنشاء حزمة النشر"
        exit 1
    fi
}

# نسخ الحزمة إلى السيرفر
upload_package() {
    print_separator
    log_info "📡 جاري نسخ الحزمة إلى السيرفر ($SSH_HOST)..."
    
    # استخدام sshpass لإرسال كلمة السر تلقائياً
    if command -v sshpass &> /dev/null; then
        if sshpass -p "$SSH_PASSWORD" scp -P $SSH_PORT deployment-package.tar.gz "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/" 2>/dev/null; then
            log_success "تم رفع الحزمة إلى السيرفر"
        else
            log_error "فشل في رفع الحزمة"
            exit 1
        fi
    else
        # إذا لم يكن sshpass متوفراً، استخدم scp العادي
        log_warning "sshpass غير متوفر - قد تحتاج لإدخال كلمة السر"
        scp -P $SSH_PORT deployment-package.tar.gz "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"
    fi
}

# فك الحزمة وإعادة تشغيل على السيرفر
deploy_on_server() {
    print_separator
    log_info "🔄 جاري فك الحزمة وإعادة التشغيل على السيرفر..."
    
    DEPLOY_COMMAND=$(cat <<'EOF'
#!/bin/bash
cd /home/administrator/construction-app

# فك الحزمة
echo "📦 فك الحزمة..."
tar -xzf deployment-package.tar.gz 2>/dev/null
rm -f deployment-package.tar.gz

# إيقاف التطبيق الحالي
echo "⏹️  إيقاف التطبيق الحالي..."
pm2 delete all 2>/dev/null || true

# تثبيت dependencies
echo "📥 تثبيت dependencies..."
npm install --loglevel=error 2>/dev/null

# بدء التطبيق مع PM2
echo "🚀 بدء التطبيق..."
pm2 start ecosystem.config.cjs
pm2 save

# عرض الحالة
echo "📊 حالة التطبيق:"
pm2 status
pm2 logs construction-app --lines 10

echo "✅ تم النشر بنجاح!"
EOF
)
    
    if command -v sshpass &> /dev/null; then
        echo "$DEPLOY_COMMAND" | sshpass -p "$SSH_PASSWORD" ssh -p $SSH_PORT "$SSH_USER@$SSH_HOST" 2>/dev/null
    else
        echo "$DEPLOY_COMMAND" | ssh -p $SSH_PORT "$SSH_USER@$SSH_HOST"
    fi
}

# التحقق من حالة التطبيق بعد النشر
verify_deployment() {
    print_separator
    log_info "🔍 التحقق من حالة التطبيق..."
    
    sleep 3  # انتظر 3 ثواني لبدء التطبيق
    
    if command -v curl &> /dev/null; then
        if curl -s "http://$SSH_HOST:$PORT/api/health" > /dev/null 2>&1; then
            log_success "التطبيق يعمل بشكل صحيح! ✨"
            log_info "رابط التطبيق: http://$SSH_HOST:$PORT"
        else
            log_warning "لم يتمكن من التحقق من التطبيق - قد يستغرق وقتاً أطول للبدء"
        fi
    fi
}

# الدالة الرئيسية
main() {
    print_separator
    log_info "🚀 بدء نشر التطبيق إلى السيرفر"
    log_info "السيرفر: $SSH_HOST (منفذ $PORT)"
    print_separator
    
    check_environment
    build_application
    create_deployment_package
    upload_package
    deploy_on_server
    verify_deployment
    
    print_separator
    log_success "🎉 اكتمل النشر بنجاح!"
    print_separator
}

# تشغيل البرنامج الرئيسي
main
