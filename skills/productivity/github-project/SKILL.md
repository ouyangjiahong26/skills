---
name: github-project
description: 管理 GitHub Project 中 Issue 与 PR 的加入、查询、状态和字段。用户要求把工单加入看板、移动状态或同步 Project 时手动运行。
argument-hint: "[#issue|#pr|ready|in-progress|in-review|done]"
disable-model-invocation: true
---

# GitHub Project

按当前仓库 `docs/agents/issue-tracker.md` 中的 Project 配置操作。没有该配置时停止，叫用户跑 `/setup-ouyangjiahong-skills`，不要猜 Project、字段或选项 ID。

## 规则

- Project Status 是工作状态；label 只表达分类、领域或分诊角色。
- Issue 与 PR 都应加入 Project；同一编号可能对应 Issue 或 PR，先用 `gh pr view <n>` 确认，失败再用 `gh issue view <n>`。
- 所有写操作前先读取 Project item，避免重复添加或覆盖未知字段。
- 不自动关闭 Issue；`Done` 只用于 PR 已合并且行为已验证的工作，关闭原因使用 `Completed`。
- PR 关闭但未合并时，不自动设为 `No action`。

## 常用流程

1. 读取仓库配置和目标 Issue/PR。
2. 用 `gh project item-list <number> --owner <owner> --format json` 查找已有 item。
3. 若不存在，用 `gh project item-add <number> --owner <owner> --url <issue-or-pr-url>` 加入项目。
4. 用配置中的 project ID、field ID 和 option ID 执行 `gh project item-edit`。
5. 再次查询确认目标 item、Status 和其他字段已更新。

## 状态迁移

- 新 Issue：`Inbox`
- 分诊确认但未排期：`Backlog`
- 已排期可开始：`Ready`
- 开始实现：`In progress`
- 创建 PR：`In review`
- PR 合并并验证完成：`Done`，随后关闭 Issue，原因 `Completed`
- 明确拒绝：`No action`，随后关闭 Issue，原因 `Not planned`
- 重开 Issue：`Inbox`

需要设置 `Priority` 或 `Start Date` 时，沿用同一 `item-edit` 流程，并只使用仓库配置声明的字段和选项。
