---
name: html-ppt-xhs-post
description: 小红书 / Instagram 风 9 页 3:4 竖版图文（810×1080）— 暖色 pastel、虚线 sticker 卡片、底部页码点点。用于发小红书图文、Instagram carousel、品牌种草内容。
triggers:
  - "小红书"
  - "xhs"
  - "xhs post"
  - "xiaohongshu"
  - "图文"
  - "instagram carousel"
  - "种草"
od:
  mode: deck
  scenario: marketing
  featured: 24
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "帮我用 html-ppt-xhs-post 模板做一组 9 张小红书图文（3:4 竖版，810×1080）。先告诉我主题，然后帮我把封面 + 7 页内容 + 结尾 CTA 排好，每页一句标题 + 一段正文 + 关键词 sticker。"
---
# HTML PPT · 小红书 图文

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`xhs-post`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `xhs-post` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/xhs-post/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-xhs-post` body class.
3. **Pull shared assets via relative paths** (`../../../assets/fonts.css`,
   `../../../assets/base.css`, `../../../assets/animations/animations.css`,
   `../../../assets/runtime.js`). Don't fork these files per project.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-xhs-post` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.
