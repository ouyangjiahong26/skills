# Issue tracker: 本地 Markdown

本仓库的 issue 和规格作为 markdown 文件存放在 `.scratch/` 中。

## 约定

- 一个功能一个目录：`.scratch/<feature-slug>/`
- 规格是 `.scratch/<feature-slug>/spec.md`
- 实现 issue 为每工单一文件，放在 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，绝非单个合并的工单文件
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论和对话记录追加到文件底部 `## Comments` 标题下
- **AI 贡献标记**：AI 提交的 issue 与 PR 标题以 `[AI Generated][<类型>]` 开头（类型是大写标签，如 `[FIX]`、`[DOCS]`）；AI 写的评论首行用 `> **[AI Generated]** 本评论由 AI 完成。` 或 `> **[AI Assisted]** 本评论由 AI 辅助完成。`

## 当技能说"发布到 issue tracker"时

在 `.scratch/<feature-slug>/` 下创建新文件（必要时创建目录）。

## 当技能说"获取相关工单"时

读取引用路径处的文件。用户通常会直接传路径或 issue 编号。
