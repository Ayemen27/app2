#!/usr/bin/env bash
# ====================================================================
# سكربت فحص المتطلبات والتثبيت التلقائي — Preflight Check
# ====================================================================
# يفحص الأدوات المطلوبة ويحاول تثبيتها تلقائياً عند الحاجة.
#
# الاستخدام:
#   ./scripts/transfer/preflight.sh           # فحص + تثبيت تلقائي
#   ./scripts/transfer/preflight.sh --check   # فحص فقط (بدون تثبيت)
#   ./scripts/transfer/preflight.sh --verbose # عرض تفاصيل
#
# يُستدعى تلقائياً من بداية كل عملية تصدير/استيراد.
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# اعتمد ألوان config.sh لو متاحة، وإلا عرّفها بسيطة
if [ -f "${SCRIPT_DIR}/config.sh" ]; then
  source "${SCRIPT_DIR}/config.sh" 2>/dev/null || true
fi
: "${C_RESET:=$(tput sgr0 2>/dev/null || echo)}"
: "${C_GREEN:=$(tput setaf 2 2>/dev/null || echo)}"
: "${C_RED:=$(tput setaf 1 2>/dev/null || echo)}"
: "${C_YELLOW:=$(tput setaf 3 2>/dev/null || echo)}"
: "${C_BLUE:=$(tput setaf 4 2>/dev/null || echo)}"
: "${C_BOLD:=$(tput bold 2>/dev/null || echo)}"

CHECK_ONLY=false
VERBOSE=false
FULL_CHECK=false   # فحص كامل: أدوات + متغيرات بيئة + اتصال SSH
WITH_ENCRYPT=false # فحص ENCRYPT_PASSPHRASE فقط
WITH_SSH=false     # فحص اتصال SSH فقط
for arg in "$@"; do
  case "$arg" in
    --check)        CHECK_ONLY=true ;;
    --verbose)      VERBOSE=true ;;
    --full)         FULL_CHECK=true; WITH_ENCRYPT=true; WITH_SSH=true ;;
    --with-encrypt) WITH_ENCRYPT=true ;;
    --with-ssh)     WITH_SSH=true ;;
  esac
done

# في الوضع غير التفاعلي (من runner)، اعتمد --full تلقائياً
if [ "${NONINTERACTIVE:-0}" = "1" ] && [ "$FULL_CHECK" = false ]; then
  FULL_CHECK=true
  WITH_ENCRYPT=true
  WITH_SSH=true
fi

# ====================================================================
# قائمة الأدوات المطلوبة + اسم حزمة Nix المقابلة + وصف الاستخدام
# الصيغة: "الأمر|اسم Nix|الوصف|إلزامي(1)/اختياري(0)"
# ====================================================================
REQUIRED_TOOLS=(
  "tar|gnutar|أرشفة الملفات|1"
  "ssh|openssh|اتصال السيرفر|1"
  "scp|openssh|نقل الملفات|1"
  "sshpass|sshpass|مصادقة SSH بكلمة سر|1"
  "rsync|rsync|نقل تزايدي (للنسخ الكبيرة)|0"
  "openssl|openssl|تشفير AES-256 (احتياطي)|1"
  "gpg|gnupg|تشفير GPG AES-256 (افتراضي)|1"
  "gzip|gzip|ضغط الأرشيف|1"
)

MISSING_REQUIRED=()
MISSING_OPTIONAL=()
INSTALLED=()

# ====================================================================
# الفحص
# ====================================================================
check_tool() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1
}

print_header() {
  echo
  echo -e "  ${C_BOLD}🔍 فحص متطلبات نظام النقل${C_RESET}"
  echo "  ──────────────────────────────────"
}

print_status() {
  local cmd="$1" present="$2" desc="$3" required="$4"
  local icon color label
  if [ "$present" = true ]; then
    icon="✓"; color="$C_GREEN"; label="مثبّت"
  else
    if [ "$required" = "1" ]; then
      icon="✗"; color="$C_RED"; label="ناقص (إلزامي)"
    else
      icon="—"; color="$C_YELLOW"; label="ناقص (اختياري)"
    fi
  fi
  printf "  ${color}%s${C_RESET} %-12s %-20s %s\n" "$icon" "$cmd" "$label" "$desc"
}

print_header

for entry in "${REQUIRED_TOOLS[@]}"; do
  IFS='|' read -r cmd nix_pkg desc required <<<"$entry"
  if check_tool "$cmd"; then
    [ "$VERBOSE" = true ] && print_status "$cmd" true "$desc" "$required"
  else
    print_status "$cmd" false "$desc" "$required"
    if [ "$required" = "1" ]; then
      MISSING_REQUIRED+=("${cmd}|${nix_pkg}")
    else
      MISSING_OPTIONAL+=("${cmd}|${nix_pkg}")
    fi
  fi
done

# ====================================================================
# التقرير
# ====================================================================
TOTAL_MISSING=$((${#MISSING_REQUIRED[@]} + ${#MISSING_OPTIONAL[@]}))

if [ "$TOTAL_MISSING" -eq 0 ]; then
  echo
  echo -e "  ${C_GREEN}${C_BOLD}✅ جميع الأدوات المطلوبة مثبتة.${C_RESET}"
  echo
  exit 0
fi

echo
if [ "${#MISSING_REQUIRED[@]}" -gt 0 ]; then
  echo -e "  ${C_RED}${C_BOLD}⚠ أدوات إلزامية ناقصة: ${#MISSING_REQUIRED[@]}${C_RESET}"
fi
if [ "${#MISSING_OPTIONAL[@]}" -gt 0 ]; then
  echo -e "  ${C_YELLOW}ℹ أدوات اختيارية ناقصة: ${#MISSING_OPTIONAL[@]}${C_RESET}"
fi

if [ "$CHECK_ONLY" = true ]; then
  echo
  if [ "${#MISSING_REQUIRED[@]}" -gt 0 ]; then
    echo -e "  ${C_RED}للتثبيت التلقائي:${C_RESET}"
    echo -e "    bash ${SCRIPT_DIR}/preflight.sh"
    exit 1
  fi
  exit 0
fi

# ====================================================================
# التثبيت التلقائي
# ====================================================================
echo
echo -e "  ${C_BLUE}${C_BOLD}🔧 محاولة التثبيت التلقائي...${C_RESET}"
echo

install_via_nix_env() {
  local nix_pkg="$1"
  if command -v nix-env >/dev/null 2>&1; then
    nix-env -iA "nixpkgs.${nix_pkg}" >/dev/null 2>&1
    return $?
  fi
  return 127
}

install_tool() {
  local cmd="$1" nix_pkg="$2"
  echo -ne "    تثبيت ${C_BOLD}${cmd}${C_RESET} (${nix_pkg})... "

  # محاولة 1: nix-env
  if install_via_nix_env "$nix_pkg"; then
    echo -e "${C_GREEN}✓${C_RESET}"
    INSTALLED+=("$cmd")
    return 0
  fi

  echo -e "${C_RED}✗${C_RESET}"
  return 1
}

ALL_INSTALLED=true
for entry in "${MISSING_REQUIRED[@]}" "${MISSING_OPTIONAL[@]}"; do
  IFS='|' read -r cmd nix_pkg <<<"$entry"
  if ! install_tool "$cmd" "$nix_pkg"; then
    ALL_INSTALLED=false
  fi
done

# إعادة فحص بعد التثبيت
echo
echo -e "  ${C_BOLD}إعادة الفحص...${C_RESET}"
STILL_MISSING=()
for entry in "${MISSING_REQUIRED[@]}"; do
  IFS='|' read -r cmd nix_pkg <<<"$entry"
  if ! check_tool "$cmd"; then
    STILL_MISSING+=("$cmd")
  fi
done

if [ "${#STILL_MISSING[@]}" -gt 0 ]; then
  echo
  echo -e "  ${C_RED}${C_BOLD}❌ فشل تثبيت أدوات إلزامية:${C_RESET}"
  for t in "${STILL_MISSING[@]}"; do
    echo -e "     - ${C_RED}${t}${C_RESET}"
  done
  echo
  echo -e "  ${C_YELLOW}الحل اليدوي:${C_RESET}"
  echo "     اطلب من المساعد تثبيت الحزم عبر أداة إدارة الحزم،"
  echo "     أو نفّذ يدوياً في Shell:"
  for entry in "${MISSING_REQUIRED[@]}"; do
    IFS='|' read -r cmd nix_pkg <<<"$entry"
    if [[ " ${STILL_MISSING[*]} " == *" ${cmd} "* ]]; then
      echo "       nix-env -iA nixpkgs.${nix_pkg}"
    fi
  done
  echo
  exit 1
fi

echo
if [ "${#INSTALLED[@]}" -gt 0 ]; then
  echo -e "  ${C_GREEN}${C_BOLD}✅ تم تثبيت ${#INSTALLED[@]} أداة بنجاح:${C_RESET}"
  for t in "${INSTALLED[@]}"; do
    echo -e "     ${C_GREEN}+${C_RESET} ${t}"
  done
fi
echo -e "  ${C_GREEN}${C_BOLD}✅ كل المتطلبات الإلزامية متوفرة.${C_RESET}"
echo
exit 0
