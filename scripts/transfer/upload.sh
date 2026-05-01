#!/usr/bin/env bash
# ====================================================================
# رفع آخر أرشيف (محفوظ في state.env) إلى السيرفر
# ====================================================================
# يعتمد على state.env المُولَّد من pack.sh.
# يرفع الأرشيف + البيان، ثم يحدّث ملف LATEST.txt على السيرفر.
# يضيف TRANSFER_REMOTE_ARCHIVE/MANIFEST إلى state.env لاستخدامها في verify.sh.
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools sshpass ssh scp

STATE_FILE="${LOCAL_TMP}/state.env"
if [ ! -f "$STATE_FILE" ]; then
  log_error "ملف الحالة مفقود: $STATE_FILE"
  log_error "يجب تشغيل pack.sh قبل upload.sh"
  exit 1
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

if [ -z "${TRANSFER_ARCHIVE_PATH:-}" ] || [ ! -f "$TRANSFER_ARCHIVE_PATH" ]; then
  log_error "الأرشيف غير موجود: ${TRANSFER_ARCHIVE_PATH:-unset}"
  exit 1
fi

if [ -z "${TRANSFER_VERSION:-}" ]; then
  log_error "TRANSFER_VERSION مفقود من state"
  exit 1
fi

ARCHIVE_SIZE=$(du -h "$TRANSFER_ARCHIVE_PATH" | cut -f1)

log_step "إعداد مجلدات السيرفر"
ssh_exec "mkdir -p '${REMOTE_BASE}' '${REMOTE_MANIFEST_DIR}'" || {
  log_error "فشل إنشاء مجلدات السيرفر"
  exit 1
}
log_ok "المجلدات جاهزة على السيرفر"

log_step "رفع الأرشيف (${ARCHIVE_SIZE})"
log_info "من: ${TRANSFER_ARCHIVE_PATH}"
log_info "إلى: ${REMOTE_BASE}/${TRANSFER_ARCHIVE_NAME}"

if ! scp_upload "$TRANSFER_ARCHIVE_PATH" "${REMOTE_BASE}/${TRANSFER_ARCHIVE_NAME}"; then
  log_error "فشل رفع الأرشيف"
  exit 1
fi
log_ok "الأرشيف مرفوع"

log_step "رفع البيان"
if ! scp_upload "$TRANSFER_MANIFEST_PATH" "${REMOTE_MANIFEST_DIR}/manifest-${TRANSFER_VERSION}.txt"; then
  log_warn "فشل رفع البيان (غير حرج)"
fi

log_step "تحديث LATEST.txt"
ssh_exec "echo '${TRANSFER_VERSION}' > '${REMOTE_LATEST_FILE}'" || {
  log_warn "فشل تحديث LATEST.txt"
}
log_ok "LATEST يشير إلى: ${TRANSFER_VERSION}"

# ----- تحديث state بالمسارات البعيدة -----
{
  echo "TRANSFER_REMOTE_ARCHIVE='${REMOTE_BASE}/${TRANSFER_ARCHIVE_NAME}'"
  echo "TRANSFER_REMOTE_MANIFEST='${REMOTE_MANIFEST_DIR}/manifest-${TRANSFER_VERSION}.txt'"
  echo "TRANSFER_UPLOAD_TIME='$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
} >> "$STATE_FILE"

echo
log_ok "✅ الرفع اكتمل"
log_info "  الإصدار:    ${TRANSFER_VERSION}"
log_info "  الحجم:      ${ARCHIVE_SIZE}"
log_info "  يضم snapshot: $([ "${TRANSFER_INCLUDES_SNAPSHOT:-0}" = "1" ] && echo "نعم 🔐" || echo "لا")"
log_info "  للتحقق:     bash scripts/transfer/verify.sh"
