---
name: html-ppt-obsidian-claude-gradient
description: GitHub 暗紫渐变 deck — GitHub-dark #0d1117 + 紫蓝 radial 环境光 + 60px 网格 mask、居中布局、紫色 pill 标签、三色渐变标题（#a855f7→#60a5fa→#34d399）、GitHub 风代码 palette、紫色左边框高亮块。适合开发者工作流 / MCP / Agent / dev tool 教程，类似 GitHub Blog / Linear Changelog。
triggers:
  - "github dark"
  - "developer tutorial"
  - "mcp tutorial"
  - "agent tutorial"
  - "dev workflow"
  - "changelog deck"
od:
  mode: deck
  scenario: engineering
  featured: 31
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "用 html-ppt-obsidian-claude-gradient 模板做一份开发者教程 PPT。GitHub 暗紫渐变 + 居中布局 + 紫色 pill + 三色渐变标题 + 配置/步骤代码块。先确认：教什么、目标受众、要不要 MCP/Agent 配置示例。"
---
# HTML PPT · GitHub 暗紫渐变

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`obsidian-claude-gradient`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `obsidian-claude-gradient` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/obsidian-claude-gradient/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-obsidian-claude-gradient` body class.
3. **Pull shared assets via relative paths** (`../../../assets/fonts.css`,
   `../../../assets/base.css`, `../../../assets/animations/animations.css`,
   `../../../assets/runtime.js`). Don't fork these files per project.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-obsidian-claude-gradient` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.
