---
name: open-pr
description: 将完成的分支推送、创建 PR、评审、合并并清理。用户要求开 PR、提 PR 或合并分支时手动运行。
argument-hint: "[分支名]（可选，默认当前分支）"
disable-model-invocation: true
---

默认场景是 piw 创建的 worktree：分支 checkout 在独立 worktree 中，主仓库停留在 base 分支。前半程（推送、创建 PR、评审、CI、合并）在 worktree 内即可完成；清理阶段需要回到主仓库操作。按顺序执行；在阻塞问题、失败 CI 和合并前停下。

## 1. 确认分支与场景

1. 使用参数中的分支名；没有参数则运行 `git rev-parse --abbrev-ref HEAD`。
2. 用 `git remote show origin` 识别默认分支；查询失败时使用 `master`。
3. 用 `git worktree list` 识别场景：
   - 当前目录不是主仓库（属于某个列出的 worktree）→ worktree 场景（默认）；
   - 否则 → 普通场景。
4. 当前分支是默认分支、没有 GitHub remote，或 `git log <base>..<branch> --oneline` 为空时，停止并说明原因。

## 2. 推送并创建 PR

1. 执行 `git push origin <branch>`。
2. 检查已有 PR：

```bash
gh pr list --head <branch> --json url,number --jq '.[0]'
```

3. 已有 PR 时复用其 URL 和编号，不动它的标题。否则：
   - 从 `git log <base>..<branch> --pretty=%s` 找关联 `#N`；标题写 `[AI Generated][<类型>] <描述>`，类型取大写标签（`[FIX]`、`[DOCS]`…），描述取第一条 commit message 去掉 `type(scope):` 前缀后的部分。
   - 起草 body：关联 issue、改动摘要、测试命令及结果；没有关联 issue 时明确写无关联 issue。
   - 用 `gh pr create --base <base> --head <branch> --title "[AI Generated][<类型>] <描述>" --body "<body>"` 创建。
4. 报告 PR URL。

`gh` 未登录时提示用户运行 `gh auth login`；不要猜测或替代认证方式。

## 3. 评审

本轮会话已经对同一分支调用过 Skill 工具传入 "code-review" 时，复用结论；否则以 `git merge-base <base> <branch>` 为固定点，调用 Skill 工具，传入 "code-review"。

将安全漏洞、数据丢失或崩溃风险、规格缺失、范围蔓延和错误实现视为阻塞项。风格与可维护性建议不阻塞。

- 存在阻塞项：按来源列出阻塞项和非阻塞建议，停止等待修复。
- 评审执行失败：报告错误，询问用户是否跳过评审；只有明确同意才继续。
- 无阻塞项：报告评审结论，进入 CI。

## 4. 预检：可合并性 + CI

`gh pr checks` 只反映检查结果，不反映分支是否落后 base 或被阻塞，合并前先查 PR 本身：

```bash
gh pr view <PR-number> --json state,isDraft,mergeable,mergeStateStatus
```

- `state` 不是 `OPEN`：停止并报告。若 PR 因 head 分支被删而被 GitHub 自动关闭、且分支已重新推送，询问用户是否 `gh pr reopen` 后重跑本 skill。
- `isDraft` 为 `true`（或 `mergeStateStatus` 为 `DRAFT`）：运行 `gh pr ready <PR-number>` 后继续。
- `mergeable` 为 `CONFLICTING` 或 `mergeStateStatus` 为 `DIRTY`：存在冲突，交由 `/resolving-merge-conflicts`，解决并 push 后重跑本步。
- `mergeStateStatus` 为 `BEHIND`：head 分支落后 base。`git fetch origin <base>` 后 `git rebase origin/<base>`（出现冲突同上交由 `/resolving-merge-conflicts`），再用 `git push --force-with-lease origin <branch>` 推送；回到本步开头重新预检：rebase 产生新 commit，CI 必须重跑。
- `mergeStateStatus` 为 `BLOCKED`：被分支保护规则阻塞（如缺 review），报告原因，停止。

可合并后运行：

```bash
gh pr checks <PR-number>
```

- 全部通过：进入合并。
- 有失败：列出失败项，停止等待修复、push 后重跑本 skill。
- 仍在运行：每 30 秒重查一次，最多 5 分钟；超时后报告状态并等待用户决定，不能自行合并。

## 5. 合并

确认评审与预检均通过后，展示 PR URL 并询问用户选择合并方式：`squash`（默认）、`merge` 或 `rebase`。

得到明确选择后执行：

```bash
gh pr merge <PR-number> --<mode>
```

**不要加 `--delete-branch`**：gh 删除本地分支前会切到默认分支，worktree 场景下与主仓库占用的 base 分支冲突（报 ``'master' is already used by worktree``），且报错时远端分支也删不掉。

**合并失败立即停止**：报告错误，不做任何清理。未合并的 PR 删除远端 head 分支会被 GitHub 自动关闭，这是禁止操作。

合并命令执行成功后，确认状态已变为 `MERGED`，再单独删远端分支：

```bash
gh pr view <PR-number> --json state --jq .state   # 必须输出 MERGED
git push origin --delete <branch>
```

本地分支删除在清理阶段由主仓库上下文处理。合并冲突时停止，交由 `/resolving-merge-conflicts` 处理。

## 6. 清理与验证

仅在第 5 步确认 `state` 为 `MERGED` 后执行。

### worktree 场景（默认）

当前会话启动于 worktree 内，**本会话不删除 worktree 与本地分支**：worktree 是会话自身所在目录，删除后 bash 工具即失效（`Cannot execute bash commands`，`cd` 前缀无法绕过）；且被 worktree checkout 的分支必须先移除 worktree 才能删除。这两项交由主仓库上下文的会话或用户手动完成（见第 5 条）。

1. 在 worktree 内检查 `git status --porcelain`：
   - 有未提交/未跟踪改动 → 停止，列出改动并询问用户如何处理。
   - 干净 → 继续。
2. 趁 worktree 目录尚存、bash 仍可用，完成不依赖 worktree 删除的操作。先切到主仓库并确认：

```bash
cd <主仓库路径>   # 用 git worktree list 确认路径
pwd              # 确认已离开 worktree
```

3. 此后所有命令一律用 `cd <主仓库路径> && ...` 前缀执行（bash 工具 cwd 仍是 worktree，目录未删前可用）：

```bash
cd <主仓库路径> && git checkout <base>   # 主仓库应已在 base；不在则切过去
cd <主仓库路径> && git pull origin <base>
```

4. 本会话清理到此为止。worktree 与本地分支不在本会话删除，交由主仓库上下文（新会话或用户手动）：
   - 装了 `piw` 时用 `piw-clean <branch>` 一条完成：移除 worktree、prune、删分支。
   - 没有 `piw` 时手动两步：`git worktree remove <worktree路径> && git worktree prune`，再删分支——squash 合并后本地提交不在 base 历史中，`git branch -d` 会误报 "not fully merged"，须用户确认后 `-D`。
   向用户报告命令与原因。

### 普通场景

在主仓库依次执行：`git checkout <base>`、`git pull origin <base>`，再按 worktree 场景的同两条路径删本地分支（`piw-clean <branch>`，或用户确认后 `git branch -D <branch>`）。远端分支已在第 5 步删除。

### 报告

报告以下可验证结果：远端分支已推送、PR URL、评审结论、CI 状态、合并方式、远端分支是否已删除、主仓库 base 是否已同步；worktree 与本地分支删除交由主仓库上下文（附 `piw-clean <branch>` 或手动命令）。

## 边界

- 不执行 `git reset --hard`、裸 `git push --force` 或 `gh pr close`；rebase 后同步远端分支只允许 `git push --force-with-lease`。
- 不自动强制移除有未提交改动的 worktree；停下询问用户。
- worktree 场景下不删除 worktree 与本地分支（会话自身目录，交由主仓库上下文）。
- 用户要求的不是合并而只是创建 PR 时，在创建并报告 PR URL 后停止。

## Project 同步

仓库配置了 GitHub Project 时：开始实现前将关联 Issue 设为 `In progress`，创建 PR 后设为 `In review`；PR 合并并验证完成后，将 Issue 设为 `Done`，再以 `Completed` 原因关闭。PR 关闭但未合并时，不自动关闭 Issue 或设为 `No action`。提醒用户跑 `/github-project` 完成状态迁移，并复核结果。
