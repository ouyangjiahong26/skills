---
name: setup-pi
description: 配置 pi 的 piw / piw-clean 命令（POSIX shell 与 Windows PowerShell）：新建分支和 worktree 直接进入 pi，及 worktree 的清理回收。Windows 上并配置 Ctrl+Shift+T 复制当前标签（Terminal cwd 跟踪 + duplicateTab）。手动运行。
disable-model-invocation: true
---

为当前机器配置 `piw`（新建分支和 worktree 后直接进入 pi）与 `piw-clean`（移除 worktree、prune、删除分支并回到主仓库）两个命令。种子模板按用户实际使用的 shell 二选一：POSIX shell 用 `references/piw-commands.md`，Windows PowerShell 用 `references/piw-commands-windows.md`。只写取得用户确认的文件。

## 1. 探索

读取，不要假设：

- 判断平台：`uname -s` 为 `Windows_NT` / `MINGW*` / `MSYS*` / `CYGWIN*`，或 `$env:OS` 为 `Windows_NT`，都算 Windows。
- Windows 上先确定用户从哪个 shell 用 `pi`：PowerShell 还是 git-bash / MSYS。Windows PowerShell 5.1 与 PowerShell 7 的 `$PROFILE` 是两个文件，也要先确认版本。
- 交互 shell 中 `type piw piw-clean`（bash / zsh）或 `Get-Command piw,piw-clean`（PowerShell）是否已定义；目标文件里是否已有同名函数及其行号范围。
- 用户实际使用的 shell 及目标文件（bash `~/.bashrc`，zsh `~/.zshrc`，PowerShell `$PROFILE`）。
- 已有函数与模板的差异：旧版本用 `git branch -d` 删分支，squash 合并的分支会误报「未合并」而删不掉。
- Windows 上定位 Windows Terminal 的 settings.json：Store 版 `$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`，解包版 `$env:LOCALAPPDATA\Microsoft\Windows Terminal\settings.json`，取先存在者。
- `$PROFILE` 是否已有 cwd 跟踪段（搜 `]9;9;`）、prompt 初始化（如 starship init）所在行；settings.json 的 actions 里是否已绑 `duplicateTab` 或 `ctrl+shift+t`。

## 2. 决策

说明两个命令的行为，向用户确认写入哪个文件：

- `piw <分支名> [基础commit/分支]`：新建分支和 worktree（POSIX 为 `../pi-<分支名>`，PowerShell 为 `..\pi-<分支名>`）后直接进入 pi。
- `piw-clean [分支名]`：在 worktree 内不带参数清理当前 worktree；在主仓库带分支名清理对应 worktree。删分支前按 patch-id 判断内容是否已进 base，squash / rebase 合并的分支也能删掉；确有未合并改动的分支保留并说明。
- **worktree 有未提交改动时会强制删除，改动丢失。必须先向用户说明。**

bash 的 `~/.bashrc` 里函数块放在非交互 guard 之前，非交互加载时也能定义。Windows PowerShell 的 `$PROFILE` 必须存成 UTF-8 带 BOM。

Windows PowerShell 路径还有一组附加行为（两处独立、可分别选用）：

- `$PROFILE` 末尾包一层 prompt，每次渲染向终端输出 OSC 9;9 上报当前目录（仅 FileSystem provider，注册表等 provider 跳过）。片段见 references/piw-commands-windows.md。
- WT settings.json 的 actions 加 `{ "command": "duplicateTab", "keys": "ctrl+shift+t" }`：Ctrl+Shift+T 从 newTab 变为复制当前标签并继承目录；空白新标签改用标签栏 `+` 或 `alt+shift+d` 分屏。
- 生效条件：profile 改动需重开终端窗口或 `. $PROFILE`；WT 保存 settings.json 后热加载。git-bash 路径不做 cwd 跟踪（该段只随 PowerShell 模板写入）。

## 3. 确认写入

只展示将写入或更新的文件、使用的种子模板及对已有内容的保留、替换或追加方式。不要输出模板全文。

Windows Terminal settings.json 也是目标文件：改的是全局按键（Ctrl+Shift+T 语义从 newTab 变 duplicateTab），必须单独确认。

得到确认后才写入。

## 4. 写入与验证

- POSIX：写入 rc 文件后，新开一个交互 shell 跑 `type piw piw-clean`，确认内容来自本次写入（旧 shell 仍持有旧函数）。bash 下再确认函数块位于非交互 guard 之前：`BASH_ENV=$HOME/.bashrc bash -c 'type -t piw piw-clean'` 应输出两个 `function`。
- Windows PowerShell：按模板里的片段把 `$PROFILE` 归一化成 UTF-8 带 BOM。新开一个 PowerShell 会话跑 `Get-Command piw,piw-clean`，确认两行都是 `Function` 且 `(Get-Command piw).Definition` 与模板一致（旧会话仍持有旧函数）；再确认 `$PROFILE` 前三字节是 `EF BB BF`。
- prompt 跟踪段追加在 `$PROFILE` 末尾（prompt 初始化之后），幂等条件与片段见 references/piw-commands-windows.md；追加后同样做 UTF-8 带 BOM 归一化。
- settings.json 的 actions 数组插入 `{ "command": "duplicateTab", "keys": "ctrl+shift+t" }`；无注释的文件用 `ConvertFrom-Json` 校验，含 `//` 注释（JSONC）则跳过校验靠 WT 热加载。
- 验证：新会话里 `Set-Location C:\Windows` 后 `(& { prompt } 6>&1 | Out-String)` 应含 OSC 9;9 序列且 starship 提示符仍正常渲染（命令见 references）。

## 边界情况

| 情况 | 处理方式 |
| --- | --- |
| Windows 上从 PowerShell 使用 `pi` | 按 `references/piw-commands-windows.md` 写 `$PROFILE`；Windows PowerShell 5.1 与 PowerShell 7 的 `$PROFILE` 是两个文件，选用户实际在用的那个 |
| Windows 上从 git-bash / MSYS 使用 `pi`（`uname -s` 为 `MINGW*` / `MSYS*`） | 按 POSIX 模板写 `~/.bashrc`；用户两处都用时分别写入，互不覆盖 |
| 目标文件不存在 | 询问用户是用其 shell 实际读取的文件，还是新建该文件 |
| 无法确定用户 shell（非 bash / zsh / PowerShell） | 询问目标文件路径，不猜 |
| 已有同名函数 | 展示差异，确认后整体替换，不留新旧两份 |
| bash 下函数块位于非交互 guard 之后 | 移到 guard 之前，说明否则非交互加载时函数不存在 |
| `$PROFILE` 已有非 ASCII 内容且不是 UTF-8 | 停下来问用户，不要整体转码（会改坏原有内容） |
| 找不到 WT settings.json（两个路径都不存在） | 跳过 duplicateTab 绑定并说明；profile 的 cwd 跟踪段不受影响 |
| `$PROFILE` 已含 `]9;9;` 跟踪段 | 跳过追加，不写第二份 |
| settings.json 已绑 duplicateTab→ctrl+shift+t | 跳过；ctrl+shift+t 绑了其他命令则展示差异，确认后替换 |
| settings.json 含 `//` 注释（JSONC） | 不做严格 JSON 校验，靠 WT 热加载验证 |
| profile 无 prompt 定制（无 starship） | 照常包装，捕获的是默认 prompt，行为不变 |
