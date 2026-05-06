# e2e/AGENTS.md

Follow the root `AGENTS.md` first. This package owns user-level end-to-end smoke tests only.

## Directory layout

- `specs/`: highest-ROI end-to-end smoke tests suitable for PR or release gating. Keep this layer small and expand it only for regressions that justify always-on signal.
- `tests/`: broader user-level end-to-end coverage, including Vitest checks that intentionally span app/package/resource boundaries. Add feature-depth scenarios here instead of bloating `specs/`.
- `ui/`: Playwright UI automation test files only. Keep helpers and resources out of this directory.
- `resources/`: declarative resources for e2e suites, such as Playwright UI scenario lists.
- `lib/shared.ts`: tiny cross-suite shared helpers only.
- `lib/vitest/`: Vitest-specific helpers.
- `lib/playwright/`: Playwright-specific fixtures, resource accessors, route helpers, and UI actions.
- `scripts/playwright.ts`: Playwright auxiliary subcommands such as artifact cleanup; it must not wrap `playwright test`.

## Naming and tools

- `specs/` files must be `*.spec.ts`.
- `tests/` files must be `*.test.ts`.
- `ui/` files must be flat `*.test.ts` Playwright tests.
- E2E Vitest tests use Node APIs; do not add JSX/TSX, jsdom, or browser-component tests here.
- Web component/runtime tests belong in `apps/web/tests/`.
- E2E tests may validate cross-app/resource consistency, but must not treat one app's private implementation as a shared helper for another app. Keep test-only helpers local to `e2e/lib/` or promote reusable logic to a pure package such as `packages/contracts`.
- E2E imports may use `@/*` for `lib/*`; keep this alias local to the e2e package.

## Commands

Run commands from this directory:

```bash
pnpm test specs/mac.spec.ts
pnpm test specs
pnpm test tests
pnpm typecheck
pnpm exec tsx scripts/playwright.ts clean
pnpm exec playwright test -c playwright.config.ts --list
```

Use a specific file path when validating a single case. Do not add root e2e aliases or extra package scripts for individual cases.
