---
name: html-ppt-pitch-deck
description: Investor-ready 10-slide HTML pitch deck — white + blue→purple gradient hero, big numbers, traction bar chart, $4.5M-style ask page. Use when the user wants a fundraising deck, seed-round pitch, or VC meeting slides.
triggers:
  - "pitch deck"
  - "pitch"
  - "fundraising"
  - "seed round"
  - "investor deck"
  - "vc deck"
  - "pitch slides"
od:
  mode: deck
  scenario: finance
  featured: 20
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "Build a 10-slide pitch deck in HTML for my seed round. Use the html-ppt-pitch-deck full-deck template (white + blue→purple gradient, traction bars, $X.XM ask). Confirm three things first: (1) name + one-line pitch, (2) key traction numbers, (3) ask + use of funds."
---
# HTML PPT · Pitch Deck

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`pitch-deck`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `pitch-deck` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/pitch-deck/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-pitch-deck` body class.
3. **Pull shared assets via relative paths** (`../../../assets/fonts.css`,
   `../../../assets/base.css`, `../../../assets/animations/animations.css`,
   `../../../assets/runtime.js`). Don't fork these files per project.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-pitch-deck` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.
