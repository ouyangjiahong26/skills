---
name: github-project
description: 管理 Issue 与 PR 在 GitHub Project 中的加入、查询、状态迁移和字段设置。用户要求把 Issue 或 PR 加入看板、移动状态或同步 Project 时手动运行。
argument-hint: "[#issue|#pr|ready|in-progress|in-review|done]"
disable-model-invocation: true
---

# GitHub Project

按当前仓库 `docs/agents/issue-tracker.md` 的“GitHub Project”节操作。该节不存在、标为“否”或缺少所需的字段或选项 ID 时停止，提示用户跑 `/setup-ouyangjiahong-skills`，不猜 Project、字段或选项 ID。

## 规则

- Project Status 是工作状态。label 只表达分类、领域或分诊角色。
- Issue 与 PR 都应加入 Project。同一编号可能对应 Issue 或 PR，先用 `gh pr view <n>` 确认，失败再用 `gh issue view <n>`。
- 所有写操作前先读取 Project item，避免重复添加或覆盖未知字段。
- 只在迁移到 `Done`（原因 `Completed`）或 `No action`（原因 `Not planned`）时关闭 Issue，其他迁移不关闭。`Done` 只用于 PR 已合并且行为已验证的工作。
- PR 关闭但未合并时，不自动设为 `No action`。

## 常用流程

1. 读取仓库配置和目标 Issue/PR。
2. 用反向索引查询确认是否已入板并读 item 现值（PR 把 `issue` 换成 `pullRequest`）。单条查询只花十几个点数，一次全板 `item-list --format json` 要花数百到数千点数，判断单个条目一律用前者：

   ```bash
   gh api graphql -f owner=<owner> -f repo=<repo> -F num=<n> -f query='
   query($owner:String!,$repo:String!,$num:Int!){
     repository(owner:$owner,name:$repo){
       issue(number:$num){
         projectItems(first: 20){
           nodes{
             id isArchived
             project{ number title }
             fieldValues(first: 20){
               nodes{
                 __typename
                 ... on ProjectV2ItemFieldSingleSelectValue{ name field{ ... on ProjectV2SingleSelectField{ name } } }
                 ... on ProjectV2ItemFieldDateValue{ date field{ ... on ProjectV2Field{ name } } }
                 ... on ProjectV2ItemFieldTextValue{ text field{ ... on ProjectV2Field{ name } } }
               }
             }
           }
         }
       }
     }
   }'
   ```

   结果含目标 Project 时取该 item 的 `id` 与字段现值，跳到第 4 步。
3. 不在 Project 时加入：`gh project item-add <number> --owner <owner> --url <issue-or-pr-url>`，随后用第 2 步的查询验证。反向索引已含该 item 即成功。此时若 `gh project item-list` 查不到，是 GitHub Project 正向索引的同步延迟：条目实际存在，看板通常 90 分钟内自行恢复。报告该状态即可，不重复添加、不删除重建。
4. 用配置中的 ID 写字段：`gh project item-edit --id <item-id> --project-id <project-id> --field-id <field-id> --single-select-option-id <option-id>`（日期字段用 `--date`）。
5. 再次用第 2 步的查询确认目标 item、Status 和其他字段已更新。

## 配额与限流

- GraphQL 主限额 5000 点/小时。全板 `item-list --format json` 一次消耗数百到数千点数，只在批量迁移确实需要全板视图时使用，用前先查 `gh api rate_limit --jq .resources.graphql.remaining`。
- 连续 GraphQL 写操作（item-add、item-edit、item-delete）之间 `sleep 2`，不并发调用，避免触发 secondary rate limit。
- 报错 `API rate limit exceeded` 时读 `gh api rate_limit --jq '.resources.graphql.reset'`（epoch 秒），换算成等待时长写进报告，期间不再发 GraphQL 请求。REST 走独立的 core 配额，不受影响，可继续用 REST 完成其余工作。
- secondary rate limit 报错时等待 60 秒后重试，一次任务内重试不超过一次。

## 状态迁移

- 新 Issue：`Inbox`
- 分诊确认但未排期：`Backlog`
- 已排期可开始：`Ready`
- 开始实现：`In progress`
- 创建 PR：`In review`
- PR 合并并验证完成：`Done`。有相关 Issue 时关闭 Issue，原因 `Completed`。无相关 Issue 时只迁移 PR 项。
- 明确拒绝：`No action`，随后关闭 Issue，原因 `Not planned`
- 重开 Issue：`Inbox`

需要设置 `Priority` 或 `Start Date` 时，沿用同一 `item-edit` 流程，并只使用仓库配置声明的字段和选项。
