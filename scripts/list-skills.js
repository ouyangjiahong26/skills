#!/usr/bin/env node
// 列出仓库内的所有 skill。

const path = require('node:path');
const { listSkillDirs } = require('./lib/find-skills');

const repo = path.resolve(__dirname, '..');

// 输出相对仓库根的 SKILL.md 路径（统一用 /，与平台无关），排序后每行一个。
const lines = listSkillDirs(repo)
  .map((dir) => path.relative(repo, dir).split(path.sep).join('/') + '/SKILL.md')
  .sort();

if (lines.length > 0) console.log(lines.join('\n'));
