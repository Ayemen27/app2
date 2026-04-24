#!/usr/bin/env bash
# ====================================================================
# سكربت تطبيق Snapshot المتغيرات في الحساب الجديد — Apply Secrets
# ====================================================================
# يقرأ .env.snapshot المُستعاد، ويوفّر طريقتين لتطبيقه:
#   1. كتابته كـ .env تلقائياً (يكفي للتطبيقات التي تستخدم dotenv)
#   2. عرضه كجدول جاهز للنسخ يدوياً في واجهة Replit Secrets
#
# الاستخدام:
#   ./scripts/transfer/apply-secrets.sh                 # تفاعلي
#   ./scripts/transfer/apply-secrets.sh --write-env     # كتابة .env تلقائياً
#   ./scripts/transfer/apply-secrets.sh --show          # عرض فقط للنسخ
#   ./scripts/transfer/apply-secrets.sh --diff          # مقارنة مع .env الحالي
# ====================================================================

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

SNAPSHOT_FILE="${LOCAL_ROOT}/.env.snapshot"
ENV_FILE="${LOCAL_ROOT}/.env"

MODE="interactive"
case "${1:-}" in
  --write-env) MODE="write" ;;
  --show)      MODE="show" ;;
  --diff)      MODE="diff" ;;
  -h|--help)
    grep -E '^#( |$)' "$0" | sed 's/^# \?//'
    exit 0 ;;
esac

# في الوضع غير التفاعلي (مثلاً من الـ runner)، اعتمد write-env تلقائياً
# بدلاً من التعليق على read أو الفشل بكود غير 0.
if [ "$MODE" = "interactive" ] && { [ "${NONINTERACTIVE:-0}" = "1" ] || [ ! -t 0 ]; }; then
  MODE="write"
  AUTO_WRITE_NOTICE=1
fi

# ----- التحقق من وجود الـ snapshot -----
if [ ! -f "$SNAPSHOT_FILE" ]; then
  log_error ".env.snapshot غير موجود."
  log_info "تأكد أنك شغّلت pull-and-restore.sh أولاً."
  exit 1
fi

# ----- تحليل الـ snapshot -----
declare -A SNAPSHOT_VALUES=()
SNAPSHOT_KEYS=()

while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$line" ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    SNAPSHOT_VALUES["$key"]="$value"
    SNAPSHOT_KEYS+=("$key")
  fi
done < "$SNAPSHOT_FILE"

log_ok "قُرئ ${#SNAPSHOT_KEYS[@]} مفتاح من .env.snapshot"

# ----- وضع المقارنة -----
diff_mode() {
  log_step "مقارنة .env.snapshot مع .env الحالي"

  if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env غير موجود — كل المفاتيح ستكون جديدة."
    for k in "${SNAPSHOT_KEYS[@]}"; do
      printf "  ${C_GREEN}+${C_RESET} %s\n" "$k"
    done
    return
  fi

  declare -A CURRENT=()
  while IFS= read -r line; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      v="${BASH_REMATCH[2]}"
      v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
      CURRENT["${BASH_REMATCH[1]}"]="$v"
    fi
  done < "$ENV_FILE"

  local added=0 changed=0 same=0 removed=0

  for k in "${SNAPSHOT_KEYS[@]}"; do
    if [ -z "${CURRENT[$k]+x}" ]; then
      printf "  ${C_GREEN}+${C_RESET} %s ${C_YELLOW}(جديد)${C_RESET}\n" "$k"
      added=$((added+1))
    elif [ "${CURRENT[$k]}" != "${SNAPSHOT_VALUES[$k]}" ]; then
      printf "  ${C_YELLOW}~${C_RESET} %s ${C_YELLOW}(قيمة مختلفة)${C_RESET}\n" "$k"
      changed=$((changed+1))
    else
      same=$((same+1))
    fi
  done

  for k in "${!CURRENT[@]}"; do
    if [ -z "${SNAPSHOT_VALUES[$k]+x}" ]; then
      printf "  ${C_RED}-${C_RESET} %s ${C_RED}(مفقود من snapshot)${C_RESET}\n" "$k"
      removed=$((removed+1))
    fi
  done

  echo
  echo -e "${C_BOLD}الملخص:${C_RESET} متطابق=${same} | جديد=${added} | متغيّر=${changed} | محذوف=${removed}"
}

# ----- وضع العرض للصق -----
show_mode() {
  log_step "المتغيرات جاهزة للنسخ إلى أداة Replit Secrets"
  echo
  echo -e "${C_YELLOW}الخطوات:${C_RESET}"
  echo "  1. افتح Replit في الحساب الجديد"
  echo "  2. اضغط على Tools → Secrets (أيقونة القفل)"
  echo "  3. لكل سطر أدناه: اضغط 'New Secret'، ألصق الاسم والقيمة"
  echo "  4. أعد تشغيل التطبيق بعد الانتهاء"
  echo
  echo -e "${C_BOLD}── المتغيرات (${#SNAPSHOT_KEYS[@]}) ──${C_RESET}"
  for key in $(echo "${SNAPSHOT_KEYS[@]}" | tr ' ' '\n' | sort); do
    value="${SNAPSHOT_VALUES[$key]}"
    [ -z "$value" ] && continue
    echo -e "  ${C_BOLD}${key}${C_RESET} = ${value}"
  done
  echo
  log_warn "🔒 تنبيه أمان: هذا الإخراج يحتوي أسراراً نشطة — لا تشاركه."
  log_info "💡 لإخفاء القيم وعرض الأسماء فقط: bash apply-secrets.sh --diff"
}

# ----- وضع الكتابة لـ .env -----
write_env_mode() {
  log_step "تطبيق snapshot على .env"

  if [ "${AUTO_WRITE_NOTICE:-0}" = "1" ]; then
    log_info "الوضع غير التفاعلي — كتابة تلقائية لـ .env (اختير افتراضياً)."
  fi

  # ----- تحليل الفروقات قبل الكتابة -----
  declare -A CURRENT=()
  if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ -z "$line" ]] && continue
      if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        v="${BASH_REMATCH[2]}"
        v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
        CURRENT["${BASH_REMATCH[1]}"]="$v"
      fi
    done < "$ENV_FILE"
  fi

  local same=0 changed=0 added=0 missing=0
  local CHANGED_KEYS=() ADDED_KEYS=() MISSING_KEYS=()

  for k in "${SNAPSHOT_KEYS[@]}"; do
    if [ -z "${CURRENT[$k]+x}" ]; then
      added=$((added+1))
      ADDED_KEYS+=("$k")
    elif [ "${CURRENT[$k]}" != "${SNAPSHOT_VALUES[$k]}" ]; then
      changed=$((changed+1))
      CHANGED_KEYS+=("$k")
    else
      same=$((same+1))
    fi
  done

  for k in "${!CURRENT[@]}"; do
    if [ -z "${SNAPSHOT_VALUES[$k]+x}" ]; then
      missing=$((missing+1))
      MISSING_KEYS+=("$k")
    fi
  done

  echo
  echo -e "${C_BOLD}── تحليل المتغيرات قبل الكتابة ──${C_RESET}"
  printf "  ${C_GREEN}✓ موجودة ومتطابقة:${C_RESET}    %d\n" "$same"
  printf "  ${C_YELLOW}~ موجودة لكن متغيّرة:${C_RESET}  %d\n" "$changed"
  printf "  ${C_BLUE}+ غير موجودة (ستُضاف):${C_RESET}  %d\n" "$added"
  printf "  ${C_RED}- في .env فقط (ستُحذف):${C_RESET} %d\n" "$missing"

  if [ "$changed" -gt 0 ]; then
    echo -e "\n  ${C_YELLOW}قيم متغيّرة:${C_RESET}"
    for k in "${CHANGED_KEYS[@]}"; do printf "    ~ %s\n" "$k"; done
  fi
  if [ "$added" -gt 0 ]; then
    echo -e "\n  ${C_BLUE}مفاتيح جديدة:${C_RESET}"
    for k in "${ADDED_KEYS[@]}"; do printf "    + %s\n" "$k"; done
  fi
  if [ "$missing" -gt 0 ]; then
    echo -e "\n  ${C_RED}مفاتيح موجودة في .env لكن ليست في snapshot:${C_RESET}"
    for k in "${MISSING_KEYS[@]}"; do printf "    - %s\n" "$k"; done
    log_warn "  هذه المفاتيح ستُحذف من .env بعد الكتابة (إن أردت إبقاءها أوقف التشغيل واحذف بعض المفاتيح من snapshot يدوياً)."
  fi
  echo

  # ----- نسخة احتياطية -----
  if [ -f "$ENV_FILE" ]; then
    BACKUP="${ENV_FILE}.before-restore-$(date +%Y%m%d-%H%M%S)"
    cp -a "$ENV_FILE" "$BACKUP"
    log_info "نسخة احتياطية: $BACKUP"
  fi

  # ----- الكتابة الفعلية -----
  cp -a "$SNAPSHOT_FILE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log_ok ".env كُتِب بنجاح من snapshot."
  log_info "  المفاتيح المكتوبة: ${#SNAPSHOT_KEYS[@]} (متطابق=${same} | متغيّر=${changed} | جديد=${added})"
  log_info "  الصلاحيات: 600"
  echo
  log_ok "🔄 التطبيق يستخدم dotenv (server/config/env.ts) — سيقرأ المتغيرات تلقائياً عند إعادة التشغيل."
  log_info "إن كان الـ workflow شغالاً الآن، أعد تشغيله ليلتقط القيم الجديدة:"
  echo "    npm run dev    # أو إعادة تشغيل الـ workflow من الواجهة"
}

# ----- وضع تفاعلي -----
interactive_mode() {
  echo
  echo -e "${C_BOLD}اختر طريقة التطبيق:${C_RESET}"
  echo -e "  1) ${C_GREEN}عرض المتغيرات للصق يدوي في Replit Secrets (موصى به)${C_RESET}"
  echo "  2) كتابة .env تلقائياً (مناسب لو تطبيقك يستخدم dotenv فقط)"
  echo "  3) كلاهما (عرض للصق + كتابة .env)"
  echo "  4) مقارنة مع .env الحالي فقط (دون تطبيق)"
  echo "  5) إلغاء"
  echo
  echo -e "  ${C_YELLOW}ℹ القناة الرسمية للأسرار: أداة Replit Secrets (الخيار 1)${C_RESET}"
  echo
  read -p "اختيارك [1-5]: " -r choice
  echo

  case "$choice" in
    1) show_mode ;;
    2) write_env_mode ;;
    3) show_mode; echo; write_env_mode ;;
    4) diff_mode ;;
    5) log_info "أُلغي."; exit 0 ;;
    *) log_error "اختيار غير صالح."; exit 1 ;;
  esac
}

case "$MODE" in
  write)       write_env_mode ;;
  show)        show_mode ;;
  diff)        diff_mode ;;
  interactive) interactive_mode ;;
esac
