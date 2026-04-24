#!/usr/bin/env bash
# ====================================================================
# سكربت السحب والاستعادة — Pull & Restore
# ====================================================================
# يسحب آخر إصدار (أو إصدار محدد) من السيرفر، يفك التشفير،
# يفك الضغط، ويستبدل الملفات في المسارات الصحيحة.
# يحتفظ بنسخة احتياطية لكل ملف موجود قبل استبداله.
#
# الاستخدام:
#   ./scripts/transfer/pull-and-restore.sh             # سحب آخر إصدار
#   ./scripts/transfer/pull-and-restore.sh v1.2.3      # سحب إصدار محدد
#   ./scripts/transfer/pull-and-restore.sh --no-backup # بدون نسخ احتياطي
#   ./scripts/transfer/pull-and-restore.sh --force     # بدون تأكيد تفاعلي
#
# المتغيرات الاختيارية:
#   DECRYPT_PASSPHRASE   كلمة سر فك التشفير (إن لم تُحدَّد، يُسأل)
# ====================================================================

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

require_tools tar sshpass ssh scp

VERSION=""
DO_BACKUP=true
FORCE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --no-backup) DO_BACKUP=false; shift ;;
    --force|-y)  FORCE=true; shift ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \?//'
      exit 0 ;;
    -*) log_error "خيار غير معروف: $1"; exit 1 ;;
    *)  VERSION="$1"; shift ;;
  esac
done

# ----- الخطوة 1: تحديد الإصدار -----
log_step "الخطوة 1: تحديد الإصدار"

if [ -z "$VERSION" ]; then
  log_info "جلب آخر إصدار من السيرفر..."
  VERSION=$(ssh_exec "cat '${REMOTE_LATEST_FILE}' 2>/dev/null" | tr -d '[:space:]')
  if [ -z "$VERSION" ]; then
    log_error "لا يوجد ملف ${REMOTE_LATEST_FILE} على السيرفر."
    log_error "يبدو أنه لم يُنشَر أي إصدار بعد."
    exit 1
  fi
  log_ok "آخر إصدار متاح: ${C_BOLD}${VERSION}${C_RESET}"
else
  log_info "الإصدار المطلوب: ${C_BOLD}${VERSION}${C_RESET}"
fi

# ----- الخطوة 2: التحقق من وجود الإصدار -----
log_step "الخطوة 2: البحث عن الأرشيف"

REMOTE_ENC="${REMOTE_BASE}/assets-${VERSION}.tar.gz.gpg"
REMOTE_PLAIN="${REMOTE_BASE}/assets-${VERSION}.tar.gz"
REMOTE_MANIFEST="${REMOTE_MANIFEST_DIR}/manifest-${VERSION}.txt"

ARCHIVE_PATH=""
IS_ENCRYPTED=false

if ssh_exec "[ -f '${REMOTE_ENC}' ]"; then
  ARCHIVE_PATH="$REMOTE_ENC"
  IS_ENCRYPTED=true
  log_info "وُجد أرشيف مشفّر."
elif ssh_exec "[ -f '${REMOTE_PLAIN}' ]"; then
  ARCHIVE_PATH="$REMOTE_PLAIN"
  log_warn "وُجد أرشيف غير مشفّر."
else
  log_error "لم يُعثَر على إصدار '${VERSION}' على السيرفر."
  log_info "للاطلاع على الإصدارات المتاحة:"
  echo "    ./scripts/transfer/list-versions.sh"
  exit 1
fi

# عرض البيان
if ssh_exec "[ -f '${REMOTE_MANIFEST}' ]"; then
  echo -e "\n${C_BOLD}— محتوى البيان —${C_RESET}"
  ssh_exec "cat '${REMOTE_MANIFEST}'" | sed 's/^/  /'
  echo
fi

# ----- الخطوة 3: تأكيد المستخدم -----
if [ "$FORCE" != true ]; then
  echo
  log_warn "ستُستبدَل الملفات المحلية بمحتوى الإصدار '${VERSION}'."
  if [ "$DO_BACKUP" = true ]; then
    log_info "نسخة احتياطية ستُحفَظ في: .transfer-backup-<timestamp>/"
  else
    log_warn "النسخ الاحتياطي معطّل — لن يتم حفظ الملفات الحالية."
  fi
  read -p "متابعة؟ [y/N] " -r REPLY
  if [[ ! "$REPLY" =~ ^[YyNnعمنy]$ ]] || [[ "$REPLY" =~ ^[Nnن]$ ]]; then
    log_info "أُلغي."
    exit 0
  fi
fi

# ----- الخطوة 4: تنزيل الأرشيف -----
log_step "الخطوة 4: تنزيل الأرشيف"

mkdir -p "${LOCAL_TMP}"
LOCAL_DOWNLOAD="${LOCAL_TMP}/$(basename "$ARCHIVE_PATH")"

log_info "تنزيل من: ${ARCHIVE_PATH}"
scp_download "$ARCHIVE_PATH" "$LOCAL_DOWNLOAD"
log_ok "تم التنزيل: $(du -h "$LOCAL_DOWNLOAD" | cut -f1)"

# ----- الخطوة 5: فك التشفير -----
DECRYPTED_TAR="${LOCAL_TMP}/assets-${VERSION}.tar.gz"

if [ "$IS_ENCRYPTED" = true ]; then
  log_step "الخطوة 5: فك التشفير"

  if [ -z "${DECRYPT_PASSPHRASE:-}" ]; then
    read -s -p "أدخل كلمة سر فك التشفير: " DECRYPT_PASSPHRASE
    echo
  fi

  echo "$DECRYPT_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
    --decrypt --output "$DECRYPTED_TAR" "$LOCAL_DOWNLOAD" 2>/dev/null || {
    log_error "فشل فك التشفير — كلمة السر غير صحيحة."
    rm -f "$LOCAL_DOWNLOAD" "$DECRYPTED_TAR"
    unset DECRYPT_PASSPHRASE
    exit 1
  }
  unset DECRYPT_PASSPHRASE
  rm -f "$LOCAL_DOWNLOAD"
  log_ok "فك التشفير تم."
else
  mv "$LOCAL_DOWNLOAD" "$DECRYPTED_TAR"
fi

# ----- الخطوة 6: نسخ احتياطي للملفات الحالية -----
if [ "$DO_BACKUP" = true ]; then
  log_step "الخطوة 6: نسخ احتياطي للملفات الحالية"

  BACKUP_DIR="${LOCAL_ROOT}/.transfer-backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  # نقرأ قائمة العناصر من الأرشيف نفسه
  TAR_ENTRIES=$(tar -tzf "$DECRYPTED_TAR" | awk -F/ '{print $1}' | sort -u)

  for entry in $TAR_ENTRIES; do
    if [ -e "${LOCAL_ROOT}/${entry}" ]; then
      log_info "نسخ احتياطي: $entry"
      cp -a "${LOCAL_ROOT}/${entry}" "${BACKUP_DIR}/" 2>/dev/null || true
    fi
  done

  log_ok "النسخ الاحتياطي في: $BACKUP_DIR"
fi

# ----- الخطوة 7: فك الضغط -----
log_step "الخطوة 7: فك الضغط واستبدال الملفات"

cd "$LOCAL_ROOT"
tar -xzf "$DECRYPTED_TAR" -C "$LOCAL_ROOT" 2>&1 | tail -5
log_ok "فك الضغط اكتمل."

# تنظيف
rm -f "$DECRYPTED_TAR"

# ----- النهاية -----
log_step "اكتملت الاستعادة بنجاح"
echo -e "  ${C_BOLD}الإصدار:${C_RESET}  ${VERSION}"
echo -e "  ${C_BOLD}المصدر:${C_RESET}   ${ARCHIVE_PATH}"
if [ "$DO_BACKUP" = true ]; then
  echo -e "  ${C_BOLD}النسخ:${C_RESET}    ${BACKUP_DIR}"
fi
echo

# ----- الخطوة الإضافية: تطبيق snapshot المتغيرات -----
if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
  log_step "الخطوة 8: تطبيق .env.snapshot المُستعاد"
  log_info "وُجد .env.snapshot يحوي متغيرات Replit Secrets الكاملة."
  echo
  if [ "$FORCE" = true ]; then
    log_info "وضع force — تطبيق snapshot تلقائياً على .env"
    bash "$(dirname "${BASH_SOURCE[0]}")/apply-secrets.sh" --write-env
  else
    log_info "للتطبيق، شغّل:"
    echo "    ./scripts/transfer/apply-secrets.sh"
    echo
    log_info "أو مباشرة:"
    echo "    ./scripts/transfer/apply-secrets.sh --write-env   # كتابة .env"
    echo "    ./scripts/transfer/apply-secrets.sh --show         # عرض للصق في Secrets"
    echo "    ./scripts/transfer/apply-secrets.sh --diff         # مقارنة قبل التطبيق"
  fi
else
  log_warn ".env.snapshot غير موجود في الأرشيف — قد تحتاج ضبط Replit Secrets يدوياً."
fi
