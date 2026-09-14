# Issue tracker: GitLab

本仓库的 issue 和规格存放在 GitLab Issues 中。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述用 heredoc。传 `--description -` 打开编辑器。
- **AI 贡献标记**：AI 提交的 issue 与 PR 标题以 `[AI Generated]` 开头；AI 写的评论首行用 `> **[AI Generated]** 本评论由 AI 完成。` 或 `> **[AI Assisted]** 本评论由 AI 辅助完成。`
- **读取 issue**：`glab issue view <number> --comments`。用 `-F json` 获取机器可读输出。
- **列出 issue**：`glab issue list -F json`，按需加 `--label` 过滤。
- **评论 issue**：`glab issue note <number> --message "..."`。GitLab 把评论叫作"note"。
- **添加 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签用逗号分隔或重复该 flag。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，所以先用 `glab issue note <number> --message "..."` 发说明，再关闭。
- **Merge request**：GitLab 把 PR 叫作"merge request"。用 `glab mr create`、`glab mr view`、`glab mr note` 等，形状与 `gh pr ...` 相同，只是 `mr` 替代 `pr`，`note`/`--message` 替代 `comment`/`--body`。

从 `git remote -v` 推导仓库，`glab` 在 clone 内运行时自动识别。

## Merge request 作为分诊渠道

**MR 作为请求渠道：否。** _（如果本仓库将外部 MR 视为功能请求，改为 `是`；`/triage` 会读取此标记。）_

设为 `是` 时，MR 与 issue 走相同的标签和状态，使用 `glab mr` 等价命令：

- **读取 MR**：`glab mr view <number> --comments`，`glab mr diff <number>` 看 diff。
- **列出待分诊的外部 MR**：`glab mr list -F json`，只保留作者不是项目成员/所有者的（贡献者的 MR，而非维护者进行中的工作）。
- **评论 / 打标签 / 关闭**：`glab mr note`、`glab mr update --label`/`--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 和 MR 编号是分开的，所以 `#42` 一旦知道指的是哪个渠道就是明确的。

## 当技能说"发布到 issue tracker"时

创建一个 GitLab issue。

## 当技能说"获取相关工单"时

运行 `glab issue view <number> --comments`。

## Wayfinding 操作

被 `/wayfinder` 使用。**地图**是一个 issue，其下挂**子** issue 作为工单。

- **地图**：一个带 `wayfinder:map` 标签的 issue，承载 Notes / Decisions-so-far / Fog 正文。`glab issue create --label wayfinder:map`。（在有原生 epic 的 GitLab 套餐中，可以改用 epic 承载地图；但带标签的 issue 在所有套餐中都能用。）
- **子工单**：一个 issue，在描述顶部带 `Part of #<map>`，标签为 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。一旦被认领，工单指派给驱动的 dev。
- **阻塞**：GitLab 的**原生阻塞链接**：规范的、UI 可见的表示。用 `/blocked_by #<n>` 快捷操作添加，发为 note（`glab issue note <child> --message "/blocked_by #<blocker>"`）。原生阻塞链接是 Premium/Ultimate 功能；在免费版（或不可用的地方）回退到描述顶部的 `Blocked by: #<n>, #<n>` 行。当所有阻塞方都关闭时，工单解除阻塞。
- **前沿查询**：`glab issue list -F json` 限定到地图的子工单，丢弃任何有未关闭阻塞方的（一条指向未关闭 issue 的原生 `blocked_by` 链接，用 `glab api projects/:id/issues/:iid/links` 查，或 `Blocked by` 行中的未关闭 issue），或有 assignee 的；按地图中的顺序，第一个胜出。
- **认领**：`glab issue update <n> --assignee @me`：会话的第一次写操作。
- **解决**：`glab issue note <n> --message "<answer>"`，然后 `glab issue close <n>`，然后在地图的 Decisions-so-far 中追加一条上下文指针（gist + 链接）。
