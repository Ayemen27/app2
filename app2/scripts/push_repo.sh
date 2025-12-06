#!/bin/bash

###############################################################################
# 📤 سكربت دفع الكود إلى GitHub Repository
# 
# الاستخدام: ./scripts/push_repo.sh [commit_message]
# المتطلبات: GITHUB_USERNAME, GITHUB_TOKEN, GITHUB_EMAIL في Secrets
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
print_separator() { echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"; }

COMMIT_MESSAGE="${1:-تحديث تلقائي $(date '+%Y-%m-%d %H:%M:%S')}"
BRANCH="${2:-main}"
REPO_NAME="app2"

check_git_secrets() {
    print_separator
    log_info "فحص بيانات GitHub..."

    if [ -z "$GITHUB_USERNAME" ]; then
        log_error "GITHUB_USERNAME غير موجود في Secrets"
        exit 1
    fi

    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "GITHUB_TOKEN غير موجود في Secrets"
        exit 1
    fi

    if [ -z "$GITHUB_EMAIL" ]; then
        log_error "GITHUB_EMAIL غير موجود في Secrets"
        exit 1
    fi

    log_success "جميع بيانات GitHub متوفرة"
}

configure_git() {
    print_separator
    log_info "تكوين Git..."

    git config user.name "$GITHUB_USERNAME"
    git config user.email "$GITHUB_EMAIL"

    REMOTE_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    
    if git remote get-url origin &>/dev/null; then
        git remote set-url origin "$REMOTE_URL"
        log_info "تم تحديث remote origin"
    else
        git remote add origin "$REMOTE_URL"
        log_info "تم إضافة remote origin"
    fi

    log_success "تم تكوين Git بنجاح"
}

check_git_status() {
    print_separator
    log_info "فحص حالة Git..."

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_warning "المجلد ليس مستودع Git، جاري التهيئة..."
        git init
        log_success "تم تهيئة المستودع"
    fi

    CHANGES=$(git status --porcelain)
    if [ -z "$CHANGES" ]; then
        log_warning "لا توجد تغييرات للدفع"
        echo ""
        log_info "إذا أردت الدفع رغم ذلك، استخدم: git push origin $BRANCH"
        exit 0
    fi

    log_info "التغييرات المكتشفة:"
    echo "$CHANGES" | head -20
    
    CHANGE_COUNT=$(echo "$CHANGES" | wc -l)
    if [ "$CHANGE_COUNT" -gt 20 ]; then
        log_info "... و $((CHANGE_COUNT - 20)) تغييرات أخرى"
    fi
}

stage_and_commit() {
    print_separator
    log_info "إضافة وتأكيد التغييرات..."

    git add -A
    
    if git diff --cached --quiet; then
        log_warning "لا توجد تغييرات مُضافة للتأكيد"
        exit 0
    fi

    git commit -m "$COMMIT_MESSAGE"
    log_success "تم التأكيد: $COMMIT_MESSAGE"
}

push_to_remote() {
    print_separator
    log_info "دفع الكود إلى GitHub..."

    if ! git show-ref --verify --quiet refs/heads/$BRANCH; then
        log_info "الفرع $BRANCH غير موجود، جاري إنشاؤه..."
        git checkout -b $BRANCH 2>/dev/null || git checkout $BRANCH
    fi

    if git push -u origin $BRANCH 2>&1; then
        log_success "تم دفع الكود بنجاح إلى origin/$BRANCH"
    else
        log_error "فشل الدفع - تحقق من:"
        log_error "  • صلاحيات GITHUB_TOKEN"
        log_error "  • اسم المستودع: $REPO_NAME"
        log_error "  • اتصال الإنترنت"
        exit 1
    fi
}

show_result() {
    print_separator
    CURRENT_SHA=$(git rev-parse --short HEAD)
    log_success "🎉 تم الدفع بنجاح!"
    log_info "الفرع: $BRANCH"
    log_info "SHA: $CURRENT_SHA"
    log_info "الرسالة: $COMMIT_MESSAGE"
    print_separator
}

main() {
    print_separator
    log_info "📤 بدء دفع الكود إلى GitHub"
    print_separator

    check_git_secrets
    configure_git
    check_git_status
    stage_and_commit
    push_to_remote
    show_result
}

main
