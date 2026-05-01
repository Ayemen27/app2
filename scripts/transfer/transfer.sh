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

  # تمرير الوسيطات الإضافية للسكربتات المعنية
  local pack_extra=()
  if [ -n "$version" ]; then
    pack_extra+=("$version")
  fi
  for arg in "$@"; do
    pack_extra+=("$arg")
  done

  log_step "🚀 أنبوب التصدير — Export Pipeline (8 خطوات)"
  echo -e "${C_BOLD}الهدف:${C_RESET} نقل كامل: كود + ملفات .gitignore + متغيرات البيئة"
  echo
  echo -e "  ${C_YELLOW}📋 الترتيب التشغيلي:${C_RESET}"
  echo -e "    ${C_BLUE}1.${C_RESET} preflight        فحص الأدوات + ENCRYPT_PASSPHRASE + اتصال SSH"
  echo -e "    ${C_BLUE}2.${C_RESET} git push         دفع الكود لـ GitHub قبل تخزين بياناته"
  echo -e "    ${C_BLUE}3.${C_RESET} snapshot         توليد .env.snapshot من البيئة الفعّالة"
  echo -e "    ${C_BLUE}4.${C_RESET} pack + encrypt   حزم الأصول + .env.snapshot وتشفيرها AES-256"
  echo -e "    ${C_BLUE}5.${C_RESET} upload           رفع الأرشيف للسيرفر"
  echo -e "    ${C_BLUE}6.${C_RESET} verify           مقارنة SHA256 محلي/بعيد"
  echo -e "    ${C_BLUE}7.${C_RESET} cleanup-old      حذف الإصدارات القديمة على السيرفر"
  echo -e "    ${C_BLUE}8.${C_RESET} cleanup-local    تنظيف .transfer-tmp/ محلياً"
  echo

  # ----- 1/8: preflight -----
  log_info "▶ المرحلة 1/8: preflight (أدوات + متغيرات + اتصال SSH)"
  if ! bash "${SCRIPT_DIR}/preflight.sh" --full; then
    log_error "فشل preflight — راجع الأخطاء أعلاه"
    exit 1
  fi
  log_ok "  preflight ناجح"
  echo

  # ----- 2/8: git push -----
  log_info "▶ المرحلة 2/8: git push (دفع الكود لـ GitHub)"
  bash "${SCRIPT_DIR}/git-push.sh" || log_warn "  git push فشل — يستمر الأنبوب"
  echo

  # ----- 3/8: snapshot -----
  log_info "▶ المرحلة 3/8: توليد .env.snapshot"
  if ! bash "${SCRIPT_DIR}/snapshot-secrets.sh"; then
    log_error "فشل توليد snapshot"
    exit 1
  fi
  echo

  # ----- 4/8: pack + encrypt -----
  log_info "▶ المرحلة 4/8: حزم وتشفير الأصول + .env.snapshot"
  if ! bash "${SCRIPT_DIR}/pack.sh" "${pack_extra[@]}"; then
    log_error "فشل الحزم والتشفير"
    exit 1
  fi
  echo

  # ----- 5/8: upload -----
  log_info "▶ المرحلة 5/8: رفع الأرشيف للسيرفر"
  if ! bash "${SCRIPT_DIR}/upload.sh"; then
    log_error "فشل رفع الأرشيف"
    exit 1
  fi
  echo

  # ----- 6/8: verify -----
  log_info "▶ المرحلة 6/8: التحقق من سلامة الرفع (SHA256)"
  if ! bash "${SCRIPT_DIR}/verify.sh"; then
    log_error "فشل التحقق — لا تنظّف، احفظ النسخة المحلية للتشخيص"
    exit 1
  fi
  echo

  # ----- 7/8: cleanup-old -----
  log_info "▶ المرحلة 7/8: حذف الإصدارات القديمة على السيرفر"
  bash "${SCRIPT_DIR}/cleanup-old.sh" || log_warn "  cleanup-old فشل — غير حرج"
  echo

  # ----- 8/8: cleanup-local -----
  log_info "▶ المرحلة 8/8: تنظيف الملفات المؤقتة المحلية"
  bash "${SCRIPT_DIR}/cleanup-local.sh" || log_warn "  cleanup-local فشل — غير حرج"
  echo

  log_ok "✅ أنبوب التصدير اكتمل بنجاح (8/8)"
  echo
  echo -e "  ${C_BOLD}الخطوات التالية في الحساب الجديد:${C_RESET}"
  echo -e "    ${C_GREEN}1.${C_RESET} استنسخ الكود من GitHub: ${C_BOLD}git clone <URL>${C_RESET}"
  echo -e "    ${C_GREEN}2.${C_RESET} أضف ENCRYPT_PASSPHRASE في Replit Secrets (نفس الكلمة المُستخدَمة هنا)"
  echo -e "    ${C_GREEN}3.${C_RESET} شغّل: ${C_BOLD}bash scripts/transfer/transfer.sh import${C_RESET}"
}

# ====================================================================
# الأنبوب 2: الاستيراد في الحساب الجديد
# ====================================================================
pipeline_import() {
  local version="${1:-}"
  shift || true

  local apply_secrets=true
  local download_extra=()
  local extract_extra=()

  for arg in "$@"; do
    case "$arg" in
      --no-apply-secrets) apply_secrets=false ;;
      --no-backup)        extract_extra+=("--no-backup") ;;
      *)                  download_extra+=("$arg") ;;
    esac
  done

  log_step "📥 أنبوب الاستيراد — Import Pipeline (4 خطوات)"
  echo -e "${C_BOLD}الهدف:${C_RESET} استعادة الأصول والمتغيرات من السيرفر"
  echo
  echo -e "  ${C_YELLOW}📋 الترتيب التشغيلي:${C_RESET}"
  echo -e "    ${C_BLUE}1.${C_RESET} preflight        فحص الأدوات + ENCRYPT_PASSPHRASE + اتصال SSH"
  echo -e "    ${C_BLUE}2.${C_RESET} download         تنزيل آخر أرشيف (أو إصدار محدد) من السيرفر"
  echo -e "    ${C_BLUE}3.${C_RESET} decrypt+extract  فك التشفير + استخراج الملفات (مع نسخة احتياطية)"
  echo -e "    ${C_BLUE}4.${C_RESET} apply-secrets    تطبيق .env.snapshot على .env تلقائياً"
  echo

  echo -e "  ${C_GREEN}ℹ${C_RESET} الكود يجب أن يكون مُستنسخاً من GitHub بالفعل (${C_BOLD}git clone${C_RESET})"
  echo

  # ----- 1/4: preflight -----
  log_info "▶ المرحلة 1/4: preflight (أدوات + متغيرات + اتصال SSH)"
  if ! bash "${SCRIPT_DIR}/preflight.sh" --full; then
    log_error "فشل preflight — راجع الأخطاء أعلاه"
    exit 1
  fi
  log_ok "  preflight ناجح"
  echo

  log_info "  الإصدارات المتاحة على السيرفر:"
  bash "${SCRIPT_DIR}/list-versions.sh" | tail -10 | sed 's/^/    /'
  echo

  # ----- 2/4: download -----
  log_info "▶ المرحلة 2/4: تنزيل الأرشيف"
  if [ -n "$version" ]; then
    if ! bash "${SCRIPT_DIR}/download.sh" "$version" "${download_extra[@]:-}"; then
      log_error "فشل تنزيل الإصدار: $version"
      exit 1
    fi
  else
    if ! bash "${SCRIPT_DIR}/download.sh" "${download_extra[@]:-}"; then
      log_error "فشل تنزيل آخر إصدار"
      exit 1
    fi
  fi
  echo

  # ----- 3/4: decrypt + extract -----
  log_info "▶ المرحلة 3/4: فك التشفير واستخراج الملفات"
  if ! bash "${SCRIPT_DIR}/decrypt-extract.sh" "${extract_extra[@]:-}"; then
    log_error "فشل فك التشفير/الاستخراج"
    exit 1
  fi
  echo

  # ----- 4/4: apply-secrets -----
  if [ "$apply_secrets" = true ]; then
    log_info "▶ المرحلة 4/4: تطبيق .env.snapshot على .env"
    if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
      # --write-env: كتابة .env تلقائياً (التطبيق يقرأها عبر dotenv في server/config/env.ts)
      if ! bash "${SCRIPT_DIR}/apply-secrets.sh" --write-env; then
        log_error "فشل تطبيق .env.snapshot"
        exit 1
      fi
    else
      log_warn "  .env.snapshot غير موجود في الأرشيف"
      log_warn "  لا يوجد متغيرات للتطبيق — تأكد من تشغيل snapshot-secrets في الحساب القديم"
    fi
  else
    log_info "▶ المرحلة 4/4: تخطي تطبيق المتغيرات (--no-apply-secrets)"
  fi
  echo

  log_ok "✅ أنبوب الاستيراد اكتمل بنجاح (4/4)"
  echo
  echo -e "  ${C_BOLD}الخطوات التالية:${C_RESET}"
  echo -e "    ${C_GREEN}1.${C_RESET} ${C_BOLD}npm install${C_RESET}            # تثبيت الاعتماديات"
  echo -e "    ${C_GREEN}2.${C_RESET} ${C_BOLD}npm run db:push${C_RESET}        # مزامنة قاعدة البيانات (لو لزم)"
  echo -e "    ${C_GREEN}3.${C_RESET} أعِد تشغيل الـ workflow ليلتقط القيم الجديدة من .env"
  echo
  echo -e "  ${C_YELLOW}ℹ ملاحظة:${C_RESET} التطبيق يقرأ .env تلقائياً عبر dotenv (server/config/env.ts)"
  echo -e "       لا حاجة لإضافة المتغيرات يدوياً في Replit Secrets."
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
