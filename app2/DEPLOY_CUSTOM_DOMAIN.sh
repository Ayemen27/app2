#!/bin/bash

###############################################################################
# 🚀 سكريبت نشر التطبيق على السيرفر مع الدومين المخصص
# 
# الاستخدام: ./DEPLOY_CUSTOM_DOMAIN.sh
# الدومين: https://app2.binarjoinanelytic.info
###############################################################################

set -e

# ألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# إعدادات الاتصال من Secrets
SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_APP_DIR="/home/administrator/construction-app"
PORT="6000"
DOMAIN="https://app2.binarjoinanelytic.info"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
print_separator() { echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"; }

check_environment() {
    print_separator
    log_info "فحص متغيرات البيئة..."
    
    if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ] || [ -z "$SSH_PASSWORD" ]; then
        log_error "متغيرات SSH غير مكتملة"
        exit 1
    fi
    
    log_success "جميع متغيرات البيئة موجودة"
}

build_application() {
    print_separator
    log_info "🔨 جاري بناء التطبيق..."
    npm run build > /dev/null 2>&1 && log_success "تم بناء التطبيق" || {
        log_error "فشل البناء"
        exit 1
    }
}

create_deployment_package() {
    print_separator
    log_info "📦 جاري إنشاء حزمة النشر..."
    rm -f deployment-package.tar.gz
    
    tar -czf deployment-package.tar.gz \
        dist/ ecosystem.config.cjs package*.json .env.production 2>/dev/null
    
    log_success "تم إنشاء الحزمة ($(du -h deployment-package.tar.gz | cut -f1))"
}

upload_package() {
    print_separator
    log_info "📡 جاري رفع الحزمة إلى السيرفر ($SSH_HOST)..."
    
    if command -v sshpass &> /dev/null; then
        sshpass -p "$SSH_PASSWORD" scp -P $SSH_PORT deployment-package.tar.gz \
            "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/" 2>/dev/null && \
            log_success "تم رفع الحزمة" || {
            log_error "فشل الرفع"
            exit 1
        }
    else
        log_warning "sshpass غير متوفر - استخدم:"
        log_warning "scp deployment-package.tar.gz $SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"
        exit 1
    fi
}

deploy_on_server() {
    print_separator
    log_info "🔄 جاري النشر على السيرفر..."
    
    DEPLOY_CMD=$(cat <<'EOF'
cd /home/administrator/construction-app
tar -xzf deployment-package.tar.gz 2>/dev/null
rm -f deployment-package.tar.gz
npm install --loglevel=error 2>/dev/null
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "✅ تم النشر بنجاح!"
pm2 status
EOF
)
    
    if command -v sshpass &> /dev/null; then
        echo "$DEPLOY_CMD" | sshpass -p "$SSH_PASSWORD" ssh -p $SSH_PORT "$SSH_USER@$SSH_HOST" 2>/dev/null
    fi
}

verify_deployment() {
    print_separator
    log_info "🔍 التحقق من التطبيق..."
    sleep 3
    
    if curl -s "$DOMAIN/api/health" > /dev/null 2>&1; then
        log_success "التطبيق يعمل بشكل صحيح!"
        log_info "الرابط: $DOMAIN"
    else
        log_warning "لم يتمكن من التحقق - قد يحتاج لوقت أطول"
    fi
}

main() {
    print_separator
    log_info "🚀 بدء النشر إلى $DOMAIN"
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

main
