#!/bin/bash

################################################################################
# 🚀 سكريبت البناء والنشر الذكي
# ينقل التحديثات عبر Git ثم يبني APK على السيرفر
################################################################################

set -e

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# متغيرات البيئة
GITHUB_TOKEN="${GITHUB_TOKEN}"
GITHUB_REPO="${GITHUB_REPO:-git@github.com:binarjoin/app2.git}"
SSH_HOST="${SSH_HOST}"
SSH_USER="${SSH_USER}"
SSH_PORT="${SSH_PORT}"
SSH_PASSWORD="${SSH_PASSWORD}"
REMOTE_APP_DIR="/home/administrator/app2"

# دالة طباعة ملونة
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

################################################################################
# 1️⃣ تحديث رقم الإصدار
################################################################################

update_version() {
    log_info "جاري تحديث رقم الإصدار..."
    
    # قراءة الإصدار الحالي من package.json
    CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
    
    log_info "الإصدار الحالي: $CURRENT_VERSION"
    
    # تحليل الإصدار (MAJOR.MINOR.PATCH)
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    
    # زيادة PATCH
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    
    log_info "الإصدار الجديد: $NEW_VERSION"
    
    # تحديث package.json
    sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    
    # تحديث Android versionCode و versionName
    NEW_VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + NEW_PATCH))
    sed -i "s/versionCode [0-9]*/versionCode $NEW_VERSION_CODE/" android/app/build.gradle
    sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle
    
    log_success "تم تحديث رقم الإصدار إلى $NEW_VERSION"
    
    echo "$NEW_VERSION"
}

################################################################################
# 2️⃣ دفع التحديثات إلى Git
################################################################################

push_to_git() {
    local VERSION=$1
    
    log_info "جاري دفع التحديثات إلى Git..."
    
    # التحقق من وجود تغييرات
    if ! git diff --quiet; then
        git add -A
        git commit -m "Build version $VERSION - Auto deployment"
        log_success "تم إنشاء commit جديد"
    else
        log_warning "لا توجد تغييرات جديدة"
    fi
    
    # دفع إلى الفرع الرئيسي
    git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
        log_warning "فشل الدفع - تحقق من اتصال Git"
    }
    
    log_success "تم دفع التحديثات إلى Git"
}

################################################################################
# 3️⃣ إرسال أمر للسيرفر ليسحب ويبني
################################################################################

trigger_build_on_server() {
    local VERSION=$1
    
    log_info "جاري إرسال أمر البناء للسيرفر..."
    
    export SSHPASS="$SSH_PASSWORD"
    
    # فحص اتصال SSH
    if ! sshpass -e ssh -o StrictHostKeyChecking=no -p $SSH_PORT $SSH_USER@$SSH_HOST "echo 'connected'" &>/dev/null; then
        log_error "فشل الاتصال بالسيرفر"
        return 1
    fi
    
    log_success "متصل بالسيرفر"
    
    # إرسال أمر البناء
    sshpass -e ssh -o StrictHostKeyChecking=no -p $SSH_PORT $SSH_USER@$SSH_HOST << REMOTE_CMD
cd $REMOTE_APP_DIR

# سحب آخر التحديثات
echo "📥 جاري سحب التحديثات من Git..."
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "تحذير: قد تكون Git ليست مهيأة"

# بناء APK
cd android

echo "🔨 جاري البناء - الإصدار: $VERSION..."

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=\$JAVA_HOME/bin:\$PATH
export ANDROID_HOME=/opt/android-sdk

chmod +x gradlew
./gradlew --stop 2>/dev/null || true
sleep 2

# البناء
./gradlew clean assembleDebug --no-daemon 2>&1 | tail -40

# التحقق من النجاح
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo ""
    echo "✅ ✅ ✅ اكتمل البناء بنجاح - الإصدار: $VERSION"
    ls -lh app/build/outputs/apk/debug/app-debug.apk
    echo "⏰ وقت البناء: \$(date)"
else
    echo ""
    echo "❌ فشل البناء"
    exit 1
fi

REMOTE_CMD
    
    if [ $? -eq 0 ]; then
        log_success "تم بناء APK بنجاح على السيرفر"
        return 0
    else
        log_error "فشل البناء على السيرفر"
        return 1
    fi
}

################################################################################
# 4️⃣ عرض الملخص
################################################################################

print_summary() {
    local VERSION=$1
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          📱 ملخص البناء والنشر الناجح                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  📦 الإصدار الجديد: $VERSION"
    echo "  🔗 المستودع: $GITHUB_REPO"
    echo "  🖥️  السيرفر: $SSH_USER@$SSH_HOST:$SSH_PORT"
    echo "  📂 المجلد البعيد: $REMOTE_APP_DIR"
    echo "  📱 APK: $REMOTE_APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "  ✅ التحديثات دُفعت إلى Git"
    echo "  ✅ السيرفر سحب التحديثات"
    echo "  ✅ تم بناء APK جديدة"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo ""
}

################################################################################
# البرنامج الرئيسي
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     🚀 سكريبت البناء والنشر الذكي - BinarJoin App        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # التحقق من المتطلبات
    if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ] || [ -z "$SSH_PORT" ] || [ -z "$SSH_PASSWORD" ]; then
        log_error "بيانات SSH غير مكتملة"
        echo "تأكد من وجود:"
        echo "  - SSH_HOST"
        echo "  - SSH_USER"
        echo "  - SSH_PORT"
        echo "  - SSH_PASSWORD"
        exit 1
    fi
    
    # تحديث الإصدار
    VERSION=$(update_version)
    
    # دفع إلى Git
    push_to_git "$VERSION"
    
    # بناء على السيرفر
    if trigger_build_on_server "$VERSION"; then
        print_summary "$VERSION"
        exit 0
    else
        log_error "فشل البناء"
        exit 1
    fi
}

# تشغيل البرنامج
main "$@"
