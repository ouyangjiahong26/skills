---
name: merge-pr
description: 合并已创建的 PR：预检评审与 CI、合并、清理本地与远端分支。用户要求合并 PR 或合并分支时手动运行。
argument-hint: “[PR 编号或分支名]（可选，默认当前分支）”
disable-model-invocation: true
---

合并当前分支对应的 PR，随后清理本地与远端分支。按顺序执行。遇到阻塞问题或 CI 失败时停下。合并前同样停下。PR 在 GitHub 栈里时走异步合并接口，自底向上逐层合并。

## 1. 确认 PR

1. 从参数解析分支名或 PR 编号。没有参数则运行 `git rev-parse --abbrev-ref HEAD`。用 `gh pr list --head <branch> --json number,url --jq '.[0]'`（已有 PR 编号则 `gh pr view <number>`）定位 PR。找不到 PR 或当前分支是默认分支时，停止并说明原因。
2. 识别 base（默认分支）：`git remote show origin` 取 HEAD 分支。查询失败时用仓库中存在的 `main` / `master`。
3. 判断 PR 是否在栈里。在栈里就按自底向上的顺序取出全栈：

```bash
gh api /repos/<owner>/<repo>/pulls/<PR号> --jq '.stack.number // empty'
gh api /repos/<owner>/<repo>/stacks/<栈号> --jq '.base.ref, ([.pull_requests[] | "\(.number) \(.head.ref) \(.state) \(.draft)"] | join("\n"))'
```

`<owner>/<repo>` 由 `gh repo view --json nameWithOwner --jq .nameWithOwner` 取。第一行空即普通 PR，走下面各步中标注“普通 PR”的路径。非空时第二行给出栈底分支与每层的 PR 号、分支名、状态和是否 draft。栈内时，本次要落地的层是从最低未合并层到目标 PR（含）的各层。
4. 当前目录属于 `git worktree list` 列出的某个 worktree 而非主工作树时，停止并说明本 skill 须在主工作树运行，请用户回主工作树重跑。
5. 分支有未推送提交（`git rev-list origin/<branch>..<branch>` 非空）时先 `git push origin <branch>`。

## 2. 合并前预检

评审、可合并性、CI 三项都通过才合并。

### 评审

本轮会话已有同一分支且其后无新 commit 的 `code-review` 结论，则算通过。否则以 `git merge-base <base> <branch>` 为固定点调用 `code-review` skill。栈内 PR 的 base 是下层分支，这个固定点就是下层分支的最新提交，评审范围是本层 diff。有阻塞项（标准见 `/open-pr` 的“评审”节）就按来源列出并停止等待修复。

### 可合并性

`gh pr checks` 只反映检查结果，不反映分支是否落后 base 或被阻塞，先查 PR 本身：

```bash
gh pr view <PR-number> --json state,isDraft,mergeable,mergeStateStatus
```

- `state` 不是 `OPEN`：停止并报告。若 PR 因 head 分支被删而被 GitHub 自动关闭，且分支已重新推送，询问用户是否 `gh pr reopen` 后重跑本 skill。
- `isDraft` 为 `true`（或 `mergeStateStatus` 为 `DRAFT`）：运行 `gh pr ready <PR-number>` 后继续。
- `mergeable` 为 `CONFLICTING` 或 `mergeStateStatus` 为 `DIRTY`：存在冲突，交由 `/resolving-merge-conflicts`，解决并 push 后重跑本步。
- `mergeStateStatus` 为 `BEHIND`：head 分支落后 base，按下面“非栈内 PR / 栈内 PR”的对应方式 rebase 后重跑本步。
- `mergeStateStatus` 为 `BLOCKED`：被分支保护规则阻塞（如缺 review），报告原因，停止。

非栈内 PR 落后时：`git fetch origin <base>` 后 `git rebase origin/<base>`（出现冲突同上交由 `/resolving-merge-conflicts`），再用 `git push --force-with-lease origin <branch>` 推送。回到本步开头重新预检：rebase 产生新 commit，评审与 CI 都要重做。

栈内 PR 落后时：用 `gh stack rebase` 做级联 rebase，再 `gh stack push`（冲突交 `/resolving-merge-conflicts`），然后回到本步开头重新预检。

栈内 PR 另查第 1 步的全栈输出：本次要落地的每一层都得是 `open` 且非 draft，有一层不是就停止并列出该层。

### CI

```bash
gh pr checks <PR-number>
```

- 全部通过：进入合并。
- 有失败：列出失败项，停止并等待修复。修复并 push 后重跑本 skill。
- 仍在运行：每 30 秒重查一次，最多 5 分钟。超时后报告状态并等待用户决定，不能自行合并。

栈内 PR 要对本次要落地的每一层各跑一次 `gh pr checks <层PR号>`，全部通过才继续。任一层失败即停止。

## 3. 合并

预检通过后，展示 PR URL 并询问用户选择合并方式：`squash`（默认）、`merge` 或 `rebase`。

得到明确选择后执行。

非栈内 PR 走 gh 命令：

```bash
# squash：必须显式给 --subject。不给的话 GitHub 拿带标记的 PR 标题当提交标题，
# 标记就进了提交历史。提交标题按该仓库的 commit 约定写（缺省约定见 git-commit
# 的 references/git-workflow.md），正文写改动摘要。
gh pr merge <PR-number> --squash --subject "<type>(<scope>): <描述> (#<PR-number>)" --body-file <文件>

# merge / rebase：提交标题沿用分支上的 commit message，本身不带标记
gh pr merge <PR-number> --merge
gh pr merge <PR-number> --rebase
```

栈内 PR 走异步合并接口，自底向上逐层做到目标 PR。接口会连带合并目标层以下未合并的层，所以从最低未合并层开始请求，每次就只落地一层：

```bash
gh api --method PUT repos/<owner>/<repo>/pulls/<层PR号>/merge-async \
  -f merge_method=<squash|merge|rebase> \
  -f commit_title="<type>(<scope>): <描述> (#<层PR号>)" \
  -f commit_message="<改动摘要>"
```

- `squash` 必须显式给 `commit_title`（`merge` / `rebase` 不给，它们沿用分支上的 commit message）：`commit_title` 只作用于本次请求的目标层。不给时服务端按仓库的 `squash_merge_commit_title` 生成，多提交的层会取 PR 标题，AI 标记就进了提交历史。标题按该层分支的 commit 约定写（缺省约定见 `git-commit` 的 `references/git-workflow.md`），正文写改动摘要。
- 响应里取 `details.uuid` 轮询：

```bash
gh api repos/<owner>/<repo>/pulls/<层PR号>/merge-async/<uuid> --jq .status
```

`pending` 每 2 秒重查一次。`merged` 表示成功，`details.sha` 是合并提交。`enqueued` 表示已进 merge queue，报告后停下。`failed` 立即停止并报告 `details.message`（栈合并是原子的，失败时没有任何层落地）。

- 每层确认 `gh pr view <层PR号> --json state --jq .state` 输出 `MERGED` 再处理下一层。下层落地后其余层会被服务端级联 rebase（SHA 改写、CI 重跑），所以下一层要回第 1 步重读栈、回第 2 步重跑预检。
- 不要用 `gh stack merge`：它无法指定提交标题，多提交的层会把带标记的 PR 标题写进历史。

不加 `--delete-branch`：squash 合并后本地分支须用户确认用 `-D` 才删得掉，合并与分支删除因此分开执行。仓库开启合并后自动删除远端分支时，该分支在合并落地那一刻已由 GitHub 删除，只剩本地分支待第 4 步处理。

合并失败立即停止：报告错误，不做任何清理。删除未合并 PR 的远端 head 分支会让 GitHub 自动关闭该 PR，这是禁止操作。

每层合并成功后，确认状态已变为 `MERGED`，再处理该层的远端分支（分支名取自第 1 步的全栈输出。非栈内 PR 用当前分支）。仓库可能开启了合并后自动删除，此时分支已不存在，先查远端再决定是否删除：

```bash
gh pr view <PR-number> --json state --jq .state   # 必须输出 MERGED
if git ls-remote --exit-code --heads origin <branch> >/dev/null 2>&1; then
  git push origin --delete <branch>
else
  echo "远端分支已由 GitHub 删除"
fi
```

最后把 PR 项与关联 Issue 置 `Done`，关联 Issue 以 `Completed` 为原因关闭。无关联 Issue 只迁 PR 项。栈内落地多层时，每层都做同样的迁移。Project 写入按 `github-project` skill 的 references/sync-discipline.md 执行。

## 4. 清理与验证

仅在第 3 步确认 `state` 为 `MERGED` 后执行。

1. 检查 `git status --porcelain`：有未提交或未跟踪改动就停止，列出改动并询问用户如何处理。干净则继续。
2. 依次执行 `git checkout <base>`、`git pull origin <base>`。
3. 删本地分支：squash 合并后本地提交不在 base 历史中，`git branch -d` 会误报 "not fully merged"，向用户确认后执行 `git branch -D <branch>`。
4. 栈内落地多层时本地只处理当前分支。上层分支已被服务端级联 rebase，本地分支随之过期，报告里提示对各上层分支执行 `git pull --rebase`，或在本仓库跑 `gh stack sync --prune`。

## 5. 报告

报告以下可验证结果：PR URL、评审结论、CI 状态、合并方式、PR 与关联 Issue 的 Project 状态、远端分支是否已删除、base 分支是否已同步、本地分支是否已删除。栈内另报栈号、本次落地的层与每层的提交标题，并提示上层分支已被服务端 rebase，需要各自 `git pull --rebase`。

## 边界

| 情况 | 处理方式 |
|------|----------|
| 找不到 PR，或 `state` 不是 `OPEN` | 停止并报告，不做任何写操作 |
| 合并命令失败 | 立即停止，不做清理，不删远端分支 |
| 当前目录属于某个 worktree | 停止，请在主工作树重跑本 skill |
| 清理时本地有未提交改动 | 停止，列出改动并询问用户 |
| 栈内某层不是 `open` 或仍是 draft | 停止并列出该层，不做写操作 |
| 异步合并返回 `failed` | 立即停止，报告 `details.message`。原子合并，没有任何层落地 |
| 异步合并返回 `enqueued` | 报告已进 merge queue 后停下，后续由队列决定 |
| `merge-async` 返回 404 | 该仓库不支持异步合并（栈也不可用），报告并停止 |
| base 分支启用 merge queue | 逐层合并要等队列处理完才能合下一层，可能超过等待上限。报告并交用户决定（整组入队用 `gh stack merge <目标PR号> --yes --<method>`，此时提交标题由仓库 squash 设置生成） |

不执行 `git reset --hard`、裸 `git push --force` 或 `gh pr close`。rebase 后同步远端分支只允许 `git push --force-with-lease`。
