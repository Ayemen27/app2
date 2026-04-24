#!/usr/bin/env bash
# ====================================================================
# سكربت الحزم والنشر — Pack & Publish
# ====================================================================
# يحزم الملفات المستبعدة من المستودع وينشرها كإصدار على السيرفر.
#
# الاستخدام:
#   ./scripts/transfer/pack-and-publish.sh                # إصدار تلقائي بالتاريخ
#   ./scripts/transfer/pack-and-publish.sh v1.2.3         # إصدار محدد
#   ./scripts/transfer/pack-and-publish.sh --dry-run      # عرض دون رفع
#   ./scripts/transfer/pack-and-publish.sh --no-encrypt   # بدون تشفير
#
# المتغيرات الاختيارية:
#   ENCRYPT_PASSPHRASE   كلمة سر لتشفير الأرشيف (إن لم تُحدَّد، يُسأل تفاعلياً)
#   KEEP_LAST            عدد الإصدارات المحفوظة على السيرفر (افتراضي: 5)
# ====================================================================

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

require_tools tar sshpass ssh scp

# ----- معالجة الوسيطات -----
VERSION=""
DRY_RUN=false
ENCRYPT=true
KEEP_LAST="${KEEP_LAST:-5}"

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)    DRY_RUN=true; shift ;;
    --no-encrypt) ENCRYPT=false; shift ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \?//'
      exit 0 ;;
    -*) log_error "خيار غير معروف: $1"; exit 1 ;;
    *)  VERSION="$1"; shift ;;
  esac
done

# ----- توليد رقم إصدار تلقائي إن لم يُحدَّد -----
if [ -z "$VERSION" ]; then
  VERSION="v$(date -u +%Y%m%d-%H%M%S)"
  log_info "لم يُحدَّد رقم إصدار — سيُستخدم: ${C_BOLD}${VERSION}${C_RESET}"
fi

# تنظيف اسم الإصدار من أي رموز خطرة
if ! [[ "$VERSION" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  log_error "اسم الإصدار يحتوي رموزاً غير مسموحة: $VERSION"
  exit 1
fi

ARCHIVE_NAME="assets-${VERSION}.tar.gz"
[ "$ENCRYPT" = true ] && ARCHIVE_NAME="${ARCHIVE_NAME}.gpg"

LOCAL_ARCHIVE="${LOCAL_TMP}/${ARCHIVE_NAME}"
LOCAL_MANIFEST="${LOCAL_TMP}/manifest-${VERSION}.txt"

# ----- الخطوة 0: تحديث snapshot المتغيرات قبل الحزم -----
log_step "الخطوة 0: توليد .env.snapshot من البيئة الحالية"

if [ -x "$(dirname "${BASH_SOURCE[0]}")/snapshot-secrets.sh" ]; then
  bash "$(dirname "${BASH_SOURCE[0]}")/snapshot-secrets.sh" 2>&1 | sed 's/^/  /' || {
    log_warn "فشل توليد snapshot — سيُتابَع بدونه"
  }
else
  log_warn "snapshot-secrets.sh غير قابل للتنفيذ — تخطي"
fi

# ----- الخطوة 1: التحقق من العناصر المحلية -----
log_step "الخطوة 1: فحص العناصر القابلة للحزم"

mkdir -p "${LOCAL_TMP}"
INCLUDED=()
TOTAL_BYTES=0

for item in "${ASSETS_INCLUDE[@]}"; do
  full="${LOCAL_ROOT}/${item}"
  if [ -e "$full" ]; then
    size=$(du -sb "$full" 2>/dev/null | cut -f1)
    size_human=$(du -sh "$full" 2>/dev/null | cut -f1)
    INCLUDED+=("$item")
    TOTAL_BYTES=$((TOTAL_BYTES + size))
    printf "  ${C_GREEN}✓${C_RESET} %-35s %s\n" "$item" "$size_human"
  else
    printf "  ${C_YELLOW}—${C_RESET} %-35s غير موجود (سيُتجاهل)\n" "$item"
  fi
done

if [ ${#INCLUDED[@]} -eq 0 ]; then
  log_error "لا توجد عناصر قابلة للحزم."
  exit 1
fi

# تأكيد عدم وجود عناصر محظورة بطريق الخطأ
for forbidden in "${ASSETS_FORBIDDEN[@]}"; do
  for item in "${INCLUDED[@]}"; do
    if [[ "$item" == "$forbidden"* ]]; then
      log_error "عنصر محظور في القائمة: $item"
      exit 1
    fi
  done
done

TOTAL_HUMAN=$(numfmt --to=iec --suffix=B "$TOTAL_BYTES" 2>/dev/null || echo "${TOTAL_BYTES}B")
log_info "عدد العناصر: ${#INCLUDED[@]} — الحجم الكلي قبل الضغط: ${C_BOLD}${TOTAL_HUMAN}${C_RESET}"

# ----- الخطوة 2: إنشاء البيان (manifest) -----
log_step "الخطوة 2: إنشاء بيان الإصدار"

{
  echo "# Assets Bundle Manifest"
  echo "version: ${VERSION}"
  echo "created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "created_by: $(whoami)@$(hostname)"
  echo "encrypted: ${ENCRYPT}"
  echo "total_bytes_uncompressed: ${TOTAL_BYTES}"
  echo "items:"
  for item in "${INCLUDED[@]}"; do
    full="${LOCAL_ROOT}/${item}"
    sz=$(du -sb "$full" 2>/dev/null | cut -f1)
    echo "  - path: ${item}"
    echo "    bytes: ${sz}"
    if [ -f "$full" ]; then
      echo "    sha256: $(sha256sum "$full" | cut -d' ' -f1)"
    fi
  done
} > "$LOCAL_MANIFEST"

log_ok "البيان جاهز: $LOCAL_MANIFEST"

# ----- الخطوة 3: الحزم والضغط -----
log_step "الخطوة 3: الحزم والضغط"

if [ "$DRY_RUN" = true ]; then
  log_warn "وضع التجربة (--dry-run): تخطي الإنشاء الفعلي."
  cat "$LOCAL_MANIFEST"
  exit 0
fi

cd "$LOCAL_ROOT"
TAR_TMP="${LOCAL_TMP}/assets-${VERSION}.tar.gz"

log_info "إنشاء الأرشيف..."
tar --exclude-vcs -czf "$TAR_TMP" "${INCLUDED[@]}" 2>&1 | tail -5 || {
  log_error "فشل tar"; exit 1;
}

ARCHIVE_SIZE=$(du -h "$TAR_TMP" | cut -f1)
log_ok "الأرشيف: $TAR_TMP — الحجم: ${C_BOLD}${ARCHIVE_SIZE}${C_RESET}"

# ----- الخطوة 4: التشفير (اختياري) -----
if [ "$ENCRYPT" = true ]; then
  log_step "الخطوة 4: تشفير الأرشيف"

  if [ -z "${ENCRYPT_PASSPHRASE:-}" ]; then
    read -s -p "أدخل كلمة سر التشفير (احتفظ بها): " ENCRYPT_PASSPHRASE
    echo
    read -s -p "أعد الإدخال للتأكيد: " ENCRYPT_CONFIRM
    echo
    if [ "$ENCRYPT_PASSPHRASE" != "$ENCRYPT_CONFIRM" ]; then
      log_error "كلمتا السر غير متطابقتين."
      exit 1
    fi
  fi

  echo "$ENCRYPT_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
    --symmetric --cipher-algo AES256 \
    --output "$LOCAL_ARCHIVE" "$TAR_TMP"

  rm -f "$TAR_TMP"
  ENC_SIZE=$(du -h "$LOCAL_ARCHIVE" | cut -f1)
  log_ok "التشفير تم — الحجم النهائي: ${C_BOLD}${ENC_SIZE}${C_RESET}"
  unset ENCRYPT_PASSPHRASE ENCRYPT_CONFIRM
else
  mv "$TAR_TMP" "$LOCAL_ARCHIVE"
  log_warn "التشفير معطّل — الأرشيف غير مشفّر."
fi

# ----- الخطوة 5: الرفع للسيرفر -----
log_step "الخطوة 5: الرفع للسيرفر (${SSH_HOST})"

ssh_exec "mkdir -p '${REMOTE_BASE}' '${REMOTE_MANIFEST_DIR}'"

log_info "رفع الأرشيف..."
scp_upload "$LOCAL_ARCHIVE" "${REMOTE_BASE}/${ARCHIVE_NAME}"

log_info "رفع البيان..."
scp_upload "$LOCAL_MANIFEST" "${REMOTE_MANIFEST_DIR}/manifest-${VERSION}.txt"

# تحديث ملف LATEST
ssh_exec "echo '${VERSION}' > '${REMOTE_LATEST_FILE}'"

log_ok "الرفع اكتمل."

# ----- الخطوة 6: تنظيف الإصدارات القديمة -----
log_step "الخطوة 6: تنظيف الإصدارات القديمة (الاحتفاظ بآخر ${KEEP_LAST})"

ssh_exec "
  cd '${REMOTE_BASE}' || exit 0
  ls -1t assets-*.tar.gz* 2>/dev/null | tail -n +\$((${KEEP_LAST}+1)) | while read f; do
    echo \"  حذف: \$f\"
    rm -f -- \"\$f\"
  done
  cd '${REMOTE_MANIFEST_DIR}' || exit 0
  ls -1t manifest-*.txt 2>/dev/null | tail -n +\$((${KEEP_LAST}+1)) | while read f; do
    echo \"  حذف: \$f\"
    rm -f -- \"\$f\"
  done
" || log_warn "فشل تنظيف الإصدارات القديمة (غير حرج)"

# ----- النهاية -----
log_step "اكتمل النشر بنجاح"
echo -e "  ${C_BOLD}الإصدار:${C_RESET}  ${VERSION}"
echo -e "  ${C_BOLD}الأرشيف:${C_RESET}  ${REMOTE_BASE}/${ARCHIVE_NAME}"
echo -e "  ${C_BOLD}البيان:${C_RESET}   ${REMOTE_MANIFEST_DIR}/manifest-${VERSION}.txt"
echo -e "  ${C_BOLD}مشفّر:${C_RESET}    ${ENCRYPT}"
echo
log_info "للسحب من حساب آخر:"
echo "    ./scripts/transfer/pull-and-restore.sh"
echo "    ./scripts/transfer/pull-and-restore.sh ${VERSION}"

# تنظيف ملفات مؤقتة محلية
rm -f "$LOCAL_ARCHIVE" "$LOCAL_MANIFEST"
