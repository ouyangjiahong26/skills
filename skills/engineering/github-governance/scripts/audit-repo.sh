#!/usr/bin/env bash
# GitHub 仓库治理审计:只读 gh api,输出逐项判定表与分级汇总。
# 用法: audit-repo.sh owner/repo [--strict] | audit-repo.sh --org <owner> [--strict]
set -u

STRICT=0
ARGS=()
for a in "$@"; do
  case "$a" in
    --strict) STRICT=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]:-}"

if ! gh auth status >/dev/null 2>&1; then
  echo "错误:gh 未登录,请先运行 gh auth login" >&2
  exit 2
fi

api() {
  gh api "$@" 2>/tmp/audit-api-err.$$
  local rc=$?
  if [ $rc -ne 0 ]; then
    if grep -qi 'rate limit' /tmp/audit-api-err.$$; then
      echo "限流,等待 60s 重试一次…" >&2
      sleep 60
      gh api "$@"
      rc=$?
    fi
  fi
  rm -f /tmp/audit-api-err.$$
  return $rc
}

R_TOTAL=0; Y_TOTAL=0; W_TOTAL=0

audit_repo() {
  local full="$1"
  local meta tree
  if ! meta=$(api "repos/$full"); then
    echo "## $full"
    echo "| 检查 | 结果 | 说明 |"
    echo "|---|---|---|"
    echo "| 仓库 | ⛔ | 不存在或不可访问(404) |"
    echo "汇总:$full:⛔ 无法访问"
    return 2
  fi

  local fork archived priv license default_branch
  fork=$(jq -r '.fork' <<<"$meta")
  archived=$(jq -r '.archived' <<<"$meta")
  priv=$(jq -r '.private' <<<"$meta")
  license=$(jq -r '.license.key // ""' <<<"$meta")
  default_branch=$(jq -r '.default_branch' <<<"$meta")

  echo "## $full"
  echo "| 检查 | 结果 | 说明 |"
  echo "|---|---|---|"

  if [ "$fork" = true ] || [ "$archived" = true ]; then
    echo "| fork/archived | ⏭️ | $([ "$fork" = true ] && echo fork)$([ "$archived" = true ] && echo archived),跳过 |"
    echo "汇总:$full:跳过(fork/archived)"
    return 0
  fi

  local r=0 y=0 w=0
  local red="" yel="" wht=""
  mark() { # level id desc
    case "$1" in
      red) red="$red $2"; r=$((r+1)); echo "| $2 | 🔴 | $3 |" ;;
      yel) yel="$yel $2"; y=$((y+1)); echo "| $2 | 🟡 | $3 |" ;;
      wht) wht="$wht $2"; w=$((w+1)); echo "| $2 | ⚪ | $3 |" ;;
      ok)  echo "| $2 | ✅ | $3 |" ;;
    esac
  }

  # 文件树(一次拿全)
  tree=$(api "repos/$full/git/trees/HEAD?recursive=1" | jq -r '.tree[]?.path' 2>/dev/null || true)
  has() { grep -qx "$1" <<<"$tree"; }
  has_prefix() { grep -q "^$1" <<<"$tree"; }

  # 代码仓判定
  local is_code=0
  for m in Cargo.toml src-tauri/Cargo.toml pyproject.toml package.json pom.xml; do
    has "$m" && is_code=1
  done

  # license(代码仓缺为 🔴,非代码仓为信息项)
  if [ -z "$license" ]; then
    if [ $is_code = 1 ]; then mark red license "repo.license 为 null"; else mark wht license "非代码仓,无 LICENSE(信息项)"; fi
  else mark ok license "$license"; fi

  # readme
  if grep -q '^README' <<<"$tree"; then
    # 链接属主:README 徽章 / git clone 行指向他人同名仓库(致谢类正文链接不算)
    local readme readme_owner stale=""
    for rp in README.md README.rst README.txt README; do
      has "$rp" && readme=$(api "repos/$full/contents/$rp" | jq -r '.content' 2>/dev/null | base64 -d 2>/dev/null || true) && break
    done
    readme_owner=$(jq -r '.owner.login' <<<"$meta")
    if [ -n "${readme:-}" ]; then
      stale=$(grep -E 'shields\.io|git clone|badge' <<<"$readme" | grep -oE "(github\.com|img\.shields\.io/github[^ )]*)/[^/ )]*/${full##*/}" | grep -v "/$readme_owner/" | head -1 || true)
      if [ -n "$stale" ]; then mark red 链接属主 "README 徽章/clone 引用他人属主仓库:$stale"; else mark ok readme "存在且属主一致"; fi
    else
      mark ok readme "存在"
    fi
  else
    mark red readme "无 README*"
  fi

  # agents / claude-dup
  if [ $is_code = 1 ]; then
    if ! has AGENTS.md; then mark red agents "代码仓无 AGENTS.md"; else
      mark ok agents "存在"
      if has CLAUDE.md; then
        local csize
        csize=$(api "repos/$full/contents/CLAUDE.md" | jq -r '.size // 0' 2>/dev/null || echo 0)
        if [ "${csize:-0}" -gt 200 ]; then mark yel claude-dup "CLAUDE.md ${csize}B(>200B),应为指针"; else mark ok claude-dup "CLAUDE.md 已是指针"; fi
      fi
    fi
  fi

  # codeowners
  if [ $is_code = 1 ]; then
    if has .github/CODEOWNERS || has CODEOWNERS; then mark ok codeowners "存在"; else mark red codeowners "无 .github/CODEOWNERS 且无根 CODEOWNERS"; fi
  fi

  # ci
  local has_ci=0
  if [ $is_code = 1 ]; then
    if grep -q '^\.github/workflows/ci.*\.yml' <<<"$tree"; then has_ci=1; mark ok ci "存在 ci workflow"; else mark red ci "代码仓无 .github/workflows/ci*.yml"; fi
  fi

  # dependabot
  if [ $is_code = 1 ]; then
    if has .github/dependabot.yml || has .github/dependabot.yaml; then mark ok dependabot "存在"; else mark yel dependabot "代码仓无 .github/dependabot.yml"; fi
  fi

  # releases / tags
  local nrel ntags
  nrel=$(api "repos/$full/releases?per_page=100" | jq 'length' 2>/dev/null || echo 0)
  ntags=$(api "repos/$full/tags?per_page=100" | jq 'length' 2>/dev/null || echo 0)

  if [ "$nrel" -ge 1 ]; then
    if has CONTRIBUTING.md; then mark ok contributing "存在"; else mark yel contributing "有 release 无 CONTRIBUTING.md"; fi
  fi

  if [ "$priv" = false ]; then
    if has SECURITY.md; then mark ok security "存在"; else mark yel security "公开库无 SECURITY.md"; fi
  fi

  # templates
  local nissue npr
  nissue=$(grep -c '^\.github/ISSUE_TEMPLATE/' <<<"$tree" || true)
  npr=0; has .github/PULL_REQUEST_TEMPLATE.md && npr=1
  if [ "$nissue" -lt 2 ] || [ "$npr" -lt 1 ]; then
    mark yel templates "ISSUE_TEMPLATE ${nissue} 个(<2)或无 PULL_REQUEST_TEMPLATE($npr)"
  else
    mark ok templates "ISSUE_TEMPLATE ${nissue} + PR 模板"
  fi

  # release-gap
  if [ "$ntags" -ge 1 ] && [ "$nrel" -eq 0 ] && ! grep -q '^\.github/workflows/release' <<<"$tree"; then
    mark yel release-gap "tags ${ntags} 但无 release 且无 release workflow"
  fi

  # protection
  local prot
  prot=$(api "repos/$full/branches/$default_branch/protection" 2>/dev/null)
  if [ -z "$prot" ] || jq -e '.message' <<<"$prot" >/dev/null 2>&1; then
    if grep -qi 'empty' <<<"${prot:-}"; then mark yel protection "默认分支 $default_branch 未保护"; else mark wht protection "未知(无权限读取保护配置)"; fi
  else
    local ctxs
    ctxs=$(jq -r '.required_status_checks.contexts // [] | length' <<<"$prot")
    if [ $has_ci = 1 ] && [ "$ctxs" = 0 ]; then
      mark red protection "有 CI 但 required checks 为空"
    else
      mark ok protection "已保护(required checks ${ctxs} 个)"
    fi
  fi

  # rulesets
  local rs_names
  rs_names=$(api "repos/$full/rulesets" | jq -r '.[].name' 2>/dev/null || true)
  local bad_rs
  bad_rs=$(grep -E -- '-[0-9]+$|^(master|main)$' <<<"$rs_names" | head -1 || true)
  if [ -n "$bad_rs" ]; then mark yel rulesets "无语义命名:$bad_rs"; else mark ok rulesets "命名正常"; fi

  # changelog
  if ! has CHANGELOG.md; then mark wht changelog "无 CHANGELOG.md"; fi

  # default-branch(信息项)
  local owner_type
  owner_type=$(jq -r '.owner.type' <<<"$meta")
  case "$owner_type" in
    Organization) [ "$default_branch" = master ] || mark wht default-branch "组织库默认分支为 $default_branch(非 master),不修" ;;
    User) [ "$default_branch" = main ] || mark wht default-branch "个人库默认分支为 $default_branch(非 main),不修" ;;
  esac

  if [ $r -gt 0 ]; then REDS=$((REDS+1)); fi
  R_TOTAL=$((R_TOTAL+r)); Y_TOTAL=$((Y_TOTAL+y)); W_TOTAL=$((W_TOTAL+w))
}

REDS=0
if [ "${1:-}" = "--org" ]; then
  owner="${2:?用法: audit-repo.sh --org <owner>}"
  repos=$(api "orgs/$owner/repos?per_page=100&type=all" | jq -r '.[].full_name' 2>/dev/null \
    || api "users/$owner/repos?per_page=100&type=owner" | jq -r '.[].full_name' 2>/dev/null)
  for full in $repos; do audit_repo "$full"; done
elif [ -n "${1:-}" ]; then
  audit_repo "$1"
else
  echo "用法: audit-repo.sh owner/repo [--strict] | audit-repo.sh --org <owner> [--strict]" >&2
  exit 2
fi

if [ $STRICT = 1 ] && [ "${REDS:-0}" -gt 0 ]; then
  exit 1
fi
exit 0
