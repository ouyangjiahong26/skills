'use strict';

// sync.test.js：sync.js 单元测试，仅用 Node 内置模块。
// 通过 spawnSync 调起子进程跑 sync.js，并通过 SKILL_DIR 环境变量
// 把 standards.md 重定向到临时目录，从而不污染仓库自身。

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SYNC_JS = path.resolve(__dirname, 'sync.js');

// 一次性建好临时目录，并在测试结束时清理。
function makeTempDir(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
  t.after(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });
  return base;
}

// 在临时目录里构造一份独立的 SKILL_DIR（含 references/standards.md），
// 文本尽量短，便于直观核对。
function makeMockSkillDir(base) {
  const skillDir = path.join(base, 'mock-skill');
  const referencesDir = path.join(skillDir, 'references');
  fs.mkdirSync(referencesDir, { recursive: true });
  fs.writeFileSync(
    path.join(referencesDir, 'standards.md'),
    [
      '# 注入规范原文',
      '',
      '## 交流语言',
      '',
      '始终使用中文与用户交流。',
      '',
      '## 写作要求',
      '',
      '遵守写作原则。',
      '',
      '## 编码准则',
      '',
      '遵守编码准则。',
      '',
    ].join('\n'),
    'utf8'
  );
  return skillDir;
}

function runSync(args, env) {
  return spawnSync(process.execPath, [SYNC_JS, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

// 断言目标文件存在、H1 正确、含三节、无 CR。
function assertTargetFile(targetDir, name) {
  const filePath = path.join(targetDir, name);
  assert.ok(fs.existsSync(filePath), `${name} 应被创建`);
  const content = fs.readFileSync(filePath, 'utf8');
  const firstLine = content.split('\n')[0];
  assert.strictEqual(firstLine, `# ${name}`, `${name} 首行应为 "# ${name}"，实际 "${firstLine}"`);
  for (const title of ['交流语言', '写作要求', '编码准则']) {
    assert.match(content, new RegExp(`## ${title}`), `${name} 应包含 ## ${title}`);
  }
  assert.ok(!content.includes('\r'), `${name} 应无 CR`);
}

test('默认只同步 AGENTS.md，不创建 CLAUDE.md', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const result = runSync([targetDir], { SKILL_DIR: skillDir });
  assert.strictEqual(result.status, 0, `脚本应退出码 0，实际 ${result.status}；stderr=${result.stderr}`);

  assertTargetFile(targetDir, 'AGENTS.md');
  assert.ok(!fs.existsSync(path.join(targetDir, 'CLAUDE.md')), '默认不应创建 CLAUDE.md');
});

test('--file CLAUDE.md 只同步 CLAUDE.md', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const result = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(result.status, 0, `脚本应退出码 0，实际 ${result.status}；stderr=${result.stderr}`);

  assertTargetFile(targetDir, 'CLAUDE.md');
  assert.ok(!fs.existsSync(path.join(targetDir, 'AGENTS.md')), '不应创建 AGENTS.md');
});

test('--file 无效值时报错且不写目标文件', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const result = runSync([targetDir, '--file', 'README.md'], { SKILL_DIR: skillDir });
  assert.notStrictEqual(result.status, 0, `应非零退出，实际 ${result.status}`);
  assert.match(result.stderr, /--file/, `stderr 应指出 --file 问题；实际：${result.stderr}`);
  assert.ok(!fs.existsSync(path.join(targetDir, 'AGENTS.md')), '失败时不应创建 AGENTS.md');
  assert.ok(!fs.existsSync(path.join(targetDir, 'CLAUDE.md')), '失败时不应创建 CLAUDE.md');
});

test('替换同名节并保留自定义内容', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const claudeFile = path.join(targetDir, 'CLAUDE.md');
  fs.writeFileSync(
    claudeFile,
    [
      '# CLAUDE.md',
      '',
      '## 交流语言',
      '',
      '旧的交流语言内容。',
      '',
      '## 自定义节',
      '',
      '这是自定义内容，不应被删除。',
      '',
    ].join('\n'),
    'utf8'
  );

  const result = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(result.status, 0, `脚本应退出码 0，实际 ${result.status}；stderr=${result.stderr}`);

  const content = fs.readFileSync(claudeFile, 'utf8');
  assert.ok(!content.includes('旧的交流语言内容'), '旧 ## 交流语言 应被替换');
  assert.ok(content.includes('始终使用中文与用户交流'), '新 ## 交流语言 内容应存在');
  assert.ok(content.includes('## 自定义节'), '## 自定义节 标题应被保留');
  assert.ok(content.includes('这是自定义内容'), '自定义节正文应被保留');
  assert.ok(!content.includes('\r'), '输出应无 CR');
});

test('CRLF 行尾归一化为 LF', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const claudeFile = path.join(targetDir, 'CLAUDE.md');
  const crlf = '# CLAUDE.md\r\n\r\n## 交流语言\r\n\r\n旧的 CRLF 内容\r\n';
  fs.writeFileSync(claudeFile, crlf, 'utf8');

  const result = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(result.status, 0, `脚本应退出码 0，实际 ${result.status}；stderr=${result.stderr}`);

  const buf = fs.readFileSync(claudeFile);
  assert.ok(!buf.includes(0x0d), '目标文件字节流中不应出现 CR (0x0d)');
  const content = buf.toString('utf8');
  assert.ok(content.includes('## 交流语言'), '目标文件仍应包含 ## 交流语言');
  assert.ok(!content.includes('旧的 CRLF 内容'), '旧内容应被替换');
  assert.ok(content.includes('始终使用中文与用户交流'), '新内容应存在');
});

test('幂等：连续运行两次文件内容一致', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const claudeFile = path.join(targetDir, 'CLAUDE.md');

  const r1 = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(r1.status, 0, `首次运行应成功，实际 ${r1.status}；stderr=${r1.stderr}`);
  const first = fs.readFileSync(claudeFile, 'utf8');

  const r2 = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(r2.status, 0, `再次运行应成功，实际 ${r2.status}；stderr=${r2.stderr}`);
  const second = fs.readFileSync(claudeFile, 'utf8');

  assert.strictEqual(second, first, '第二次运行后文件内容应与第一次完全一致');

  // 源 standards.md 也应保持 LF
  const standardsBuf = fs.readFileSync(path.join(skillDir, 'references', 'standards.md'));
  assert.ok(!standardsBuf.includes(0x0d), 'standards.md 应保持 LF 行尾');
});

test('standards.md 缺失时失败并报错到 stderr', (t) => {
  const base = makeTempDir(t);
  const emptySkill = path.join(base, 'empty-skill');
  fs.mkdirSync(path.join(emptySkill, 'references'), { recursive: true });
  // 注意：references/ 下不放 standards.md
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const result = runSync([targetDir], { SKILL_DIR: emptySkill });
  assert.notStrictEqual(result.status, 0, `脚本应非零退出，实际 ${result.status}`);
  assert.match(result.stderr, /错误/, `stderr 应含 "错误"；实际：${result.stderr}`);

  // 不应写出目标文件
  assert.ok(!fs.existsSync(path.join(targetDir, 'AGENTS.md')), '失败时不应创建 AGENTS.md');
  assert.ok(!fs.existsSync(path.join(targetDir, 'CLAUDE.md')), '失败时不应创建 CLAUDE.md');
});

test('目标目录不存在时失败并报错到 stderr', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'nonexistent-target');

  const result = runSync([targetDir], { SKILL_DIR: skillDir });
  assert.notStrictEqual(result.status, 0, `脚本应非零退出，实际 ${result.status}`);
  assert.match(result.stderr, /错误/, `stderr 应含 "错误"；实际：${result.stderr}`);
});

test('追加缺失节时保留非空行的末尾空格', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);
  const targetDir = path.join(base, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  const claudeFile = path.join(targetDir, 'CLAUDE.md');
  // 自定义内容；最后一行带两个尾随空格，且文件里不含标准三节。
  const beforeContent = [
    '# CLAUDE.md',
    '',
    '## 自定义节',
    '',
    '最后一行带两个尾随空格  ', // 行末两个空格
    '',
  ].join('\n');
  fs.writeFileSync(claudeFile, beforeContent, 'utf8');

  const result = runSync([targetDir, '--file', 'CLAUDE.md'], { SKILL_DIR: skillDir });
  assert.strictEqual(result.status, 0, `脚本应退出码 0；stderr=${result.stderr}`);

  const content = fs.readFileSync(claudeFile, 'utf8');
  assert.ok(
    content.includes('最后一行带两个尾随空格  '),
    `自定义末行的两个尾随空格应保留：\n${content}`
  );
  // 三节应已追加进来
  for (const title of ['交流语言', '写作要求', '编码准则']) {
    assert.ok(content.includes(`## ${title}`), `应含 ## ${title}`);
  }
  // 顺手核一下没引入 CR
  assert.ok(!content.includes('\r'), '输出应无 CR');
});

test('目标路径是普通文件时退出且报错明确', (t) => {
  const base = makeTempDir(t);
  const skillDir = makeMockSkillDir(base);

  // 把一个普通文件作为"目标目录"传入
  const fakeTarget = path.join(base, 'not-a-dir.txt');
  fs.writeFileSync(fakeTarget, 'hello', 'utf8');

  const result = runSync([fakeTarget], { SKILL_DIR: skillDir });

  assert.notStrictEqual(result.status, 0, `应非零退出，实际 ${result.status}`);
  assert.match(result.stderr, /错误/, `stderr 应含 "错误"；实际：${result.stderr}`);
  // 应明确指出目标路径有问题（不是 Node stack 中的 ENOTDIR）
  assert.ok(
    result.stderr.includes('目标') &&
      (result.stderr.includes('不存在') || result.stderr.includes('不是目录')),
    `stderr 应明确指出目标路径问题；实际：${result.stderr}`
  );
  // 不应有未捕获的 Node stack frames
  assert.ok(
    !/at .+\(.+:\d+:\d+\)/.test(result.stderr),
    `stderr 不应含 Node stack frames；实际：${result.stderr}`
  );
});
