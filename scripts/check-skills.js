#!/usr/bin/env node
// 回归检查：
// 1. README / AGENTS.md 里的安装命令必须指向当前仓库的 origin。
//    文件可以是单行整文件指针（内容就是另一个文件名），此时跟随它再查。
// 2. 每个 SKILL.md 必须有 name 和 description 的 YAML frontmatter。

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { listSkillDirs } = require('./lib/find-skills');

const repo = path.resolve(__dirname, '..');

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
  // 兼容 https://host/owner/repo(.git) 与 git@host:owner/repo(.git)。
  const name = url.replace(/\.git$/, '').split(/[/:]/).filter(Boolean).pop() ?? '';
  return { url, name };
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 单行文件视为指针，跟随一次（CLAUDE.md -> AGENTS.md）。
function resolvePointer(file) {
  const text = readText(file);
  if (text === null) return file;
  if (text.split('\n').length - 1 > 1) return file;
  const pointer = text.replace(/\s/g, '');
  if (pointer === '') return file;
  const candidate = path.resolve(repo, pointer);
  return candidate !== file && isFile(candidate) ? candidate : file;
}

const { url, name: originName } = originRemote();
if (originName === '') {
  console.error(`error: cannot determine origin repo name (git remote get-url origin: ${url || '无输出'})`);
  process.exit(1);
}

let badRefs = 0;
const refPattern = new RegExp(`npx skills add \\S+/${escapeRegExp(originName)}`);
for (const name of ['README.md', 'AGENTS.md']) {
  const file = path.join(repo, name);
  const target = resolvePointer(file);
  const text = readText(target);
  if (text === null || !refPattern.test(text)) {
    console.error(`error: ${name} does not reference the current origin (${originName})`);
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
