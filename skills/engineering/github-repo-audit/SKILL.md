---
name: github-repo-audit
description: 检查 GitHub 仓库配置完整度(治理文件、CI、release、分支保护、依赖更新),输出分级问题清单与修复建议。模型可调用时补触发:仓库体检、repo audit、检查仓库配置
argument-hint: "owner/repo 或 --org <owner>"
---

# github-repo-audit

运行只读审计脚本,对单个仓库或整个 owner 的非 fork 仓库输出分级问题清单,并按两个范本给出修复建议。

## 步骤

### 1. 确认凭据

运行 `gh auth status`,确认已登录且 `gh api` 可用;未登录则提示 `gh auth login` 后停止。

### 2. 运行审计脚本

单个仓库:`bash scripts/audit-repo.sh owner/repo [--strict]`;整个组织/账号:`bash scripts/audit-repo.sh --org <owner>`(自动遍历全部非 fork、非 archived 仓库)。

### 3. 解读输出表

每个仓库一张 `| 检查 | 结果 | 说明 |` 判定表,末行汇总 `owner/repo:🔴 n 🟡 n ⚪ n`。🔴 为治理缺口,🟡 为建议补齐,⚪ 为信息项。

### 4. 给修复建议

按两个范本给:
- 治理文件 / CI / 分支保护 → 照 `cislunarspace/CODE-core`;
- 发版工程 / AGENTS.md → 照 `ouyangjiahong26/altgo`。

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| gh 未登录 | 提示 `gh auth login` 后停止(exit 2) |
| 仓库不存在 / 404 | 报告并停止(exit 2) |
| fork 或 archived | 脚本自动跳过,在汇总中说明 |
| 无 admin 读不到保护配置 | 该项标"未知(无权限)",不算失败 |
| API 限流(HTTP 403/429 带 rate 提示) | 脚本 sleep 60 自动重试一次 |

## Checkpoint

只读审计无需确认,直接执行。若用户接着要求修复,按仓库 PR 流程(开分支 → PR → merge)另行执行,不直推默认分支。

## 输出

- 逐仓库问题表(检查项 / 级别 / 说明)
- 每仓库 🔴/🟡/⚪ 计数汇总
- 前 3 个优先修复项(🔴 优先,其次影响面大的 🟡)

## 完成条件

- 目标范围内每仓库都有逐项判定,无未处理异常。
