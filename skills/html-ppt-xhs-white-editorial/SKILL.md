---
name: html-ppt-xhs-white-editorial
description: 白底杂志风 deck — 纯白背景 + 顶部 10 色彩虹 bar、80-110px display 标题、紫→蓝→绿→橙→粉渐变文字、马卡龙软卡片组（粉/紫/蓝/绿/橙）、黑底白字 .focus pill、引用大块。同时适合发小红书图文 + 横版 PPT 双用。
triggers:
  - "白底杂志"
  - "杂志风"
  - "xhs editorial"
  - "white editorial"
  - "小红书白底"
  - "editorial deck"
od:
  mode: deck
  scenario: marketing
  featured: 27
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "用 html-ppt-xhs-white-editorial 模板做一份白底杂志风 PPT，中文优先。要点：80-110px display 大标题、彩虹顶部 bar、马卡龙软卡片、黑底白字 .focus pill。先告诉我主题和受众，再写 8-12 页。"
---
# HTML PPT · 白底杂志风

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`xhs-white-editorial`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `xhs-white-editorial` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/xhs-white-editorial/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-xhs-white-editorial` body class.
3. **Pull shared assets via relative paths** (`../../../assets/fonts.css`,
   `../../../assets/base.css`, `../../../assets/animations/animations.css`,
   `../../../assets/runtime.js`). Don't fork these files per project.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-xhs-white-editorial` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.
