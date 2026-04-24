#!/usr/bin/env bash
# ====================================================================
# حزم وتشفير الأصول (بدون رفع)
# ====================================================================
# يحزم ASSETS_INCLUDE + .env.snapshot (إن وُجدت) في أرشيف tar.gz
# ثم يشفّره بـ AES-256 عبر GPG، ويحفظ مسار الأرشيف في state.env.
#
# الاستخدام:
#   ./scripts/transfer/pack.sh                # إصدار تلقائي بالتاريخ
#   ./scripts/transfer/pack.sh v1.2.3         # إصدار محدد
#   ./scripts/transfer/pack.sh --no-encrypt   # بدون تشفير
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools tar gpg gzip sha256sum

# ----- معالجة الوسيطات -----
VERSION=""
ENCRYPT=true

while [ $# -gt 0 ]; do
  case "$1" in
    --no-encrypt) ENCRYPT=false; shift ;;
    --force|-y)   shift ;;
    -h|--help)    grep -E '^#( |$)' "$0" | sed 's/^# \?//'; exit 0 ;;
    -*)           log_error "خيار غير معروف: $1"; exit 1 ;;
    *)            VERSION="$1"; shift ;;
  esac
done

# ----- توليد رقم إصدار -----
if [ -z "$VERSION" ]; then
  VERSION="v$(date -u +%Y%m%d-%H%M%S)"
fi

if ! [[ "$VERSION" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  log_error "اسم الإصدار يحتوي رموزاً غير مسموحة: $VERSION"
  exit 1
fi

ARCHIVE_NAME="assets-${VERSION}.tar.gz"
[ "$ENCRYPT" = true ] && ARCHIVE_NAME="${ARCHIVE_NAME}.gpg"

LOCAL_ARCHIVE="${LOCAL_TMP}/${ARCHIVE_NAME}"
LOCAL_MANIFEST="${LOCAL_TMP}/manifest-${VERSION}.txt"
mkdir -p "${LOCAL_TMP}"

# ----- جمع العناصر -----
log_step "تجميع العناصر القابلة للحزم"

INCLUDED=()
TOTAL_BYTES=0

for item in "${ASSETS_INCLUDE[@]}"; do
  full="${LOCAL_ROOT}/${item}"
  if [ -e "$full" ]; then
    size=$(du -sb "$full" 2>/dev/null | cut -f1)
    INCLUDED+=("$item")
    TOTAL_BYTES=$((TOTAL_BYTES + size))
    printf "  ${C_GREEN}✓${C_RESET} %-35s %s\n" "$item" "$(du -sh "$full" 2>/dev/null | cut -f1)"
  else
    printf "  ${C_YELLOW}—${C_RESET} %-35s غير موجود\n" "$item"
  fi
done

# ----- إضافة .env.snapshot إن وُجدت (تُولَّد من snapshot-secrets.sh قبل هذه الخطوة) -----
INCLUDES_SNAPSHOT=0
if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
  INCLUDED+=(".env.snapshot")
  size=$(du -sb "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null | cut -f1)
  TOTAL_BYTES=$((TOTAL_BYTES + size))
  INCLUDES_SNAPSHOT=1
  printf "  ${C_GREEN}🔐${C_RESET} %-35s %s ${C_BOLD}(snapshot المتغيرات)${C_RESET}\n" \
    ".env.snapshot" "$(du -sh "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null | cut -f1)"
else
  log_warn "  .env.snapshot غير موجود — لن تنتقل المتغيرات داخل الأرشيف"
  log_warn "  نفّذ snapshot-secrets.sh قبل pack.sh لضمان نقل المتغيرات"
fi

if [ ${#INCLUDED[@]} -eq 0 ]; then
  log_error "لا توجد عناصر قابلة للحزم"
  exit 1
fi

# ----- التحقق من عدم وجود محظورات -----
for forbidden in "${ASSETS_FORBIDDEN[@]}"; do
  for item in "${INCLUDED[@]}"; do
    if [ "$item" = "$forbidden" ]; then
      log_error "عنصر محظور في القائمة: $item"
      exit 1
    fi
  done
done

TOTAL_HUMAN=$(numfmt --to=iec --suffix=B "$TOTAL_BYTES" 2>/dev/null || echo "${TOTAL_BYTES}B")
log_info "عدد العناصر: ${#INCLUDED[@]} — الحجم قبل الضغط: ${C_BOLD}${TOTAL_HUMAN}${C_RESET}"

# ----- إنشاء البيان -----
log_step "إنشاء بيان الإصدار"
{
  echo "# Assets Bundle Manifest"
  echo "version: ${VERSION}"
  echo "created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "created_by: $(whoami)@$(hostname)"
  echo "encrypted: ${ENCRYPT}"
  echo "includes_env_snapshot: ${INCLUDES_SNAPSHOT}"
  echo "total_bytes_uncompressed: ${TOTAL_BYTES}"
  echo "items:"
  for item in "${INCLUDED[@]}"; do
    echo "  - ${item}"
  done
} > "$LOCAL_MANIFEST"
log_ok "البيان: $LOCAL_MANIFEST"

# ----- الحزم -----
log_step "إنشاء الأرشيف tar.gz"
cd "$LOCAL_ROOT"
TAR_TMP="${LOCAL_TMP}/assets-${VERSION}.tar.gz"

tar --exclude-vcs -czf "$TAR_TMP" "${INCLUDED[@]}" 2>&1 | tail -5 || {
  log_error "فشل tar"
  exit 1
}

ARCHIVE_SIZE=$(du -h "$TAR_TMP" | cut -f1)
log_ok "الأرشيف الخام: ${C_BOLD}${ARCHIVE_SIZE}${C_RESET}"

# ----- التشفير -----
if [ "$ENCRYPT" = true ]; then
  log_step "تشفير AES-256"

  if [ -z "${ENCRYPT_PASSPHRASE:-}" ]; then
    log_error "ENCRYPT_PASSPHRASE غير معرّفة"
    log_error "هذه الكلمة هي التأمين الوحيد لفك التشفير لاحقاً."
    log_error "أضِفها في Replit Secrets ثم أعد المحاولة."
    rm -f "$TAR_TMP"
    exit 2
  fi

  if ! echo "$ENCRYPT_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
        --symmetric --cipher-algo AES256 \
        --output "$LOCAL_ARCHIVE" "$TAR_TMP" 2>/dev/null; then
    log_error "فشل التشفير"
    rm -f "$TAR_TMP" "$LOCAL_ARCHIVE"
    exit 1
  fi

  rm -f "$TAR_TMP"
  ENC_SIZE=$(du -h "$LOCAL_ARCHIVE" | cut -f1)
  log_ok "التشفير اكتمل — الحجم النهائي: ${C_BOLD}${ENC_SIZE}${C_RESET}"
else
  mv "$TAR_TMP" "$LOCAL_ARCHIVE"
  log_warn "التشفير معطّل — الأرشيف غير مشفّر"
fi

# ----- حساب checksum -----
ARCHIVE_SHA256=$(sha256sum "$LOCAL_ARCHIVE" | cut -d' ' -f1)
log_info "SHA256: ${ARCHIVE_SHA256}"

# ----- كتابة state للخطوات التالية -----
STATE_FILE="${LOCAL_TMP}/state.env"
cat > "$STATE_FILE" <<EOF
# مولّد تلقائياً من pack.sh — لا تُعدّل يدوياً
TRANSFER_VERSION='${VERSION}'
TRANSFER_ARCHIVE_PATH='${LOCAL_ARCHIVE}'
TRANSFER_ARCHIVE_NAME='${ARCHIVE_NAME}'
TRANSFER_MANIFEST_PATH='${LOCAL_MANIFEST}'
TRANSFER_ARCHIVE_SHA256='${ARCHIVE_SHA256}'
TRANSFER_ENCRYPTED='${ENCRYPT}'
TRANSFER_INCLUDES_SNAPSHOT='${INCLUDES_SNAPSHOT}'
TRANSFER_PACK_TIME='$(date -u +%Y-%m-%dT%H:%M:%SZ)'
EOF
chmod 600 "$STATE_FILE"

echo
log_ok "✅ الحزم اكتمل"
log_info "  الإصدار:        ${VERSION}"
log_info "  الأرشيف:        ${LOCAL_ARCHIVE}"
log_info "  يضم snapshot:   $([ "$INCLUDES_SNAPSHOT" = "1" ] && echo "نعم 🔐" || echo "لا")"
log_info "  جاهز للرفع عبر: bash scripts/transfer/upload.sh"
