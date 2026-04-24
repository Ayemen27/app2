#!/usr/bin/env bash
# ====================================================================
# الإعدادات المشتركة لنظام نقل الأصول
# ====================================================================
# يُستورَد من بقية السكربتات. لا يُشغَّل مباشرة.
# ====================================================================

set -euo pipefail

# ----- ألوان المخرجات -----
readonly C_RESET='\033[0m'
readonly C_RED='\033[0;31m'
readonly C_GREEN='\033[0;32m'
readonly C_YELLOW='\033[0;33m'
readonly C_BLUE='\033[0;34m'
readonly C_BOLD='\033[1m'

log_info()    { echo -e "${C_BLUE}[معلومة]${C_RESET} $*"; }
log_ok()      { echo -e "${C_GREEN}[نجاح]${C_RESET}  $*"; }
log_warn()    { echo -e "${C_YELLOW}[تنبيه]${C_RESET} $*"; }
log_error()   { echo -e "${C_RED}[خطأ]${C_RESET}   $*" >&2; }
log_step()    { echo -e "\n${C_BOLD}${C_BLUE}━━━ $* ━━━${C_RESET}"; }

# ----- التحقق من متغيرات البيئة الأساسية -----
require_env() {
  local missing=()
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "متغيرات البيئة الناقصة: ${missing[*]}"
    log_error "يجب ضبطها في Replit Secrets قبل المتابعة."
    exit 1
  fi
}

require_env SSH_HOST SSH_USER SSH_PORT
if [ -z "${SSHPASS:-}" ] && [ -z "${SSH_PASSWORD:-}" ]; then
  log_error "لا توجد طريقة مصادقة: اضبط SSHPASS أو SSH_PASSWORD."
  exit 1
fi
export SSHPASS="${SSHPASS:-${SSH_PASSWORD:-}}"

# ----- إعدادات الاتصال -----
readonly SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=15
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=20
  -p "${SSH_PORT}"
)

readonly REMOTE_BASE="/home/${SSH_USER}/replit-assets-versions"
readonly REMOTE_LATEST_FILE="${REMOTE_BASE}/LATEST.txt"
readonly REMOTE_MANIFEST_DIR="${REMOTE_BASE}/manifests"

# ----- المسارات المحلية -----
readonly LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly LOCAL_TMP="${LOCAL_ROOT}/.transfer-tmp"

# ----- قائمة العناصر التي ستُحزَم -----
# كل عنصر سطر مستقل: المسار النسبي من جذر المشروع
# يُترَك مرفوضاً ما يُعتبر سرياً جداً (مفاتيح، جلسات حية)
readonly ASSETS_INCLUDE=(
  "attached_assets"
  "backups"
  "uploads"
  "wa-import-data"
  "local.db"
  "ara.traineddata"
  "eng.traineddata"
  "wa-import-empty.png"
  "تقرير_المقارنة.xlsx"
  ".env"
  ".env.production"
  ".env.snapshot"
  "google-services.json"
  "auth_info_baileys"
)

# ----- مفاتيح Replit Secrets الإضافية (غير الموجودة عادة في .env) -----
# تُضاف لـ snapshot لضمان عدم فقدان أي سرّ مدار من المنصة
readonly EXTRA_SECRET_KEYS=(
  "DATABASE_URL"
  "SESSION_SECRET"
  "PGHOST"
  "PGPORT"
  "PGUSER"
  "PGPASSWORD"
  "PGDATABASE"
  "SSHPASS"
  "SSH_PASSWORD"
  "KEYSTORE_PASSWORD"
  "KEYSTORE_KEY_PASSWORD"
)

# ----- العناصر المحظورة دائماً (حماية إضافية) -----
readonly ASSETS_FORBIDDEN=(
  ".git"
  "node_modules"
  ".cache"
  ".local"
  ".config"
  ".upm"
  "dist"
  "www"
  "client/www"
  ".pythonlibs"
)

# ----- أدوات SSH -----
ssh_exec() {
  sshpass -e ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_HOST}" "$@"
}

scp_upload() {
  local src="$1" dest="$2"
  sshpass -e scp "${SSH_OPTS[@]/-p ${SSH_PORT}/-P ${SSH_PORT}}" \
    -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 \
    -P "${SSH_PORT}" "$src" "${SSH_USER}@${SSH_HOST}:$dest"
}

scp_download() {
  local src="$1" dest="$2"
  sshpass -e scp \
    -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 \
    -P "${SSH_PORT}" "${SSH_USER}@${SSH_HOST}:$src" "$dest"
}

# ----- التأكد من توفر الأدوات المحلية -----
require_tools() {
  local tools=("$@") missing=()
  for t in "${tools[@]}"; do
    if ! command -v "$t" >/dev/null 2>&1; then
      missing+=("$t")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    log_error "أدوات مفقودة: ${missing[*]}"
    exit 1
  fi
}
