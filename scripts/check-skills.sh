#!/usr/bin/env bash
set -euo pipefail

# 回归检查：
# 1. README / CLAUDE.md 里的安装命令必须指向当前仓库的 origin。
#    CLAUDE.md 可以是指向 AGENTS.md 的整文件指针（内容就是 "AGENTS.md"），此时跟随它再查。
# 2. 每个 SKILL.md 必须有 name 和 description 的 YAML frontmatter。

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

source "$(dirname "$0")/lib/find-skills.sh"

origin_url="$(git remote get-url origin 2>/dev/null || true)"
origin_path="${origin_url%.git}"
origin_name="${origin_path##*/:}"
origin_name="${origin_name##*/}"

if [ -z "$origin_name" ]; then
  echo "error: cannot determine origin repo name" >&2
  exit 1
fi

bad_refs=0
while IFS= read -r file; do
  target="$file"
  # 单行文件视为指针，跟随一次（CLAUDE.md -> AGENTS.md）。
  if [ -f "$target" ] && [ "$(wc -l < "$target")" -le 1 ]; then
    pointer="$(tr -d '[:space:]' < "$target")"
    if [ -f "$pointer" ] && [ "$pointer" != "$target" ]; then
      target="$pointer"
    fi
  fi
  if grep -qE "npx skills add [^[:space:]]+/$origin_name" "$target"; then
    :
  else
    echo "error: $file does not reference the current origin ($origin_name)" >&2
    bad_refs=$((bad_refs + 1))
  fi
done < <(printf '%s\n' README.md CLAUDE.md)

bad_skills=0
while IFS= read -r skill_md; do
  if ! grep -qE '^name:' "$skill_md" || ! grep -qE '^description:' "$skill_md"; then
    echo "error: $skill_md missing name/description frontmatter" >&2
    bad_skills=$((bad_skills + 1))
  fi
done < <(list_skill_dirs | sed 's|$|/SKILL.md|')

if [ "$bad_refs" -gt 0 ] || [ "$bad_skills" -gt 0 ]; then
  exit 1
fi

echo "ok: repo references and skill frontmatter are consistent"
