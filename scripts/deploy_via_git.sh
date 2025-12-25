#!/bin/bash

###############################################################################
# 🚀 نظام النشر المتكامل - GitHub كوسيط + بناء تلقائي
# 
# الاستخدام: ./scripts/deploy_via_git.sh [commit_message]
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
REPO_NAME="app2"
GITHUB_REPO="https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

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
    [ -z "$GITHUB_TOKEN" ] && MISSING="$MISSING GITHUB_TOKEN"
    [ -z "$GITHUB_USERNAME" ] && MISSING="$MISSING GITHUB_USERNAME"
    
    if [ -n "$MISSING" ]; then
        log_error "المتغيرات التالية غير موجودة في Secrets:"
        for var in $MISSING; do
            log_error "  • $var"
        done
        exit 1
    fi
    
    log_success "جميع المتطلبات متوفرة"
}

check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass غير متوفر"
        exit 1
    fi
}

step1_push_to_github() {
    print_header "الخطوة 1: رفع التحديثات إلى GitHub"
    
    log_info "جاري تشغيل سكربت الرفع المخصص..."
    if bash scripts/push_repo.sh "$COMMIT_MESSAGE"; then
        log_success "تم الرفع إلى GitHub بنجاح"
    else
        log_error "فشل الرفع إلى GitHub"
        exit 1
    fi
}

step2_pull_and_build_on_server() {
    print_header "الخطوة 2: تحديث السيرفر وبناء التطبيقات"
    
    log_info "جاري الاتصال بالسيرفر لتنفيذ التحديثات..."
    
    ENV_CONTENT="# Production Environment Variables - Auto Generated
NODE_ENV=production
PORT=6000
DATABASE_URL=${DATABASE_URL}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
DOMAIN=https://app2.binarjoinanelytic.info"

    REMOTE_SCRIPT='
set -e
mkdir -p '"$REMOTE_APP_DIR"'
cd '"$REMOTE_APP_DIR"'

echo "🔄 جاري سحب التحديثات من GitHub..."
# تهيئة المستودع إذا لم يكن موجوداً
if [ ! -d ".git" ]; then
    git init
    git remote add origin '"$GITHUB_REPO"'
else
    # تحديث الرابط للتأكد من استخدام التوكن الصحيح والمستودع الصحيح
    git remote set-url origin '"$GITHUB_REPO"'
fi

# التأكد من تكوين Git على السيرفر
git config user.email "server@binarjoin.info"
git config user.name "Build Server"

git fetch origin main
git reset --hard origin/main

echo "⚙️  تحديث ملفات الإعداد..."
cat > .env.production << EOF
'"$ENV_CONTENT"'
EOF

echo "📦 تحديث واعتماد تطبيق الويب..."
npm install --loglevel=error
npm run build
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "📱 بناء تطبيق APK الجديد..."
# تمرير بيانات SSH لسكربت البناء
export SSH_HOST="'"$SSH_HOST"'"
export SSH_USER="'"$SSH_USER"'"
export SSH_PASSWORD="'"$SSH_PASSWORD"'"
export SSH_PORT="'"$SSH_PORT"'"
bash scripts/build-and-deploy.sh
'

    if sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no -p $SSH_PORT "$SSH_USER@$SSH_HOST" "bash -s" <<< "$REMOTE_SCRIPT"; then
        log_success "تم تحديث السيرفر وبناء جميع السكربتات بنجاح"
    else
        log_error "فشل التحديث على السيرفر"
        exit 1
    fi
}

main() {
    clear
    print_header "🚀 نظام النشر المتكامل عبر GitHub"
    echo ""
    
    check_all_secrets
    check_sshpass
    step1_push_to_github
    step2_pull_and_build_on_server
    
    print_header "✅ اكتملت العملية بنجاح"
}

main
