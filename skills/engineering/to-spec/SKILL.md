---
name: to-spec
description: 把当前对话变成一份规格，发布到项目 issue tracker：不做访谈，只综合已经讨论过的内容。
disable-model-invocation: true
---

本 skill 取当前对话上下文和代码库理解，产出一份规格。不要访谈用户：只综合你已经知道的。

issue tracker 和分诊标签术语应当已提供。如未提供，叫用户跑 `/setup-ouyangjiahong-skills`。

## 流程

1. 若还没探索过仓库，先探索以了解代码库的当前状态。规格全程使用项目的领域术语表，遵守你将要改动区域的 ADR。

2. 勾画你要测试这个功能的接口（seam）。已有接口优先于新建。用尽可能高的接口。若需要新接口，在你能到的最高点提出。代码库里的测试接口越少越好：理想数量是一。

和用户确认这些接口符合预期。

3. 用下面的模板写规格，然后发布到项目 issue tracker。套上 `ready-for-agent` 分诊标签：不需要额外分诊。

<spec-template>

## Problem Statement

用户面临的问题，从用户视角。

## Solution

问题的解决方案，从用户视角。

## User Stories

一长串编号的用户故事。每条格式：

1. 作为 <角色>，我想要 <功能>，以便 <收益>

<user-story-example>
1. 作为手机银行客户，我想要查看账户余额，以便更好地决定消费
</user-story-example>

用户故事列表应极其详尽，覆盖功能的所有方面。

## Implementation Decisions

已做出的实现决策列表。可包括：

- 将构建/修改的模块
- 这些模块中将被修改的接口
- 来自开发者的技术澄清
- 架构决策
- schema 变更
- API 契约
- 具体交互

不要包含具体文件路径或代码片段。它们很快过时。

例外：如果原型产出了一个比散文更精确地编码某个决策的片段（状态机、reducer、schema、类型形状），内联进相关决策，简要注明它来自原型。裁到决策密集的部分，不是可运行的 demo，只是重要的那几处。

## Testing Decisions

已做出的测试决策列表。包括：

- 什么样的测试是好测试的描述（只测外部行为，不测实现细节）
- 哪些模块将被测试
- 测试的先例（即代码库里类似的测试类型）

## Out of Scope

本规格中不在范围内的事项描述。

## Further Notes

关于功能的任何其他说明。

</spec-template>
