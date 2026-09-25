---
name: open-pr
description: 将完成的分支推送、创建 PR 并评审。用户要求开 PR、提 PR 时手动运行。
argument-hint: "[分支名]（可选，默认当前分支）"
disable-model-invocation: true
---

推送分支、创建带 AI 标记的 PR、评审改动，报告结果。合并、CI 预检与清理在 `/merge-pr`。

## 1. 确认分支与 base

1. 使用参数中的分支名；没有参数则运行 `git rev-parse --abbrev-ref HEAD`。
2. 识别 base（默认分支）：`git remote show origin` 取 HEAD 分支；查询失败时用仓库中存在的 `main` / `master`。
3. 当前分支是默认分支、没有 GitHub remote，或 `git log <base>..<branch> --oneline` 为空时，停止并说明原因。

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
4. 把 PR 自身加入 Project，Status 置 `In review`：项目与字段配置取自目标仓库 `docs/agents/issue-tracker.md`，写前用 `gh project item-list` 读 item 现值、写后复核（纪律同 `github-project` 的规则）；配置缺失或写入失败时报告原因并跳过。之后报告 PR URL。

`gh` 未登录时提示用户运行 `gh auth login`；不要猜测或替代认证方式。

## 3. 评审

本轮会话已有同一分支、其后无新 commit 的评审结论则复用；否则以 `git merge-base <base> <branch>` 为固定点调用 `code-review` skill。

将安全漏洞、数据丢失或崩溃风险、规格缺失、范围蔓延和错误实现视为阻塞项。风格与可维护性建议不阻塞。

- 存在阻塞项：按来源列出阻塞项和非阻塞建议，停止等待修复。
- 评审执行失败：报告错误，询问用户是否跳过评审；只有明确同意才继续。
- 无阻塞项：报告评审结论。

## 4. 报告

报告：分支已推送、PR URL、评审结论、PR 的 Project 状态。CI 与可合并性在 `/merge-pr` 合并前预检；下一步提示用户运行 `/merge-pr`。

## 边界

| 情况 | 处理方式 |
|------|----------|
| 用户只要求创建 PR | 创建并报告 PR URL 后停止，不评审 |
| 评审发现阻塞项 | 停止等待修复；修复后重新提交、推送并重跑本 skill |
| `gh pr create` 失败 | 报告错误与原因，不做替代操作 |
