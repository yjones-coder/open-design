# research/

> **状态**:**未接入主干**。本目录是 `docs/research/openwork-aionui-alaude-integration.md` 调研的最小代码起点,作为后续 PR 的形态参考,**不被 `server.ts` / `cli.ts` import**,也不参与运行时。

## 内容

| 文件 | 来源调研项 | 用途 |
|---|---|---|
| `memory-schema.ts` | P0-A:Memory 子系统 | `memories` 表的 SQL migration 草稿 + TypeScript 类型 + 工具函数草稿 |
| `audit-log.ts` | P1-1:Audit log per project | JSONL append-only writer + reader,接 openwork `apps/server/src/audit.ts` 形态 |
| `skill-hub.ts` | P0-C:Skill Hub | GitHub-as-registry 的 list/install fetcher,接 openwork `apps/server/src/skill-hub.ts` 形态 |

## 接入路径(后续 PR)

每个文件都是独立模块。接入主干的工作量:

1. **`memory-schema.ts`** → 把 `MEMORIES_DDL` 加到 `db.ts` 的 `migrate()`;在 `runs.ts` / `claude-stream.ts` 等 spawn agent 的位置调用 `injectMemoryPrefix()`;在 `packages/contracts/src/api/` 加 `MemoryEntry` DTO + `/api/memories/*` 路由的 zod schema。
2. **`audit-log.ts`** → 在 `server.ts` 每个 mutation 路由的 success 分支调用 `appendAuditEntry()`;加 `GET /api/projects/:id/audit?limit=50` 路由读最近 N 条;`packages/contracts` 加 `AuditEntry` DTO。
3. **`skill-hub.ts`** → 在 `server.ts` 加 `GET /api/skill-hub/list` + `POST /api/skill-hub/install`;`packages/contracts` 加 `HubSkill` DTO;`apps/web` 加 SkillHubBrowser 组件。

## 删除时机

任意一项接入主干后,把对应文件从本目录移走(到 `apps/daemon/src/<module>.ts`),并更新 `AGENTS.md` 与 `docs/spec.md`。当本目录所有文件都接入或确认放弃时,整个 `research/` 目录连同此 README 一并删除。

## 边界保护

- 这些文件**不写 `@ts-nocheck`**,严格遵守 daemon "TypeScript-first" 约束(maintainability-roadmap R1/W3)。
- 不依赖 `server.ts` 内部的全局状态;每个函数都接受显式入参(`db`、`projectRoot`、配置等)。
- 副作用只发生在被调用时;import 本目录任意文件不会触发副作用。
