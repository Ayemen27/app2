#!/usr/bin/env bash
# ====================================================================
# سكربت تشغيل نظام نقل الأصول الموحّد — Transfer Orchestrator
# ====================================================================
# واجهة موحّدة لكل عمليات نقل الأصول والمتغيرات بين حسابات Replit.
#
# الاستخدام:
#   ./scripts/transfer/transfer.sh export [version]   # أنبوب التصدير الكامل
#   ./scripts/transfer/transfer.sh import [version]   # أنبوب الاستيراد الكامل
#   ./scripts/transfer/transfer.sh list                # الإصدارات المتاحة
#   ./scripts/transfer/transfer.sh check               # فحص الانجراف
#   ./scripts/transfer/transfer.sh status              # حالة النظام
#   ./scripts/transfer/transfer.sh test                # اختبار الاتصال
#   ./scripts/transfer/transfer.sh help                # المساعدة
#
# الخيارات (تنطبق على export/import):
#   --force               تخطي التأكيدات التفاعلية
#   --no-encrypt          (export فقط) بدون تشفير
#   --no-backup           (import فقط) بدون نسخ احتياطي
#   --no-apply-secrets    (import فقط) بدون تطبيق snapshot
#
# المتغيرات الاختيارية:
#   ENCRYPT_PASSPHRASE    لتجنب الإدخال التفاعلي للتشفير/فك التشفير
#   KEEP_LAST             عدد الإصدارات المحفوظة (افتراضي 5)
# ====================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

# ====================================================================
# الأنبوب 1: التصدير من الحساب القديم
# ====================================================================
pipeline_export() {
  local version="${1:-}"
  shift || true

  log_step "🚀 أنبوب التصدير — Export Pipeline"
  echo -e "${C_BOLD}الهدف:${C_RESET} حزم الملفات المُستثناة من Git ورفعها للسيرفر"
  echo
  echo -e "  ${C_YELLOW}📋 تذكير القنوات الثلاث:${C_RESET}"
  echo -e "    ${C_BLUE}1. GitHub${C_RESET}        ← الكود (تأكد من git push قبل المتابعة)"
  echo -e "    ${C_BLUE}2. هذا الأنبوب${C_RESET}   ← ملفات .gitignore (assets/DBs/WA)"
  echo -e "    ${C_BLUE}3. Replit Secrets${C_RESET} ← المتغيرات (snapshot سيُولَّد محلياً)"
  echo

  log_info "▶ المرحلة 1/4: فحص النظام"
  if ! pipeline_test_silent; then
    log_error "فشل اختبار الاتصال — راجع بيانات SSH"
    exit 1
  fi
  log_ok "  الاتصال بالسيرفر سليم"

  log_info "▶ المرحلة 2/4: فحص الانجراف وتوليد snapshot"
  if ! bash "${SCRIPT_DIR}/snapshot-secrets.sh" --check 2>&1 | tail -20 | sed 's/^/    /'; then
    log_warn "  تحذيرات في snapshot — راجعها أعلاه"
  fi

  log_info "▶ المرحلة 3/4: الحزم والتشفير والرفع"
  if [ -n "$version" ]; then
    bash "${SCRIPT_DIR}/pack-and-publish.sh" "$version" "$@"
  else
    bash "${SCRIPT_DIR}/pack-and-publish.sh" "$@"
  fi

  log_info "▶ المرحلة 4/4: التحقق النهائي"
  bash "${SCRIPT_DIR}/list-versions.sh" | tail -10

  echo
  log_ok "✅ أنبوب التصدير اكتمل بنجاح"
  echo
  echo -e "  ${C_BOLD}الخطوات التالية للنقل الكامل:${C_RESET}"
  echo -e "    ${C_GREEN}1.${C_RESET} تأكد أن الكود مرفوع على GitHub:"
  echo "         bash scripts/transfer/gh-sync.sh push"
  echo -e "    ${C_GREEN}2.${C_RESET} في الحساب الجديد:"
  echo "         git clone <repo-url>"
  echo "         bash scripts/transfer/transfer.sh import"
  echo -e "    ${C_GREEN}3.${C_RESET} ألصق المتغيرات في أداة Replit Secrets:"
  echo "         bash scripts/transfer/apply-secrets.sh --show"
}

# ====================================================================
# الأنبوب 2: الاستيراد في الحساب الجديد
# ====================================================================
pipeline_import() {
  local version="${1:-}"
  shift || true

  local apply_secrets=true
  local extra_args=()
  for arg in "$@"; do
    case "$arg" in
      --no-apply-secrets) apply_secrets=false ;;
      *) extra_args+=("$arg") ;;
    esac
  done

  log_step "📥 أنبوب الاستيراد — Import Pipeline"
  echo -e "${C_BOLD}الهدف:${C_RESET} سحب الإصدار من السيرفر واستعادة ملفات .gitignore"
  echo
  echo -e "  ${C_YELLOW}📋 ترتيب النقل الموصى به:${C_RESET}"
  echo -e "    ${C_GREEN}✓${C_RESET} ${C_BLUE}الكود${C_RESET} يجب أن يكون مُستنسخاً من GitHub بالفعل (git clone)"
  echo -e "    ${C_BLUE}▶${C_RESET} هذا الأنبوب يستعيد الملفات الكبيرة من السيرفر"
  echo -e "    ${C_BLUE}↻${C_RESET} المتغيرات تُلصَق يدوياً في أداة Replit Secrets بعد الاستيراد"
  echo

  log_info "▶ المرحلة 1/5: فحص النظام"
  if ! pipeline_test_silent; then
    log_error "فشل اختبار الاتصال — راجع بيانات SSH"
    exit 1
  fi
  log_ok "  الاتصال بالسيرفر سليم"

  log_info "▶ المرحلة 2/5: عرض الإصدارات المتاحة"
  bash "${SCRIPT_DIR}/list-versions.sh" | tail -10

  log_info "▶ المرحلة 3/5: السحب وفك التشفير والاستعادة"
  if [ -n "$version" ]; then
    bash "${SCRIPT_DIR}/pull-and-restore.sh" "$version" "${extra_args[@]:-}"
  else
    bash "${SCRIPT_DIR}/pull-and-restore.sh" "${extra_args[@]:-}"
  fi

  if [ "$apply_secrets" = true ]; then
    log_info "▶ المرحلة 4/5: عرض snapshot المتغيرات للنسخ في أداة Secrets"
    if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
      # القناة الرسمية للأسرار في الحساب الجديد = أداة Replit Secrets
      bash "${SCRIPT_DIR}/apply-secrets.sh" --show 2>&1 | sed 's/^/    /'
    else
      log_warn "  .env.snapshot غير موجود — يجب تشغيل snapshot-secrets في الحساب القديم أولاً"
    fi
  else
    log_info "▶ المرحلة 4/5: تخطي عرض المتغيرات (--no-apply-secrets)"
  fi

  log_info "▶ المرحلة 5/5: ملخص الاستعادة"
  echo
  log_ok "✅ أنبوب الاستيراد اكتمل بنجاح"
  echo
  echo -e "  ${C_BOLD}الخطوات التالية:${C_RESET}"
  echo -e "    ${C_GREEN}1.${C_RESET} ألصق المتغيرات أعلاه في: Tools → Secrets"
  echo -e "    ${C_GREEN}2.${C_RESET} npm install            # تثبيت الاعتماديات"
  echo -e "    ${C_GREEN}3.${C_RESET} npm run db:push        # مزامنة قاعدة البيانات (لو لزم)"
  echo -e "    ${C_GREEN}4.${C_RESET} npm run dev            # تشغيل التطبيق"
}

# ====================================================================
# اختبار الاتصال
# ====================================================================
pipeline_test_silent() {
  ssh_exec "echo OK" >/dev/null 2>&1
}

pipeline_test() {
  log_step "🔌 اختبار الاتصال بالسيرفر"
  log_info "السيرفر: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
  echo

  if pipeline_test_silent; then
    log_ok "الاتصال ناجح"
    ssh_exec 'echo "  المضيف: $(hostname)"; echo "  المستخدم: $(whoami)"; echo "  المساحة: $(df -h / | tail -1 | awk "{print \$4 \" متاح من \" \$2}")"'
    echo
    log_info "مجلد الإصدارات:"
    ssh_exec "ls -la '${REMOTE_BASE}' 2>/dev/null | head -10 || echo '  (غير موجود بعد — سيُنشأ عند أول export)'" | sed 's/^/  /'
  else
    log_error "فشل الاتصال — راجع SSH_HOST, SSH_USER, SSH_PORT, SSH_PASSWORD"
    exit 1
  fi
}

# ====================================================================
# حالة النظام
# ====================================================================
pipeline_status() {
  log_step "📊 حالة نظام النقل"

  echo -e "\n${C_BOLD}الإعدادات:${C_RESET}"
  printf "  %-25s %s\n" "السيرفر:" "${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
  printf "  %-25s %s\n" "مسار الإصدارات:" "${REMOTE_BASE}"
  printf "  %-25s %d عنصر\n" "الأصول المحزومة:" "${#ASSETS_INCLUDE[@]}"
  printf "  %-25s %d مفتاح إضافي\n" "Secrets الإضافية:" "${#EXTRA_SECRET_KEYS[@]}"

  echo -e "\n${C_BOLD}الملفات المحلية:${C_RESET}"
  for item in "${ASSETS_INCLUDE[@]}"; do
    if [ -e "${LOCAL_ROOT}/${item}" ]; then
      sz=$(du -sh "${LOCAL_ROOT}/${item}" 2>/dev/null | cut -f1)
      printf "  ${C_GREEN}✓${C_RESET} %-30s %s\n" "$item" "$sz"
    else
      printf "  ${C_YELLOW}—${C_RESET} %-30s غير موجود\n" "$item"
    fi
  done

  echo -e "\n${C_BOLD}snapshot المتغيرات:${C_RESET}"
  if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
    age=$(stat -c %y "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null | cut -d. -f1)
    cnt=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null || echo 0)
    printf "  ${C_GREEN}✓${C_RESET} موجود — %d مفتاح — آخر تحديث: %s\n" "$cnt" "$age"
  else
    printf "  ${C_YELLOW}—${C_RESET} غير موجود (سيُولَّد عند أول export)\n"
  fi

  echo -e "\n${C_BOLD}الاتصال بالسيرفر:${C_RESET}"
  if pipeline_test_silent; then
    printf "  ${C_GREEN}✓${C_RESET} الاتصال يعمل\n"
    LATEST=$(ssh_exec "cat '${REMOTE_LATEST_FILE}' 2>/dev/null || true" 2>/dev/null | tr -d '[:space:]' || true)
    if [ -n "$LATEST" ]; then
      printf "  ${C_BLUE}ℹ${C_RESET} آخر إصدار منشور: ${C_BOLD}%s${C_RESET}\n" "$LATEST"
    else
      printf "  ${C_YELLOW}!${C_RESET} لا يوجد إصدار منشور بعد\n"
    fi
  else
    printf "  ${C_RED}✗${C_RESET} الاتصال فاشل\n"
  fi
  echo
}

# ====================================================================
# المساعدة
# ====================================================================
show_help() {
  cat <<'HELP'

  ╔════════════════════════════════════════════════════════════════╗
  ║         نظام نقل الأصول والمتغيرات بين حسابات Replit          ║
  ╚════════════════════════════════════════════════════════════════╝

  معمارية القنوات الثلاث:
    🐙 GitHub         → الكود المُتعقَّب
    💾 السيرفر        → ملفات .gitignore (assets/DBs/WA)
    🔐 Replit Secrets → المتغيرات السرية (يدوي)

  الأوامر الرئيسية:

    export [version] [opts]    🚀 أنبوب التصدير (الحساب القديم)
                                  - يولّد snapshot المتغيرات (محلياً)
                                  - يحزم ملفات .gitignore
                                  - يشفّر بـ AES-256
                                  - يرفع للسيرفر كإصدار

    import [version] [opts]    📥 أنبوب الاستيراد (الحساب الجديد)
                                  - يسحب الإصدار من السيرفر
                                  - يفك التشفير + يستعيد الأصول
                                  - يعرض المتغيرات للصق في أداة Secrets

    gh push                    🐙 رفع الكود لـ GitHub
    gh status                  🐙 حالة المستودع وعلاقته بـ origin
    guide                      📖 الدليل الكامل لطريقة النقل

  الأوامر المساعدة:

    list                       📋 عرض الإصدارات المتاحة على السيرفر
    check                      🔍 كشف الانجراف بين .env والبيئة
    status                     📊 حالة النظام الكاملة
    test                       🔌 اختبار الاتصال بالسيرفر
    preflight                  🔧 فحص + تثبيت الأدوات المطلوبة
    apply --show               📋 عرض snapshot للصق في Secrets
    help                       ❓ هذه الرسالة

  الخيارات:

    export:
      --force                  تخطي التأكيدات
      --no-encrypt             بدون تشفير (غير مستحسن)
      --dry-run                تجربة دون رفع فعلي

    import:
      --force / -y             تخطي التأكيدات
      --no-backup              بدون نسخ احتياطي للملفات الحالية
      --no-apply-secrets       تخطي تطبيق snapshot

  أمثلة:

    # تصدير بإصدار تلقائي
    ./scripts/transfer/transfer.sh export

    # تصدير بإصدار محدد
    ./scripts/transfer/transfer.sh export v2.1.0

    # استيراد آخر إصدار في حساب جديد
    ./scripts/transfer/transfer.sh import

    # استيراد إصدار محدد بدون أسئلة
    ./scripts/transfer/transfer.sh import v2.1.0 --force

  متغيرات البيئة المطلوبة (في Replit Secrets):
    SSH_HOST, SSH_USER, SSH_PORT, SSH_PASSWORD

  متغيرات اختيارية:
    ENCRYPT_PASSPHRASE   يتجنب الإدخال التفاعلي
    KEEP_LAST            عدد الإصدارات المحفوظة (افتراضي 5)

HELP
}

# ====================================================================
# نقطة الدخول
# ====================================================================
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  export|publish)
    pipeline_export "$@"
    ;;
  import|restore|pull)
    pipeline_import "$@"
    ;;
  preflight|deps|check-deps)
    bash "${SCRIPT_DIR}/preflight.sh" "$@"
    ;;
  list|ls)
    bash "${SCRIPT_DIR}/list-versions.sh"
    ;;
  check|drift)
    bash "${SCRIPT_DIR}/snapshot-secrets.sh" --check
    ;;
  status|info)
    pipeline_status
    ;;
  test|ping)
    pipeline_test
    ;;
  snapshot)
    bash "${SCRIPT_DIR}/snapshot-secrets.sh"
    ;;
  apply)
    bash "${SCRIPT_DIR}/apply-secrets.sh" "$@"
    ;;
  gh|git|github)
    bash "${SCRIPT_DIR}/gh-sync.sh" "$@"
    ;;
  guide|docs)
    bash "${SCRIPT_DIR}/gh-sync.sh" guide
    ;;
  help|-h|--help|"")
    show_help
    ;;
  *)
    log_error "أمر غير معروف: $COMMAND"
    echo
    show_help
    exit 1
    ;;
esac
