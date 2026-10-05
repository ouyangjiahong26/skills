# Changelog

本项目的所有显著变更都记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本管理遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增

- `github-governance`：仓库治理的审计与修复合一，`github-repo-audit` 与 `github-gov-fix` 合并为单条入口。
- `setup-pi`：pi harness 的引导流程；`piw` / `piw-clean` 提供 POSIX 与 Windows PowerShell 两版。
- `merge-pr`：自 `open-pr` 拆出的预检、合并与清理；`open-pr` 只留推送、建 PR 与评审。
- `github-project`：GitHub Project 的状态迁移，`triage`、`open-pr`、`merge-pr` 接入。
- 对齐上游 [mattpocock/skills](https://github.com/mattpocock/skills) 的工程技能：`code-review`、`triage`、`diagnosing-bugs`、`resolving-merge-conflicts` 等。
- Node 工具链与测试：`scripts/` 下的技能枚举、链接与检查脚本，`npm test` 聚合运行；仓库 CI 在 PR 上跑 `check-skills.js`。

### 变更

- 技能重组为 engineering / productivity 两组，分组信息由 `.claude-plugin/marketplace.json` 承载。
- `sync-writing-standards`：注入改为按 `## 节` 整节替换，`--file` 选择 `AGENTS.md` 或 `CLAUDE.md`；脚本改用 Node 并补单元测试。
- `open-pr` 与 `merge-pr` 支持 GitHub 栈式 PR：合并前预检可合并性与 CI，确认 `MERGED` 后才删远端分支。
- 全部 skill 文案按写作要求润色，术语统一。
- `setup-ouyangjiahong-skills` 合并 `sync-writing-standards` 的注入流程：一个入口先注入写作要求与编码准则，再配置 issue tracker、分诊标签与领域文档。
- 写作要求新增「单位用国标」一条：带单位的数值用 GB 3100～3102 的法定计量单位。
- `docs/agents/issue-tracker.md` 的种子模板吸收 issue / PR / 评论的格式约定：提案先行、issue 三段、PR 五段与评论规范。

### 移除

- 试验性技能与流程：research 组、Loop 套件、subagent 方案、`setup-claude-code` 等。技能集收敛为 engineering / productivity 两组。
- 写作标准的「交流语言」一节，以及 `sync-writing-standards` skill（注入流程并入 `setup-ouyangjiahong-skills`）。
- `implement`、`implement-spec`、`tdd`、`codebase-design`、`to-spec`：非日常调用的上游实现类技能，连同引用它们的 README 日常流程与 AI 标记清单一并清理。
- `github-repo-audit` 与 `github-gov-fix` 合并为 `github-governance`，不再单列。

### 修复

- `setup-pi`：`piw-clean` 改按 patch-id 判断分支是否已合并，squash 合并的分支不再残留；worktree 目录被占用或加锁而删不净时不再静默留空壳。
- `git-commit`：新增分支与 worktree 归属检查，避免提交落到错误分支。
- `open-pr` / `merge-pr`：worktree 场景不再带 `--delete-branch`（拆分后该逻辑落在 `merge-pr`），避免切分支失败、远端分支删不掉。

## [0.2.0] - 2026-07-13

首个带标签的版本。

### 新增

- 面向 AI 编码 agent 的技能集：`git-commit`、`sync-writing-standards`、`dispatch`、`improve-codebase-architecture`、`write-skill`、`handoff`、`pdf-with-mineru` 等工程技能。
- research 组 8 个技能：从 `research-planning` 到 `research-ethics`，覆盖选题、检索、分析、成文与呈现。
- 写作标准（交流语言、写作要求、编码准则）及其注入流程；写作要求提炼自《毛泽东年谱》中关于写作的论述。

### 变更

- 技能按组组织，分组信息由 `.claude-plugin/marketplace.json` 管理并据此安装。

[Unreleased]: https://github.com/ouyangjiahong26/skills/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ouyangjiahong26/skills/releases/tag/v0.2.0
