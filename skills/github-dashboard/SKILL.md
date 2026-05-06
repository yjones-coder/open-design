---
name: github-dashboard
description: |
  GitHub repository analytics dashboard — stars, forks, contributors,
  issues, pull requests, recent activity, and top contributors. Use when
  the brief asks for a GitHub repo dashboard, open-source growth report,
  repository health page, or GitHub analytics view.
triggers:
  - "github dashboard"
  - "repo dashboard"
  - "repository dashboard"
  - "github analytics"
  - "open source dashboard"
  - "github growth"
  - "仓库看板"
  - "GitHub 看板"
od:
  mode: prototype
  platform: desktop
  scenario: operation
  preview:
    type: html
    entry: index.html
  design_system:
    requires: true
    sections: [color, typography, layout, components]
  outputs:
    primary: index.html
    secondary:
      - data.json
      - provenance.json
  capabilities_required:
    - shell
    - file_write
  example_prompt: "Build a GitHub dashboard for nexu-io/open-design — stars, forks, contributors, issues, PRs, recent activity, and top contributors."
---

# GitHub Dashboard Skill

Create a single-screen GitHub repository analytics dashboard in the FlowAI / Soft Paper Workspace visual style: warm off-white canvas, white rounded panels, a fixed left sidebar, compact KPI cards, pastel pills, dense tables, and low-contrast hairlines.

## Resource map

```
github-dashboard/
├── SKILL.md
├── example.html                         ← rendered reference dashboard
└── references/
    ├── template.html                    ← live-artifact-compatible HTML template
    ├── example-data.json                ← normalized public GitHub data shape
    └── provenance-example.json          ← safe source/provenance example
```

## When to use this skill

Use this when the user asks for a dashboard or report about one or more GitHub repositories, for example:

- repository growth dashboard
- open-source project health report
- GitHub stars / forks / contributors analytics
- issue and pull-request activity page
- maintainer / contributor dashboard

If the user asks for refreshability, source auditability, or scheduled updates, produce the live-artifact source set (`template.html`, `data.json`, `artifact.json`, `provenance.json`) and follow the `live-artifact` contract. If they only need a visual artifact, produce a self-contained `index.html`.

## Workflow

1. **Resolve repository scope**
   - Parse `owner/repo` from the brief. If multiple repositories are requested, decide whether to show them as a comparison table or an aggregate org dashboard.
   - If the repo is missing, ask one concise question for the GitHub URL or `owner/repo`.

2. **Collect public GitHub data**
   - Prefer GitHub CLI/API for public repository data when available.
   - Useful read-only endpoints: `GET /repos/{owner}/{repo}`, `GET /repos/{owner}/{repo}/contributors`, `GET /repos/{owner}/{repo}/issues`, `GET /repos/{owner}/{repo}/pulls`, and `GET /repos/{owner}/{repo}/stats/participation`.
   - Do not store auth tokens, raw HTTP envelopes, cookies, rate-limit headers, or private metadata.

3. **Normalize into dashboard data**
   - Required `repository`: `name`, `fullName`, `description`, `language`, `license`, `created`, `lastUpdated`.
   - Required `metrics`: stars, forks, contributors, issues, pull requests. Store display-ready totals plus small deltas or growth notes.
   - Required `contributors`: top 5–8 contributors with `login`, `avatar`, and `contributions`.
   - Required `recentActivity`: recent issues/PRs with title, type, author, avatar, status label, and relative timestamp.
   - Chart data can be synthetic only when GitHub does not expose the exact history; document the transformation in provenance.

4. **Apply the visual system**
   - Use the active `DESIGN.md` tokens when present.
   - If no design system is provided, use the Soft Paper defaults reflected in `references/template.html`: `#F2F2F0` canvas, white cards, `#ECECEA` borders, `#0A0A0A` ink, Geist/Inter typography, 256px sidebar, 48px topbar, and 16px card radius.
   - Keep color small and semantic: green for healthy metrics, amber for warning, blue for feature/PR labels, red only for defects or risk.

5. **Lay out the page**
   - Shell: 256px sidebar + main panel, both white, rounded 16px, 1px hairline border.
   - Topbar: repo context on the left, refresh/export/action affordances on the right.
   - Header: repository name, description, and date/settings/actions row.
   - KPI strip: 5 compact cards for stars, forks, contributors, issues, PRs.
   - Main grid: 2fr/1fr split with a growth chart or activity table on the left and top contributors/health cards on the right.
   - Footer: provenance/last-updated note in small muted text.

6. **Write the artifact**
   - For a static artifact, write one self-contained `index.html` with inline CSS and no external JS libraries.
   - For a live artifact, write `template.html`, `data.json`, `artifact.json`, and `provenance.json`; `index.html` is derived by the daemon.
   - Tag major regions with stable `data-od-id` values: `sidebar`, `topbar`, `repo-header`, `kpi-strip`, `growth-chart`, `contributors`, `activity`, `provenance`.

## Visual rules

- Light mode only.
- 256px fixed sidebar on desktop; stack on narrow screens.
- 4 or 5 KPI cards in the first row.
- Use tabular lining numerals for all counts.
- Avatars are circular, 28–32px in tables and contributor lists.
- Tables use 13px body text, 11px uppercase column labels, 1px row dividers.
- Cards use hairline borders and a barely visible shadow at most: `0 1px 2px rgba(10,10,10,.04), 0 1px 1px rgba(10,10,10,.02)`.
- Do not use gradients except tiny workflow/repo icon placeholders.
- Do not make the page look like GitHub itself. This is a custom operational dashboard, not a GitHub UI clone.

## Self-check

- Every metric has a source or a provenance note.
- No private data or credentials are persisted.
- Data labels are specific to the repository, not placeholders.
- The screen still reads clearly at 50% zoom.
- The dashboard uses at most one solid black primary action per area.
- Status labels and issue/PR chips are pastel pills, not saturated badges.
