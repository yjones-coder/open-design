# AGENTS.md

## Current implementation boundary

- This worktree is the active implementation target for desktop integration.
- The old desktop branch/worktree is reference-only. Copy proven files from it when useful, but do not edit that worktree.
- `apps/web` is the web runtime. Do not reintroduce `apps/nextjs`.
- `apps/daemon` is the local privileged daemon. Desktop discovers the web URL through sidecar IPC.

## Project shape

- pnpm workspace packages come from `pnpm-workspace.yaml`: `apps/web`, `apps/daemon`, `apps/desktop`, `packages/contracts`, `packages/sidecar-proto`, `packages/sidecar`, `packages/platform`, `tools/dev`, and `e2e`.
- Runtime target is Node `~24` with `pnpm@10.33.2`; use Corepack so the pinned pnpm version from `package.json` is selected.
- `apps/web` is a Next.js 16 App Router + React 18 client. Entrypoints: `apps/web/app/`, main client shell `apps/web/src/App.tsx`.
- `packages/contracts` is the shared, pure TypeScript web/daemon app contract layer for API DTOs, SSE events, task states, and unified errors.
- `apps/daemon` is the local Express + SQLite process and the `od` bin (`apps/daemon/dist/cli.js` after build). It owns `/api/*`, agent spawning, skills, design systems, artifacts, and static serving.
- `e2e` contains both Playwright UI specs (`e2e/specs`) and Vitest/jsdom integration tests (`e2e/tests`).

## Command policy

- Use `pnpm tools-dev` as the only local development lifecycle entry point.
- Do not add or use root lifecycle aliases such as `pnpm dev`, `pnpm dev:all`, `pnpm daemon`, `pnpm preview`, or `pnpm start`.
- Quality commands may remain root scripts (`pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm test:ui`, `pnpm check:residual-js`).

## tools-dev lifecycle

```bash
pnpm tools-dev                 # background start: daemon + web + desktop
pnpm tools-dev start web       # background start: daemon + web
pnpm tools-dev run web         # foreground daemon + web, used by Playwright webServer
pnpm tools-dev status
pnpm tools-dev logs
pnpm tools-dev stop
pnpm tools-dev restart
pnpm tools-dev inspect desktop status
pnpm tools-dev inspect desktop screenshot --path /tmp/open-design.png
pnpm tools-dev check
```

Port flags are authoritative:

```bash
pnpm tools-dev run web --daemon-port 17456 --web-port 17573
```

Internally, `tools-dev` exports `OD_PORT` for the daemon/web proxy target and `OD_WEB_PORT` for the web listener. Do not use `NEXT_PORT`.

## Sidecar stamp boundary

- Sidecar process stamps have exactly five fields: `app`, `mode`, `namespace`, `ipc`, and `source`.
- `@open-design/sidecar-proto` owns the Open Design sidecar business protocol: valid app/mode/source constants, namespace validation, stamp fields/flags, IPC message schema, status shapes, and error semantics.
- `@open-design/sidecar` owns generic sidecar runtime primitives such as bootstrap, IPC transport, path resolution, JSON runtime files, and launch env assembly. It must not hard-code Open Design app keys or IPC messages.
- `@open-design/platform` owns generic OS process stamp serialization, command parsing, and process matching/search primitives. It must consume a descriptor from `@open-design/sidecar-proto` instead of hard-coding `--od-stamp-*` details.
- Orchestration layers such as `tools-dev`, future `tools-pack`, and packaged launchers must call the package primitives. Do not hand-build `--od-stamp-*` args or process-scan regexes in orchestration code.
- Do not reintroduce runtime tokens, process roles, or duplicate process namespace/source args into the stamp boundary.

## Sidecar path boundary

- Default runtime files live under `<project-root>/.tmp/<source>/<namespace>/...` (for example `.tmp/tools-dev/default/logs/web/latest.log`).
- IPC sockets are namespace/app singletons at `/tmp/open-design/ipc/<namespace>/<app>.sock` on POSIX. Do not add workspace hashes or hidden runtime tokens to IPC names.
- Open Design-specific path constants belong in `@open-design/sidecar-proto`; generic path and IPC resolvers belong in `@open-design/sidecar` and consume the protocol descriptor.
- App business logic must not import sidecar packages or branch on `runtime.mode`, `namespace`, `ipc`, or `source`. Keep sidecar awareness in `apps/<app>/sidecar` or the desktop sidecar entry wrapper.

## TypeScript and app boundary conventions

- New project-owned entrypoints, modules, scripts, tests, reporters, and configs use TypeScript. The residual JavaScript allowlist is limited to generated output, vendored dependencies, and documented compatibility build artifacts such as `apps/daemon/dist/**/*.{js,mjs,cjs}`, `apps/web/.next/**/*.{js,mjs,cjs}`, `apps/web/out/**/*.{js,mjs,cjs}`, and the explicit entries in `scripts/check-residual-js.ts`.
- Shared web/daemon app contracts go in `packages/contracts`; keep this package free of Next.js, Express, Node filesystem/process APIs, browser APIs, SQLite, daemon internals, and sidecar control-plane protocol.
- Keep UI-only state and presentation unions in `apps/web`; import daemon-facing API, SSE, task, and error contracts from `@open-design/contracts`.
- Keep local capability logic in `apps/daemon`: filesystem, SQLite, agent CLI spawning, task lifecycle, logs, artifacts, skills, design systems, and static serving.
- Runtime validation policy and schema enforcement belong to the later validation workstream; current shared contracts define the typed target shape.

## Runtime data and ports

- The daemon auto-creates local data under `.od/` by default: SQLite at `.od/app.sqlite`, per-project agent CWDs at `.od/projects/<id>/`, saved renders at `.od/artifacts/`.
- Keep `.od/`, `.tmp/`, `e2e/.od-data`, Playwright reports, and agent scratch dirs out of git; `.gitignore` covers these paths.
- `OD_DATA_DIR` relocates daemon data relative to the repo root; Playwright uses this for isolated runs.
- In local `tools-dev` web runs, `apps/web/next.config.ts` rewrites `/api/*`, `/artifacts/*`, and `/frames/*` to `OD_PORT`. In production, the daemon serves `apps/web/out/` directly.

## Agent, skill, and design-system wiring

- The daemon scans `PATH` for local CLIs in `apps/daemon/src/agents.ts` and spawns them with `cwd` pinned to `.od/projects/<id>/`.
- Agent stdout parsing is per transport: Claude stream JSON, Copilot stream JSON, ACP JSON-RPC, or plain text. Changes to CLI args belong in `apps/daemon/src/agents.ts` and matching parser tests.
- Skills are folder bundles under `skills/` with `SKILL.md`; extended `od:` frontmatter is parsed by `apps/daemon/src/skills.ts`. Restart the daemon after adding or changing skill folders.
- Design systems are `design-systems/*/DESIGN.md`; `scripts/sync-design-systems.ts` re-imports upstream systems.
- Prompt composition lives in `apps/web/src/prompts/system.ts`, `discovery.ts`, and `directions.ts`; artifacts are parsed/rendered through `apps/web/src/artifacts/` and `apps/web/src/runtime/`.

## Testing notes

- Web Vitest includes `apps/web/src/**/*.test.{ts,tsx}` in a Node environment.
- Daemon Vitest includes `apps/daemon/**/*.test.{ts,tsx}` in a Node environment.
- E2E Vitest includes `e2e/tests/**/*.test.{ts,tsx}` in jsdom with automatic React JSX.
- Playwright uses Chromium only, writes reports under `e2e/reports/`, and starts `pnpm tools-dev run web` with isolated data under `e2e/.od-data` and strict explicit ports.
- Live adapter smoke: `pnpm test:e2e:live` runs `e2e/scripts/runtime-adapter.e2e.live.test.ts` through Node strip-types.

## Validation expectations

- After package or command changes, run `pnpm install` so workspace links and generated dist entries are fresh.
- Run `pnpm typecheck` and `pnpm test` before considering the change ready.
- For web/e2e loop validation, prefer `pnpm tools-dev run web --daemon-port <port> --web-port <port>`.
- For desktop validation on a GUI-capable machine, run `pnpm tools-dev`, then inspect with `pnpm tools-dev inspect desktop status`.
- Stamp/namespace changes must also pass two concurrent namespaces with desktop `inspect eval` and `inspect screenshot` for each namespace.
- Path/log changes must include `pnpm tools-dev logs --namespace <name> --json` for each concurrent namespace and confirm log paths are under `.tmp/tools-dev/<namespace>/...`.
