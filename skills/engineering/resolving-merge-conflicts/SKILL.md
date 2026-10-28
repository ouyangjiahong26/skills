---
name: resolving-merge-conflicts
description: 当需要解决进行中的 git merge / rebase 冲突，或处理 PR 上未解决的评审意见（含自动评审 bot）时使用。
---

## git merge / rebase 冲突

1. 看清当前状态。检查 merge / rebase 进度、git 历史、冲突文件。

2. 找原始资料。深入理解每处改动为什么这么改，原始意图是什么。读 commit message，查 PR，查原始 issue / ticket。

3. 逐 hunk 解决。能同时保留两边意图的，就两边都保留。不可调和时，选符合本次合并既定目标的那一边，并记下取舍。不要发明新行为。冲突永远要解决，绝不 `--abort`。

4. 找到项目的自动化检查并逐个运行：通常先 typecheck，再测试，最后格式化。把合并弄坏的地方修好。

5. 收尾 merge / rebase：暂存全部改动并提交。处于 rebase 中时，继续推进直到所有 commit 都 rebase 完。

## PR 评审意见

处理 PR 上未解决的评审：自动评审 bot 或人留下的 `CHANGES_REQUESTED` 与逐行 comment。

1. 读全部评审结论与逐行 comment，用 REST 端点：

```bash
gh api /repos/<owner>/<repo>/pulls/<PR号>/reviews --jq '.[] | {user: .user.login, state: .state, body: .body}'
gh api /repos/<owner>/<repo>/pulls/<PR号>/comments --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body}'
```

`<owner>/<repo>` 由 `gh repo view --json nameWithOwner --jq .nameWithOwner` 取。评审正文是汇总，逐行 comment 是细节，两处都要看。

2. 逐条判断是否成立。评审意见（含 bot 的）不必然正确：按意见指出的文件与行号核对，必要时读它引用的材料求证。成立的修复。不成立的不改，记下依据。

3. 修复成立的意见，只动意见涉及的范围。评审常分阻塞与应改两级，全部处理，不只处理阻塞项。

4. 对不采纳的意见逐条回帖说明依据，第一行写 AI 贡献标记（`> **[AI Generated]** 本评论由 AI 完成。`）：

```bash
gh api --method POST /repos/<owner>/<repo>/pulls/<PR号>/comments/<commentId>/replies -f body="<标记与理由>"
```

采纳并修复的不必回帖，diff 即回应。

5. push 分支。自动评审 bot 会重新评审，复审仍提意见时重复本节流程。复审通过或用户确认解决后，合并走 `/merge-pr`。
