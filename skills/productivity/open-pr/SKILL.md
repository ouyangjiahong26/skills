---
name: open-pr
description: 将完成的分支推送、创建 PR 并评审。用户要求开 PR、提 PR 时手动运行。
argument-hint: "[分支名] [下层分支]（可选，默认当前分支；给出下层分支时该 PR 作为栈的一层）"
disable-model-invocation: true
---

推送分支、创建带 AI 标记的 PR、评审改动，报告结果。合并、CI 预检与清理在 `/merge-pr`。分支属于 GitHub 栈时，base 指向下层分支，并把这一层入栈。

## 1. 确认分支与 base

1. 分支取参数第一项；没有参数则运行 `git rev-parse --abbrev-ref HEAD`。
2. 识别默认分支：`git remote show origin` 取 HEAD 分支；查询失败时用仓库中存在的 `main` / `master`。
3. 定 base——本分支是栈的一层时是下层分支，否则是默认分支：
   - 参数给了下层分支：base 取它。
   - 否则查当前分支已有 PR：`gh pr list --head <branch> --json baseRefName --jq '.[0].baseRefName'`；有值且不是默认分支时 base 取它。
   - 否则 base 是默认分支。
4. 当前分支是默认分支、没有 GitHub remote，或 `git log <base>..<branch> --oneline` 为空时，停止并说明原因。
5. base 不是默认分支时（本分支是栈的一层）：
   - 下层分支必须有 open PR（`gh pr list --head <base> --json number,state --jq '.[0]'`）；没有就停止，让用户先对下层分支跑 `/open-pr`。`gh stack link` 会给缺 PR 的下层自动建 draft PR，不借它做这件事。
   - `gh stack --version` 失败时停止，请用户跑 `gh extension install github/gh-stack`。链式 PR 不入栈时，上层 PR 的 CI 与分支规则不会按栈底分支触发。
   - 不用 `gh stack view` 反推 base：piw 的 worktree 读不到 `.git/gh-stack`（跟踪文件在主仓库 git 目录下），它必然报 not part of a stack。

## 2. 推送并创建 PR

1. 执行 `git push origin <branch>`。
2. 检查已有 PR：

```bash
gh pr list --head <branch> --json url,number --jq '.[0]'
```

3. 已有 PR 时复用其 URL 和编号，不动它的标题。否则：
   - 从 `git log <base>..<branch> --pretty=%s` 找关联 `#N`；标题写 `[AI Generated][<类型>] <描述>`：类型取大写标签（`[FIX]`、`[DOCS]`…），描述取第一条 commit message 去掉 `type(scope):` 前缀后的部分。
   - 起草 body：关联 issue、改动摘要、测试命令及结果；分支上有多条 commit 时改动摘要覆盖全部 commit；没有关联 issue 时明确写无关联 issue。
   - 用 `gh pr create --base <base> --head <branch> --title "<标题>" --body "<body>"` 创建。
4. base 不是默认分支时把这一层入栈——新建 PR 和复用已有 PR 都要做。`gh stack link` 自己会 push 分支，且要求给全链：
   1. 下层 PR 已在栈里时，用 `<owner>/<repo>`（`gh repo view --json nameWithOwner --jq .nameWithOwner`）读栈：

```bash
gh api /repos/<owner>/<repo>/pulls/<下层PR号> --jq '.stack.number // empty'
gh api /repos/<owner>/<repo>/stacks/<栈号> --jq '.base.ref, ([.pull_requests[].head.ref] | join(" "))'
```

   第一行给出栈号（空即下层还没入栈）；第二行给出 trunk 与自底向上的分支链，当前分支不在链里就补到末尾。
   2. 只有两层时链是 `<下层分支> <分支>`，trunk 取下层 PR 的 `baseRefName`。
   3. `gh stack link --base <trunk> <链…>`。缺层会报 `Cannot update stack: this would remove #N from the stack`，报错即停止，不自行拼链。
   4. 复核：`gh api /repos/<owner>/<repo>/pulls/<PR号> --jq '.stack'` 应给出 `number`、`position`、`size`。
5. 把 PR 自身加入 Project，Status 置 `In review`：项目与字段配置取自目标仓库 `docs/agents/issue-tracker.md`，写前用 `gh project item-list` 读 item 现值、写后复核（纪律同 `github-project` 的规则）；配置缺失或写入失败时报告原因并跳过。之后报告 PR URL。

`gh` 未登录时提示用户运行 `gh auth login`；不要猜测或替代认证方式。

## 3. 评审

本轮会话已有同一分支、其后无新 commit 的评审结论则复用；否则以 `git merge-base <base> <branch>` 为固定点调用 `code-review` skill。base 是下层分支时，这个固定点正好是下层 tip，评审范围就是本层 diff。

将安全漏洞、数据丢失或崩溃风险、规格缺失、范围蔓延和错误实现视为阻塞项。风格与可维护性建议不阻塞。

- 存在阻塞项：按来源列出阻塞项和非阻塞建议，停止等待修复。
- 评审执行失败：报告错误，询问用户是否跳过评审；只有明确同意才继续。
- 无阻塞项：报告评审结论。

## 4. 报告

报告：分支已推送、PR URL、评审结论、PR 的 Project 状态；入栈时另报栈号与层级（`stack #<number> 第 <position>/<size> 层`）。CI 与可合并性在 `/merge-pr` 合并前预检；下一步提示用户运行 `/merge-pr`。

## 边界

| 情况 | 处理方式 |
|------|----------|
| 用户只要求创建 PR | 创建并报告 PR URL 后停止，不评审 |
| 评审发现阻塞项 | 停止等待修复；修复后重新提交、推送并重跑本 skill |
| `gh pr create` 失败 | 报告错误与原因，不做替代操作 |
| `gh stack` 扩展未安装 | 停止，请用户 `gh extension install github/gh-stack` |
| 下层分支没有 open PR | 停止，提示先对下层分支跑 `/open-pr` |
| `gh stack link` 失败 | 报告错误与原因；不自行拼链，也不改用 `gh stack submit`（它自造标题并新建 draft PR） |
| worktree 里 `gh stack view` 报 not part of a stack | 预期行为（读不到跟踪文件）；base 用参数或已有 PR 的 `baseRefName` 判定 |
