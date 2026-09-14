---
name: resolving-merge-conflicts
description: 当需要解决进行中的 git merge / rebase 冲突时使用。
---

1. **看清当前状态**。检查 merge / rebase 进度、git 历史、冲突文件。

2. **找原始资料**。深入理解每处改动为什么这么改、原始意图是什么。读 commit message，查 PR，查原始 issue / ticket。

3. **逐 hunk 解决。** 能同时保留两边意图就保留；不可调和时，选符合本次合并既定目标的那一边，并记下取舍。**不要**发明新行为。永远解决；绝不 `--abort`。

4. 找到项目的**自动化检查**并跑：通常先是 typecheck，然后测试，然后格式化。修掉合并弄坏的任何东西。

5. **收尾 merge / rebase。** stage 全部改动并提交。rebase 中则继续推进，直到所有 commit 都 rebase 完。
