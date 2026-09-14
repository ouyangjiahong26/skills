# CONTEXT.md 格式

## 结构

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## 规则

- **要有主见。** 当同一个概念存在多个词时，选最好的那个，把其余的列在 `_Avoid_` 下。
- **定义要紧。** 最多一两句话。定义它*是*什么，不是它*做*什么。
- **只收这个项目上下文特有的术语。** 通用编程概念（超时、错误类型、工具模式）不属于这里，哪怕项目大量使用。加一个术语之前先问：这是这个上下文独有的概念，还是通用编程概念？只有前者属于这里。
- **当自然的聚类出现时，用子标题给术语分组。** 如果所有术语都属于同一个内聚区域，平铺一张表也行。

## 单上下文 vs 多上下文仓库

**单上下文（大多数仓库）：** 仓库根目录一个 `CONTEXT.md`。

**多上下文：** 仓库根目录一个 `CONTEXT-MAP.md` 列出各上下文、它们在哪里、彼此如何关联：

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md): manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

本 skill 推断适用哪种结构：

- 如果存在 `CONTEXT-MAP.md`，读它来找各上下文
- 如果只有根 `CONTEXT.md`，单上下文
- 如果两者都不存在，在第一个术语确定时按需创建根 `CONTEXT.md`

当存在多个上下文时，推断当前话题属于哪一个。不清楚就问。
