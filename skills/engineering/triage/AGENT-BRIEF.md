# 写 Agent Brief

agent brief 是 GitHub issue 或 PR 进入 `ready-for-agent` 时发布的一条结构化评论。它是 AFK agent 工作的权威规格。原始正文和讨论只是上下文，agent brief 才是契约。

brief 说清 **agent 应该做什么**，这一点延伸到两个入口：对 issue，是从零构建这个改动；对 PR，是_对现有 diff_ 还要做什么：收尾、补缺口、回应评审意见。两边原则相同；下面的 PR 例子展示了差别。

## 原则

### 耐用优先于精确

issue 可能在 `ready-for-agent` 待上几天甚至几周。这期间代码库会变。brief 要写得即使文件被改名、移动、重构，依然有用。

- **要**描述接口、类型、行为契约
- **要**点名 agent 应查找或修改的具体类型、函数签名、配置形状
- **不要**引用文件路径：会过时
- **不要**引用行号
- **不要**假设当前实现结构会保持不变

### 行为的，不是过程的

描述系统**应该做什么**，不是**怎么实现**。agent 会重新探索代码库，自己决定实现。

- **好：** "`SkillConfig` 类型应接受一个可选的 `schedule` 字段，类型为 `CronExpression`"
- **坏：** "打开 src/types/skill.ts，在第 42 行加一个 schedule 字段"
- **好：** "用户无参数运行 `/triage` 时，应看到待处理 issue 的摘要"
- **坏：** "在主 handler 函数里加一个 switch 语句"

### 完整的验收标准

agent 需要知道什么时候算完。每份 agent brief 必须有具体、可测的验收标准，每条都能独立验证。

- **好：** "运行 `gh issue list --label needs-triage` 返回经过初步分类的 issue"
- **坏：** "分诊应正常工作"

### 明确的范围边界

说清什么不在范围内。这能防止 agent 镀金，或对相邻功能做假设。

## 模板

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** 一句话描述要做什么

**Current behavior:**
描述现在的行为。bug 写坏掉的行为；enhancement 写功能所基于的现状。

**Desired behavior:**
描述 agent 工作完成后应发生的行为。说清边界情况和错误条件。

**Key interfaces:**
- `TypeName`：要改什么、为什么
- `functionName()` 返回类型：现在返回什么、应该返回什么
- 配置形状：需要的新配置项

**Acceptance criteria:**
- [ ] 具体、可测的标准 1
- [ ] 具体、可测的标准 2
- [ ] 具体、可测的标准 3

**Out of scope:**
- 本 issue 不应改动或处理的东西
- 看起来相关、实则独立的相邻功能
```

## 示例

### 好的 agent brief（bug）

```markdown
## Agent Brief

**Category:** bug
**Summary:** Skill description 截断在词中间，产生残缺输出

**Current behavior:**
当 skill description 超过 1024 字符时，无视词边界精确截断在 1024 字符处。这会产生
断在词中间的描述（如 "Use when the user wants to confi"）。

**Desired behavior:**
截断应在 1024 字符前的最后一个词边界处断开，并追加 "..." 表示被截断。

**Key interfaces:**
- `SkillMetadata` 类型的 `description` 字段：类型无需改动，
  但填充它的校验/处理逻辑需要尊重词边界
- 任何读取 SKILL.md frontmatter 并提取 description 的函数

**Acceptance criteria:**
- [ ] 1024 字符以下的描述不变
- [ ] 1024 字符以上的描述截断在 1024 字符前的最后一个词边界
- [ ] 截断的描述以 "..." 结尾
- [ ] 含 "..." 的总长不超过 1024 字符

**Out of scope:**
- 修改 1024 字符上限本身
- 多行描述支持
```

### 好的 agent brief（enhancement）

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 增加 `.out-of-scope/` 目录，用于记录被拒的功能请求

**Current behavior:**
功能请求被拒时，issue 以 `wontfix` 标签和一条评论关闭。没有关于决策和理由的
持久记录。今后类似的请求需要维护者回忆或搜索过往讨论。

**Desired behavior:**
被拒的功能请求应记入 `.out-of-scope/<concept>.md` 文件，记录决策、理由、以及
所有请求过该功能的 issue 链接。分诊新 issue 时，应检查这些文件以匹配。

**Key interfaces:**
- `.out-of-scope/` 中的 markdown 文件格式：每个文件应有 `# Concept Name`
  标题、一行 `**Decision:**`、一行 `**Reason:**`、一个带 issue 链接的
  `**Prior requests:**` 列表
- 分诊流程应在早期读取所有 `.out-of-scope/*.md`，按概念相似度匹配新 issue

**Acceptance criteria:**
- [ ] 以 wontfix 关闭功能时，创建/更新 `.out-of-scope/` 中的文件
- [ ] 文件包含决策、理由、被关闭 issue 的链接
- [ ] 若匹配的 `.out-of-scope/` 文件已存在，新 issue 追加到其 "Prior requests"
      列表，而非创建重复文件
- [ ] 分诊时检查已有 `.out-of-scope/` 文件，新 issue 匹配曾被拒请求时浮出

**Out of scope:**
- 自动匹配（由人确认匹配）
- 重开曾被拒的功能
- bug 报告（只有 enhancement 的拒绝进 `.out-of-scope/`）
```

### 好的 agent brief（PR）

PR 的 "Current behavior" 描述 diff 的状态，brief 要求 agent 收尾或修复，而非从零构建。

```markdown
## Agent Brief

**Category:** enhancement
**Summary:** 完成贡献者为 `triage list` 加的 `--json` 输出标志

**Current behavior:**
PR 加了一个 `--json` 标志，把 issue 列表序列化为 JSON。happy path 可用，
diff 符合项目的命令结构。还剩两个缺口：错误仍以人类可读文本打印（非 JSON），
新标志没有测试覆盖。

**Desired behavior:**
带 `--json` 时，所有输出（包括错误）是 stdout 上合法的 JSON，命令的退出码不变。
不带该标志时，现有的人类可读输出原样不动。

**Key interfaces:**
- 命令的错误路径在 `--json` 下应输出 `{ "error": string }`，
  而非纯文本错误
- 复用 PR 已加的序列化器；不要引入第二个

**Acceptance criteria:**
- [ ] `triage list --json` 对成功和错误情况都输出合法 JSON
- [ ] 退出码与非 JSON 命令一致
- [ ] 一条测试覆盖 `--json` 成功输出和一个错误情况
- [ ] 默认（非 JSON）输出逐字节不变

**Out of scope:**
- 给任何其他命令加 `--json`
- 修改 PR 已定义的成功载荷 JSON 形状
```

### 坏的 agent brief

```markdown
## Agent Brief

**Summary:** Fix the triage bug

**What to do:**
The triage thing is broken. Look at the main file and fix it.
The function around line 150 has the issue.

**Files to change:**
- src/triage/handler.ts (line 150)
- src/types.ts (line 42)
```

坏在哪里：
- 没有分类
- 描述含糊（"the triage thing is broken"）
- 引用了会过时的文件路径和行号
- 没有验收标准
- 没有范围边界
- 没有描述当前行为 vs 期望行为
