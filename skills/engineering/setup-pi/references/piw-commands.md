# piw / piw-clean 命令（POSIX shell 函数）

只用于 Linux（及同类 POSIX）的 bash / zsh：写入 `~/.bashrc`（或 `~/.zshrc` 等等效 rc 文件）的**非交互 guard 之前**，这样非交互加载时也能定义。Windows 上的同名命令是 PowerShell 函数（`$PROFILE`），不适用本模板，也不要用它覆盖。

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

# piw-clean: 移除 piw 创建的 worktree，并删除其分支
# 用法: piw-clean             在 worktree 内执行：清理当前 worktree 与当前分支
#       piw-clean <分支名>     在任意位置执行：清理该分支 checkout 的 worktree 与分支
piw-clean() {
  local branch="${1:-}" here main wt target
  here="$(pwd)"
  # 定位主仓库：git worktree list 第一条即主仓库
  main="$(git worktree list --porcelain 2>/dev/null | awk '$1=="worktree"{print substr($0,10); exit}')"
  if [ -z "$main" ]; then
    echo "piw-clean: 当前目录不在 git 仓库内"
    return 1
  fi
  [ -n "$branch" ] || branch="$(git -C "$here" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if [ -z "$branch" ]; then
    echo "用法: piw-clean [分支名]"
    return 1
  fi
  # 该分支 checkout 在哪个 worktree；命中主仓库说明分支正被主仓库占用
  wt="$(git -C "$main" worktree list --porcelain | awk -v b="refs/heads/$branch" \
    '/^worktree /{p=substr($0,10)} /^branch /{if ($2==b) print p}')"
  if [ "$wt" = "$main" ]; then
    echo "piw-clean: 分支 '$branch' 由主仓库自身 checkout，不能删除"
    return 1
  fi
  cd "$main" || return 1               # 先离开待删目录，否则 cwd 会随 worktree 一起消失
  if [ -n "$wt" ]; then
    git worktree remove "$wt" 2>/dev/null \
      || { echo "worktree $wt 有未提交改动，强制删除（改动将丢失）"; git worktree remove --force "$wt"; }
    git worktree prune
  fi
  # 删分支。squash / rebase 合并会重写 SHA，tip 不是 base 的祖先，git branch -d 会误判
  # 「未合并」；故用 git cherry 按 patch-id 判等：出现 '+' 行才算真有未合并的改动。
  target="$(git -C "$main" rev-parse --abbrev-ref HEAD)"
  if ! git -C "$main" show-ref --verify --quiet "refs/heads/$branch"; then
    echo "本地无分支 '$branch'，无需删除"
  elif git -C "$main" cherry "$target" "$branch" 2>/dev/null | command grep -q '^+'; then
    echo "分支 '$branch' 有未合并进 $target 的改动，已保留"
  else
    git -C "$main" branch -D "$branch"
  fi
  echo "已清理 worktree，当前位于主仓库: $main"
}
```

## 使用

- `piw feature/login`：在 `../pi-feature-login` 新建 worktree 并直接进入 pi。
- `piw-clean`（在 worktree 内）：移除当前 worktree、prune、删当前分支，回到主仓库。
- `piw-clean issue100`（任意位置，包括主仓库）：清理 issue100 对应的 worktree 与分支。

## 注意

- 目录约定：worktree 放在主仓库**父目录**下的 `pi-<分支名>`（`/` 转 `-`）。
- `piw-clean` 必须能定位主仓库（`git worktree list` 第一条）；不在仓库内会报错返回 1。
- 删分支前用 `git cherry <主仓库当前分支> <分支>` 按 patch-id 判等，而不是 `git branch -d` 的祖先判据：squash / rebase 合并后内容已进 base、但提交 SHA 不同，`-d` 会误报「未合并」并留下分支。只有出现 `+` 行（补丁在 base 中找不到）才保留分支并说明。
- worktree 有未提交改动时强制删除，改动会丢失；`piw-clean` 会先警告再删。
