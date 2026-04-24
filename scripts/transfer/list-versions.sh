#!/usr/bin/env bash
# ====================================================================
# سكربت عرض الإصدارات المتاحة على السيرفر
# ====================================================================
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

log_step "الإصدارات المتاحة على ${SSH_HOST}"

LATEST=$(ssh_exec "cat '${REMOTE_LATEST_FILE}' 2>/dev/null || true" 2>/dev/null | tr -d '[:space:]' || true)

LIST=$(ssh_exec "
  if [ ! -d '${REMOTE_BASE}' ]; then
    echo '__NO_DIR__'
    exit 0
  fi
  cd '${REMOTE_BASE}'
  ls -1t assets-*.tar.gz* 2>/dev/null || true
" 2>/dev/null || true)

if [ -z "$LIST" ] || [ "$LIST" = "__NO_DIR__" ]; then
  log_warn "لا توجد إصدارات منشورة على السيرفر بعد."
  echo
  log_info "لإنشاء أول إصدار:"
  echo "    ./scripts/transfer/pack-and-publish.sh"
  exit 0
fi

COUNT=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  COUNT=$((COUNT+1))
  ver=$(echo "$line" | sed -E 's/^assets-(.+)\.tar\.gz(\.gpg)?$/\1/')
  enc=""
  [[ "$line" == *.gpg ]] && enc=" 🔒"
  marker=""
  [ "$ver" = "$LATEST" ] && marker="  ${C_GREEN}← الأحدث${C_RESET}"
  size=$(ssh_exec "du -h '${REMOTE_BASE}/${line}' 2>/dev/null | cut -f1" 2>/dev/null)
  printf "  %-35s %8s%s%b\n" "$ver" "$size" "$enc" "$marker"
done <<< "$LIST"

echo
log_info "العدد الإجمالي: ${COUNT}"
log_info "للسحب: ./scripts/transfer/pull-and-restore.sh [VERSION]"
