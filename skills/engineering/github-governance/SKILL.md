---
name: github-governance
description: 对 GitHub 仓库先做只读治理审计（治理文件、CI、release、分支保护、依赖更新），输出分级问题清单与修复建议，再按清单逐仓库补齐（文件类走 clone、分支、PR、CI 通过后 squash merge，保护/ruleset/安全报告等 API 类直调 gh api）。模型可调用时补触发：仓库体检、repo audit、检查仓库配置、修复仓库治理、补齐治理文件、governance fix
argument-hint: “owner/repo 或 --org <owner>”
---

# github-governance

分两阶段：先只读审计出分级清单，确认后逐仓库修复。文件类改动一律 clone 出分支、提 PR、CI 通过后 squash merge，绝不直推默认分支。保护 / ruleset / 安全报告等 API 级改动直接调 `gh api`，不进 PR。

## 阶段 1：审计（只读）

### 1.1 确认凭据

运行 `gh auth status`，确认已登录且 `gh api` 可用。未登录则提示 `gh auth login` 后停止。

### 1.2 运行审计脚本

单个仓库:`bash scripts/audit-repo.sh owner/repo [--strict]`。整个组织/账号:`bash scripts/audit-repo.sh --org <owner>`(自动遍历全部非 fork、非 archived 仓库)。

### 1.3 解读输出表

每个仓库一张 `| 检查 | 结果 | 说明 |` 判定表。结果列取值：`通过`、`严重`(治理缺口)、`建议`(建议补齐)、`信息`(信息项)、`跳过`(fork/archived)、`失败`(不可访问)。

### 1.4 给修复建议

按两个范本给:

- 治理文件 / CI / 分支保护：照 `cislunarspace/CODE-core`。
- 发版工程 / AGENTS.md：照 `ouyangjiahong26/altgo`。

## 阶段 2：修复

### 2.1 排修复顺序

按严重项优先、建议项次之排序。逐仓库列出改动清单(加哪些文件、改哪些 API),再动手。

### 2.2 通用 PR 流程(每个仓库相同)

```bash
gh repo clone <owner>/<repo> <workdir>/<repo> && cd <workdir>/<repo>
git checkout -b chore/gov-<日期>
# ...应用该仓库改动清单...
git add -A && git commit -m "chore: 补齐仓库治理文件"   # 新增 skill 用 feat: 前缀
git push -u origin chore/gov-<日期>
```

推送后走 `/open-pr`(标题按其约定:`[AI Generated][TASK] 补齐仓库治理文件`,body 写改动清单并注明“纯配置/文档改动,不挂 issue”),CI 预检、评审与 squash 合并用 `/merge-pr`。批量流程里 `/open-pr` 不可调用(手动 skill)时,等价命令兜底:

```bash
gh pr create --title "[AI Generated][TASK] 补齐仓库治理文件" --body "<改动清单;纯配置/文档改动,不挂 issue>"
gh pr checks <n> --watch
gh pr merge <n> --squash --admin --delete-branch
```

CI 因存量问题失败时:在 PR body 注明原因后 `--admin` 合并。因本次改动失败则修复重推。

### 2.3 文件类资产(按范本)

- CODEOWNERS / dependabot / FUNDING / 模板：照 `cislunarspace/CODE-core`
- CI / AGENTS / 发版工程：照 `ouyangjiahong26/altgo`
- 最小 CI 只查必绿项:Python 用 `ruff check --select E9,F63,F7,F82`(+本地已验证的 pytest)。Rust 先在 clone 里实跑 `cargo fmt --check`/`clippy`/`test` 定档,存量不过的步不进 CI。系统依赖(opencv/alsa/glib/gtk/udev/dbus)在 CI 里 apt 装。
- CLAUDE.md 双文件仓库:diff 出独有内容并入 AGENTS.md 末尾的补充约定节,CLAUDE.md 改为一行指针。

### 2.4 API 级修复(不进 PR)

- required checks:GET 保护配置,从默认分支 check-runs 取精确 check 名(矩阵 job 名含矩阵值,勿凭 workflow 名猜),再 PUT 全量保护 body(保留既有字段)。
- ruleset 整合:GET 两份 rulesets 的 rules 数组(含 parameters 原样),POST 合并为语义命名(如 `master-protection`,enforcement=active),确认成功后 DELETE 旧的。
- 私密安全报告:对新增 SECURITY.md 的公开库 `PUT repos/<o>/<r>/private-vulnerability-reporting`。

### 2.5 终审

重跑 `audit-repo.sh --org <owner>` 全量审计,目标仓库严重项清零。建议项余量逐条核对是否设计豁免(如非代码仓无 LICENSE、无 release 不加 CONTRIBUTING、上游镜像保持一致)。未预期的严重项回到对应仓库补修。

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| gh 未登录 | 提示 `gh auth login` 后停止(exit 2) |
| 仓库不存在 / 404 | 报告并停止(exit 2) |
| fork 或 archived | 审计自动跳过,在汇总中说明。修复阶段只读不可推送,跳过并在报告注明 |
| 无 admin 读不到保护配置 | 该项标“未知(无权限)”,不算失败 |
| API 限流(HTTP 403/429 带 rate 提示) | 审计脚本 sleep 60 自动重试一次 |
| API 403(权限不足) | 跳过该步,记录,不阻塞其余交付 |
| ruleset/保护 PUT 失败 | 保留原状,记录错误。不改其他字段重试一次仍失败则跳过 |
| 本机缺 Rust/Java 构建系统依赖 | 不在本机装。把依赖装进 CI,以 PR 首跑验证 |
| 审计规则误报(致谢类上游链接、非代码仓 LICENSE) | 修审计脚本的判定,不为了消除严重项改仓库 |

## Checkpoint

审计阶段只读,无需确认,直接执行。修复阶段每仓库 PR 创建前无需确认(可逆)。以下停下问用户:

1. 要 `--admin` 合并 CI 失败的 PR 时
2. 发现仓库 archived / 权限不足需要缩减范围时
3. 修复方案需要偏离既有范本时

## 输出

- 审计:逐仓库问题表(检查项 / 级别 / 说明)、每仓库严重/建议/信息计数汇总、前 3 个优先修复项(严重项优先,其次影响面大的建议项)
- 修复:逐仓库 PR 链接、新增/修改文件清单、CI 结论。API 修改的规则/保护前后对比与生效值。终审的严重/建议/信息计数与豁免清单。偏差记录

## 完成条件

- 目标范围内每仓库都有逐项判定,无未处理异常。
- 修复后目标范围内所有仓库严重项清零(设计豁免项单独列出理由)。
- 所有文件类改动经 PR 合入,新加 CI 的仓库默认分支 CI 为 success。
- API 修改用 GET 验证生效值与预期一致。
