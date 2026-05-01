#!/usr/bin/env bash
# ====================================================================
# تنزيل الأرشيف من السيرفر (بدون فك تشفير ولا استخراج)
# ====================================================================
# يحدد الإصدار (آخر إصدار افتراضياً أو إصدار محدد)، ينزّل الأرشيف
# والبيان، ويكتب state.env لـ decrypt-extract.sh.
#
# الاستخدام:
#   ./scripts/transfer/download.sh           # آخر إصدار
#   ./scripts/transfer/download.sh v1.2.3    # إصدار محدد
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools sshpass ssh scp

VERSION=""
while [ $# -gt 0 ]; do
  case "$1" in
    --force|-y) shift ;;
    -h|--help)  grep -E '^#( |$)' "$0" | sed 's/^# \?//'; exit 0 ;;
    -*)         log_error "خيار غير معروف: $1"; exit 1 ;;
    *)          VERSION="$1"; shift ;;
  esac
done

# ----- تحديد الإصدار -----
log_step "تحديد الإصدار"

if [ -z "$VERSION" ]; then
  log_info "جلب آخر إصدار من السيرفر..."
  VERSION=$(ssh_exec "cat '${REMOTE_LATEST_FILE}' 2>/dev/null" 2>/dev/null | tr -d '[:space:]')
  if [ -z "$VERSION" ]; then
    log_error "لا يوجد ${REMOTE_LATEST_FILE} على السيرفر — لم يُنشَر أي إصدار بعد"
    exit 1
  fi
  log_ok "آخر إصدار: ${C_BOLD}${VERSION}${C_RESET}"
else
  log_info "الإصدار المطلوب: ${C_BOLD}${VERSION}${C_RESET}"
fi

# ----- تحديد مسار الأرشيف -----
log_step "البحث عن الأرشيف على السيرفر"
REMOTE_ENC="${REMOTE_BASE}/assets-${VERSION}.tar.gz.gpg"
REMOTE_PLAIN="${REMOTE_BASE}/assets-${VERSION}.tar.gz"
REMOTE_MANIFEST="${REMOTE_MANIFEST_DIR}/manifest-${VERSION}.txt"

REMOTE_ARCHIVE=""
IS_ENCRYPTED=false

if ssh_exec "[ -f '${REMOTE_ENC}' ]"; then
  REMOTE_ARCHIVE="$REMOTE_ENC"
  IS_ENCRYPTED=true
  log_info "وُجد أرشيف مشفّر"
elif ssh_exec "[ -f '${REMOTE_PLAIN}' ]"; then
  REMOTE_ARCHIVE="$REMOTE_PLAIN"
  log_warn "وُجد أرشيف غير مشفّر"
else
  log_error "الإصدار '${VERSION}' غير موجود على السيرفر"
  log_info "لعرض الإصدارات المتاحة: bash scripts/transfer/list-versions.sh"
  exit 1
fi

# ----- تنزيل الأرشيف -----
mkdir -p "${LOCAL_TMP}"
LOCAL_ARCHIVE="${LOCAL_TMP}/$(basename "$REMOTE_ARCHIVE")"
LOCAL_MANIFEST="${LOCAL_TMP}/manifest-${VERSION}.txt"

log_step "تنزيل الأرشيف"
log_info "من: ${REMOTE_ARCHIVE}"
log_info "إلى: ${LOCAL_ARCHIVE}"

if ! scp_download "$REMOTE_ARCHIVE" "$LOCAL_ARCHIVE"; then
  log_error "فشل تنزيل الأرشيف"
  exit 1
fi
DOWNLOAD_SIZE=$(du -h "$LOCAL_ARCHIVE" | cut -f1)
log_ok "التنزيل اكتمل: ${DOWNLOAD_SIZE}"

# ----- تنزيل البيان (اختياري) -----
if ssh_exec "[ -f '${REMOTE_MANIFEST}' ]"; then
  scp_download "$REMOTE_MANIFEST" "$LOCAL_MANIFEST" 2>/dev/null || log_warn "فشل تنزيل البيان"
  if [ -f "$LOCAL_MANIFEST" ]; then
    log_info "البيان محفوظ: $LOCAL_MANIFEST"
  fi
fi

# ----- كتابة state -----
STATE_FILE="${LOCAL_TMP}/state.env"
cat > "$STATE_FILE" <<EOF
# مولّد تلقائياً من download.sh — لا تُعدّل يدوياً
TRANSFER_VERSION='${VERSION}'
TRANSFER_REMOTE_ARCHIVE='${REMOTE_ARCHIVE}'
TRANSFER_LOCAL_ARCHIVE='${LOCAL_ARCHIVE}'
TRANSFER_LOCAL_MANIFEST='${LOCAL_MANIFEST}'
TRANSFER_ENCRYPTED='${IS_ENCRYPTED}'
TRANSFER_DOWNLOAD_TIME='$(date -u +%Y-%m-%dT%H:%M:%SZ)'
EOF
chmod 600 "$STATE_FILE"

echo
log_ok "✅ التنزيل اكتمل"
log_info "  الإصدار:   ${VERSION}"
log_info "  الحجم:     ${DOWNLOAD_SIZE}"
log_info "  مشفّر:     $([ "$IS_ENCRYPTED" = true ] && echo "نعم 🔐" || echo "لا")"
log_info "  جاهز لـ:   bash scripts/transfer/decrypt-extract.sh"
