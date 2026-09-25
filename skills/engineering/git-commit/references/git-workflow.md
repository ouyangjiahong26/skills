# Git 工作流（缺省约定）

缺省的提交与分支约定。目标仓库有自己的约定（`CONTRIBUTING.md`、`AGENTS.md`、`docs/` 中的提交与分支规则）时以目标仓库为准，本文件只在目标仓库没有约定时使用。

## Commit message 格式

类 Conventional Commits，描述用中文：

```
<type>(<scope>): <description>
```

- `scope` 可选；涉及具体 skill 或模块时加上，例如 `(git-commit)`、`(open-pr)`。
- `description` 用中文，句末不加句号。
- 标题尽量一行；需要补充说明时，空一行再写 body。

## 类型

| 类型 | 用途 |
|------|------|
| feat | 新功能、新 skill |
| fix | 修复 bug |
| docs | 文档、注释、写作标准 |
| refactor | 不改变行为的结构调整 |
| test | 测试相关 |
| chore | 构建、脚本、依赖等杂项 |
| style | 不影响语义的格式调整 |

## 示例

- `docs(git-commit): 重写工作流说明并汉化脚本注释`
- `feat(open-pr): PR 入板并自行完成 Project 状态迁移`
- `fix(setup-pi): piw-clean 按 patch-id 判断分支是否已合并`
- `docs: 明确 AI 标记只加标题，squash 合并须显式指定提交标题`

## 分支

默认在功能分支上提交，不在默认分支（`main` / `master`）上直接提交；默认分支只接受合并进来的改动。

- 从最新的默认分支切出：`git switch <默认分支> && git pull && git switch -c <branch>`。
- 分支名 `<type>/<slug>`，`type` 与 commit 类型同词汇，`slug` 用小写英文与连字符：
  - `docs/ai-contribution`
  - `chore/repo-polish`
  - `fix/issue-40-filter-delete`
- 一个分支对应一个关注点；同一分支上的多个 commit 各自独立成篇（见拆分原则）。
- 已经在默认分支上提交、且尚未推送时，用 `git switch -c <branch>` 把提交带到新分支；已推送的公共历史不要改写。
- 提交后由 `/open-pr` 推送分支并开 PR，由 `/merge-pr` 合并与清理；提交环节不推送、不合并。

## 拆分原则

一个 commit 只包含一个独立关注点。若改动跨越多个模块或意图，拆成多个 commit，各自拟定 message。
