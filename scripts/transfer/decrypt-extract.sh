#!/usr/bin/env bash
# ====================================================================
# فك تشفير الأرشيف + استخراجه إلى المسار الجذري
# ====================================================================
# يعتمد على state.env المُولَّد من download.sh.
# يحفظ نسخة احتياطية للملفات الموجودة قبل الاستبدال (إلا إذا --no-backup).
# يحدّث state بأسماء العناصر المستخرجة + مسار النسخة الاحتياطية.
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

require_tools tar openssl

DO_BACKUP=true
while [ $# -gt 0 ]; do
  case "$1" in
    --no-backup) DO_BACKUP=false; shift ;;
    --force|-y)  shift ;;
    -h|--help)   grep -E '^#( |$)' "$0" | sed 's/^# \?//'; exit 0 ;;
    -*)          log_error "خيار غير معروف: $1"; exit 1 ;;
    *)           shift ;;
  esac
done

STATE_FILE="${LOCAL_TMP}/state.env"
if [ ! -f "$STATE_FILE" ]; then
  log_error "ملف الحالة مفقود — هل شغّلت download.sh؟"
  exit 1
fi

# shellcheck disable=SC1090
source "$STATE_FILE"

if [ -z "${TRANSFER_LOCAL_ARCHIVE:-}" ] || [ ! -f "$TRANSFER_LOCAL_ARCHIVE" ]; then
  log_error "الأرشيف المحلي غير موجود: ${TRANSFER_LOCAL_ARCHIVE:-unset}"
  exit 1
fi

DECRYPTED_TAR="${LOCAL_TMP}/assets-${TRANSFER_VERSION}.tar.gz"

# ----- فك التشفير -----
if [ "$TRANSFER_ENCRYPTED" = "true" ]; then
  log_step "فك التشفير AES-256"

  if [ -z "${ENCRYPT_PASSPHRASE:-}" ]; then
    log_error "ENCRYPT_PASSPHRASE غير معرّفة"
    log_error "هي نفس الكلمة المُستخدَمة في التشفير من الحساب القديم."
    log_error "أضِفها في Replit Secrets ثم أعد المحاولة."
    exit 2
  fi

  # محاولة 1: OpenSSL (تشفير جديد)
  if openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -salt \
        -pass "pass:${ENCRYPT_PASSPHRASE}" \
        -in "$TRANSFER_LOCAL_ARCHIVE" -out "$DECRYPTED_TAR" 2>/dev/null; then
    log_ok "فك التشفير اكتمل (OpenSSL)"
  # محاولة 2: GPG (أرشيفات قديمة مشفّرة قبل الترقية)
  elif command -v gpg >/dev/null 2>&1 && \
       echo "$ENCRYPT_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
        --decrypt --output "$DECRYPTED_TAR" "$TRANSFER_LOCAL_ARCHIVE" 2>/dev/null; then
    log_ok "فك التشفير اكتمل (GPG — أرشيف قديم)"
    log_warn "هذا الأرشيف مشفّر بـ GPG (قديم) — الأرشيفات الجديدة ستستخدم OpenSSL"
  else
    log_error "فشل فك التشفير — كلمة السر غير صحيحة أو الأرشيف تالف"
    rm -f "$DECRYPTED_TAR"
    exit 1
  fi
  rm -f "$TRANSFER_LOCAL_ARCHIVE"
else
  log_step "نسخ الأرشيف (غير مشفّر)"
  mv "$TRANSFER_LOCAL_ARCHIVE" "$DECRYPTED_TAR"
fi

# ----- قراءة قائمة العناصر من الأرشيف -----
log_step "تحليل محتويات الأرشيف"
TAR_ENTRIES=$(tar -tzf "$DECRYPTED_TAR" 2>/dev/null | awk -F/ '{print $1}' | sort -u | grep -v '^$')

if [ -z "$TAR_ENTRIES" ]; then
  log_error "الأرشيف فارغ أو تالف"
  rm -f "$DECRYPTED_TAR"
  exit 1
fi

ENTRY_COUNT=$(echo "$TAR_ENTRIES" | wc -l | tr -d ' ')
log_info "عدد العناصر: ${ENTRY_COUNT}"
echo "$TAR_ENTRIES" | sed 's/^/    - /'

# ----- نسخة احتياطية -----
BACKUP_DIR=""
if [ "$DO_BACKUP" = true ]; then
  log_step "نسخ احتياطي للملفات الحالية قبل الاستبدال"
  BACKUP_DIR="${LOCAL_ROOT}/.transfer-backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  backed_up=0
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    if [ -e "${LOCAL_ROOT}/${entry}" ]; then
      log_info "  نسخ: ${entry}"
      cp -a "${LOCAL_ROOT}/${entry}" "${BACKUP_DIR}/" 2>/dev/null && backed_up=$((backed_up+1))
    fi
  done <<< "$TAR_ENTRIES"

  if [ "$backed_up" -eq 0 ]; then
    rmdir "$BACKUP_DIR" 2>/dev/null
    BACKUP_DIR=""
    log_info "لا توجد ملفات قائمة لنسخها احتياطياً"
  else
    log_ok "نُسخ ${backed_up} عنصر إلى: ${BACKUP_DIR}"
  fi
fi

# ----- الاستخراج -----
log_step "استخراج الأرشيف"
cd "$LOCAL_ROOT"
if ! tar -xzf "$DECRYPTED_TAR" -C "$LOCAL_ROOT" 2>&1 | tail -5; then
  log_error "فشل tar -x"
  exit 1
fi
log_ok "استخراج اكتمل في: ${LOCAL_ROOT}"

# ----- تنظيف -----
rm -f "$DECRYPTED_TAR"

# ----- التأكد من snapshot -----
HAS_SNAPSHOT=0
if [ -f "${LOCAL_ROOT}/.env.snapshot" ]; then
  HAS_SNAPSHOT=1
  SNAPSHOT_KEYS=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "${LOCAL_ROOT}/.env.snapshot" 2>/dev/null || echo 0)
  log_ok "🔐 .env.snapshot مُستعاد — ${SNAPSHOT_KEYS} مفتاح"
  log_info "  سيُطبَّق تلقائياً في الخطوة التالية (apply-secrets.sh)"
else
  log_warn ".env.snapshot غير موجود في الأرشيف — لن يكون هناك متغيرات للتطبيق"
fi

# ----- تحديث state -----
{
  echo "TRANSFER_EXTRACTED_ENTRIES='$(echo "$TAR_ENTRIES" | tr '\n' ',' | sed 's/,$//')'"
  echo "TRANSFER_BACKUP_DIR='${BACKUP_DIR}'"
  echo "TRANSFER_HAS_SNAPSHOT='${HAS_SNAPSHOT}'"
  echo "TRANSFER_EXTRACT_TIME='$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
} >> "$STATE_FILE"

echo
log_ok "✅ فك التشفير والاستخراج اكتملا"
log_info "  الإصدار:        ${TRANSFER_VERSION}"
log_info "  العناصر:        ${ENTRY_COUNT}"
log_info "  نسخة احتياطية: ${BACKUP_DIR:-بدون}"
log_info "  يضم snapshot:   $([ "$HAS_SNAPSHOT" = "1" ] && echo "نعم 🔐" || echo "لا")"
