---
name: html-ppt-zhangzara-neo-grid-bold
description: |
  Neo-Grid Bold — Editorial neo-brutalism with a single neon yellow accent on off-white paper. Anything that should feel confident and editorial-graphic: design-led pitches, brand work, founder talks, conference keynotes.
triggers:
  - "neo-grid-bold"
  - "zhangzara-neo-grid-bold"
  - "Neo-Grid Bold"
  - "confident"
  - "punchy"
  - "bold"
  - "minimal"
  - "product launch"
  - "design review"
  - "html deck"
  - "html slides"
  - "zhangzara"
od:
  mode: deck
  scenario: marketing
  upstream: "https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/neo-grid-bold"
  upstream_license: MIT
  preview:
    type: html
    entry: example.html
  design_system:
    requires: false
  speaker_notes: false
  animations: false
---

# Neo-Grid Bold

> Editorial neo-brutalism with a single neon yellow accent on off-white paper.

A single self-contained HTML deck — typography, palette, decorative system,
and slide vocabulary are all tuned together. Mixing layouts across templates
breaks the system; stay inside this one.

## At a glance

- **Scheme:** light
- **Formality:** medium
- **Density:** high
- **Slides in demo:** 13

## Best for

Anything that should feel confident and editorial-graphic: design-led pitches, brand work, founder talks, conference keynotes. Excellent for stat-heavy slides, comparisons, and process flows. Just as strong for tech, research, or finance when the speaker wants to read as design-led rather than corporate.

## Avoid for

Contexts that need to feel quiet, traditional, or warm — the neon-yellow accent and uppercase display commit to a confident editorial voice.

## Workflow

1. **Clone `example.html`** into the user's workspace as the working file.
2. **Replace placeholder content** with the user's real headlines, body copy,
   numbers, names, dates, and section labels. Match existing dimensions when
   swapping image placeholders.
3. **Preserve the design system.** Never substitute fonts, recolor the palette,
   restructure the layout grid, or strip decorative elements (corner brackets,
   paper grain, geometric shapes, illustrated SVGs). They are part of the
   identity.
4. **Adjust deck length by duplicating layouts.** If the user has more content
   than the demo holds, duplicate an existing slide of the most appropriate
   layout. If less, drop slides from the bottom. Update page-number labels.
5. **Designing missing layouts:** if a slide needs a layout the template
   doesn't have, design it from scratch using the same fonts, palette,
   decorative vocabulary, spacing rhythm, and component grammar — never bail
   to a different template.
6. **Keep the navigation runtime as shipped.** If the deck ships an
   `assets/deck-stage.js` or inline keyboard handler, leave it intact.

## Output contract

Emit between `<artifact>` tags:

```
<artifact identifier="zhangzara-neo-grid-bold" type="text/html" title="Deck Title">
<!doctype html>
<html>...</html>
</artifact>
```

## Source

Vendored from upstream MIT-licensed
[`zarazhangrui/beautiful-html-templates`](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/neo-grid-bold).
See `template.json` for the upstream metadata snapshot.
