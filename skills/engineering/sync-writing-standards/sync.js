#!/usr/bin/env node
'use strict';

// sync.js：把 references/standards.md 三节注入目标仓库的 AGENTS.md / CLAUDE.md。
//
// 用法: node sync.js [目标仓库根目录] [--file AGENTS.md|CLAUDE.md]
//   不传目录默认 process.cwd()；--file 缺省 AGENTS.md。
//
// 仅依赖 Node 标准库（fs / path），跨 Windows / macOS / Linux。

const fs = require('node:fs');
const path = require('node:path');

const SECTION_TITLES = ['交流语言', '写作要求', '编码准则'];
// --file 参数值（大写化后）→ 目标文件名，兼做合法值校验。
const FILE_MAP = { 'AGENTS.MD': 'AGENTS.md', 'CLAUDE.MD': 'CLAUDE.md' };

// ---- 输出 ----

function log(msg) {
  process.stdout.write(msg + '\n');
}

function die(msg) {
  process.stderr.write(`错误：${msg}\n`);
  process.exit(1);
}

// ---- 行尾处理 ----

function normalizeLF(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function readLF(filePath) {
  return normalizeLF(fs.readFileSync(filePath, 'utf8'));
}

function writeLF(filePath, content) {
  fs.writeFileSync(filePath, normalizeLF(content));
}

function countCR(filePath) {
  const buf = fs.readFileSync(filePath);
  let n = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d) n++;
  }
  return n;
}

// 剥掉文件末尾的空白行，保留非空行末尾的空格。
function stripTrailingBlankLines(content) {
  const lines = content.split('\n');
  while (lines.length > 0 && /^\s*$/.test(lines[lines.length - 1])) {
    lines.pop();
  }
  return lines.join('\n');
}

// ---- 段落抽取 ----

// 从文本里抽一段 `## TITLE` 节：起于匹配行，止于下一个 `## ` 行或独立 `---` 行；
// 再去掉尾部空行。返回值不含尾随换行。
function extractSection(content, title) {
  const lines = content.split('\n');
  const header = `## ${title}`;
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === header) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i]) || /^---\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const sectionLines = lines.slice(startIdx, endIdx);
  while (
    sectionLines.length > 0 &&
    sectionLines[sectionLines.length - 1].trim() === ''
  ) {
    sectionLines.pop();
  }
  return sectionLines.join('\n');
}

// 把 newSection（已含 `## TITLE` 起始行，且无尾随空行）注入 content：
//   - 若 `## TITLE` 已存在：从该行起，到下一个 `## ` / 独立 `---` 之前替换；
//     与下一段间补一个空行。
//   - 若不存在：去掉尾部空白行后追加，恰好一个空行分隔；
//     空文件则只写 `newSection\n`。
function injectSection(content, title, newSection) {
  const lines = content.split('\n');
  const header = `## ${title}`;
  const existingIdx = lines.indexOf(header);

  if (existingIdx === -1) {
    const trimmed = stripTrailingBlankLines(content);
    if (trimmed === '') return newSection + '\n';
    return trimmed + '\n\n' + newSection + '\n';
  }

  let endIdx = lines.length;
  for (let i = existingIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i]) || /^---\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const newLines = newSection.split('\n');
  const before = lines.slice(0, existingIdx);
  const after = lines.slice(endIdx);

  // 确保节末有换行，保证幂等性。
  if (after.length > 0 && newLines[newLines.length - 1] !== '') {
    newLines.push('');
  }

  let result = [...before, ...newLines, ...after].join('\n');
  if (!result.endsWith('\n')) result += '\n';
  return result;
}

// 确保第一行是预期的 `# NAME` H1：已有 H1 标题则替换内容；否则在开头插入标题和空行。
function ensureH1(content, expected) {
  const lines = content.split('\n');
  if (lines[0] === expected) return content;
  if (/^# /.test(lines[0])) {
    lines[0] = expected;
    return lines.join('\n');
  }
  return [expected, '', content].join('\n');
}

// ---- 参数解析 ----

// 解析命令行参数：第一个位置参数是目标目录；--file / -f 指定目标文件
// （AGENTS.md / CLAUDE.md，大小写不敏感），缺省 AGENTS.md。
function parseArgs(argv) {
  const parsed = { targetDir: undefined, file: 'AGENTS.md' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--file' || arg === '-f') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        die('--file 需要一个参数值: AGENTS.md / CLAUDE.md');
      }
      const key = value.toUpperCase();
      if (!(key in FILE_MAP)) {
        die(`无效的 --file 值 "${value}"，可选 AGENTS.md / CLAUDE.md`);
      }
      parsed.file = FILE_MAP[key];
      i++;
    } else if (parsed.targetDir === undefined) {
      parsed.targetDir = arg;
    } else {
      die(`无法识别的参数: ${arg}`);
    }
  }
  return parsed;
}

// ---- 流程 ----

function run() {
  const skillDir = process.env.SKILL_DIR || path.dirname(__filename);
  const parsed = parseArgs(process.argv.slice(2));
  const targetDir = parsed.targetDir || process.cwd();
  const targetFiles = [parsed.file];
  const standardsPath = path.join(skillDir, 'references', 'standards.md');

  // standards.md 必须存在且是普通文件。
  const standardsStat = fs.statSync(standardsPath, { throwIfNoEntry: false });
  if (!standardsStat) {
    die(`缺少 ${standardsPath}`);
  }
  if (!standardsStat.isFile()) {
    die(`${standardsPath} 不是普通文件`);
  }

  // 目标必须是已存在的目录。
  const targetStat = fs.statSync(targetDir, { throwIfNoEntry: false });
  if (!targetStat) {
    die(`目标目录不存在: ${targetDir}`);
  }
  if (!targetStat.isDirectory()) {
    die(`目标路径不是目录: ${targetDir}`);
  }

  log('==> 归一化源文件行尾 (LF)');
  writeLF(standardsPath, readLF(standardsPath));

  log('==> 抽取三节原文');
  const standardsContent = readLF(standardsPath);
  const sourceSections = {};
  for (const title of SECTION_TITLES) {
    const section = extractSection(standardsContent, title);
    if (!section) die(`standards.md 缺 ## ${title}`);
    sourceSections[title] = section;
  }

  log(`==> 目标文件: ${targetFiles.join(' + ')}`);
  for (const name of targetFiles) {
    const filePath = path.join(targetDir, name);
    if (!fs.existsSync(filePath)) {
      log(`==> ${name}: 不存在，创建并注入三节`);
      fs.writeFileSync(filePath, '');
    } else {
      log(`==> ${name}: 已存在，替换/追加三节`);
    }

    let content = readLF(filePath);
    for (const title of SECTION_TITLES) {
      content = injectSection(content, title, sourceSections[title]);
    }

    const before = content;
    content = ensureH1(content, `# ${name}`);
    if (before !== content) log(`    H1 标题 → # ${name}`);

    writeLF(filePath, content);
  }

  log('==> 归一化目标文件行尾 (LF)');
  for (const name of targetFiles) {
    const filePath = path.join(targetDir, name);
    writeLF(filePath, readLF(filePath));
  }

  log('==> 验证');
  for (const filePath of [
    standardsPath,
    ...targetFiles.map((n) => path.join(targetDir, n)),
  ]) {
    if (countCR(filePath) > 0) die(`${filePath} 含 CR`);
  }
  for (const name of targetFiles) {
    const filePath = path.join(targetDir, name);
    const content = readLF(filePath);
    const lines = content.split('\n');
    const expected = `# ${name}`;
    if (lines[0] !== expected) die(`${filePath} 第一行应为 ${expected}`);
    for (const title of SECTION_TITLES) {
      const got = extractSection(content, title);
      if (got !== sourceSections[title]) {
        die(`${filePath} 的 ## ${title} 与 standards.md 不一致`);
      }
    }
  }

  log('完成。');
  for (const name of targetFiles) {
    log(`  ${path.join(targetDir, name)}`);
  }
}

run();
