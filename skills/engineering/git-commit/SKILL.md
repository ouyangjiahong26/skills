---
name: git-commit
description: 只提交本会话改动的文件。
disable-model-invocation: true
---

只提交本会话改动的文件。改动来源以会话记录为准：范围取自本会话的 `Write`、`Edit` 调用，git 命令只用来核对与执行。

## 流程

### 1. 检查

1. 从对话上下文列出本会话修改或新建的仓库文件（会话文件）。
2. 运行 `git worktree list` 与 `git rev-parse --abbrev-ref HEAD`，记录当前所在 worktree 与分支。会话文件路径不在当前 cwd 所在 worktree 内（典型：误指向主仓库目录）时，停止并说明：提交将落到错误分支。
3. 运行 `git status --porcelain` 列出全部改动（未跟踪、已暂存、未暂存都在内），与会话文件对照：
   - 改动不在会话文件中 → 会话外改动，单列出来；
   - 会话文件未出现在改动中 → 实际未改动，剔除并说明。
4. 运行 `git diff --stat` 与 `git diff -- <会话文件>` 确认每项改动都应提交；新建的未跟踪文件直接读内容确认。
5. 确定提交与分支约定：目标仓库有自己的约定（`CONTRIBUTING.md`、`AGENTS.md`、`docs/` 中的提交与分支规则）时以它为准，没有时用 `references/git-workflow.md` 作缺省模板。据此起草 commit message；当前分支是默认分支时，按约定的命名规则确定功能分支名。
6. 从对话上下文识别关联 issue（`#N` 或 issue 链接）。

### 2. 确认并提交

1. 展示会话文件、会话外改动、改动摘要、当前分支、拟建的分支名和拟议 commit message。
2. 会话外改动存在时，询问是否纳入；默认不纳入。
3. 等用户明确确认 message、文件范围和分支名后执行提交。
4. 仍在默认分支上时先切出功能分支：`git switch -c <branch>`。
5. 用明确路径暂存并提交（不用 `git add -A` / `git add .`）：

```bash
git add <file1> <file2> ...
git commit -m "<标题>" -m "<正文>"   # 正文可省
```

### 3. 验证

运行：

```bash
git status -- <会话文件>
git log --oneline -3
git branch --show-current
```

确认已提交的会话文件不再有未提交改动，且提交落在第 1 步确定的功能分支上、不在默认分支。

### 4. 关联 Issue

提交时只在 commit message 中保留准确的关联引用（如 `Fixes #123` 或 `Related to #123`，按用户意图选择）。`git-commit` 不关闭 Issue、不改 GitHub Project：这些在 PR 生命周期中由 `/open-pr`（PR 入板置 `In review`）与 `/merge-pr`（合并后置 `Done` 并关闭 Issue）处理。

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| 会话文件为空 | 不提交，告知用户 |
| 改动含未解决的合并冲突 | 不提交，先解决冲突 |
| diff 与本会话目标不符 | 不提交，说明差异并等待决定 |
| 超过 20 个文件或含多个独立关注点 | 按约定的拆分原则建议拆成多个 commit，等待用户决定 |
