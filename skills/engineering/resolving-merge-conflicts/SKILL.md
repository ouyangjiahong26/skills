---
name: resolving-merge-conflicts
description: 当需要解决进行中的 git merge / rebase 冲突时使用。
---

1. 看清当前状态。检查 merge / rebase 进度、git 历史、冲突文件。

2. 找原始资料。深入理解每处改动为什么这么改，原始意图是什么。读 commit message，查 PR，查原始 issue / ticket。

3. 逐 hunk 解决。能同时保留两边意图的，就两边都保留。不可调和时，选符合本次合并既定目标的那一边，并记下取舍。不要发明新行为。冲突永远要解决，绝不 `--abort`。

4. 找到项目的自动化检查并逐个运行：通常先 typecheck，再测试，最后格式化。把合并弄坏的地方修好。

5. 收尾 merge / rebase：暂存全部改动并提交。处于 rebase 中时，继续推进直到所有 commit 都 rebase 完。
