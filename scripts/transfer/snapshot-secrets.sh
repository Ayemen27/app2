#!/usr/bin/env bash
# ====================================================================
# سكربت تصدير المتغيرات الفعّالة الآن — Snapshot Secrets
# ====================================================================
# يقرأ كل المتغيرات من البيئة الحالية (.env + Replit Secrets المحقونة)
# ويولّد ملف .env.snapshot يعكس الواقع الفعلي.
# يكشف الانجراف بين القيم في .env والقيم الفعلية في البيئة.
#
# الاستخدام:
#   ./scripts/transfer/snapshot-secrets.sh           # توليد snapshot
#   ./scripts/transfer/snapshot-secrets.sh --check   # كشف الانجراف فقط
# ====================================================================

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

CHECK_ONLY=false
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=true
fi

ENV_FILE="${LOCAL_ROOT}/.env"
SNAPSHOT_FILE="${LOCAL_ROOT}/.env.snapshot"

# ----- جمع كل المفاتيح -----
log_step "جمع المفاتيح من المصادر المتاحة"

declare -A ALL_KEYS=()

# من .env
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      ALL_KEYS["${BASH_REMATCH[1]}"]="env"
    fi
  done < "$ENV_FILE"
  log_ok "قُرئ ${#ALL_KEYS[@]} مفتاح من .env"
else
  log_warn ".env غير موجود — سيُعتمد فقط على المفاتيح الإضافية"
fi

ENV_COUNT=${#ALL_KEYS[@]}

# إضافة المفاتيح الإضافية المعروفة
for key in "${EXTRA_SECRET_KEYS[@]}"; do
  if [ -z "${ALL_KEYS[$key]:-}" ]; then
    ALL_KEYS["$key"]="extra"
  fi
done

EXTRA_COUNT=$((${#ALL_KEYS[@]} - ENV_COUNT))
log_info "أُضيف ${EXTRA_COUNT} مفتاح من قائمة Replit Secrets الإضافية"

# ----- استخراج قيم .env للمقارنة -----
declare -A ENV_VALUES=()
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      # إزالة الاقتباسات المحيطة
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      ENV_VALUES["$key"]="$value"
    fi
  done < "$ENV_FILE"
fi

# ----- كشف الانجراف -----
log_step "كشف الانجراف بين .env والبيئة الفعّالة"

DRIFTED_KEYS=()
ONLY_IN_ENV=()
ONLY_IN_RUNTIME=()
EMPTY_KEYS=()

for key in "${!ALL_KEYS[@]}"; do
  runtime_value="${!key:-}"
  env_value="${ENV_VALUES[$key]:-}"

  if [ -z "$runtime_value" ] && [ -z "$env_value" ]; then
    EMPTY_KEYS+=("$key")
  elif [ -z "$runtime_value" ] && [ -n "$env_value" ]; then
    ONLY_IN_ENV+=("$key")
  elif [ -n "$runtime_value" ] && [ -z "$env_value" ]; then
    ONLY_IN_RUNTIME+=("$key")
  elif [ "$runtime_value" != "$env_value" ]; then
    DRIFTED_KEYS+=("$key")
  fi
done

# ----- التقرير -----
echo
echo -e "${C_BOLD}── تقرير التحليل ──${C_RESET}"
printf "  المفاتيح الكلية:           %d\n" "${#ALL_KEYS[@]}"
printf "  متطابقة (.env = البيئة):   %d\n" $((${#ALL_KEYS[@]} - ${#DRIFTED_KEYS[@]} - ${#ONLY_IN_ENV[@]} - ${#ONLY_IN_RUNTIME[@]} - ${#EMPTY_KEYS[@]}))
printf "  ${C_YELLOW}منجرفة (قيم مختلفة):${C_RESET}      %d\n" "${#DRIFTED_KEYS[@]}"
printf "  ${C_BLUE}في .env فقط:${C_RESET}              %d\n" "${#ONLY_IN_ENV[@]}"
printf "  ${C_BLUE}في البيئة فقط:${C_RESET}            %d\n" "${#ONLY_IN_RUNTIME[@]}"
printf "  ${C_RED}فارغة في الاثنين:${C_RESET}         %d\n" "${#EMPTY_KEYS[@]}"

if [ ${#DRIFTED_KEYS[@]} -gt 0 ]; then
  echo
  log_warn "مفاتيح بقيم مختلفة بين .env والبيئة الفعّالة (سيُعتَمد قيمة البيئة):"
  for k in "${DRIFTED_KEYS[@]}"; do
    echo "    • $k"
  done
fi

if [ ${#ONLY_IN_RUNTIME[@]} -gt 0 ]; then
  echo
  log_info "مفاتيح موجودة في البيئة فقط (Replit Secrets، غير في .env):"
  for k in "${ONLY_IN_RUNTIME[@]}"; do
    echo "    • $k"
  done
fi

if [ ${#EMPTY_KEYS[@]} -gt 0 ]; then
  echo
  log_warn "مفاتيح فارغة (تستحق المراجعة):"
  for k in "${EMPTY_KEYS[@]}"; do
    echo "    • $k"
  done
fi

# ----- إن كان وضع الفحص فقط، توقّف هنا -----
if [ "$CHECK_ONLY" = true ]; then
  echo
  log_info "وضع الفحص — لم يُكتَب أي ملف."
  exit 0
fi

# ----- كتابة ملف Snapshot -----
log_step "كتابة .env.snapshot"

{
  echo "# ====================================================================="
  echo "# .env.snapshot — لقطة شاملة للمتغيرات الفعّالة"
  echo "# تاريخ التوليد: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# المصدر: $(whoami)@$(hostname)"
  echo "# عدد المفاتيح: ${#ALL_KEYS[@]}"
  echo "#"
  echo "# هذا الملف يُحزَم ضمن أرشيف الأصول المشفّر."
  echo "# لا تضعه في Git أبداً."
  echo "# ====================================================================="
  echo

  # ترتيب أبجدي للمفاتيح
  for key in $(echo "${!ALL_KEYS[@]}" | tr ' ' '\n' | sort); do
    value="${!key:-}"
    if [ -z "$value" ]; then
      value="${ENV_VALUES[$key]:-}"
    fi

    # تخطي القيم الفارغة تماماً
    if [ -z "$value" ]; then
      echo "# ${key}=  # فارغ"
      continue
    fi

    # اقتباس القيم التي تحتوي مسافات أو رموز خاصة
    if [[ "$value" =~ [[:space:]\#\$\\\"\'] ]]; then
      # هروب علامات الاقتباس المزدوجة وعلامات الـ backslash
      escaped="${value//\\/\\\\}"
      escaped="${escaped//\"/\\\"}"
      echo "${key}=\"${escaped}\""
    else
      echo "${key}=${value}"
    fi
  done
} > "$SNAPSHOT_FILE"

chmod 600 "$SNAPSHOT_FILE"

NON_EMPTY=$(grep -cE '^[A-Za-z_][A-Za-z0-9_]*=' "$SNAPSHOT_FILE" || true)
log_ok "تم إنشاء: $SNAPSHOT_FILE"
log_info "  الحجم: $(du -h "$SNAPSHOT_FILE" | cut -f1)"
log_info "  المفاتيح غير الفارغة: ${NON_EMPTY}"
log_warn "  الصلاحيات: 600 (قراءة المالك فقط)"
echo
log_info "هذا الملف سيُضمَّن تلقائياً في الأرشيف عند تشغيل pack-and-publish.sh"
