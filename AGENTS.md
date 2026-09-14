# AGENTS.md

Skills 集中在 `skills/` 目录，按分组（engineering、productivity、in-progress）组织。每个 skill 一个目录，目录名即 skill 名；内部固定有 `SKILL.md`，补充材料（如 `DEEPENING.md`、`tests.md`）放在 skill 根目录，通过 markdown 链接引用。

安装：跑 `npx skills add cislunarspace/skills`，把 skill 软链到 `~/.claude/skills/`。链接是软链，`git pull` 自动同步。

新增 skill：在 `skills/<group>/<name>/` 下放 `SKILL.md`（写作规范见 `docs/skill-writing.md`，骨架模板在 `docs/templates/SKILL.md`），在 `.claude-plugin/marketplace.json` 对应分组的 `skills` 数组里加一行，重跑 `npx skills add cislunarspace/skills`。

## Agent skills

### Issue tracker

GitHub Issues, with external PRs also treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: read `CONTEXT.md` at the repo root and `docs/adr/` for architectural decisions. See `docs/agents/domain.md`。

### AI 贡献标记

AI 提交的 issue 和 PR 标题以 `[AI Generated]` 开头；AI 写的评论首行标明「由 AI 完成」还是「AI 辅助完成」。见 `docs/agents/ai-contribution.md`。

## 交流语言

始终使用中文与用户交流。代码、commit message、PR 描述等技术输出也用中文。

## 写作要求

所有面向人读的文本（注释、CONTEXT.md、ADR、issue 评论、PR 描述、agent brief、triage notes、Sphinx 文档、Agent 回复）应当：

- 准确、清楚、简洁；先理解材料，再提炼结论。
- 按逻辑组织，区分相近概念；不用空泛、夸大的修饰语。
- 面向实际读者，从已知事实推到陌生结论；用分析说服，不装腔或堆砌。

## 编码准则

- **先理解再改动**：完整阅读目标文件、相似实现和相关测试；不确定 API 或惯例时查源码或文档，不猜。
- **明确目标与决策**：需求或验收条件不明确时先澄清；架构选择、假设和关键取舍要说明。
- **保持简单**：只实现当前需求。复用已有模式；不为单一用例过早抽象、配置化或引入依赖。
- **精准修改**：只改与任务直接相关的代码，贴合既有风格；删掉本次修改产生的废弃代码，不重格式化无关内容。
- **完整迁移**：变更接口或行为时更新所有调用方、测试和文档；不保留无需求的兼容层。
- **按根因修复**：先复现并读完整错误信息；一次处理一个原因，不用吞异常或特判掩盖问题。
- **验证行为**：按影响范围运行相关检查；测试可观察行为、边界和错误路径，不测试实现细节。无法测试时说明原因并做可行的烟雾验证。
- **审慎依赖**：优先现有依赖和标准库；新增依赖前确认必要性、维护状态和成本，并说明理由。
- **清楚沟通**：说明做了什么、为什么、验证结果和已知风险；对不确定性给出具体事实，提交信息描述实际改动。
