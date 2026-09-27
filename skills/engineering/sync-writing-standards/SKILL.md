---
name: sync-writing-standards
description: 把仓库统一的交流语言、写作要求和编码准则同步到 AGENTS.md 或 CLAUDE.md，默认 AGENTS.md。用户要求同步、注入或更新写作规范时手动运行。
disable-model-invocation: true
---

用 `references/standards.md` 作为唯一内容来源，把三节规范同步到目标仓库的指令文件。脚本负责节级替换或追加、保留其他内容、统一 LF 行尾并验证结果。

目标文件二选一：`AGENTS.md`（默认）或 `CLAUDE.md`。

## 流程

1. 确认目标目录与目标文件：
   - 目录：默认当前工作目录；目标不是仓库根目录时，传入明确路径。
   - 文件：用户已指明记录到 `CLAUDE.md` 时遵从；未指明时使用默认 `AGENTS.md`，无需追问。
2. 运行一次：

   ```bash
   # 默认：只同步 AGENTS.md
   node "{{SKILL_DIR}}/sync.js"

   # 同步 CLAUDE.md（--file 可简写为 -f）
   node "{{SKILL_DIR}}/sync.js" --file CLAUDE.md

   # 指定目录
   node "{{SKILL_DIR}}/sync.js" "/path/to/repo" --file CLAUDE.md
   ```

   `{{SKILL_DIR}}` 是 skill 所在目录的绝对路径，由 harness 替换。
3. 以退出码判断结果：退出码 `0` 表示同步并验证成功；非 `0` 时报告完整错误并停止。
4. 成功后对本次同步的文件执行 `git diff`（如 `git diff -- AGENTS.md`），向用户说明新增、替换或保留的内容。

脚本已经包揽文件读取、节切分、写入、行尾归一化和一致性验证。不要再手动编辑同一批文件，也不要用其他脚本重复实现这些步骤。

## 完成条件

- 脚本退出码为 `0`。
- 每个选中的目标文件存在，首行为对应的 `# AGENTS.md` 或 `# CLAUDE.md`。
- 选中的文件都包含 `## 交流语言`、`## 写作要求`、`## 编码准则`。
- 三节内容分别与 `references/standards.md` 逐字一致。
- 目标文件和源文件均使用 LF 行尾。
- 其他已有章节仍保留；未选中的文件未被创建或改动。

## 维护

- 只编辑 `references/standards.md` 更新规范正文；不要直接修改目标文件中的同步章节。
- 规范同步成功后，重启 Claude Code 会话，让新规范进入上下文。
