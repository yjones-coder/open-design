---
name: live-artifact
description: |
  Create refreshable, auditable Open Design artifacts backed by connector or local data.
  Trigger when the user asks for live dashboards, refreshable reports, synced views, or reusable data-backed artifacts.
triggers:
  - "live artifact"
  - "refreshable dashboard"
  - "live report"
  - "synced view"
  - "可刷新"
  - "实时看板"
od:
  mode: prototype
  preview:
    type: html
    entry: index.html
    reload: debounce-100
  design_system:
    requires: true
  outputs:
    primary: index.html
    secondary:
      - template.html
      - artifact.json
      - data.json
      - provenance.json
  capabilities_required:
    - shell
    - file_write
---

# Live Artifact Skill

Create an Open Design live artifact: a project-scoped, previewable HTML artifact whose data can later be refreshed without redesigning the presentation.

## Resource map

```
live-artifact/
├── SKILL.md
└── references/
    ├── artifact-schema.md      ← artifact files, DTO shape, template binding rules
    ├── connector-policy.md     ← connector safety, redaction, credential boundaries
    └── refresh-contract.md     ← refresh permissions, source metadata, snapshots
```

## Current status

Use the references in this directory as the source of truth for the live artifact file contract. Prefer daemon wrapper commands over raw HTTP when registering or updating live artifacts.
