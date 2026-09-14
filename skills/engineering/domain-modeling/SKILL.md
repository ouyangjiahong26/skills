---
name: domain-modeling
description: 构建和打磨项目的领域模型。当在讨论代码库术语、编写或编辑 CONTEXT.md，或记录、编辑 ADR 时使用。
---

# 领域建模

在设计过程中主动构建和打磨项目的领域模型。这是一项*主动的*纪律：挑战术语、构造边界场景、在术语和决策刚结晶的那一刻就把它们写下来。（仅仅是*读* `CONTEXT.md` 找术语不算这个 skill：那是任何 skill 都能做的一行习惯。这个 skill 用在你正在改变模型、而不只是使用模型的时候。）

## 文件结构

大多数仓库只有一个上下文：

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

如果根目录存在 `CONTEXT-MAP.md`，仓库就有多个上下文。这份 map 指向每个上下文所在的位置：

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

按需创建文件：只有有东西可写时才创建。如果没有 `CONTEXT.md`，在第一个术语确定时创建一个。如果没有 `docs/adr/`，在需要第一个 ADR 时创建它。

## 会话过程中

### 对照术语表挑战

当用户使用的术语与 `CONTEXT.md` 中的已有语言冲突时，立刻指出。"你的术语表把'取消'定义为 X，但你似乎在说 Y。到底是哪个？"

### 锐化模糊语言

当用户使用模糊或重载的词时，提出一个精确的规范术语。"你说'账户'：指的是 Customer 还是 User？这是两个不同的东西。"

### 讨论具体场景

当讨论领域关系时，用具体场景来压测它们。构造场景去探边界情况，迫使用户把概念之间的边界说精确。

### 与代码交叉验证

当用户陈述某事怎么运作时，检查代码是否同意。发现矛盾就摆出来："你的代码取消的是整个 Order，但你刚说支持部分取消。哪个对？"

### 当场更新 CONTEXT.md

术语确定时，当场更新 `CONTEXT.md`。不要攒着：发生就记。用 [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md) 中的格式。

`CONTEXT.md` 应当完全不沾实现细节。不要把 `CONTEXT.md` 当规格、草稿本、或实现决策的仓库。它就是术语表，不是别的。

### 克制地提议 ADR

只在以下三条同时为真时才提议创建 ADR：

1. **难以撤销**：事后改变主意的成本很大
2. **缺乏上下文会令人困惑**：未来的读者会想"他们为什么这么做？"
3. **源于真正的权衡**：存在真实的替代方案，你因特定理由选了其中一个

三条缺一条，就跳过 ADR。用 [ADR-FORMAT.md](./ADR-FORMAT.md) 中的格式。
