# piw / piw-clean 命令（POSIX shell 函数）

用于 POSIX shell 的 bash / zsh，含 Windows 上从 git-bash / MSYS 使用 `pi` 的场景：写入 `~/.bashrc`（或 `~/.zshrc` 等等效 rc 文件）的**非交互 guard 之前**，这样非交互加载时也能定义。Windows 上从 PowerShell 使用 `pi` 时用 PowerShell 模板 [piw-commands-windows.md](./piw-commands-windows.md)，两个文件互不覆盖。

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
  local branch="${1:-}" here main wt target base
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
  # 删分支。git branch -d 只看 tip 是否为 base 的祖先，squash / rebase 合并重写 SHA 后会误判
  # 「未合并」，故分两步判断分支内容是否已进目标分支：
  #   1. git cherry 逐个 patch-id 比对：普通合并、rebase、单提交 squash 都能认出；
  #   2. squash 把多个提交压成一个，逐个 patch-id 对不上，改看内容：分支相对 merge-base 的
  #      改动能否在目标分支上反向应用，能则说明这些改动已经在里面。
  # 两条都不成立才保留分支。
  target="$(git -C "$main" rev-parse --abbrev-ref HEAD)"
  base="$(git -C "$main" merge-base "$target" "$branch" 2>/dev/null)"
  if ! git -C "$main" show-ref --verify --quiet "refs/heads/$branch"; then
    echo "本地无分支 '$branch'，无需删除"
  elif ! git -C "$main" cherry "$target" "$branch" 2>/dev/null | command grep -q '^+'; then
    git -C "$main" branch -D "$branch"
  elif [ -n "$base" ] \
    && git -C "$main" diff "$base" "$branch" | git -C "$main" apply --check --reverse - 2>/dev/null; then
    git -C "$main" branch -D "$branch"     # squash 合并：这些改动已经出现在目标分支上
  else
    echo "分支 '$branch' 有未合并进 $target 的改动，已保留"
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
- 删分支的判据不是 `git branch -d` 的祖先关系（squash / rebase 合并重写 SHA，内容已进 base 也会被判「未合并」，留下分支），而是两步：
  1. `git cherry <主仓库当前分支> <分支>` 逐个 patch-id 比对，出现 `+` 行说明该提交的补丁在 base 中找不到；
  2. 全部是 `-` / 空时直接删；出现 `+` 时再退一步看内容——把分支相对 `merge-base` 的改动反向应用到 base 上（`git apply --check --reverse`），能应用说明这些改动已经在 base 里（多提交 squash 合并就属于这种）。
  两条都不成立才保留分支并说明。
- worktree 有未提交改动时强制删除，改动会丢失；`piw-clean` 会先警告再删。
