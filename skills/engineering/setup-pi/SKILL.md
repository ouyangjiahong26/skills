---
name: setup-pi
description: 配置 pi 的 piw / piw-clean shell 命令：新建分支和 worktree 直接进入 pi，及 worktree 的清理回收。手动运行。
disable-model-invocation: true
---

为当前机器配置 `piw`（新建分支和 worktree 后直接进入 pi）与 `piw-clean`（移除 worktree、prune、删除分支并回到主仓库）两个 shell 函数。种子模板是 `references/piw-commands.md`，只写取得用户确认的文件。

只覆盖 POSIX shell（Linux 的 bash / zsh）。Windows 上的 `piw` / `piw-clean` 是 PowerShell 函数、由 `$PROFILE` 提供：不写入、不覆盖、不按本模板改造。

## 1. 探索

读取，不要假设：

- `uname -s` 判断平台；Windows（`MINGW*` / `MSYS*` / `CYGWIN*`）按「边界情况」处理，不写文件。
- 交互 shell 中 `type piw piw-clean` 是否已定义，rc 文件里是否已有同名函数及其行号范围。
- 用户实际使用的 shell 及 rc 文件（bash 默认 `~/.bashrc`，zsh 用 `~/.zshrc`）。
- 已有函数与模板的差异：旧版本用 `git branch -d` 删分支，squash 合并的分支会误报「未合并」而删不掉。

## 2. 决策

说明两个命令的行为，向用户确认写入 rc 文件：

- `piw <分支名> [基础commit/分支]`：新建分支和 worktree（`../pi-<分支名>`）后直接进入 pi。
- `piw-clean [分支名]`：在 worktree 内不带参数清理当前 worktree；在主仓库带分支名清理对应 worktree。删分支前按 patch-id 判断内容是否已进 base，squash / rebase 合并的分支也能删掉；确有未合并改动的分支保留并说明。
- **worktree 有未提交改动时会强制删除，改动丢失。必须先向用户说明。**

bash 的 `~/.bashrc` 里函数块放在非交互 guard 之前，非交互加载时也能定义。

## 3. 确认写入

只展示将写入或更新的文件、使用的种子模板及对已有内容的保留、替换或追加方式。不要输出模板全文。

得到确认后才写入。

## 4. 写入与验证

- 写入 rc 文件后，新开一个交互 shell 跑 `type piw piw-clean`，确认内容来自本次写入（旧 shell 仍持有旧函数）。
- bash 下再确认函数块位于非交互 guard 之前：`BASH_ENV=$HOME/.bashrc bash -c 'type -t piw piw-clean'` 应输出两个 `function`。

## 边界情况

| 情况 | 处理方式 |
| --- | --- |
| 平台是 Windows（`uname -s` 为 `MINGW*` / `MSYS*` / `CYGWIN*`） | 不写任何文件，说明本 skill 只配置 POSIX shell，Windows 的 PowerShell 函数保持原样 |
| rc 文件不存在 | 询问用户是用其 shell 实际读取的文件，还是新建该文件 |
| 无法确定用户 shell（非 bash / zsh） | 询问 rc 文件路径，不猜 |
| 已有同名函数 | 展示差异，确认后整体替换，不留新旧两份 |
| bash 下函数块位于非交互 guard 之后 | 移到 guard 之前，说明否则非交互加载时函数不存在 |
