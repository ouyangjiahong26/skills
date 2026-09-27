#!/usr/bin/env node
// 把本仓库的 skill 软链到本地 Claude Code 安装目录。每个 entry 是到仓库内的
// symlink，`git pull` 自动同步；新增/删除/改名后重跑一次。
//
// 用法:
//   npm run link                      # 安装所有 skills
//   npm run link engineering          # 只安装工程相关 skills
//   npm run link engineering productivity  # 安装多个分组

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listSkillDirs } = require('./lib/find-skills');

const repo = path.resolve(__dirname, '..');
const marketplace = path.join(repo, '.claude-plugin', 'marketplace.json');

function die(message) {
  console.error(message);
  process.exit(1);
}

// marketplace.json 的 plugins[] 是分组清单，也是分组名的唯一来源。
function readPlugins() {
  if (!fs.existsSync(marketplace)) die(`错误: 找不到 ${marketplace}`);
  const manifest = JSON.parse(fs.readFileSync(marketplace, 'utf8'));
  return (manifest.plugins ?? []).map((plugin) => ({
    name: String(plugin.name),
    skills: plugin.skills ?? [],
  }));
}

function removeExisting(target) {
  let stat = null;
  try {
    stat = fs.lstatSync(target);
  } catch {
    return;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    fs.unlinkSync(target);
  }
}

const plugins = readPlugins();
const known = plugins.map((plugin) => plugin.name.toLowerCase());

const groups = [];
for (const arg of process.argv.slice(2)) {
  if (arg === '' || arg === 'all') continue;
  const group = arg.toLowerCase();
  if (!known.includes(group)) {
    console.error(`未知的分组: ${arg}`);
    console.error(`可用分组: ${known.join(', ')}`);
    process.exit(1);
  }
  if (!groups.includes(group)) groups.push(group);
}

const found = [];

if (groups.length === 0) {
  console.log('未指定分组，安装所有 skills...');
  for (const dir of listSkillDirs(repo)) found.push({ name: path.basename(dir), src: dir });
} else {
  console.log(`指定分组: ${groups.join(' ')}`);
  for (const group of groups) {
    const plugin = plugins.find((candidate) => candidate.name.toLowerCase() === group);
    for (const skillPath of plugin.skills) {
      const src = path.resolve(repo, skillPath);
      if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
        found.push({ name: path.basename(src), src });
      }
    }
  }
}

// 同名只装一次，先出现的胜出。
const seen = new Set();
const skills = found.filter((skill) => {
  if (seen.has(skill.name)) return false;
  seen.add(skill.name);
  return true;
});

if (skills.length === 0) die('没有找到要安装的 skills');

const dest = path.join(os.homedir(), '.claude', 'skills');

let destStat = null;
try {
  destStat = fs.lstatSync(dest);
} catch {
  // 尚未创建，下面 mkdir 会建。
}
if (destStat !== null && destStat.isSymbolicLink()) {
  const resolved = fs.realpathSync(dest);
  if (resolved === repo || resolved.startsWith(repo + path.sep)) {
    die(`error: ${dest} 指向本仓库 (${resolved})。删除它再重跑。`);
  }
}

fs.mkdirSync(dest, { recursive: true });

console.log('');
console.log('安装以下 skills:');
for (const { name } of skills) console.log(`  - ${name}`);
console.log('');

for (const { name, src } of skills) {
  const target = path.join(dest, name);
  removeExisting(target);
  // Windows 上 junction 不需要开发者模式；POSIX 用目录符号链接。
  fs.symlinkSync(src, target, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`linked ${name} -> ${src} (${dest})`);
}

console.log('');
console.log(`安装完成！共安装 ${skills.length} 个 skills。`);
