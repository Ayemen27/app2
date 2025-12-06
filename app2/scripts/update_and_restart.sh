#!/bin/bash

###############################################################################
# 🔄 سكربت تحديث وإعادة تشغيل التطبيق على السيرفر
# 
# الاستخدام: يتم تشغيله عن بعد عبر SSH
# المسار: /home/administrator/construction-app
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

APP_DIR="/home/administrator/construction-app"
BRANCH="${1:-main}"
HEALTH_URL="https://app2.binarjoinanelytic.info/api/health"

cd "$APP_DIR" || {
    log_error "فشل الوصول إلى مجلد التطبيق: $APP_DIR"
    exit 1
}

save_current_version() {
    print_separator
    log_info "حفظ النسخة الحالية للتراجع..."
    
    PREVIOUS_SHA=$(git rev-parse HEAD 2>/dev/null || echo "none")
    echo "$PREVIOUS_SHA" > .previous_sha
    
    if [ "$PREVIOUS_SHA" != "none" ]; then
        log_success "النسخة الحالية: ${PREVIOUS_SHA:0:8}"
    else
        log_warning "لا توجد نسخة سابقة"
    fi
}

pull_latest_code() {
    print_separator
    log_info "سحب أحدث الكود من المستودع..."

    git fetch --all --prune 2>&1 || {
        log_error "فشل جلب التحديثات من المستودع"
        exit 1
    }

    git reset --hard origin/$BRANCH 2>&1 || {
        log_error "فشل تحديث الكود إلى origin/$BRANCH"
        exit 1
    }

    NEW_SHA=$(git rev-parse --short HEAD)
    log_success "تم التحديث إلى: $NEW_SHA"
    
    log_info "آخر التغييرات:"
    git log --oneline -3
}

install_dependencies() {
    print_separator
    log_info "تثبيت المتطلبات..."

    if [ -f "package-lock.json" ]; then
        npm ci --loglevel=error 2>&1 || {
            log_warning "فشل npm ci، جاري المحاولة بـ npm install..."
            npm install --loglevel=error 2>&1 || {
                log_error "فشل تثبيت المتطلبات"
                exit 1
            }
        }
    else
        npm install --loglevel=error 2>&1 || {
            log_error "فشل تثبيت المتطلبات"
            exit 1
        }
    fi

    log_success "تم تثبيت المتطلبات"
}

build_application() {
    print_separator
    log_info "بناء التطبيق..."

    npm run build 2>&1 || {
        log_error "فشل بناء التطبيق"
        log_warning "جاري التراجع للنسخة السابقة..."
        rollback
        exit 1
    }

    log_success "تم بناء التطبيق بنجاح"
}

restart_pm2() {
    print_separator
    log_info "إعادة تشغيل التطبيق عبر PM2..."

    mkdir -p logs

    if pm2 describe construction-app > /dev/null 2>&1; then
        pm2 reload ecosystem.config.cjs --update-env 2>&1 || {
            log_warning "فشل reload، جاري المحاولة بـ restart..."
            pm2 restart ecosystem.config.cjs --update-env 2>&1 || {
                log_error "فشل إعادة تشغيل PM2"
                exit 1
            }
        }
        log_success "تم إعادة تشغيل التطبيق"
    else
        log_info "التطبيق غير موجود، جاري بدء تشغيل جديد..."
        pm2 start ecosystem.config.cjs 2>&1 || {
            log_error "فشل بدء التطبيق"
            exit 1
        }
        log_success "تم بدء التطبيق"
    fi

    pm2 save
    
    echo ""
    log_info "حالة PM2:"
    pm2 status
}

verify_health() {
    print_separator
    log_info "التحقق من صحة التطبيق..."

    sleep 5

    RETRY_COUNT=0
    MAX_RETRIES=3

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            log_success "التطبيق يعمل بشكل صحيح!"
            log_info "الرابط: $HEALTH_URL"
            return 0
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warning "المحاولة $RETRY_COUNT من $MAX_RETRIES..."
        sleep 3
    done

    log_warning "لم يتم التحقق من الصحة - قد يحتاج لوقت إضافي"
    log_info "تحقق يدوياً: curl $HEALTH_URL"
}

rollback() {
    log_warning "🔙 جاري التراجع للنسخة السابقة..."
    
    if [ -f ".previous_sha" ]; then
        PREVIOUS_SHA=$(cat .previous_sha)
        if [ "$PREVIOUS_SHA" != "none" ] && [ -n "$PREVIOUS_SHA" ]; then
            git checkout "$PREVIOUS_SHA" 2>&1 || {
                log_error "فشل التراجع إلى $PREVIOUS_SHA"
                return 1
            }
            log_success "تم التراجع إلى: ${PREVIOUS_SHA:0:8}"
            
            npm ci --loglevel=error 2>&1
            npm run build 2>&1
            pm2 reload ecosystem.config.cjs --update-env 2>&1
            
            log_success "تم استعادة النسخة السابقة"
        else
            log_error "لا توجد نسخة سابقة للتراجع إليها"
        fi
    else
        log_error "ملف النسخة السابقة غير موجود"
    fi
}

show_summary() {
    print_separator
    CURRENT_SHA=$(git rev-parse --short HEAD)
    log_success "🎉 اكتمل التحديث بنجاح!"
    log_info "النسخة: $CURRENT_SHA"
    log_info "الفرع: $BRANCH"
    log_info "الرابط: https://app2.binarjoinanelytic.info"
    print_separator
}

main() {
    print_separator
    log_info "🔄 بدء تحديث التطبيق على السيرفر"
    log_info "المجلد: $APP_DIR"
    log_info "الفرع: $BRANCH"
    print_separator

    save_current_version
    pull_latest_code
    install_dependencies
    build_application
    restart_pm2
    verify_health
    show_summary
}

main
