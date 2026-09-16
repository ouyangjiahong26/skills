# AI 贡献标记

本仓库接受 AI 提交的 issue、PR 和评论，但要求来源一眼可辨：维护者决定要不要读、要不要复核之前，先看标记。

## 规则

| 产物 | 位置 | 标记 |
|---|---|---|
| Issue 标题 | 最开头 | `[AI Generated][<类型>]` |
| PR 标题 | 最开头 | `[AI Generated][<类型>]` |
| 评论 | 第一行 | `> **[AI Generated]** 本评论由 AI 完成。` |
| 评论 | 第一行 | `> **[AI Assisted]** 本评论由 AI 辅助完成。` |

标题写成 `[AI Generated][<类型>] <标题>`：标记在最前，紧跟方括号类型标签，再空一格写标题，如 `[AI Generated][FIX] 修正 piw-clean 的合并判断`。类型标签按改动性质取大写，取值同 [git-commit 的类型表](../../skills/engineering/git-commit/references/git-workflow.md)（`[FIX]`、`[DOCS]`、`[FEAT]`、`[REFACTOR]`、`[TEST]`、`[CHORE]`、`[STYLE]`）。标题已带标记的不再叠加。

两类评论的区别，在于人类是否动过内容本身：

- **由 AI 完成**：agent 独立写成，人类没改内容。分诊记录、agent brief、按规格实现的 PR 属此类。人类只点了同意、没改内容，仍算这一类。
- **AI 辅助完成**：agent 起草，人类做了实质决策或改写。人机来回打磨后落笔的规格属此类。

## 标记不转移责任

AI 产出的 issue 和 PR 由发起它的维护者负责：AI 说得对不对，仍由人核。复核过、改过的内容如实标成「AI 辅助完成」，不要一律推给 AI。

## 谁执行

`to-spec`、`triage`、`open-pr`、`implement-spec` 写 issue tracker 时按本约定加标记；`docs/agents/issue-tracker.md` 的约定里也记了这一条。
