---
name: merge-pr
description: 合并已创建的 PR：预检评审与 CI、合并、清理分支与 worktree。用户要求合并 PR 或合并分支时手动运行。
argument-hint: "[PR 编号或分支名]（可选，默认当前分支）"
disable-model-invocation: true
---

默认场景是 piw 创建的 worktree：分支 checkout 在独立 worktree 中，主仓库停留在 base 分支。合并在 worktree 内完成，清理阶段需要回到主仓库操作。按顺序执行；在阻塞问题、失败 CI 和合并前停下。

## 1. 确认 PR 与场景

1. 用参数解析分支名或 PR 编号；没有参数则运行 `git rev-parse --abbrev-ref HEAD`。用 `gh pr list --head <branch> --json number,url --jq '.[0]'`（已有 PR 编号则 `gh pr view <number>`）定位 PR；找不到 PR 或当前分支是默认分支时，停止并说明原因。
2. 识别 base（默认分支）：`git remote show origin` 取 HEAD 分支；查询失败时用仓库中存在的 `main` / `master`。
3. 用 `git worktree list` 识别场景：
   - 当前目录不是主仓库（属于某个列出的 worktree）→ worktree 场景（默认）；
   - 否则 → 普通场景。
4. 分支有未推送提交（`git rev-list origin/<branch>..<branch>` 非空）时先 `git push origin <branch>`。

## 2. 合并前预检

评审、可合并性、CI 三项都通过才合并。

### 评审

本轮会话已有同一分支、其后无新 commit 的 `code-review` 结论则算通过；否则以 `git merge-base <base> <branch>` 为固定点调用 `code-review` skill。有阻塞项（标准见 `/open-pr` 的「评审」节）就按来源列出并停止等待修复。

### 可合并性

`gh pr checks` 只反映检查结果，不反映分支是否落后 base 或被阻塞，先查 PR 本身：

```bash
gh pr view <PR-number> --json state,isDraft,mergeable,mergeStateStatus
```

- `state` 不是 `OPEN`：停止并报告。若 PR 因 head 分支被删被 GitHub 自动关闭、且分支已重新推送，询问用户是否 `gh pr reopen` 后重跑本 skill。
- `isDraft` 为 `true`（或 `mergeStateStatus` 为 `DRAFT`）：运行 `gh pr ready <PR-number>` 后继续。
- `mergeable` 为 `CONFLICTING` 或 `mergeStateStatus` 为 `DIRTY`：存在冲突，交由 `/resolving-merge-conflicts`，解决并 push 后重跑本步。
- `mergeStateStatus` 为 `BEHIND`：head 分支落后 base。`git fetch origin <base>` 后 `git rebase origin/<base>`（出现冲突同上交由 `/resolving-merge-conflicts`），再用 `git push --force-with-lease origin <branch>` 推送；回到本步开头重新预检：rebase 产生新 commit，评审与 CI 都要重做。
- `mergeStateStatus` 为 `BLOCKED`：被分支保护规则阻塞（如缺 review），报告原因，停止。

### CI

```bash
gh pr checks <PR-number>
```

- 全部通过：进入合并。
- 有失败：列出失败项，停止等待修复、push 后重跑本 skill。
- 仍在运行：每 30 秒重查一次，最多 5 分钟；超时后报告状态并等待用户决定，不能自行合并。

## 3. 合并

预检通过后，展示 PR URL 并询问用户选择合并方式：`squash`（默认）、`merge` 或 `rebase`。

得到明确选择后执行：

```bash
# squash：必须显式给 --subject。不给的话 GitHub 拿带标记的 PR 标题当提交标题，
# 标记就进了提交历史；提交标题按该仓库的 commit 约定写（缺省模板见 git-commit
# 的 references/git-workflow.md），正文写改动摘要。
gh pr merge <PR-number> --squash --subject "<type>(<scope>): <描述> (#<PR-number>)" --body-file <文件>

# merge / rebase：提交标题沿用分支上的 commit message，本身不带标记
gh pr merge <PR-number> --merge
gh pr merge <PR-number> --rebase
```

**不加 `--delete-branch`**：gh 删除本地分支前会切到默认分支，worktree 场景下与主仓库占用的 base 分支冲突（报 ``'master' is already used by worktree``），且报错时远端分支也删不掉；远端分支在确认合并后单独删。

**合并失败立即停止**：报告错误，不做任何清理。未合并的 PR 删除远端 head 分支会被 GitHub 自动关闭，这是禁止操作。

合并命令执行成功后，确认状态已变为 `MERGED`，再删远端分支：

```bash
gh pr view <PR-number> --json state --jq .state   # 必须输出 MERGED
git push origin --delete <branch>
```

最后把 PR 项与关联 Issue 置 `Done`，关联 Issue 以 `Completed` 原因关闭；无关联 Issue 只迁 PR 项。项目与字段配置取自目标仓库 `docs/agents/issue-tracker.md`，写前用 `gh project item-list` 读 item 现值、写后复核（纪律同 `github-project` 的规则）；配置缺失或写入失败时报告原因，请用户跑 `/github-project`。

## 4. 清理与验证

仅在第 3 步确认 `state` 为 `MERGED` 后执行。删除规则：worktree 场景下本会话不删 worktree 与本地分支——worktree 是会话自身所在目录，删除后 bash 工具即失效（`Cannot execute bash commands`，`cd` 前缀无法绕过），且被 worktree checkout 的分支必须先移除 worktree 才能删除；这两项交由主仓库上下文（新会话或用户手动）完成。

### worktree 场景（默认）

1. 在 worktree 内检查 `git status --porcelain`：有未提交/未跟踪改动 → 停止，列出改动并询问用户如何处理；干净 → 继续。
2. 趁 worktree 目录尚存、bash 仍可用，先切到主仓库并确认：

```bash
cd <主仓库路径>   # 用 git worktree list 确认路径
pwd              # 确认已离开 worktree
```

3. 此后所有命令一律用 `cd <主仓库路径> && ...` 前缀执行（bash 工具 cwd 仍是 worktree，目录未删前可用）：

```bash
cd <主仓库路径> && git checkout <base>   # 主仓库应已在 base；不在则切过去
cd <主仓库路径> && git pull origin <base>
```

4. 本会话清理到此为止，向用户报告删除命令与原因：
   - 装了 `piw` 时用 `piw-clean <branch>` 一条完成：移除 worktree、prune、删分支。
   - 没有 `piw` 时手动两步：`git worktree remove <worktree路径> && git worktree prune`，再删分支——squash 合并后本地提交不在 base 历史中，`git branch -d` 会误报 "not fully merged"，须用户确认后 `-D`。

### 普通场景

在主仓库依次执行：`git checkout <base>`、`git pull origin <base>`，再删本地分支（`piw-clean <branch>`，或用户确认后 `git branch -D <branch>`）。远端分支已在第 3 步删除。

## 5. 报告

报告以下可验证结果：PR URL、评审结论、CI 状态、合并方式、PR 与关联 Issue 的 Project 状态、远端分支是否已删除、主仓库 base 是否已同步；worktree 与本地分支删除交由主仓库上下文（附 `piw-clean <branch>` 或手动命令）。

## 边界

| 情况 | 处理方式 |
|------|----------|
| 找不到 PR，或 `state` 不是 `OPEN` | 停止并报告，不做任何写操作 |
| 合并命令失败 | 立即停止，不做清理，不删远端分支 |
| worktree 有未提交改动 | 停止，列出改动并询问用户 |

不执行 `git reset --hard`、裸 `git push --force` 或 `gh pr close`；rebase 后同步远端分支只允许 `git push --force-with-lease`。
