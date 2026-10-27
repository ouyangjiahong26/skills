# 外部 skill 的 Project 同步纪律

`triage`、`open-pr`、`merge-pr` 需要把 Issue 或 PR 写入 GitHub Project 时按本文件执行，不各自维护流程。

## 配置来源

目标仓库 `docs/agents/issue-tracker.md` 的 GitHub Project 节：项目、字段与选项 ID 全部取自那里，不猜测。状态与选项的映射见本 skill 的“状态迁移”节。

## 纪律

1. 写操作前用反向索引查询读 item 现值（查询语句见 `github-project` skill 常用流程第 2 步），避免重复添加或覆盖未知字段。判断单个条目不用全板 `item-list`，它一次消耗数百到数千 GraphQL 点数。
2. item 不存在先 `gh project item-add` 加入，再用同一反向索引查询验证条目已存在。
3. 写操作后重新查询，确认 Status 与其他字段已更新。
4. 连续 GraphQL 写操作之间 `sleep 2`，不并发调用。

## 失败处理

| 情况 | 处理方式 |
|------|----------|
| 配置节不存在或缺字段 ID | 报告原因，提示用户跑 `/setup-ouyangjiahong-skills`，跳过 Project 写入 |
| 配置节标为“否” | 不做 Project 写入 |
| item-add 成功但 item-list 查不到 | 反向索引能确认条目已存在时，属 GitHub Project 正向索引同步延迟，报告后停止。不重复添加、不删除重建，看板通常 90 分钟内自行恢复 |
| GraphQL 限流（API rate limit exceeded 或 secondary rate limit） | 读 `gh api rate_limit --jq '.resources.graphql.reset'` 换算等待时长并报告。期间 REST 操作可继续。一次任务内重试不超过一次 |
| 写入失败 | 报告原因并跳过，不阻塞主流程。需要人工修复时提示用户跑 `/github-project` |
