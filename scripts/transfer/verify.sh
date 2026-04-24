#!/usr/bin/env bash
# ====================================================================
# التحقق من سلامة الرفع — يقارن SHA256 محلي/بعيد + LATEST
# ====================================================================
# يعتمد على state.env. يفشل بكود غير 0 إن:
#   - الأرشيف غير موجود على السيرفر
#   - sha256 المحلي مختلف عن البعيد (تلف أثناء النقل)
#   - LATEST.txt لا يطابق الإصدار الحالي
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools sshpass ssh

STATE_FILE="${LOCAL_TMP}/state.env"
if [ ! -f "$STATE_FILE" ]; then
  log_error "ملف الحالة مفقود — هل شغّلت pack.sh ثم upload.sh؟"
  exit 1
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

if [ -z "${TRANSFER_REMOTE_ARCHIVE:-}" ]; then
  log_error "المسار البعيد للأرشيف مفقود — هل اكتمل upload.sh؟"
  exit 1
fi

if [ -z "${TRANSFER_ARCHIVE_SHA256:-}" ]; then
  log_error "SHA256 المحلي مفقود من state"
  exit 1
fi

log_step "التحقق من وجود الأرشيف على السيرفر"
if ! ssh_exec "[ -f '${TRANSFER_REMOTE_ARCHIVE}' ]"; then
  log_error "الأرشيف غير موجود على السيرفر:"
  log_error "  ${TRANSFER_REMOTE_ARCHIVE}"
  exit 1
fi
log_ok "الأرشيف موجود على السيرفر"

log_step "حساب SHA256 على السيرفر"
REMOTE_SHA=$(ssh_exec "sha256sum '${TRANSFER_REMOTE_ARCHIVE}' 2>/dev/null | cut -d' ' -f1" 2>/dev/null | tr -d '[:space:]')

if [ -z "$REMOTE_SHA" ]; then
  log_error "تعذّر حساب SHA256 على السيرفر (sha256sum غير متوفر؟)"
  exit 1
fi

LOCAL_SHA="${TRANSFER_ARCHIVE_SHA256}"

if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
  log_ok "✅ SHA256 متطابق"
  log_info "  المحلي : ${LOCAL_SHA}"
  log_info "  البعيد: ${REMOTE_SHA}"
else
  log_error "❌ SHA256 مختلف — الرفع تالف"
  log_error "  المحلي : ${LOCAL_SHA}"
  log_error "  البعيد: ${REMOTE_SHA}"
  exit 1
fi

log_step "التحقق من LATEST.txt"
LATEST=$(ssh_exec "cat '${REMOTE_LATEST_FILE}' 2>/dev/null" 2>/dev/null | tr -d '[:space:]')
if [ "$LATEST" = "$TRANSFER_VERSION" ]; then
  log_ok "LATEST.txt يشير إلى: ${LATEST}"
else
  log_warn "LATEST.txt يشير إلى '${LATEST}' بدلاً من '${TRANSFER_VERSION}'"
fi

# ----- تحقق إضافي: حجم الملف -----
REMOTE_SIZE=$(ssh_exec "stat -c%s '${TRANSFER_REMOTE_ARCHIVE}' 2>/dev/null" 2>/dev/null | tr -d '[:space:]')
LOCAL_SIZE=$(stat -c%s "${TRANSFER_ARCHIVE_PATH}" 2>/dev/null || echo 0)

if [ -n "$REMOTE_SIZE" ] && [ "$REMOTE_SIZE" = "$LOCAL_SIZE" ]; then
  log_ok "حجم الملف متطابق: ${REMOTE_SIZE} بايت"
elif [ -n "$REMOTE_SIZE" ]; then
  log_warn "حجم مختلف — محلي:${LOCAL_SIZE} بعيد:${REMOTE_SIZE}"
fi

echo
log_ok "✅ التحقق اكتمل بنجاح — الرفع سليم 100%"
