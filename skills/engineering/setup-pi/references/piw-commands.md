# piw / piw-clean 命令（bash 函数）

写入 `~/.bashrc`（或等效 rc 文件）的**非交互 guard 之前**，这样 SSH 非交互命令也能用。

```bash
# piw: 新建分支+worktree 并直接进入 pi
# 用法: piw <分支名> [基础commit/分支]  示例: piw feature/login main
piw() {
  local branch="$1" base="${2:-HEAD}" dir
  if [ -z "$branch" ]; then
    echo "用法: piw <分支名> [基础commit/分支]"
    return 1
  fi
  dir="../pi-${branch//\//-}"          # 分支名转目录名，如 feature/login -> ../pi-feature-login
  git worktree add -b "$branch" "$dir" "$base" || return 1
  cd "$dir" && pi
}

# piw-clean: 在 piw 创建的 worktree 目录内执行，清理当前 worktree 并删分支
# 用法: piw-clean [分支名]   示例: piw-clean（在 worktree 内） / piw-clean issue100
piw-clean() {
  local branch="${1:-$(git rev-parse --abbrev-ref HEAD)}" here main
  here="$(pwd)"
  # 定位主仓库：git worktree list 第一条即主仓库
  main="$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')"
  if [ -z "$branch" ] || [ -z "$main" ]; then
    echo "用法: piw-clean [分支名]（在 piw 创建的 worktree 目录内执行）"
    return 1
  fi
  git worktree remove "$here" 2>/dev/null \
    || { echo "worktree 有未提交改动，强制删除（改动将丢失）"; git worktree remove --force "$here"; }
  git -C "$main" worktree prune
  git -C "$main" branch -d "$branch" 2>/dev/null || echo "分支 '$branch' 未删除(可能有未合并的提交)"
  cd "$main" && echo "已清理 worktree，当前位于主仓库: $main"
}
```

## 使用

- `piw feature/login`：在 `../pi-feature-login` 新建 worktree 并直接进入 pi。
- `piw-clean`（在 worktree 内）：移除当前 worktree、prune、删当前分支，回到主仓库。
- `piw-clean issue100`：在任意位置显式指定分支名清理。

## 注意

- 目录约定：worktree 放在主仓库**父目录**下的 `pi-<分支名>`（`/` 转 `-`）。
- `piw-clean` 必须能定位主仓库（`git worktree list` 第一条）；在非 worktree 目录执行会打印用法并返回 1。
- worktree 有未提交改动时强制删除，改动会丢失；`piw-clean` 会先警告再删。
