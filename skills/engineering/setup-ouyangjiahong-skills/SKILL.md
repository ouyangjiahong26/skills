---
name: setup-ouyangjiahong-skills
description: 初始化仓库的 issue tracker、分诊标签和领域文档。首次配置工程技能时手动运行。
disable-model-invocation: true
---

为当前仓库建立工程技能的 harness 无关配置（issue tracker、分诊标签、领域文档）。先读取现状，再逐项取得用户结论；只在用户确认后写入。

## 1. 探索

读取，不要假设：

- `git remote -v` 和 `.git/config`，判断 GitHub、GitLab 或其他托管方式。
- 根目录 `CLAUDE.md`、`AGENTS.md`，以及其中的 `## Agent skills`。
- `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/`、`*/*/docs/adr/`、`docs/agents/`、`.scratch/`。
- `triage` skill 是否可用。
- `pnpm-workspace.yaml` 与 `package.json` 的 `workspaces`，判断是否为明确的大型 monorepo。

## 2. 决策

先总结现状和缺口。按以下顺序逐项给出推荐，让用户接受、修改或跳过；每项结论确认后再进入下一项。

### A. Issue tracker

GitHub remote 默认 GitHub（`gh`），GitLab remote 默认 GitLab（`glab`），已采用 `.scratch/` 时默认本地 Markdown。其他 tracker 让用户说明工作流。

写入 `docs/agents/issue-tracker.md`。

选 GitHub 时接着问是否用 GitHub Project 管理工作状态（`/github-project`、`/triage`、`/open-pr`、`/merge-pr` 依赖它）。用时：

1. `gh project list --owner <owner>` 列出候选，让用户选定。
2. `gh project view <number> --owner <owner> --format json --jq .id` 取 Project ID；`gh project field-list <number> --owner <owner> --format json` 取 Status 等字段 ID 与选项 ID。
3. 按模板的“GitHub Project”节填表，标为“是”。Status 缺模板列出的某个选项时，报告缺口，不自行建选项。

`gh` 报缺 `project` 权限时，请用户跑 `gh auth refresh -s project`。不用 Project 时保留“否”。

### B. 分诊标签

只有 `triage` 可用时配置。默认保留：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`；用户拒绝默认值时，再收集覆盖项。

写入 `docs/agents/triage-labels.md`。

### C. 领域文档

默认单一上下文：根目录 `CONTEXT.md` 与 `docs/adr/`。只有发现明确 monorepo 信号时才讨论 `CONTEXT-MAP.md` 和多上下文布局。

写入 `docs/agents/domain.md`。

## 3. 确认写入

只展示将写入或更新的文件、使用的种子模板及对已有内容的保留、替换或追加方式。不要输出模板全文。

种子模板在 `references/`：

| 目标文件 | 种子模板 |
| --- | --- |
| `docs/agents/issue-tracker.md` | `issue-tracker-github.md`、`issue-tracker-gitlab.md`、`issue-tracker-local.md` 或从零写 |
| `docs/agents/triage-labels.md` | `triage-labels.md` |
| `docs/agents/domain.md` | `domain.md` |

得到确认后才写入。

## 4. 写入与结束

- 优先编辑 `AGENTS.md`，否则编辑 `CLAUDE.md`；两者都不存在时询问用户。不要额外创建另一份。
- 已有 `## Agent skills` 时在其中更新，避免重复。
- 完成后说明哪些工程技能会读取 `docs/agents/*.md`。
