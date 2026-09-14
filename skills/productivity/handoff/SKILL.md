---
name: handoff
description: 把当前会话压缩成一份交接文档，供另一个 agent 接手。
argument-hint: "下一次会话用来做什么？"
disable-model-invocation: true
---

写一份交接文档，总结当前会话，让一个新的 agent 能继续这项工作。保存到用户操作系统的临时目录：不是当前工作区。

在文档中加一个"建议 skill"小节，点名下一个 agent 该对哪些 skill 调用 Skill 工具。

不要重复已经在其他产物（规格、计划、ADR、issue、commit、diff）中记录的内容。用路径或 URL 引用它们。

给任何敏感信息脱敏，比如 API key、密码或个人身份信息。

如果用户传了参数，把它们当作对下一次会话重点的描述，据此调整文档。
