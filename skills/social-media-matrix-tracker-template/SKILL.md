---
name: social-media-matrix-tracker-template
description: |
  社媒矩阵数据追踪面板模板（Social Media Matrix Tracker）。
  Use when users ask for a cinematic, data-dense social media analytics dashboard
  with multi-platform metrics, interactive charts, hover insights, range compare,
  and dark/light theme switching in a single HTML artifact.
triggers:
  - "social media matrix tracker"
  - "social media dashboard template"
  - "creator analytics template"
  - "live social dashboard"
  - "社媒矩阵数据追踪面板"
  - "社媒矩阵看板模板"
  - "社交媒体数据追踪模板"
od:
  mode: template
  platform: desktop
  scenario: live-artifacts
  featured: 1
  preview:
    type: html
    entry: index.html
    reload: debounce-100
  design_system:
    requires: true
    sections: [color, typography, layout, components]
  outputs:
    primary: index.html
    secondary:
      - template.html
      - example.html
  example_prompt: "Create a social media matrix tracker dashboard template using my DESIGN.md. Keep the cinematic glassmorphism style, multi-chart analytics sections, hover tooltips, pin/drag range analysis, and light/dark switching."
  capabilities_required:
    - file_write
---

# Social Media Matrix Tracker Template

Ship a premium, cinematic social-media analytics template with high data density and production-grade micro-interactions.

## Resource map

```text
social-media-matrix-tracker-template/
├── SKILL.md
├── assets/
│   └── template.html
├── references/
│   └── checklist.md
└── example.html
```

## Workflow

1. Read active `DESIGN.md` first, map tokens to CSS variables, then adapt `assets/template.html`.
2. Keep the structural information architecture intact: hero + platform matrix + KPI strip + multi-chart deep sections.
3. Preserve interaction fidelity:
   - dark/light theme toggle
   - hover tooltip on charts
   - click-to-pin chart point
   - drag interval analysis
   - Shift+drag multi-range compare
   - insights panel live updates
4. Ensure template remains self-contained (single HTML with inline CSS/JS, no framework dependency).
5. Keep default sample data realistic and internally consistent across cards/charts.
6. Validate with `references/checklist.md` before emitting the artifact.

## Output contract

One sentence before artifact, then:

```xml
<artifact identifier="social-media-matrix-tracker" type="text/html" title="Social Media Matrix Tracker">
<!doctype html>
<html>...</html>
</artifact>
```
