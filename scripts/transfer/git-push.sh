#!/usr/bin/env bash
# ====================================================================
# دفع تلقائي للكود إلى GitHub قبل التصدير
# ====================================================================
# يُستدعى من runner كخطوة "transfer-git-push" في أنبوب assets-export.
# سلوكه:
#   - إن لم يكن مستودع git أو لا يوجد origin: تخطي بدون فشل (exit 0)
#   - إن وُجدت تغييرات غير محفوظة: commit تلقائي
#   - إن وُجد GITHUB_TOKEN + GITHUB_USERNAME: يستخدمهما للمصادقة
#   - وإلا: يحاول الدفع بـ credential helper المحفوظ
#   - عند فشل الدفع: تحذير لكن لا يكسر الأنبوب (exit 0)
#
# الاستخدام:
#   ./scripts/transfer/git-push.sh
#   ./scripts/transfer/git-push.sh --strict   # يفشل عند فشل الدفع
# ====================================================================

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh" 2>/dev/null || true

STRICT=false
[ "${1:-}" = "--strict" ] && STRICT=true

cd "${LOCAL_ROOT:-$(pwd)}"

if ! command -v git >/dev/null 2>&1; then
  log_warn "git غير مثبت — تخطي خطوة دفع الكود"
  exit 0
fi

if [ ! -d ".git" ]; then
  log_warn "ليس مستودع git — تخطي خطوة دفع الكود"
  log_info "إن أردت ربطه بمستودع: git init && git remote add origin <URL>"
  exit 0
fi

if ! git config --get remote.origin.url >/dev/null 2>&1; then
  log_warn "لم يُضبَط remote origin — تخطي git push"
  log_info "لإضافته: git remote add origin <URL>"
  exit 0
fi

remote_url=$(git config --get remote.origin.url)
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

log_step "دفع الكود إلى GitHub"
log_info "  Remote: ${remote_url}"
log_info "  Branch: ${branch}"

# ----- commit تلقائي للتغييرات غير المحفوظة -----
uncommitted=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$uncommitted" -gt 0 ]; then
  log_info "تغييرات غير محفوظة (${uncommitted} ملف) — commit تلقائي"
  git status --short | head -10 | sed 's/^/    /'

  if ! git add . 2>&1 | tail -5; then
    log_error "فشل git add"
    [ "$STRICT" = true ] && exit 1 || exit 0
  fi

  msg="نقل تلقائي: تحديث قبل التصدير $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if ! git commit -m "$msg" 2>&1 | tail -5; then
    log_error "فشل git commit"
    [ "$STRICT" = true ] && exit 1 || exit 0
  fi
  log_ok "commit تلقائي اكتمل"
fi

# ----- الدفع -----
push_result=0
if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_USERNAME:-}" ]; then
  log_info "استخدام GITHUB_TOKEN للمصادقة"
  if [[ "$remote_url" =~ ^https://github.com/(.+)$ ]]; then
    repo_path="${BASH_REMATCH[1]}"
    auth_url="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${repo_path}"
    git push "$auth_url" "$branch" 2>&1 | grep -v "${GITHUB_TOKEN}" | tail -10 || true
    push_result=${PIPESTATUS[0]}
  else
    git push origin "$branch" 2>&1 | tail -10
    push_result=${PIPESTATUS[0]}
  fi
else
  log_info "لا يوجد GITHUB_TOKEN — محاولة الدفع بـ credential helper المحفوظ"
  git push origin "$branch" 2>&1 | tail -10
  push_result=${PIPESTATUS[0]}
fi

if [ "$push_result" -eq 0 ]; then
  log_ok "✅ تم دفع الكود لفرع: ${branch}"
  exit 0
fi

# فشل الدفع
log_error "فشل git push (كود: ${push_result})"
log_warn "أسباب محتملة:"
log_warn "  • GITHUB_TOKEN/USERNAME غير مضبوطين"
log_warn "  • التوكن منتهي الصلاحية أو لا يملك صلاحية الكتابة"
log_warn "  • الفرع البعيد فيه تعديلات أحدث (يحتاج pull أولاً)"

if [ "$STRICT" = true ]; then
  log_error "وضع --strict — إنهاء بفشل"
  exit 1
fi

log_warn "تخطي بدون كسر الأنبوب — يمكنك الدفع يدوياً لاحقاً:"
log_info "    git push origin ${branch}"
exit 0
