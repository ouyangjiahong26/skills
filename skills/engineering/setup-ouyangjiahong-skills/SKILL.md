---
name: setup-ouyangjiahong-skills
description: 初始化仓库的写作标准与工程技能配置：把写作要求、编码准则注入 AGENTS.md 或 CLAUDE.md，并配置 issue tracker、分诊标签和领域文档。首次配置仓库时手动运行。
disable-model-invocation: true
---

为当前仓库做两件事：注入写作标准，再建立工程技能的 harness 无关配置。只做其中一件时，执行对应小节即可。

目标文件二选一：`AGENTS.md`（默认）或 `CLAUDE.md`；两件事写同一个文件，先定下来再动手。

## 1. 注入写作标准

1. 确认目标目录与目标文件：
   - 目录：默认当前工作目录；目标不是仓库根目录时，传入明确路径。
   - 文件：用户已指明记录到 `CLAUDE.md` 时遵从；未指明时使用默认 `AGENTS.md`，无需追问。
2. 运行一次：

   ```bash
   # 默认：只同步 AGENTS.md
   node "{{SKILL_DIR}}/sync.js"

   # 同步 CLAUDE.md（--file 可简写为 -f）
   node "{{SKILL_DIR}}/sync.js" --file CLAUDE.md

   # 指定目录
   node "{{SKILL_DIR}}/sync.js" "/path/to/repo" --file CLAUDE.md
   ```

   `{{SKILL_DIR}}` 是 skill 所在目录的绝对路径，由 harness 替换。
3. 以退出码判断结果：退出码 `0` 表示同步并验证成功；非 `0` 时报告完整错误并停止。
4. 成功后对本次同步的文件执行 `git diff`（如 `git diff -- AGENTS.md`），向用户说明新增、替换或保留的内容。

脚本已经包揽文件读取、节切分、写入、行尾归一化和一致性验证。不要再手动编辑同一批文件，也不要用其他脚本重复实现这些步骤。

完成条件：脚本退出码为 `0`；每个选中的目标文件存在，首行为对应的 `# AGENTS.md` 或 `# CLAUDE.md`，包含 `## 写作要求`、`## 编码准则`，两节内容分别与 `references/standards.md` 逐字一致，源文件与目标文件均为 LF 行尾，其他已有章节保留。

## 2. 探索

读取，不要假设：

- `git remote -v` 和 `.git/config`，判断 GitHub、GitLab 或其他托管方式。
- 根目录 `CLAUDE.md`、`AGENTS.md`，以及其中的 `## Agent skills`。
- `CONTEXT.md`、`CONTEXT-MAP.md`、`docs/adr/`、`*/*/docs/adr/`、`docs/agents/`、`.scratch/`。
- `triage` skill 是否可用。
- `pnpm-workspace.yaml` 与 `package.json` 的 `workspaces`，判断是否为明确的大型 monorepo。

## 3. 决策

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

## 4. 确认写入

只展示将写入或更新的文件、使用的种子模板及对已有内容的保留、替换或追加方式。不要输出模板全文。

种子模板在 `references/`：

| 目标文件 | 种子模板 |
| --- | --- |
| `docs/agents/issue-tracker.md` | `issue-tracker-github.md`、`issue-tracker-gitlab.md`、`issue-tracker-local.md` 或从零写 |
| `docs/agents/triage-labels.md` | `triage-labels.md` |
| `docs/agents/domain.md` | `domain.md` |

得到确认后才写入。

## 5. 写入与结束

- 优先编辑 `AGENTS.md`，否则编辑 `CLAUDE.md`；两者都不存在时询问用户。不要额外创建另一份。
- 已有 `## Agent skills` 时在其中更新，避免重复。
- 完成后说明哪些工程技能会读取 `docs/agents/*.md`。

## 维护

- 只编辑 `references/standards.md` 更新规范正文；不要直接修改目标文件中的同步章节。
- 脚本只管理 `references/standards.md` 里现存的节；从标准中删掉的节（如早期的「交流语言」）不会从目标文件移除，需要时手动删除该节。
- 规范同步成功后，重启会话，让新规范进入上下文。
