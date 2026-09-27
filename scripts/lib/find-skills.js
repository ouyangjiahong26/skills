// 枚举仓库内所有 skill 的共享 helper。
//
// 抽象层选择：输出 skill 的"目录绝对路径"，而不是 SKILL.md 文件路径。理由：
// 调用方各自需要的东西都能从目录路径派生——list 要名字（basename）、check 要
// SKILL.md 路径（目录 + /SKILL.md）、link 要目录路径本身。SKILL.md 只是 skill
// 目录的隐含约定，把目录作为最小公共单元最自然。
//
// 过滤规则集中在这里一处：名为 SKILL.md 的文件。不跟随符号链接。

const fs = require('node:fs');
const path = require('node:path');

// 返回 skills/ 下所有 skill 目录的绝对路径，顺序不定，需要稳定顺序的调用方自行排序。
function listSkillDirs(repoRoot) {
  const root = path.join(repoRoot, 'skills');
  if (!fs.existsSync(root)) throw new Error(`找不到 ${root}，无法枚举 skill`);
  const dirs = [];
  collect(root, dirs);
  return dirs;
}

function collect(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // isDirectory() 对符号链接为 false，等价于 find 不跟随符号链接的默认行为。
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (fs.existsSync(path.join(full, 'SKILL.md'))) out.push(full);
    collect(full, out);
  }
}

module.exports = { listSkillDirs };
