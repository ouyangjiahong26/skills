#!/usr/bin/env node
// 回归检查：
// 1. README / AGENTS.md 里出现的**每条**安装命令都必须指向当前仓库的 origin。
// 2. 每个 SKILL.md 必须有 name 和 description 的 YAML frontmatter。

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { listSkillDirs } = require('./lib/find-skills');

const repo = path.resolve(__dirname, '..');

// 仓库身份取 owner/repo（末两段）：owner/repo、https://host/owner/repo(.git)、
// git@host:owner/repo(.git) 都归一到同一把键。只比末段会放过 owner 不同的同名仓库。
function refKey(ref) {
  const parts = ref.replace(/\.git$/, '').split(/[/:]/).filter(Boolean);
  return parts.slice(-2).join('/');
}

function originRemote() {
  let url = '';
  try {
    url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // 不在 git 仓库里，或没有 origin。
  }
  return { url, key: refKey(url) };
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

// 安装命令（`npx skills[@版本] add <仓库引用>`）里抓仓库引用。引用由路径/URL 字符
// 组成，遇到反引号、引号或空白即结束——README 里这些命令多数包在反引号中。
// 只用 matchAll 取值，不在本正则上调用 test/exec，避免共享 lastIndex。
const INSTALL_COMMAND = /npx skills(?:@[\w.-]+)?\s+add\s+([\w./:@-]+)/g;

const { url, key: originKey } = originRemote();
if (originKey === '') {
  console.error(`error: cannot determine origin repo (git remote get-url origin: ${url || '无输出'})`);
  process.exit(1);
}

let badRefs = 0;
for (const name of ['README.md', 'AGENTS.md']) {
  const text = readText(path.join(repo, name));
  const refs = text === null ? [] : [...text.matchAll(INSTALL_COMMAND)].map((match) => refKey(match[1]));
  if (refs.length === 0) {
    console.error(`error: ${name} does not reference the current origin (${originKey})`);
    badRefs++;
    continue;
  }
  // 每条安装命令都算数：只改首屏那条、别处留着旧仓库名，同样要挂。
  const wrong = [...new Set(refs.filter((ref) => ref !== originKey))];
  if (wrong.length > 0) {
    console.error(`error: ${name} installs from ${wrong.join(', ')} instead of ${originKey}`);
    badRefs++;
  }
}

let badSkills = 0;
for (const dir of listSkillDirs(repo)) {
  const file = path.join(dir, 'SKILL.md');
  const text = fs.readFileSync(file, 'utf8');
  if (!/^name:/m.test(text) || !/^description:/m.test(text)) {
    console.error(`error: ${path.relative(repo, file).split(path.sep).join('/')} missing name/description frontmatter`);
    badSkills++;
  }
}

if (badRefs > 0 || badSkills > 0) process.exit(1);

console.log('ok: repo references and skill frontmatter are consistent');
