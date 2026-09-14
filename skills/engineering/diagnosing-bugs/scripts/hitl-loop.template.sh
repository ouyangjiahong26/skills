#!/usr/bin/env bash
# 人在回路（HITL）的复现回路。
# 复制本文件，改下面这几步，然后运行。
# 由 agent 跑这个脚本；用户在终端里跟着提示走。
#
# 用法：
#   bash hitl-loop.template.sh
#
# 两个辅助函数：
#   step "<指令>"         → 显示指令，等回车
#   capture VAR "<问题>"  → 显示问题，把回答读进 VAR
#
# 跑完后，抓到的值以 KEY=VALUE 形式打印出来，供 agent 解析。
#
# `capture` 会把它的值打印回终端，agent 在那里读它，所以
# 用 capture 抓观察值，把登录这类事留给用户、写成 `step`。

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [完成后按 Enter] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- 改下面这段 --------------------------------------------------------

step "打开 http://localhost:3000 上的应用并登录。"

capture ERRORED "点 'Export' 按钮。报错了吗？(y/n)"

capture ERROR_MSG "把错误信息贴出来（没有就填 none）："

# --- 改上面这段 --------------------------------------------------------

printf '\n--- 抓到的值 ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
