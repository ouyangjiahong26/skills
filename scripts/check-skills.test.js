// check-skills.js 的回归测试。
//
// 脚本按自身所在目录的上一级当仓库根，所以每个用例都在临时目录里复制一份
// scripts/，把它做成一个带 origin 的 git 仓库，再在那边跑脚本。

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptsDir = __dirname;
const ORIGIN = 'https://github.com/ouyangjiahong26/skills.git';

function makeRepo(t, files, origin = ORIGIN) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-skills-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  fs.mkdirSync(path.join(dir, 'scripts', 'lib'), { recursive: true });
  fs.copyFileSync(path.join(scriptsDir, 'check-skills.js'), path.join(dir, 'scripts', 'check-skills.js'));
  fs.copyFileSync(path.join(scriptsDir, 'lib', 'find-skills.js'), path.join(dir, 'scripts', 'lib', 'find-skills.js'));

  for (const [name, body] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }

  spawnSync('git', ['init', '-q'], { cwd: dir });
  if (origin !== null) spawnSync('git', ['remote', 'add', 'origin', origin], { cwd: dir });
  return dir;
}

function runCheck(dir) {
  return spawnSync(process.execPath, ['scripts/check-skills.js'], { cwd: dir, encoding: 'utf8' });
}

const SKILL_OK = '---\nname: ok\ndescription: 一个合法的 skill\n---\n正文\n';

test('合法仓库通过', (t) => {
  const dir = makeRepo(t, {
    'README.md': '## 快速开始\n\n```bash\nnpx skills@latest add ouyangjiahong26/skills\n```\n',
    'AGENTS.md': '安装：跑 `npx skills add ouyangjiahong26/skills`，之后 `git pull` 同步。\n',
    'skills/ok/SKILL.md': SKILL_OK,
  });
  const result = runCheck(dir);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
});

test('首屏安装命令指向别的 owner 时失败，即使别处写对了', (t) => {
  const dir = makeRepo(t, {
    'README.md': '```bash\nnpx skills@latest add cislunarspace/skills\n```\n\n3. 重跑 `npx skills add ouyangjiahong26/skills`\n',
    'AGENTS.md': '安装：跑 `npx skills add ouyangjiahong26/skills`。\n',
    'skills/ok/SKILL.md': SKILL_OK,
  });
  const result = runCheck(dir);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /README\.md installs from cislunarspace\/skills/);
});

test('只比仓库名不比 owner 会被抓住（同名不同 owner）', (t) => {
  const dir = makeRepo(t, {
    'README.md': '```bash\nnpx skills add someoneelse/skills\n```\n',
    'AGENTS.md': '安装：跑 `npx skills add git@github.com:ouyangjiahong26/skills.git`。\n',
    'skills/ok/SKILL.md': SKILL_OK,
  });
  const result = runCheck(dir);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /installs from someoneelse\/skills/);
});

test('URL、scp 形式与其它 host 都算同一个仓库', (t) => {
  const dir = makeRepo(
    t,
    {
      'README.md': '```bash\nnpx skills add https://gitlab.com/ouyangjiahong26/skills\n```\n',
      'AGENTS.md': '安装：跑 `npx skills add https://github.com/ouyangjiahong26/skills.git`。\n',
      'skills/ok/SKILL.md': SKILL_OK,
    },
    'git@github.com:ouyangjiahong26/skills.git',
  );
  const result = runCheck(dir);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
});

test('没有安装命令时失败', (t) => {
  const dir = makeRepo(t, {
    'README.md': '# Skills\n\n这里没有任何安装命令。\n',
    'AGENTS.md': '安装：跑 `npx skills add ouyangjiahong26/skills`。\n',
    'skills/ok/SKILL.md': SKILL_OK,
  });
  const result = runCheck(dir);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /README\.md does not reference the current origin/);
});

test('SKILL.md 缺 name 或 description 时失败', (t) => {
  const dir = makeRepo(t, {
    'README.md': '```bash\nnpx skills add ouyangjiahong26/skills\n```\n',
    'AGENTS.md': '安装：跑 `npx skills add ouyangjiahong26/skills`。\n',
    'skills/bad/SKILL.md': '---\ndescription: 只有 description\n---\n',
  });
  const result = runCheck(dir);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /skills\/bad\/SKILL\.md missing name\/description frontmatter/);
});

test('取不到 origin 时失败', (t) => {
  const dir = makeRepo(
    t,
    {
      'README.md': '```bash\nnpx skills add ouyangjiahong26/skills\n```\n',
      'AGENTS.md': '安装：跑 `npx skills add ouyangjiahong26/skills`。\n',
      'skills/ok/SKILL.md': SKILL_OK,
    },
    null,
  );
  const result = runCheck(dir);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /cannot determine origin repo/);
});
