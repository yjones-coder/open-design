---
name: html-ppt-testing-safety-alert
description: 红琥珀警示 deck — 顶/底 45° 红黑 hazard 条纹、红色删除线否定标题、L1/L2/L3 绿/琥珀/红 tier 卡片、圆点状态 alert box、policy-yaml 代码块（红左边框 + bad 关键词高亮）、红绿 checklist、Q1 事故堆叠柱状图。适合安全 / 风险 / 事故复盘 / 红队 / 上线前 AI 评审 / policy-as-code。
triggers:
  - "safety alert"
  - "incident"
  - "red team"
  - "risk review"
  - "事故复盘"
  - "安全评审"
  - "policy as code"
od:
  mode: deck
  scenario: engineering
  featured: 32
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "用 html-ppt-testing-safety-alert 模板做一份事故复盘 / 安全评审 PPT。红黑 hazard 条 + 红色删除线 + L1/L2/L3 tier 卡片 + policy-yaml 代码块。先告诉我事件时间线、根因、影响范围。"
---
# HTML PPT · 红琥珀警示

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`testing-safety-alert`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `testing-safety-alert` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/testing-safety-alert/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-testing-safety-alert` body class.
3. **Pull shared assets via relative paths** (`../../../assets/fonts.css`,
   `../../../assets/base.css`, `../../../assets/animations/animations.css`,
   `../../../assets/runtime.js`). Don't fork these files per project.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-testing-safety-alert` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.
