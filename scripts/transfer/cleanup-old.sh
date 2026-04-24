#!/usr/bin/env bash
# ====================================================================
# تنظيف الإصدارات القديمة على السيرفر
# ====================================================================
# يحتفظ بآخر KEEP_LAST إصدارات (افتراضي 5) ويحذف ما قبلها.
# يحذف الأرشيفات والبيانات معاً.
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools sshpass ssh

KEEP_LAST="${KEEP_LAST:-5}"

if ! [[ "$KEEP_LAST" =~ ^[0-9]+$ ]]; then
  log_error "KEEP_LAST يجب أن يكون رقماً موجباً — قيمته الحالية: $KEEP_LAST"
  exit 1
fi

log_step "تنظيف الإصدارات القديمة على السيرفر (الاحتفاظ بآخر ${KEEP_LAST})"

# عدّ الإصدارات الموجودة
TOTAL_VERSIONS=$(ssh_exec "ls -1 '${REMOTE_BASE}'/assets-*.tar.gz* 2>/dev/null | wc -l" 2>/dev/null | tr -d '[:space:]')
TOTAL_VERSIONS=${TOTAL_VERSIONS:-0}

if [ "$TOTAL_VERSIONS" -le "$KEEP_LAST" ]; then
  log_info "عدد الإصدارات الحالية: ${TOTAL_VERSIONS} ≤ ${KEEP_LAST} — لا حاجة للتنظيف"
  exit 0
fi

TO_DELETE=$((TOTAL_VERSIONS - KEEP_LAST))
log_info "موجود: ${TOTAL_VERSIONS} — سيُحذف: ${TO_DELETE}"

# الحذف الفعلي + جمع أسماء الملفات المحذوفة
DELETED=$(ssh_exec "
  set -e
  cd '${REMOTE_BASE}' 2>/dev/null || exit 0
  ls -1t assets-*.tar.gz* 2>/dev/null | tail -n +\$((${KEEP_LAST}+1)) | while read -r f; do
    rm -f -- \"\$f\"
    echo \"\$f\"
  done
  cd '${REMOTE_MANIFEST_DIR}' 2>/dev/null || exit 0
  ls -1t manifest-*.txt 2>/dev/null | tail -n +\$((${KEEP_LAST}+1)) | while read -r f; do
    rm -f -- \"\$f\"
  done
" 2>/dev/null)

if [ -n "$DELETED" ]; then
  echo "$DELETED" | while IFS= read -r line; do
    [ -n "$line" ] && log_info "  حُذف: $line"
  done
  log_ok "تنظيف الإصدارات القديمة اكتمل"
else
  log_info "لا توجد إصدارات للحذف"
fi
