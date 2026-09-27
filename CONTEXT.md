# Context

## Skill

A self-contained unit of agent behaviour, defined by a `SKILL.md` (YAML frontmatter: `name`, `description` required; `argument-hint`, `disable-model-invocation` optional) and optional supplementary files at the skill root. Each skill lives at `skills/<group>/<name>/`, grouped as `engineering` or `productivity`.

## Plugin

A manifest at `.claude-plugin/marketplace.json` grouping skill paths under `plugins[]` (Engineering, Productivity). Lets the repo be loaded as a unit by agent harnesses that read the plugin format.

## Linking

Installing means creating symlinks from `~/.claude/skills` back into `skills/<group>/<name>/` in this repo. Symlinks make the repo the single source of truth: `git pull` updates the installed copies. Run `npm run link` to (re)create them.