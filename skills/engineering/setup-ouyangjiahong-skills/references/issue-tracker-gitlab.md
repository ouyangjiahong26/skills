# Issue tracker: GitLab

本仓库的 issue 和任务要求存放在 GitLab Issues 中。所有操作使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- 创建 issue：`glab issue create --title "..." --description "..."`。多行描述用 heredoc。传 `--description -` 打开编辑器。
- AI 贡献标记：AI 提交的 issue 与 PR 标题以 `[AI Generated][<类型>]` 开头（类型是大写标签，如 `[FIX]`、`[DOCS]`）。AI 写的评论首行用 `> **[AI Generated]** 本评论由 AI 完成。` 或 `> **[AI Assisted]** 本评论由 AI 辅助完成。`
- 读取 issue：`glab issue view <number> --comments`。用 `-F json` 获取机器可读输出。
- 列出 issue：`glab issue list -F json`，按需加 `--label` 过滤。
- 评论 issue：`glab issue note <number> --message "..."`。GitLab 把评论叫作“note”。
- 添加 / 移除标签：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签用逗号分隔或重复该 flag。
- 关闭：`glab issue close <number>`。`glab issue close` 不接受关闭评论，所以先用 `glab issue note <number> --message "..."` 发说明，再关闭。
- Merge request：GitLab 把 PR 叫作“merge request”。用 `glab mr create`、`glab mr view`、`glab mr note` 等，形状与 `gh pr ...` 相同，只是 `mr` 替代 `pr`，`note`/`--message` 替代 `comment`/`--body`。

从 `git remote -v` 推导仓库，`glab` 在 clone 内运行时自动识别。

## Merge request 作为分诊渠道

MR 作为请求渠道：否。 _（如果本仓库将外部 MR 视为功能请求，改为 `是`。`/triage` 会读取此标记。）_

设为 `是` 时，MR 与 issue 走相同的标签和状态，使用 `glab mr` 等价命令：

- 读取 MR：`glab mr view <number> --comments`，`glab mr diff <number>` 看 diff。
- 列出待分诊的外部 MR：`glab mr list -F json`，只保留作者不是项目成员/所有者的（贡献者的 MR，而非维护者进行中的工作）。
- 评论 / 打标签 / 关闭：`glab mr note`、`glab mr update --label`/`--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 的 issue 和 MR 编号是分开的，所以 `#42` 一旦知道指的是哪个渠道就是明确的。

## 当技能说“发布到 issue tracker”时

创建一个 GitLab issue。

## 当技能说“获取相关工单”时

运行 `glab issue view <number> --comments`。
