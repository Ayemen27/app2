#!/bin/bash

###############################################################################
# 🚀 سكربت النشر المحسّن - نقل مباشر + بناء على السيرفر
# 
# الاستخدام: ./scripts/deploy_via_git.sh [commit_message]
# 
# هذا السكربت يقوم بـ:
# 1. نقل الملفات مباشرة إلى السيرفر عبر SCP/Rsync (بدون GitHub)
# 2. الاتصال بالسيرفر عبر SSH
# 3. بناء التطبيق على السيرفر (الذي لديه ذاكرة كافية)
# 4. إعادة تشغيل التطبيق
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🔷 $1${NC}"; }
print_separator() { echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"; }
print_header() { echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"; echo -e "${CYAN}║  $1  ║${NC}"; echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"; }

COMMIT_MESSAGE="${1:-نشر تلقائي $(date '+%Y-%m-%d %H:%M:%S')}"
REMOTE_APP_DIR="/home/administrator/app2"
DOMAIN="https://app2.binarjoinanelytic.info"

SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_PORT="${SSH_PORT:-22}"

check_all_secrets() {
    print_header "فحص المتطلبات"
    
    MISSING=""
    
    [ -z "$SSH_HOST" ] && MISSING="$MISSING SSH_HOST"
    [ -z "$SSH_USER" ] && MISSING="$MISSING SSH_USER"
    [ -z "$SSH_PASSWORD" ] && MISSING="$MISSING SSH_PASSWORD"
    
    if [ -n "$MISSING" ]; then
        log_error "المتغيرات التالية غير موجودة في Secrets:"
        for var in $MISSING; do
            log_error "  • $var"
        done
        exit 1
    fi
    
    log_success "جميع المتطلبات متوفرة"
    log_info "السيرفر: $SSH_USER@$SSH_HOST:$SSH_PORT"
}

check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass غير متوفر"
        log_info "للتثبيت: apt-get install sshpass"
        exit 1
    fi
}

step1_test_ssh_connection() {
    print_header "الخطوة 1: اختبار الاتصال بالسيرفر"
    
    log_info "جاري الاتصال بـ $SSH_HOST..."
    
    if sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
        -p $SSH_PORT "$SSH_USER@$SSH_HOST" "echo 'SSH OK'" 2>/dev/null; then
        log_success "الاتصال بالسيرفر ناجح"
    else
        log_error "فشل الاتصال بالسيرفر"
        log_error "تحقق من: SSH_HOST, SSH_USER, SSH_PASSWORD, SSH_PORT"
        exit 1
    fi
}

step2_sync_files() {
    print_header "الخطوة 2: نقل الملفات إلى السيرفر"
    
    log_info "تحضير الملفات للنقل..."
    
    # إنشاء ملف tar من مصادر المشروع فقط (بدون node_modules و dist)
    log_info "جاري ضغط الملفات المطلوبة..."
    tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=project.tar.gz --exclude=.env --exclude=.DS_Store --exclude=.next --exclude=build --exclude=.cache -czf /tmp/app2-deploy.tar.gz .
    log_success "تم ضغط الملفات"
    
    log_info "جاري نقل الملفات عبر scp..."
    if sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no -P $SSH_PORT -q /tmp/app2-deploy.tar.gz "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/" 2>&1; then
        log_success "تم نقل الملفات بنجاح"
        rm -f /tmp/app2-deploy.tar.gz
    else
        log_error "فشل نقل الملفات"
        rm -f /tmp/app2-deploy.tar.gz
        exit 1
    fi
    
    # فك الضغط على السيرفر
    log_info "جاري فك ضغط الملفات على السيرفر..."
    EXTRACT_CMD='cd '"$REMOTE_APP_DIR"' && tar -xzf app2-deploy.tar.gz && rm -f app2-deploy.tar.gz'
    if sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SSH_USER@$SSH_HOST" "$EXTRACT_CMD" 2>&1; then
        log_success "تم فك الضغط بنجاح"
    else
        log_error "فشل فك الضغط"
        exit 1
    fi
}

step3_build_and_deploy() {
    print_header "الخطوة 3: بناء التطبيق على السيرفر"
    
    log_info "جاري بناء التطبيق على السيرفر (الذي لديه ذاكرة كافية)..."
    
    ENV_CONTENT="# Production Environment Variables - Auto Generated
NODE_ENV=production
PORT=6000
HEALTH_CHECK_PORT=6000
HEALTH_CHECK_URL=http://localhost:6000/api/health
CUSTOM_DOMAIN=app2.binarjoinanelytic.info
DATABASE_URL=${DATABASE_URL}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENABLE_RATE_LIMITING=true
CORS_ORIGIN=*
LOG_LEVEL=info
DOMAIN=https://app2.binarjoinanelytic.info"
    
    BUILD_SCRIPT='
set -e

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

APP_DIR="/home/administrator/app2"

# حفظ ملف البيئة الحالي إن وجد
if [ -f "$APP_DIR/.env.production" ]; then
    cp "$APP_DIR/.env.production" /tmp/.env.production.backup
    log_info "تم حفظ نسخة من .env.production"
fi

cd "$APP_DIR"

# إنشاء ملف البيئة الجديد
log_info "إنشاء ملف البيئة..."
cat > .env.production << EOF
'"$ENV_CONTENT"'
EOF
log_success "تم إنشاء .env.production"

# تثبيت المتطلبات
log_info "تثبيت المتطلبات..."
npm install --loglevel=error 2>&1 | tail -5
log_success "تم تثبيت المتطلبات"

# بناء التطبيق
log_info "بناء Client..."
NODE_OPTIONS="--max-old-space-size=8192" npm run build:client 2>&1 | tail -10
log_success "تم بناء Client"

log_info "بناء Server..."
npm run build:server 2>&1 | tail -5
log_success "تم بناء Server"

# إعادة تشغيل PM2
log_info "إعادة تشغيل التطبيق عبر PM2..."
set -a
source .env.production
set +a

# حذف العملية القديمة وإعادة البدء
pm2 delete app2 2>/dev/null || true
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save

log_success "تم إعادة التشغيل"
echo ""
pm2 status
echo ""
log_success "🎉 اكتمل البناء والنشر على السيرفر!"
'
    
    if sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=120 -o StrictHostKeyChecking=no \
        -p $SSH_PORT "$SSH_USER@$SSH_HOST" "bash -s" <<< "$BUILD_SCRIPT" 2>&1; then
        log_success "اكتمل البناء والنشر بنجاح"
    else
        log_error "فشل البناء على السيرفر"
        exit 1
    fi
}

step4_verify_deployment() {
    print_header "الخطوة 4: التحقق من النشر"
    
    log_info "انتظار بدء التطبيق..."
    sleep 5
    
    HEALTH_URL="$DOMAIN/api/health"
    RETRY=0
    MAX_RETRY=5
    
    while [ $RETRY -lt $MAX_RETRY ]; do
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            log_success "التطبيق يعمل بشكل صحيح!"
            return 0
        fi
        RETRY=$((RETRY + 1))
        log_warning "المحاولة $RETRY من $MAX_RETRY..."
        sleep 3
    done
    
    log_warning "لم يتم التحقق الفوري - تحقق يدوياً: $HEALTH_URL"
}

show_final_summary() {
    print_header "ملخص النشر"
    
    CURRENT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
    
    echo ""
    log_success "🎉 اكتمل النشر بنجاح!"
    echo ""
    log_info "📋 التفاصيل:"
    log_info "   • النسخة: $CURRENT_SHA"
    log_info "   • الرسالة: $COMMIT_MESSAGE"
    log_info "   • الرابط: $DOMAIN"
    log_info "   • الطريقة: نقل مباشر + بناء على السيرفر"
    echo ""
    print_separator
}

main() {
    clear
    print_header "🚀 نظام النشر المحسّن - نقل مباشر + بناء على السيرفر"
    echo ""
    log_info "الوقت: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "الرسالة: $COMMIT_MESSAGE"
    print_separator
    
    check_all_secrets
    check_sshpass
    step1_test_ssh_connection
    step2_sync_files
    step3_build_and_deploy
    step4_verify_deployment
    show_final_summary
}

main
