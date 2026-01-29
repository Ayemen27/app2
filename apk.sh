#!/bin/bash

# ==============================================
# AXION Smart Build Pro v2.2.0 (External Server Edition)
# تطوير: وكيل AXION الذكي
# ==============================================

set -e
LOG_FILE="/tmp/axion_build_$(date +%s).log"

log() {
    echo -e ">>> $1" | tee -a "$LOG_FILE"
}

error_exit() {
    echo -e "❌ ERROR: $1" | tee -a "$LOG_FILE"
    exit 1
}

log "Starting AXION Smart Build Pro v2.2.0"
log "Work root: $(pwd)"

# 1. فحص البيئة وتحديد نوع المشروع
log "Detecting project environment..."
if [ -d "android" ]; then
    PROJECT_TYPE="capacitor"
    ANDROID_ROOT="android"
    log "Detected project type: Capacitor"
elif [ -d "platforms/android" ]; then
    PROJECT_TYPE="cordova"
    ANDROID_ROOT="platforms/android"
    log "Detected project type: Cordova"
else
    error_exit "Could not find android or platforms/android directory."
fi

# 2. تطوير وإصلاح ملفات Gradle (في طبقة التطبيق فقط)
APP_GRADLE="$ANDROID_ROOT/app/build.gradle"

if [ -f "$APP_GRADLE" ]; then
    log "Patching $APP_GRADLE..."
    
    # نسخة احتياطية
    cp "$APP_GRADLE" "${APP_GRADLE}.bak.$(date +%s)"
    
    # أ) تفعيل MultiDex في defaultConfig
    if ! grep -q "multiDexEnabled true" "$APP_GRADLE"; then
        sed -i '/defaultConfig {/a \        multiDexEnabled true' "$APP_GRADLE"
        log "✅ Enabled MultiDex in defaultConfig"
    fi
    
    # ب) إضافة التبعية بشكل صحيح وآمن
    if ! grep -q "androidx.multidex:multidex" "$APP_GRADLE"; then
        # البحث عن بلوك dependencies وإضافة التبعية في أوله
        sed -i '/dependencies {/a \    implementation "androidx.multidex:multidex:2.0.1"' "$APP_GRADLE"
        log "✅ Added MultiDex dependency safely"
    fi
    
    # ج) إصلاح الـ Namespace syntax (Gradle 8+)
    sed -i 's/namespace "/namespace = "/g' "$APP_GRADLE"
    log "✅ Standardized namespace syntax"
    
else
    error_exit "Application build.gradle not found at $APP_GRADLE"
fi

# 3. منع التعديلات الخاطئة في node_modules (التنظيف الذكي)
log "Cleaning up potential misconfigurations in dependencies..."
CAP_GRADLE="node_modules/@capacitor/android/capacitor/build.gradle"
if [ -f "$CAP_GRADLE" ]; then
    # إزالة أي محاولة سابقة لإضافة multidex في ملف المكتبة (هذا هو سبب الخطأ الأصلي)
    sed -i '/androidx.multidex:multidex/d' "$CAP_GRADLE"
    log "✅ Cleaned library-level dependencies to prevent 'method not found' error"
fi

# 4. تنظيف وبناء
log "Cleaning Gradle cache..."
cd "$ANDROID_ROOT"
./gradlew clean >> "$LOG_FILE" 2>&1 || log "⚠️ Clean failed, proceeding anyway..."

log "Starting Debug Build (assembleDebug)..."
if ./gradlew assembleDebug >> "$LOG_FILE" 2>&1; then
    log "=============================================="
    log "✅ BUILD SUCCESSFUL"
    log "=============================================="
else
    log "❌ DEBUG BUILD FAILED"
    log "Check logs at: $LOG_FILE"
    # استخراج الخطأ الأساسي للعرض السريع
    grep "ERROR" "$LOG_FILE" | head -n 5
    exit 1
fi
