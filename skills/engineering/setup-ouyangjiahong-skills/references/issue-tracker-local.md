# Issue tracker: 本地 Markdown

本仓库的 issue 和规格作为 markdown 文件存放在 `.scratch/` 中。

## 约定

- 一个功能一个目录：`.scratch/<feature-slug>/`
- 规格是 `.scratch/<feature-slug>/spec.md`
- 实现 issue 为每工单一文件，放在 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号，绝非单个合并的工单文件
- 分诊状态记录在每个 issue 文件顶部附近的 `Status:` 行（角色字符串见 `triage-labels.md`）
- 评论和对话记录追加到文件底部 `## Comments` 标题下

## 当技能说"发布到 issue tracker"时

在 `.scratch/<feature-slug>/` 下创建新文件（必要时创建目录）。

## 当技能说"获取相关工单"时

读取引用路径处的文件。用户通常会直接传路径或 issue 编号。

## Wayfinding 操作

被 `/wayfinder` 使用。**地图**是一个文件，每个工单一个**子**文件。

- **地图**：`.scratch/<effort>/map.md`，承载 Notes / Decisions-so-far / Fog 正文。
- **子工单**：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始编号，正文中放问题。`Type:` 行记录工单类型（`research`/`prototype`/`grilling`/`task`）；`Status:` 行记录 `claimed`/`resolved`。
- **阻塞**：顶部附近的 `Blocked by: NN, NN` 行。当它列出的每个文件都为 `resolved` 时，工单解除阻塞。
- **前沿**：扫描 `.scratch/<effort>/issues/`，找未关闭、未阻塞且未认领的文件；按编号，第一个胜出。
- **认领**：设 `Status: claimed`，在任何工作之前保存。
- **解决**：在 `## Answer` 标题下追加答案，设 `Status: resolved`，然后在 `map.md` 的 Decisions-so-far 中追加一条上下文指针（gist + 链接）。
