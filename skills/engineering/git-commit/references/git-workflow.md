# Git 工作流

本仓库的 commit message 使用中文，采用类 Conventional Commits 格式。

## 格式

```
<type>(<scope>): <description>
```

- `scope` 可选；涉及具体 skill 或模块时加上，例如 `(git-commit)`、`(dispatch)`。
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
- `feat(git-commit): support Kimi Code session tracking`
- `refactor(dispatch): 参考 implement 进一步压缩，71→52 行`
- `docs: 更新 AGENTS.md，添加技能安装和新增说明`

## 分支

默认在功能分支上提交，不在 `main` / `master` 上直接提交。默认分支只接受合并进来的改动。

- 从最新的默认分支切出：`git switch main && git pull && git switch -c <branch>`。
- 分支名 `<type>/<slug>`，`type` 与 commit 类型同词汇，`slug` 用小写英文与连字符：

  - `docs/ai-contribution`
  - `chore/repo-polish`
  - `fix/issue-40-filter-delete`

- 一个分支对应一个关注点；同一分支上的多个 commit 各自独立成篇（见下）。
- 已经在默认分支上提交、且尚未推送时，用 `git switch -c <branch>` 把提交带到新分支；已推送的公共历史不要改写。
- 提交完成后推送分支，由 `/open-pr` 开 PR；合并、关闭与删分支都在 PR 生命周期里处理。

## 拆分原则

一个 commit 只包含一个独立关注点。若改动跨越多个模块或意图，拆成多个 commit，各自拟定 message。
