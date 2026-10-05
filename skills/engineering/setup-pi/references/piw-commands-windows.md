# piw / piw-clean 命令（Windows PowerShell 函数）

用于 Windows 上从 PowerShell 使用 `pi` 的场景：两个函数写入 `$PROFILE`（用户实际在用的那个 PowerShell 的 profile）。文件必须存成 UTF-8 带 BOM：Windows PowerShell 5.1 对无 BOM 的脚本按系统 ANSI 码页解码，中文注释和提示会乱码。Windows 上从 git-bash / MSYS 使用 `pi` 时改用 POSIX 模板 [piw-commands.md](./piw-commands.md)。

```powershell
# piw: 新建分支+worktree 并直接进入 pi
# 用法: piw <分支名> [基础commit/分支]  示例: piw feature/login main
function piw {
  param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Branch,
    [Parameter(Position = 1)][string]$Base = 'HEAD'
  )
  # 会话若把 $ErrorActionPreference 设为 Stop，git 写到 stderr 的警告/报错会中断函数；
  # 在本函数作用域内固定为 Continue：git 的消息照常显示，失败与否仍看 $LASTEXITCODE。
  $ErrorActionPreference = 'Continue'
  $dir = Join-Path '..' ('pi-' + ($Branch -replace '/', '-'))   # feature/login -> ..\pi-feature-login
  git worktree add -b $Branch $dir $Base
  if ($LASTEXITCODE -ne 0) { return }
  Set-Location $dir
  pi
}

# piw-clean: 移除 piw 创建的 worktree，并删除其分支
# 用法: piw-clean             在 worktree 内执行：清理当前 worktree 与当前分支
#       piw-clean <分支名>     在任意位置执行：清理该分支 checkout 的 worktree 与分支
function piw-clean {
  param([Parameter(Position = 0)][string]$Branch)

  # 同 piw：会话设为 Stop 时原生命令写 stderr 会中断函数。本函数会故意让 git 失败
  # （目录不在仓库内、worktree 脏、分支内容未合并），失败路径的 stderr 由 2>$null 压掉，
  # 结果改由下面的中文提示汇报。
  $ErrorActionPreference = 'Continue'

  $here = (Get-Location).ProviderPath
  $porcelain = @(git worktree list --porcelain 2>$null)
  if ($LASTEXITCODE -ne 0) {
    Write-Output 'piw-clean: 当前目录不在 git 仓库内'
    return
  }
  # 定位主仓库：git worktree list 第一条即主仓库
  $main = $porcelain | Where-Object { $_ -like 'worktree *' } | Select-Object -First 1
  if (-not $main) {
    Write-Output 'piw-clean: 当前目录不在 git 仓库内'
    return
  }
  $main = $main.Substring(9)

  if (-not $Branch) {
    $Branch = git -C $here rev-parse --abbrev-ref HEAD 2>$null
  }
  if (-not $Branch) {
    Write-Output '用法: piw-clean [分支名]'
    return
  }

  # 该分支 checkout 在哪个 worktree；命中主仓库说明分支正被主仓库占用
  $wt = $null; $cur = $null
  foreach ($line in $porcelain) {
    if ($line -like 'worktree *') { $cur = $line.Substring(9) }
    elseif ($line -eq "branch refs/heads/$Branch") { $wt = $cur }
  }
  if ($wt -eq $main) {
    Write-Output "piw-clean: 分支 '$Branch' 由主仓库自身 checkout，不能删除"
    return
  }

  Set-Location $main                      # 先离开待删目录，否则 cwd 会随 worktree 一起消失
  if ($wt) {
    git worktree remove $wt 2>$null
    if ($LASTEXITCODE -ne 0) {
      # 失败可能是未提交改动、目录被占用、权限不足或 worktree 被 lock，git 不作区分；一律走 --force：
      # 目录被占用（Windows 下终端/编辑器停在目录里）时，--force 会删光内容并注销该 worktree，但删不掉
      # 目录本身，留下一个未注册的空目录；worktree 被 lock 或注册残留时 git 直接拒绝，目录内容原封不动。
      Write-Output "worktree $wt 未干净或被占用，强制删除（未提交改动将丢失）"
      git worktree remove --force $wt 2>$null
      if ($LASTEXITCODE -ne 0 -and (Test-Path -LiteralPath $wt -PathType Container)) {
        # 补删只对空目录有效：Directory::Delete 非递归，非空即抛错（由下面的 Test-Path 警告接管），
        # 与 POSIX 版的 rmdir 等价。不用 Remove-Item：它对非空目录会弹「缺 -Recurse，继续将连子项一起
        # 删」的确认，默认同意就递归删光，正好删掉 git 拒绝删除时目录里保留下来的内容。
        try { [System.IO.Directory]::Delete($wt) } catch { }
        if (Test-Path -LiteralPath $wt) {
          Write-Output "警告: $wt 未能删净（可能仍被占用、权限不足或 worktree 被 lock）；确认无用后手动删除该目录"
        }
      }
    }
    git worktree prune
  }

  # 删分支。git branch -d 只看 tip 是否为 base 的祖先，squash / rebase 合并重写 SHA 后会误判
  # “未合并”，故分两步判断分支内容是否已进目标分支：
  #   1. git cherry 逐个 patch-id 比对：普通合并、rebase、单提交 squash 都能认出；
  #   2. squash 把多个提交压成一个，逐个 patch-id 对不上，改看内容：分支相对 merge-base 的
  #      改动能否在目标分支上反向应用，能则说明这些改动已经在里面。
  # 两条都不成立才保留分支。
  $target = git -C $main rev-parse --abbrev-ref HEAD
  $base = git -C $main merge-base $target $Branch 2>$null
  git -C $main show-ref --verify --quiet "refs/heads/$Branch"
  if ($LASTEXITCODE -ne 0) {
    Write-Output "本地无分支 '$Branch'，无需删除"
  } else {
    $cherry = @(git -C $main cherry $target $Branch 2>$null)
    if (-not ($cherry | Where-Object { $_ -like '+*' })) {
      git -C $main branch -D $Branch
    } else {
      $applied = $false
      if ($base) {
        # 用临时文件传 diff：PowerShell 管道会按会话编码重新编码 git 的输出，可能破坏补丁
        $patch = [System.IO.Path]::GetTempFileName()
        git -C $main diff $base $Branch --output=$patch
        if ($LASTEXITCODE -eq 0) {
          git -C $main apply --check --reverse --quiet $patch 2>$null
          $applied = ($LASTEXITCODE -eq 0)
        }
        Remove-Item $patch -Force -ErrorAction SilentlyContinue
      }
      if ($applied) {
        git -C $main branch -D $Branch     # squash 合并：这些改动已经出现在目标分支上
      } else {
        Write-Output "分支 '$Branch' 有未合并进 $target 的改动，已保留"
      }
    }
  }
  Write-Output "清理流程结束，当前位于主仓库: $main"
}
```

## 使用

- `piw feature/login`：在 `..\pi-feature-login` 新建 worktree 并直接进入 pi。
- `piw-clean`（在 worktree 内）：移除当前 worktree、prune、删当前分支，回到主仓库。
- `piw-clean issue100`（任意位置，包括主仓库）：清理 issue100 对应的 worktree 与分支。

## 写入 $PROFILE

写完函数块后归一化编码，确保带 BOM：

```powershell
$p = $PROFILE
$b = [System.IO.File]::ReadAllBytes($p)
if (-not ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)) {
  [System.IO.File]::WriteAllText($p, [System.Text.Encoding]::UTF8.GetString($b), (New-Object System.Text.UTF8Encoding $true))
}
```

这一步按 UTF-8 重新解释整个文件。原文件里已有非 UTF-8 的编码（如旧 ANSI 码页写的中文）时先停下来问用户，不要整体转码。

## 注意

- 目录约定与 POSIX 版一致：worktree 放在主仓库父目录下的 `pi-<分支名>`，分支名里的 `/` 转成 `-`。
- `piw-clean` 必须能定位主仓库（`git worktree list` 第一条）。不在仓库内时打印提示并返回。
- 两个函数都在自己作用域内把 `$ErrorActionPreference` 固定为 `Continue`：会话设成 `Stop` 时，原生命令往 stderr 写的任何内容（含警告）都会中断函数，失败与否统一看 `$LASTEXITCODE`。赋值只作用于函数作用域，不改会话设置。
- diff 用临时文件传给 `git apply`（`git diff --output=`）：PowerShell 管道会按会话编码重新编码 git 的输出，中文文件名的补丁会被破坏。`git apply` 加 `--quiet`，避免预期失败时把 git 的报错混进输出。
- 删分支判据与 POSIX 版一致：先 `git cherry` 比 patch-id，再退一步用 `git apply --check --reverse` 看内容。两条都不成立才保留分支并说明。
- 失败路径打印中文提示后直接 `return`。PowerShell 函数没有退出码（POSIX 版在这些路径返回 1）。写成 `return 1` 会把 `1` 混进输出流。
- worktree 有未提交改动时强制删除，改动会丢失。`piw-clean` 会先警告再删。
  - `git worktree remove --force` 失败时（目录被占用、权限不足、worktree 被 lock），git 可能已删光
  内容并注销该 worktree 却删不掉目录本身，留下一个未注册的空目录。被 lock 或注册残留时 git 直接
  拒绝，目录内容原封不动。函数会再补一次非递归删除（`[System.IO.Directory]::Delete`，只删空目录，
  不会碰 git 特意保全的内容，也不会弹 `Remove-Item` 对非空目录的递归确认），仍失败则明确警告让
  用户手动处理，不静默留壳。

## Windows Terminal：Ctrl+Shift+T 复制当前标签（继承 cwd）

WT 的普通 `newTab` 不继承当前目录。`duplicateTab` 会复用 shell 通过 OSC 9。9 上报的最后工作目录。下面两处配合后，`Ctrl+Shift+T` = 复制当前标签（同一 profile、同一目录、同字体设置）。两处独立，可只取其一（cwd 跟踪对 `alt+shift+d` 的 splitMode: duplicate 分屏同样有效）。

### 1. $PROFILE 末尾追加 prompt 包装

放在 prompt 初始化（如 `Invoke-Expression (&starship init powershell)`）之后，包装当时生效的 prompt。没有 prompt 定制时包装的是默认 prompt，行为不变：

```powershell
# 让 Windows Terminal 跟踪当前目录（OSC 9;9），使 Ctrl+Shift+T（duplicateTab）
# 新开的标签继承本窗口的 cwd。必须放在 prompt 初始化（如 starship init）之后。
$global:__wtCwdPrompt = (Get-Command prompt).ScriptBlock
function global:prompt {
    if ($pwd.Provider.Name -eq 'FileSystem') {
        $e = [char]27
        Write-Host -NoNewline "$e]9;9;`"$($pwd.ProviderPath)`"$e\"
    }
    & $global:__wtCwdPrompt
}
```

- 只在 FileSystem provider 下输出：注册表等 provider 的路径发给 WT 会报错。
- 目录更新依赖提示符渲染：`cd` 之后出现过一次提示符（正常交互都会满足）才会上报。
- 不支持 OSC 9。9 的终端会忽略该序列，无害。
- 幂等：`$PROFILE` 里已能搜到 `]9;9;` 就跳过，不写第二份。
- 追加后做与函数块相同的 UTF-8 带 BOM 归一化（见上节）。

### 2. settings.json 把 Ctrl+Shift+T 绑到 duplicateTab

定位 WT 的 settings.json（取先存在者。都没有则跳过本步并说明）：

- Store 版：`$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`
- 解包版：`$env:LOCALAPPDATA\Microsoft\Windows Terminal\settings.json`

在 `actions` 数组加一条（WT 默认把 Ctrl+Shift+T 绑给 newTab，此条覆盖它）：

```json
{ "command": "duplicateTab", "keys": "ctrl+shift+t" }
```

- 已把 `duplicateTab` 绑到 `ctrl+shift+t` 就跳过。`ctrl+shift+t` 绑了其他命令时展示差异，确认后替换。
- settings.json 允许 `//` 注释和尾逗号（JSONC），严格 JSON 校验失败不代表 WT 拒绝该文件。含注释时跳过校验。
- 想开全新空白标签用标签栏 `+` 按钮，或 `alt+shift+d` 分屏（splitMode: duplicate，同样继承目录）。
- WT 保存 settings.json 后热加载，无需重开窗口。

### 验证

重开一个 PowerShell 会话（或 `. $PROFILE`），cd 后捕获 prompt 输出应含 OSC 序列且原提示符仍正常渲染：

```powershell
Set-Location C:\Windows
(& { prompt } 6>&1 | Out-String) -match '\x1b\]9;9;"C:\\Windows"'
```

应输出 `True`。settings.json 无注释时 `Get-Content -Raw <路径> | ConvertFrom-Json` 应成功。手按 Ctrl+Shift+T 应复制出同目录标签。
