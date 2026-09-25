# Skills

[![skills.sh](https://skills.sh/b/ouyangjiahong26/skills)](https://skills.sh/ouyangjiahong26/skills)

一套给 AI 编码 agent 用的 skills，小、可组合，来自日常工程习惯。共 20 个，大部分对齐 [mattpocock/skills](https://github.com/mattpocock/skills) 并翻译成中文，覆盖从规格讨论到 PR 合并的日常循环。

## 写作要求的来历

[`sync-writing-standards`](./skills/engineering/sync-writing-standards/SKILL.md) 注入的"写作要求"一节，提炼自《毛泽东年谱》中毛泽东关于写作的论述。比如 1955 年他提醒："关于写文章，请注意不要用过于夸大的修饰词，反而减损了力量……废话应当尽量除去。"又如他评价文件的标准：逻辑性、准确性、鲜明性，要使人读得下去、读后脑中有印象。

这个仓库的文档，包括这份 README，也按这些要求写。

## 快速开始

```bash
npx skills@latest add ouyangjiahong26/skills
```

CLI 读取 `.claude-plugin/marketplace.json`，安装时提示选择分组（Engineering / Productivity / 全部）和要安装到的 agent。skill 以软链方式安装，`git pull` 即同步。安装后在 agent 里直接用 `/grill-with-docs`、`/code-review`、`/git-commit`、`/open-pr`、`/merge-pr` 等命令。

### pi（pi coding agent）

在 pi 会话里跑 `/setup-pi` 可按需配置 `piw` / `piw-clean` worktree 命令：`piw <分支名>` 新建分支和 worktree 后直接进入 pi，`piw-clean` 清理 worktree、prune、删除分支并回到主仓库。

## 日常使用

一条从仓库初始化到 PR 合并的完整路径：

1. 拿到新仓库，先跑 [`/setup-ouyangjiahong-skills`](./skills/engineering/setup-ouyangjiahong-skills/SKILL.md)，配置 issue tracker、分诊标签和领域文档；再跑 [`/sync-writing-standards`](./skills/engineering/sync-writing-standards/SKILL.md)，把交流语言、写作要求和编码准则同步到 `AGENTS.md`，后续会话自动遵守。
2. 做事之前讨论计划，配 [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md) 追问打磨，把术语和架构决定写进 `CONTEXT.md` 和 ADR；讨论成熟后用 [`/to-spec`](./skills/engineering/to-spec/SKILL.md) 固化成 issue。
3. 干活时用 [`/implement`](./skills/engineering/implement/SKILL.md) 或 [`/tdd`](./skills/engineering/tdd/SKILL.md) 推进实现；卡在难调的 bug 上时换 [`/diagnosing-bugs`](./skills/engineering/diagnosing-bugs/SKILL.md)。
4. 干完活用 [`/code-review`](./skills/engineering/code-review/SKILL.md) 审查改动，[`/git-commit`](./skills/engineering/git-commit/SKILL.md) 提交，[`/open-pr`](./skills/productivity/open-pr/SKILL.md) 开 PR 并评审，[`/merge-pr`](./skills/productivity/merge-pr/SKILL.md) 合并并清理。

## GitHub 管理

AI 提交的 issue 和 PR，标题以 `[AI Generated][<类型>]` 开头；AI 写的评论，首行标明由 AI 完成还是 AI 辅助完成。维护者扫一眼就知道该按什么信任级别去读，也清楚责任落在谁身上。约定见 [`docs/agents/ai-contribution.md`](./docs/agents/ai-contribution.md)。

## Skill 列表

### Engineering

| Skill | 作用 | 触发词 |
|---|---|---|
| [setup-ouyangjiahong-skills](./skills/engineering/setup-ouyangjiahong-skills/SKILL.md) | 配置 issue tracker、分诊标签、领域文档 | `setup-ouyangjiahong-skills` |
| [setup-pi](./skills/engineering/setup-pi/SKILL.md) | 配置 pi 的 piw / piw-clean worktree 命令 | `setup-pi` |
| [sync-writing-standards](./skills/engineering/sync-writing-standards/SKILL.md) | 把交流语言、写作要求、编码准则注入 `AGENTS.md` | `sync-writing-standards` |
| [grill-with-docs](./skills/engineering/grill-with-docs/SKILL.md) | 追问打磨计划，同时维护领域文档 | `grill-with-docs` |
| [domain-modeling](./skills/engineering/domain-modeling/SKILL.md) | 构建和打磨领域模型，维护 `CONTEXT.md` 与 ADR | `domain-modeling` |
| [codebase-design](./skills/engineering/codebase-design/SKILL.md) | "深模块"共享术语：设计接口、找深化机会、定接口位置 | `codebase-design`、`深模块` |
| [to-spec](./skills/engineering/to-spec/SKILL.md) | 把当前对话综合成规格，发布到 issue tracker | `to-spec` |
| [implement](./skills/engineering/implement/SKILL.md) | 基于 spec 或 ticket 执行一段实现，配 TDD 和 code-review | `implement`、`实现` |
| [implement-spec](./skills/engineering/implement-spec/SKILL.md) | 把规格和工单图在单分支上实现成一个 PR，并行子代理推进 | `implement-spec`、`实现规格` |
| [tdd](./skills/engineering/tdd/SKILL.md) | 测试驱动开发，红-绿循环 | `tdd`、`TDD`、`red-green` |
| [code-review](./skills/engineering/code-review/SKILL.md) | 两轴审查 diff：规范（编码准则）与规格（issue/spec） | `code-review`、`review since` |
| [diagnosing-bugs](./skills/engineering/diagnosing-bugs/SKILL.md) | 难调 bug 和性能回归的诊断流程 | `diagnose`、`debug` |
| [triage](./skills/engineering/triage/SKILL.md) | 把 issue/PR 推过分诊状态机，产出 agent 可认领的 brief | `triage`、`分诊` |
| [git-commit](./skills/engineering/git-commit/SKILL.md) | 只提交本会话改动的文件，检查分支归属，确认后提交 | `git-commit`、`提交` |
| [resolving-merge-conflicts](./skills/engineering/resolving-merge-conflicts/SKILL.md) | 解决进行中的 git merge/rebase 冲突 | `解决冲突`、`merge conflict` |

### Productivity

| Skill | 作用 | 触发词 |
|---|---|---|
| [grilling](./skills/productivity/grilling/SKILL.md) | 对计划或设计进行不懈质询（逐轮问完整条前沿） | `grill` |
| [handoff](./skills/productivity/handoff/SKILL.md) | 把当前会话压缩成交接文档，供下一个 agent 接手 | `handoff` |
| [github-project](./skills/productivity/github-project/SKILL.md) | 管理 GitHub Project 中 issue/PR 的加入、查询与状态迁移 | `github-project` |
| [open-pr](./skills/productivity/open-pr/SKILL.md) | 推送分支、创建 PR（AI 标记标题）、评审改动 | `open-pr`、`提 PR` |
| [merge-pr](./skills/productivity/merge-pr/SKILL.md) | 预检评审与 CI、合并 PR、清理分支与 worktree | `merge-pr`、`合并分支` |

## 相关项目

- **[mattpocock/skills](https://github.com/mattpocock/skills)**：本仓库软件工程 skill 的上游。软件工程部分的 skill 对齐该项目当前版本、翻译成中文；自创 skill（`sync-writing-standards`、`setup-ouyangjiahong-skills`、`setup-pi`、`git-commit`、`open-pr`、`merge-pr`、`github-project`）为本仓库独有。

## 目录结构

```
.
├── skills/
│   ├── engineering/            # 工程相关 skills
│   │   └── <name>/SKILL.md
│   └── productivity/           # 通用生产力 skills
├── .claude-plugin/
│   └── marketplace.json        # 分组清单（CLI 读取入口）
└── scripts/                    # 辅助脚本
```

## 新增 Skill

1. 在 `skills/<group>/<name>/` 下创建 `SKILL.md`（含 frontmatter：`name`、`description`）。写作规范见 [`docs/skill-writing.md`](./docs/skill-writing.md)，可从 [`docs/templates/SKILL.md`](./docs/templates/SKILL.md) 复制骨架起步
2. 在 `.claude-plugin/marketplace.json` 对应分组的 `skills` 数组里加一行（必须以 `./` 开头）
3. 重跑 `npx skills add ouyangjiahong26/skills`

## 测试

```bash
npm test
```

用 Node 内置的 `node:test` 跑 `skills/` 下所有 `.test.js`。改任何 skill 之前和之后都跑一遍。
