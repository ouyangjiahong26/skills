---
name: github-gov-fix
description: 按 github-repo-audit 的审计结果批量修复 GitHub 仓库治理缺口(治理文件、CI、分支保护、ruleset),全程走 clone→分支→PR→merge,API 级修改单独执行。模型可调用时补触发:修复仓库治理、补齐治理文件、governance fix
argument-hint: "owner/repo 列表或 --org <owner>"
---

# github-gov-fix

对审计发现的治理缺口逐仓库修复:文件类改动一律 clone → 开分支 → PR → CI 绿 → squash merge,绝不直推默认分支;保护/ruleset/安全报告等 API 级改动直接调 `gh api`,不进 PR。

## 步骤

### 1. 拿到审计结果

先用 `/github-repo-audit`(或 `scripts/audit-repo.sh`)对目标范围出分级清单,按 🔴 优先、🟡 次之排修复顺序。逐仓库列出改动清单(加哪些文件、改哪些 API),再动手。

### 2. 通用 PR 流程(每个仓库相同)

```bash
gh repo clone <owner>/<repo> <workdir>/<repo> && cd <workdir>/<repo>
git checkout -b chore/gov-<日期>
# ...应用该仓库改动清单...
git add -A && git commit -m "chore: 补齐仓库治理文件"   # 新增 skill 用 feat: 前缀
git push -u origin chore/gov-<日期>
```

推送后走 `/open-pr`(标题按其约定:`[AI Generated][TASK] 补齐仓库治理文件`,body 写改动清单并注明"纯配置/文档改动,不挂 issue"),CI 预检、评审与 squash 合并用 `/merge-pr`。批量流程里 `/open-pr` 不可调用(手动 skill)时,等价命令兜底:

```bash
gh pr create --title "[AI Generated][TASK] 补齐仓库治理文件" --body "<改动清单;纯配置/文档改动,不挂 issue>"
gh pr checks <n> --watch
gh pr merge <n> --squash --admin --delete-branch
```

CI 因存量问题失败时:在 PR body 注明原因后 `--admin` 合并;因本次改动失败则修复重推。

### 3. 文件类资产(按范本)

- CODEOWNERS / dependabot / FUNDING / 模板 → 照 `cislunarspace/CODE-core`
- CI / AGENTS / 发版工程 → 照 `ouyangjiahong26/altgo`
- 最小 CI 只查必绿项:Python 用 `ruff check --select E9,F63,F7,F82`(+本地已验证的 pytest);Rust 先在 clone 里实跑 `cargo fmt --check`/`clippy`/`test` 定档,存量不过的步不进 CI;系统依赖(opencv/alsa/glib/gtk/udev/dbus)在 CI 里 apt 装。
- CLAUDE.md 双文件仓库:diff 出独有内容并入 AGENTS.md 末尾「补充约定」节,CLAUDE.md 改为一行指针。

### 4. API 级修复(不进 PR)

- required checks:GET 保护配置 → 从默认分支 check-runs 取精确 check 名(矩阵 job 名含矩阵值,勿凭 workflow 名猜)→ PUT 全量保护 body(保留既有字段)。
- ruleset 整合:GET 两份 rulesets 的 rules 数组(含 parameters 原样)→ POST 合并为语义命名(如 `master-protection`,enforcement=active)→ 确认成功后 DELETE 旧的。
- 私密安全报告:对新增 SECURITY.md 的公开库 `PUT repos/<o>/<r>/private-vulnerability-reporting`。

### 5. 终审

重跑 `audit-repo.sh --org <owner>` 全量审计,目标仓库 🔴=0;🟡 余项逐条核对是否设计豁免(如非代码仓无 LICENSE、无 release 不加 CONTRIBUTING、上游镜像保持一致)。未预期的 🔴 回到对应仓库补修。

## 边界情况

| 情况 | 处理方式 |
|------|----------|
| fork / archived 仓库 | 只读,不可推送;跳过并在报告注明(archived 在 GitHub 侧是只读) |
| API 403(权限不足) | 跳过该步,记录,不阻塞其余交付 |
| ruleset/保护 PUT 失败 | 保留原状,记录错误;不改其他字段重试一次仍失败则跳过 |
| 本机缺 Rust/Java 构建系统依赖 | 不在本机装;把依赖装进 CI,以 PR 首跑验证 |
| 审计规则误报(致谢类上游链接、非代码仓 LICENSE) | 修审计脚本的判定,不为了消红改仓库 |

## Checkpoint

每仓库 PR 创建前无需确认(可逆);以下停下问用户:
1. 要 `--admin` 合并 CI 失败的 PR 时
2. 发现仓库 archived / 权限不足需要缩减范围时
3. 修复方案需要偏离既有范本时

## 输出

- 逐仓库:PR 链接、新增/修改文件清单、CI 结论
- API 修改:规则/保护前后对比、生效值
- 终审:两 owner 全量审计的 🔴/🟡/⚪ 计数与豁免清单
- 偏差记录:与计划的出入及原因

## 完成条件

- 目标范围内所有仓库 🔴=0(设计豁免项单独列出理由)
- 所有文件类改动经 PR 合入,新加 CI 的仓库默认分支 CI 为 success
- API 修改用 GET 验证生效值与预期一致
