#!/usr/bin/env bash
# ====================================================================
# سكربت مساعد GitHub — Git Helper
# ====================================================================
# يعرض حالة Git ويرشدك لخطوات النقل عبر GitHub بين الحسابين.
#
# الاستخدام:
#   ./scripts/transfer/gh-sync.sh status     # حالة + ملخص
#   ./scripts/transfer/gh-sync.sh push       # رفع التغييرات للحساب القديم
#   ./scripts/transfer/gh-sync.sh guide      # دليل كامل (افتراضي)
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh" 2>/dev/null || true

ACTION="${1:-guide}"

# ====================================================================
# فحص حالة Git
# ====================================================================
gh_status() {
  log_step "حالة المستودع"

  if ! command -v git >/dev/null 2>&1; then
    log_error "git غير مثبت"; return 1
  fi

  cd "${LOCAL_ROOT:-$(pwd)}"

  if [ ! -d ".git" ]; then
    log_warn "ليس مستودع git — لا يوجد .git/"
    log_info "لتهيئة مستودع جديد:"
    echo "    git init"
    echo "    git remote add origin https://github.com/USER/REPO.git"
    return 0
  fi

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
  local remote_url
  remote_url=$(git config --get remote.origin.url 2>/dev/null || echo "غير مضبوط")
  local commit_count
  commit_count=$(git rev-list --count HEAD 2>/dev/null || echo "?")
  local last_commit
  last_commit=$(git log -1 --format="%h %s (%cr)" 2>/dev/null || echo "—")
  local uncommitted
  uncommitted=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  local untracked_size="0"
  if [ "$uncommitted" -gt 0 ]; then
    untracked_size=$(git status --porcelain | head -20)
  fi

  echo
  printf "  ${C_BOLD}%-22s${C_RESET} %s\n" "الفرع الحالي:" "$branch"
  printf "  ${C_BOLD}%-22s${C_RESET} %s\n" "GitHub remote:" "$remote_url"
  printf "  ${C_BOLD}%-22s${C_RESET} %s\n" "إجمالي الـ commits:" "$commit_count"
  printf "  ${C_BOLD}%-22s${C_RESET} %s\n" "آخر commit:" "$last_commit"
  printf "  ${C_BOLD}%-22s${C_RESET} %s\n" "تغييرات غير محفوظة:" "$uncommitted ملف"

  # مقارنة مع origin
  if git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
    local ahead behind
    ahead=$(git rev-list --count "origin/$branch..HEAD" 2>/dev/null || echo "0")
    behind=$(git rev-list --count "HEAD..origin/$branch" 2>/dev/null || echo "0")
    echo
    if [ "$ahead" -gt 0 ]; then
      log_warn "عندك ${ahead} commit محلي لم يُرفع لـ GitHub"
    fi
    if [ "$behind" -gt 0 ]; then
      log_warn "GitHub فيه ${behind} commit أحدث منك"
    fi
    if [ "$ahead" = "0" ] && [ "$behind" = "0" ] && [ "$uncommitted" = "0" ]; then
      log_ok "متزامن تماماً مع GitHub ✓"
    fi
  else
    echo
    log_warn "لم يُجلب origin/$branch بعد — جرّب: git fetch origin"
  fi

  # تذكير أن .gitignore يحمي الملفات الكبيرة
  echo
  log_info "الملفات في .gitignore لن تُرفع لـ GitHub (تُنقَل عبر السيرفر):"
  for path in attached_assets backups uploads wa-import-data auth_info_baileys; do
    if [ -e "${LOCAL_ROOT:-.}/$path" ]; then
      local sz
      sz=$(du -sh "${LOCAL_ROOT:-.}/$path" 2>/dev/null | cut -f1)
      printf "    ${C_YELLOW}—${C_RESET} %-25s %s\n" "$path" "$sz"
    fi
  done
}

# ====================================================================
# تنفيذ git push
# ====================================================================
gh_push() {
  cd "${LOCAL_ROOT:-$(pwd)}"

  if [ ! -d ".git" ]; then
    log_error "ليس مستودع git"; exit 1
  fi

  local uncommitted
  uncommitted=$(git status --porcelain | wc -l | tr -d ' ')

  if [ "$uncommitted" -gt 0 ]; then
    log_step "تغييرات غير محفوظة (${uncommitted} ملف)"
    git status --short | head -20
    echo
    if [ "${NONINTERACTIVE:-0}" = "1" ] || [ ! -t 0 ]; then
      log_error "يوجد تغييرات غير محفوظة. احفظها يدوياً ثم أعد المحاولة."
      log_info "  git add . && git commit -m 'msg'"
      exit 1
    fi
    read -p "هل تريد عمل commit تلقائي؟ [y/N]: " -r yn
    if [[ "$yn" =~ ^[Yy]$ ]]; then
      git add .
      git commit -m "نقل: تحديث قبل النشر $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
      log_info "أُلغي الـ push"
      exit 0
    fi
  fi

  log_step "رفع للـ GitHub"
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  git push origin "$branch" 2>&1
  log_ok "تم الرفع لفرع: $branch"
}

# ====================================================================
# الدليل الكامل
# ====================================================================
gh_guide() {
  cat <<'EOF'

  ╔════════════════════════════════════════════════════════════════╗
  ║   دليل نقل المشروع بين حسابي Replit                           ║
  ╚════════════════════════════════════════════════════════════════╝

  المعمارية: ثلاث قنوات منفصلة، كل قناة تحمل نوعاً واحداً من البيانات

  ┌─────────────────────────────────────────────────────────────┐
  │  1️⃣  GitHub          ← الكود المُتعقَّب (في git)              │
  │  2️⃣  السيرفر         ← الملفات في .gitignore (assets/DBs)   │
  │  3️⃣  Replit Secrets   ← المتغيرات السرية (.env)              │
  └─────────────────────────────────────────────────────────────┘

  ━━━ في الحساب القديم (التصدير) ━━━

    1. ادفع الكود لـ GitHub:
         bash scripts/transfer/gh-sync.sh push

    2. حزّم الملفات الكبيرة وارفعها للسيرفر:
         bash scripts/transfer/transfer.sh export
       (سيتولّد .env.snapshot محلياً تلقائياً)

    3. افتح .env.snapshot وانسخ المتغيرات لاستخدامها لاحقاً.


  ━━━ في الحساب الجديد (الاستيراد) ━━━

    1. استنسخ الكود من GitHub:
         git clone https://github.com/USER/REPO.git
         cd REPO

    2. ثبّت أداة Replit Secrets واحدة من طريقتين:
         (أ) ألصق المتغيرات يدوياً من .env.snapshot عبر Tools → Secrets
         (ب) اطلب snapshot من الحساب القديم وشغّل:
             bash scripts/transfer/apply-secrets.sh --show
             ثم ألصق كل سطر في أداة Secrets

    3. اسحب الملفات الكبيرة من السيرفر:
         bash scripts/transfer/transfer.sh import

    4. شغّل التطبيق:
         npm install
         npm run dev


  ━━━ ملاحظات أمان ━━━

  ⚠ السيرفر لا يستلم أي سرّ — فقط أصول وملفات بيانات.
  ⚠ GitHub لا يستلم أي ملف في .gitignore — حماية مزدوجة.
  ⚠ الأسرار تنتقل يدوياً عبر أداة Replit Secrets فقط.

EOF
}

case "$ACTION" in
  status|s)        gh_status ;;
  push|p)          gh_push ;;
  guide|help|h|*)  gh_guide ;;
esac
