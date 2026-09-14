# Out-of-Scope 知识库

仓库里的 `.out-of-scope/` 目录存放被拒功能请求的持久记录。它有两个用途：

1. **机构记忆**：记下一个功能为什么被拒，使理由在 issue 关闭后不丢失。
2. **去重**：新 issue 匹配一次过往拒绝时，skill 浮出先前的决策，而非重新辩论。

## 目录结构

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

一个文件对应一个**概念**，不是一条 issue。请求同一件事的多个 issue 归到同一文件下。

## 文件格式

文件应写得轻松、可读：更像一份简短设计文档，而非数据库条目。用段落、代码示例、例子把理由讲清楚，让第一次读到它的人觉得有用。

```markdown
# Dark Mode

本项目不支持暗色模式或面向用户的主题系统。

## Why this is out of scope

渲染管线假设 `ThemeConfig` 中定义了单一调色板。支持多主题需要：

- 一个包裹整个组件树的主题 context provider
- 每个组件的主题感知样式解析
- 用户主题偏好的持久化层

这是一项重大的架构变更，与本项目聚焦内容创作的方向不符。主题化是
下游调用方（他们嵌入或再分发输出）要操心的事。

```ts
// 当前的 ThemeConfig 接口不是为运行时切换设计的：
interface ThemeConfig {
  colors: ColorPalette; // 单一调色板，构建期解析
  fonts: FontStack;
}
```

## Prior requests

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
- #134: "Dark theme option"
```

### 文件命名

用简短、描述性的 kebab-case 名字命名概念：`dark-mode.md`、`plugin-system.md`、`graphql-api.md`。名字要有辨识度，让人扫一眼目录就能明白拒绝了什么，不必打开文件。

### 写理由

理由要有实质：不是"我们不想要这个"，而是为什么。好的理由会引用：

- 项目范围或理念（"本项目聚焦 X；主题化是下游的事"）
- 技术约束（"支持它需要 Y，与我们的 Z 架构冲突"）
- 战略决策（"我们选择了 A 而非 B，因为……"）

理由要耐用。别引用临时情况（"我们现在太忙"），那不是真正的拒绝，是推迟。

## 什么时候检查 `.out-of-scope/`

分诊时（第 1 步：收集上下文），读 `.out-of-scope/` 中所有文件。评估新 issue 时：

- 检查请求是否匹配一个已有的 out-of-scope 概念
- 匹配按概念相似度，不是关键词："night theme" 匹配 `dark-mode.md`
- 若匹配，浮出给维护者："这条类似 `.out-of-scope/dark-mode.md`：我们之前拒过，因为 [理由]。你现在还这么认为吗？"

维护者可以：

- **确认**：新 issue 加入该文件的 "Prior requests" 列表，然后关闭
- **重新考虑**：out-of-scope 文件被删除或更新，issue 走正常分诊
- **不同意**：两条相关但不同，走正常分诊

## 什么时候写入 `.out-of-scope/`

只有 **enhancement**（不是 bug）被作为 `wontfix` *拒绝* 时才写。这对 enhancement PR 同样适用：被拒的 PR 记在这里，同样的请求就不会以新代码的形式再来。

因 **已实现** 而以 `wontfix` 关闭时，**不要**写到这里。那是已建的功能，不是被拒的；记在这里会用假拒绝污染去重检查。关闭评论应指向功能已存在的地方。

流程：

1. 维护者判定一个功能请求不在范围内
2. 检查匹配的 `.out-of-scope/` 文件是否已存在
3. 若是：把新 issue 追加到 "Prior requests" 列表
4. 若否：用概念名、决策、理由、第一条 prior request 新建文件
5. 在 issue 上发评论解释决策，提及 `.out-of-scope/` 文件
6. 以 `wontfix` 标签关闭 issue

## 更新或删除 out-of-scope 文件

维护者对先前拒绝的概念改变主意时：

- 删除 `.out-of-scope/` 文件
- skill 无需重开旧 issue：它们是历史记录
- 触发重新考虑的那条新 issue 走正常分诊
