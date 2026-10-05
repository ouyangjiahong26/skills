# 外部 skill 的 Project 同步纪律

`triage`、`open-pr`、`merge-pr` 需要把 Issue 或 PR 写入 GitHub Project 时按本文件执行，不各自维护流程。

## 配置来源

目标仓库 `docs/agents/issue-tracker.md` 的 GitHub Project 节：项目、字段与选项 ID 全部取自那里，不猜测。状态到选项的映射见本 skill 的状态迁移节。

## 纪律

1. 写操作前先用 `gh project item-list <number> --owner <owner> --format json` 读 item 现值，避免重复添加或覆盖未知字段。
2. item 不存在先 `gh project item-add` 加入，再按配置 ID 写 Status 字段。
3. 写操作后重新查询，确认 Status 与其他字段已更新。

## 失败处理

| 情况 | 处理方式 |
|------|----------|
| 配置节不存在或缺字段 ID | 报告原因，提示跑 `/setup-ouyangjiahong-skills`，跳过 Project 写入 |
| 配置节标为否 | 不做 Project 写入 |
| 写入失败 | 报告原因并跳过，不阻塞主流程。需要人工修复时提示跑 `/github-project` |
