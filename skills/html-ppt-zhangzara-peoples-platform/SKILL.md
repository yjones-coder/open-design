---
name: html-ppt-zhangzara-peoples-platform
description: |
  People's Platform (Block & Bold) — Activist poster energy: blue, orange, red on cream, with Alfa Slab + Caveat Brush. Anything that should feel honest, loud, and graphic: cultural commentary, manifestos, civic and community decks, design talks, campaign pitches.
triggers:
  - "peoples-platform"
  - "zhangzara-peoples-platform"
  - "People's Platform (Block & Bold)"
  - "activist"
  - "loud"
  - "punchy"
  - "direct"
  - "cultural commentary"
  - "manifesto"
  - "html deck"
  - "html slides"
  - "zhangzara"
od:
  mode: deck
  scenario: marketing
  upstream: "https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/peoples-platform"
  upstream_license: MIT
  preview:
    type: html
    entry: example.html
  design_system:
    requires: false
  speaker_notes: false
  animations: false
---

# People's Platform (Block & Bold)

> Activist poster energy: blue, orange, red on cream, with Alfa Slab + Caveat Brush.

A single self-contained HTML deck — typography, palette, decorative system,
and slide vocabulary are all tuned together. Mixing layouts across templates
breaks the system; stay inside this one.

## At a glance

- **Scheme:** light
- **Formality:** medium-low
- **Density:** medium-high
- **Slides in demo:** 10

## Best for

Anything that should feel honest, loud, and graphic: cultural commentary, manifestos, civic and community decks, design talks, campaign pitches. Excellent for founder-vision moments, mission statements, or any deck — including across industries — that wants protest-poster energy instead of corporate polish.

## Avoid for

Contexts where institutional restraint is the actual goal — the saturated political-poster palette commits hard to expressive energy.

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
<artifact identifier="zhangzara-peoples-platform" type="text/html" title="Deck Title">
<!doctype html>
<html>...</html>
</artifact>
```

## Source

Vendored from upstream MIT-licensed
[`zarazhangrui/beautiful-html-templates`](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/peoples-platform).
See `template.json` for the upstream metadata snapshot.
