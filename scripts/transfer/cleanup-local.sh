#!/usr/bin/env bash
# ====================================================================
# تنظيف الملفات المؤقتة المحلية بعد التصدير الناجح
# ====================================================================
# يحذف:
#   - .transfer-tmp/ (يحتوي الأرشيف المشفّر، البيانات، state.env)
#   - .env.snapshot (محفوظ مشفّراً داخل الأرشيف على السيرفر)
#
# يجب استدعاؤه آخر خطوة في أنبوب التصدير، وفقط بعد verify.sh الناجح.
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

KEEP_TMP=false
[ "${1:-}" = "--keep-tmp" ] && KEEP_TMP=true

log_step "تنظيف الملفات المؤقتة المحلية"

FREED_BYTES=0

# ----- حذف .env.snapshot المحلي -----
if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
  size=$(stat -c%s "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null || echo 0)
  rm -f "${LOCAL_ROOT}/.env.snapshot"
  FREED_BYTES=$((FREED_BYTES + size))
  log_info "🔐 حُذف .env.snapshot المحلي (محفوظ مشفّراً على السيرفر داخل الأرشيف)"
fi

# ----- حذف .transfer-tmp/ -----
if [ -d "${LOCAL_TMP}" ]; then
  if [ "$KEEP_TMP" = true ]; then
    log_info "  --keep-tmp: الإبقاء على ${LOCAL_TMP}"
  else
    SIZE_BEFORE=$(du -sb "${LOCAL_TMP}" 2>/dev/null | cut -f1)
    SIZE_HUMAN=$(du -sh "${LOCAL_TMP}" 2>/dev/null | cut -f1)
    COUNT=$(find "${LOCAL_TMP}" -type f 2>/dev/null | wc -l | tr -d ' ')

    log_info "حذف ${COUNT} ملف من .transfer-tmp/ (${SIZE_HUMAN}):"
    find "${LOCAL_TMP}" -maxdepth 1 -type f 2>/dev/null | while IFS= read -r f; do
      log_info "  - $(basename "$f") ($(du -h "$f" 2>/dev/null | cut -f1))"
    done

    rm -rf "${LOCAL_TMP}"
    FREED_BYTES=$((FREED_BYTES + ${SIZE_BEFORE:-0}))
  fi
else
  log_info ".transfer-tmp/ غير موجود — لا شيء للتنظيف"
fi

if [ "$FREED_BYTES" -gt 0 ]; then
  FREED_HUMAN=$(numfmt --to=iec --suffix=B "$FREED_BYTES" 2>/dev/null || echo "${FREED_BYTES}B")
  log_ok "✅ تم تحرير ${FREED_HUMAN} من المساحة المحلية"
else
  log_ok "لا توجد ملفات للتنظيف"
fi
