---
name: implement
description: 基于 spec 或一组 ticket 执行一段实现工作。
disable-model-invocation: true
---

实现用户在 spec 或 ticket 中描述的工作。

在事先约定好的接口处，尽量调用 Skill 工具，传入 "tdd"。

定期跑类型检查和覆盖改动的单个测试文件。仅当改动跨模块、涉及共享契约或基础设施、影响范围无法可靠判断，或 CI 明确要求时，再扩大到相关集成测试或完整测试套件。

完成后，调用 Skill 工具，传入 "code-review"，审查工作。

把工作提交到当前分支。
