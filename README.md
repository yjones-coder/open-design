# Open Design

> **The open-source alternative to [Claude Design][cd].** Local-first, web-deployable, BYOK at every layer — your existing coding agent (Claude Code, Codex, Cursor Agent, Gemini CLI, OpenCode, Qwen, GitHub Copilot CLI) becomes the design engine, driven by **19 composable Skills** and **71 brand-grade Design Systems**.

<p align="center">
  <img src="docs/assets/banner.png" alt="Open Design — editorial cover: design with the agent on your laptop" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
  <a href="#supported-coding-agents"><img alt="Agents" src="https://img.shields.io/badge/agents-Claude%20%7C%20Codex%20%7C%20Cursor%20%7C%20Gemini%20%7C%20OpenCode%20%7C%20Qwen%20%7C%20Copilot-black" /></a>
  <a href="#design-systems"><img alt="Design systems" src="https://img.shields.io/badge/design%20systems-71-orange" /></a>
  <a href="#skills"><img alt="Skills" src="https://img.shields.io/badge/skills-19-teal" /></a>
  <a href="QUICKSTART.md"><img alt="Quickstart" src="https://img.shields.io/badge/quickstart-3%20commands-green" /></a>
</p>

<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

---

## Why this exists

Anthropic's [Claude Design][cd] (released 2026-04-17, Opus 4.7) showed what happens when an LLM stops writing prose and starts shipping design artifacts. It went viral — and stayed closed-source, paid-only, cloud-only, locked to Anthropic's model and Anthropic's skills. There is no checkout, no self-host, no Vercel deploy, no swap-in-your-own-agent.

**Open Design (OD) is the open-source alternative.** Same loop, same artifact-first mental model, none of the lock-in. We don't ship an agent — the strongest coding agents already live on your laptop. We wire them into a skill-driven design workflow that runs on `pnpm dev`, deploys to Vercel, and stays BYOK at every layer.

Type `make me a magazine-style pitch deck for our seed round`. The interactive question form pops up before the model improvises a single pixel. The agent picks one of five curated visual directions. A live `TodoWrite` plan streams into the UI. The daemon builds a real on-disk project folder with a seed template, layout library, and self-check checklist. The agent reads them — pre-flight enforced — runs a five-dimensional critique against its own output, and emits a single `<artifact>` that renders in a sandboxed iframe seconds later.

That's not "AI tries to design something". That's an AI that has been trained, by the prompt stack, to behave like a senior designer with a working filesystem, a deterministic palette library, and a checklist culture — exactly the bar Claude Design set, but open and yours.

OD stands on four open-source shoulders:

- [**`alchaincyf/huashu-design`**](https://github.com/alchaincyf/huashu-design) — the design-philosophy compass. Junior-Designer workflow, the 5-step brand-asset protocol, the anti-AI-slop checklist, the 5-dimensional self-critique, and the "5 schools × 20 design philosophies" idea behind our direction picker — all distilled into [`apps/web/src/prompts/discovery.ts`](apps/web/src/prompts/discovery.ts).
- [**`op7418/guizang-ppt-skill`**](https://github.com/op7418/guizang-ppt-skill) — the deck mode. Bundled verbatim under [`skills/guizang-ppt/`](skills/guizang-ppt/) with original LICENSE preserved; magazine-style layouts, WebGL hero, P0/P1/P2 checklists.
- [**`OpenCoworkAI/open-codesign`**](https://github.com/OpenCoworkAI/open-codesign) — the UX north star and our closest peer. The first open-source Claude-Design alternative. We borrow its streaming-artifact loop, its sandboxed-iframe preview pattern (vendored React 18 + Babel), its live agent panel (todos + tool calls + interruptible generation), and its five-format export list (HTML / PDF / PPTX / ZIP / Markdown). We deliberately diverge on form factor — they are a desktop Electron app bundling [`pi-ai`][piai]; we are a web app + local daemon that delegates to your existing CLI.
- [**`multica-ai/multica`**](https://github.com/multica-ai/multica) — the daemon-and-runtime architecture. PATH-scan agent detection, the local daemon as the only privileged process, the agent-as-teammate worldview.

## At a glance

| | What you get |
|---|---|
| **Coding agents supported** | Claude Code · Codex CLI · Cursor Agent · Gemini CLI · OpenCode · Qwen Code · GitHub Copilot CLI · Anthropic API (BYOK fallback) |
| **Design systems built-in** | **71** — 2 hand-authored starters + 69 product systems (Linear, Stripe, Vercel, Airbnb, Tesla, Notion, Anthropic, Apple, Cursor, Supabase, Figma, …) imported from [`awesome-design-md`][acd2] |
| **Skills built-in** | **19** — prototype, deck, mobile, dashboard, pricing, docs, blog, SaaS landing, plus 10 document/work-product templates (PM spec, weekly update, OKRs, runbook, kanban, …) |
| **Visual directions** | 5 curated schools (Editorial Monocle · Modern Minimal · Tech Utility · Brutalist · Soft Warm) — each ships a deterministic OKLch palette + font stack |
| **Device frames** | iPhone 15 Pro · Pixel · iPad Pro · MacBook · Browser Chrome — pixel-accurate, shared across screens |
| **Agent runtime** | Local daemon spawns the CLI in your project folder — agent gets real `Read`, `Write`, `Bash`, `WebFetch` against a real on-disk environment |
| **Deployable to** | Local (`pnpm dev`) · Vercel · Single-process prod (`npm start`) |
| **License** | Apache-2.0 |

[acd2]: https://github.com/VoltAgent/awesome-design-md

## Demo

<table>
<tr>
<td width="50%">
<img src="docs/screenshots/01-entry-view.png" alt="01 · Entry view" /><br/>
<sub><b>Entry view</b> — pick a skill, pick a design system, type the brief. The same surface for prototypes, decks, mobile apps, dashboards, and editorial pages.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/02-question-form.png" alt="02 · Turn-1 discovery form" /><br/>
<sub><b>Turn-1 discovery form</b> — before the model writes a pixel, OD locks the brief: surface, audience, tone, brand context, scale. 30 seconds of radios beats 30 minutes of redirects.</sub>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/screenshots/03-direction-picker.png" alt="03 · Direction picker" /><br/>
<sub><b>Direction picker</b> — when the user has no brand, the agent emits a second form with 5 curated directions (Monocle / Modern Minimal / Tech Utility / Brutalist / Soft Warm). One radio click → a deterministic palette + font stack, no model freestyle.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/04-todo-progress.png" alt="04 · Live todo progress" /><br/>
<sub><b>Live todo progress</b> — the agent's plan streams as a live card. <code>in_progress</code> → <code>completed</code> updates land in real time. The user can redirect cheaply, mid-flight.</sub>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/screenshots/05-preview-iframe.png" alt="05 · Sandboxed preview" /><br/>
<sub><b>Sandboxed preview</b> — every <code>&lt;artifact&gt;</code> renders in a clean srcdoc iframe. Editable in place via the file workspace; downloadable as HTML, PDF, ZIP.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/06-design-systems-library.png" alt="06 · 71-system library" /><br/>
<sub><b>71-system library</b> — every product system shows its 4-color signature. Click for the full <code>DESIGN.md</code>, swatch grid, and live showcase.</sub>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/screenshots/07-magazine-deck.png" alt="07 · Magazine deck" /><br/>
<sub><b>Deck mode (guizang-ppt)</b> — the bundled <a href="https://github.com/op7418/guizang-ppt-skill"><code>guizang-ppt-skill</code></a> drops in unchanged. Magazine layouts, WebGL hero backgrounds, single-file HTML output, PDF export.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/08-mobile-app.png" alt="08 · Mobile prototype" /><br/>
<sub><b>Mobile prototype</b> — pixel-accurate iPhone 15 Pro chrome (Dynamic Island, status bar SVGs, home indicator). Multi-screen prototypes use the shared <code>/frames/</code> assets so the agent never re-draws a phone.</sub>
</td>
</tr>
</table>

## Skills

19 skills ship in the box. Each is a folder under [`skills/`](skills/) following the Claude Code [`SKILL.md`][skill] convention with an extended `od:` frontmatter (`mode`, `platform`, `scenario`, `preview`, `design_system`).

### Showcase examples

The visually distinctive skills you'll most likely run first. Each ships a real `example.html` you can open straight from the repo to see exactly what the agent will produce — no auth, no setup.

<table>
<tr>
<td width="50%" valign="top">
<a href="skills/dating-web/"><img src="docs/screenshots/skills/dating-web.png" alt="dating-web" /></a><br/>
<sub><b><a href="skills/dating-web/"><code>dating-web</code></a></b> · <i>prototype</i><br/>Consumer dating / matchmaking dashboard — left rail nav, ticker bar, KPIs, 30-day mutual-matches chart, editorial typography.</sub>
</td>
<td width="50%" valign="top">
<a href="skills/digital-eguide/"><img src="docs/screenshots/skills/digital-eguide.png" alt="digital-eguide" /></a><br/>
<sub><b><a href="skills/digital-eguide/"><code>digital-eguide</code></a></b> · <i>template</i><br/>Two-spread digital e-guide — cover (title, author, TOC teaser) + lesson spread with pull-quote and step list. Creator / lifestyle tone.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="skills/email-marketing/"><img src="docs/screenshots/skills/email-marketing.png" alt="email-marketing" /></a><br/>
<sub><b><a href="skills/email-marketing/"><code>email-marketing</code></a></b> · <i>prototype</i><br/>Brand product-launch HTML email — masthead, hero image, headline lockup, CTA, specs grid. Centered single-column, table-fallback safe.</sub>
</td>
<td width="50%" valign="top">
<a href="skills/gamified-app/"><img src="docs/screenshots/skills/gamified-app.png" alt="gamified-app" /></a><br/>
<sub><b><a href="skills/gamified-app/"><code>gamified-app</code></a></b> · <i>prototype</i><br/>Three-frame gamified mobile-app prototype on a dark showcase stage — cover, today's quests with XP ribbons + level bar, quest detail.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="skills/mobile-onboarding/"><img src="docs/screenshots/skills/mobile-onboarding.png" alt="mobile-onboarding" /></a><br/>
<sub><b><a href="skills/mobile-onboarding/"><code>mobile-onboarding</code></a></b> · <i>prototype</i><br/>Three-frame mobile onboarding flow — splash, value-prop, sign-in. Status bar, swipe dots, primary CTA.</sub>
</td>
<td width="50%" valign="top">
<a href="skills/motion-frames/"><img src="docs/screenshots/skills/motion-frames.png" alt="motion-frames" /></a><br/>
<sub><b><a href="skills/motion-frames/"><code>motion-frames</code></a></b> · <i>prototype</i><br/>Single-frame motion-design hero with looping CSS animations — rotating type ring, animated globe, ticking timer. Hand-off ready for HyperFrames.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<a href="skills/social-carousel/"><img src="docs/screenshots/skills/social-carousel.png" alt="social-carousel" /></a><br/>
<sub><b><a href="skills/social-carousel/"><code>social-carousel</code></a></b> · <i>prototype</i><br/>Three-card 1080×1080 social-media carousel — cinematic panels with display headlines that connect across the series, brand mark, loop affordance.</sub>
</td>
<td width="50%" valign="top">
<a href="skills/sprite-animation/"><img src="docs/screenshots/skills/sprite-animation.png" alt="sprite-animation" /></a><br/>
<sub><b><a href="skills/sprite-animation/"><code>sprite-animation</code></a></b> · <i>prototype</i><br/>Pixel / 8-bit animated explainer slide — full-bleed cream stage, animated pixel mascot, kinetic Japanese display type, looping CSS keyframes.</sub>
</td>
</tr>
</table>

### Design surfaces

| Skill | Mode | Default for | What it produces |
|---|---|---|---|
| [`web-prototype`](skills/web-prototype/) | prototype | desktop | Single-page HTML — landings, marketing, hero pages |
| [`saas-landing`](skills/saas-landing/) | prototype | desktop | Hero / features / pricing / CTA marketing layout |
| [`dashboard`](skills/dashboard/) | prototype | desktop | Admin / analytics with sidebar + data dense layout |
| [`pricing-page`](skills/pricing-page/) | prototype | desktop | Standalone pricing + comparison tables |
| [`docs-page`](skills/docs-page/) | prototype | desktop | 3-column documentation layout |
| [`blog-post`](skills/blog-post/) | prototype | desktop | Editorial long-form |
| [`mobile-app`](skills/mobile-app/) | prototype | mobile | iPhone 15 Pro / Pixel framed app screen(s) |
| [`simple-deck`](skills/simple-deck/) | deck | desktop | Minimal horizontal-swipe deck |
| [`guizang-ppt`](skills/guizang-ppt/) | deck | **default** for deck | Magazine-style web PPT — bundled from [op7418/guizang-ppt-skill][guizang] |

### Document / work-product surfaces

| Skill | Mode | What it produces |
|---|---|---|
| [`pm-spec`](skills/pm-spec/) | template | PM specification doc with TOC + decision log |
| [`weekly-update`](skills/weekly-update/) | template | Team weekly with progress / blockers / next |
| [`meeting-notes`](skills/meeting-notes/) | template | Meeting decision log |
| [`eng-runbook`](skills/eng-runbook/) | template | Incident runbook |
| [`finance-report`](skills/finance-report/) | template | Exec finance summary |
| [`hr-onboarding`](skills/hr-onboarding/) | template | Role onboarding plan |
| [`invoice`](skills/invoice/) | template | Single-page invoice |
| [`kanban-board`](skills/kanban-board/) | template | Board snapshot |
| [`team-okrs`](skills/team-okrs/) | template | OKR scoresheet |

Adding a skill takes one folder. Read [`docs/skills-protocol.md`](docs/skills-protocol.md) for the extended frontmatter, fork an existing skill, restart the daemon, it appears in the picker.

## Six load-bearing ideas

### 1 · We don't ship an agent. Yours is good enough.

The daemon scans your `PATH` for [`claude`](https://docs.anthropic.com/en/docs/claude-code), [`codex`](https://github.com/openai/codex), [`cursor-agent`](https://www.cursor.com/cli), [`gemini`](https://github.com/google-gemini/gemini-cli), [`opencode`](https://opencode.ai/), [`qwen`](https://github.com/QwenLM/qwen-code), and [`copilot`](https://github.com/features/copilot/cli) on startup. Whichever it finds becomes the design engine — driven via stdio, with one adapter per CLI. Inspired by [`multica`](https://github.com/multica-ai/multica) and [`cc-switch`](https://github.com/farion1231/cc-switch). No CLI? `Anthropic API · BYOK` is the same pipeline minus the spawn.

### 2 · Skills are files, not plugins.

Following Claude Code's [`SKILL.md` convention](https://docs.anthropic.com/en/docs/claude-code/skills), each skill is `SKILL.md` + `assets/` + `references/`. Drop a folder into [`skills/`](skills/), restart the daemon, it appears in the picker. The bundled `magazine-web-ppt` is [`op7418/guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) committed verbatim — original license preserved, attribution preserved.

### 3 · Design Systems are portable Markdown, not theme JSON.

The 9-section `DESIGN.md` schema from [`VoltAgent/awesome-design-md`][acd2] — color, typography, spacing, layout, components, motion, voice, brand, anti-patterns. Every artifact reads from the active system. Switch system → next render uses the new tokens. The dropdown ships with **Linear, Stripe, Vercel, Airbnb, Tesla, Notion, Apple, Anthropic, Cursor, Supabase, Figma, Resend, Raycast, Lovable, Cohere, Mistral, ElevenLabs, X.AI, Spotify, Webflow, Sanity, PostHog, Sentry, MongoDB, ClickHouse, Cal, Replicate, Clay, Composio…** — 71 in total.

### 4 · The interactive question form prevents 80% of redirects.

OD's prompt stack hard-codes a `RULE 1`: every fresh design brief begins with a `<question-form id="discovery">` instead of code. Surface · audience · tone · brand context · scale · constraints. A long brief still leaves design decisions open — visual tone, color stance, scale — exactly the things the form locks down in 30 seconds. The cost of a wrong direction is one chat round, not one finished deck.

This is the **Junior-Designer mode** distilled from [`huashu-design`](https://github.com/alchaincyf/huashu-design): batch the questions up front, show something visible early (even a wireframe with grey blocks), let the user redirect cheaply. Combined with the brand-asset protocol (locate · download · `grep` hex · write `brand-spec.md` · vocalise), it's the single biggest reason output stops feeling like AI freestyle and starts feeling like a designer who paid attention before painting.

### 5 · The daemon makes the agent feel like it's on your laptop, because it is.

The daemon spawns the CLI with `cwd` set to the project's artifact folder under `.od/projects/<id>/`. The agent gets `Read`, `Write`, `Bash`, `WebFetch` — real tools against a real filesystem. It can `Read` the skill's `assets/template.html`, `grep` your CSS for hex values, write a `brand-spec.md`, drop generated images, and produce `.pptx` / `.zip` / `.pdf` files that show up in the file workspace as download chips when the turn ends. Sessions, conversations, messages, tabs persist in a local SQLite DB — pop the project open tomorrow and the agent's todo card is right where you left it.

### 6 · The prompt stack is the product.

What you compose at send time isn't "system + user". It's:

```
DISCOVERY directives  (turn-1 form, turn-2 brand branch, TodoWrite, 5-dim critique)
  + identity charter   (OFFICIAL_DESIGNER_PROMPT, anti-AI-slop, junior-pass)
  + active DESIGN.md   (71 systems available)
  + active SKILL.md    (19 skills available)
  + project metadata   (kind, fidelity, speakerNotes, animations, inspiration ids)
  + skill side files   (auto-injected pre-flight: read assets/template.html + references/*.md)
  + (deck kind, no skill seed) DECK_FRAMEWORK_DIRECTIVE   (nav / counter / scroll / print)
```

Every layer is composable. Every layer is a file you can edit. Read [`apps/web/src/prompts/system.ts`](apps/web/src/prompts/system.ts) and [`apps/web/src/prompts/discovery.ts`](apps/web/src/prompts/discovery.ts) to see the actual contract.

## Architecture

```
┌────────────────────────── browser ─────────────────────────────┐
│                                                                │
│   Next.js 16 App Router  (chat · file workspace · iframe preview) │
│                                                                │
└──────────────┬───────────────────────────────────┬─────────────┘
               │ /api/* (rewritten in dev)         │ direct (BYOK)
               ▼                                   ▼
   ┌──────────────────────┐              ┌──────────────────────┐
   │   Local daemon       │              │   Anthropic SDK      │
   │   (Express + SQLite) │              │   (browser fallback) │
   │                      │              └──────────────────────┘
   │   /api/agents        │
   │   /api/skills        │
   │   /api/design-systems│
   │   /api/projects/...  │
   │   /api/chat (SSE)    │
   │                      │
   └─────────┬────────────┘
             │ spawn(cli, [...], { cwd: .od/projects/<id> })
             ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │  claude · codex · cursor-agent · gemini · opencode · qwen · copilot│
   │  reads SKILL.md + DESIGN.md, writes artifacts to disk              │
   └────────────────────────────────────────────────────────────────────┘
```

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 App Router + React 18 + TypeScript |
| Daemon | Node 20–22 · Express · SSE streaming · `better-sqlite3` for projects/conversations/messages/tabs |
| Agent transport | `child_process.spawn` with typed-event parsers for Claude Code (`claude-stream-json`) and Copilot CLI (`copilot-stream-json`); line-buffered plain stdout for the rest |
| Storage | Plain files in `.od/projects/<id>/` + SQLite at `.od/db.sqlite` (gitignored) |
| Preview | Sandboxed iframe via `srcdoc` + per-skill `<artifact>` parser |
| Export | HTML (inline assets) · PDF (browser print) · PPTX (skill-defined) · ZIP (archiver) |

## Quickstart

```bash
git clone https://github.com/nexu-io/open-design.git
cd open-design
nvm use              # uses Node 22 from .nvmrc
corepack enable
pnpm install
pnpm dev:all         # daemon (:7456) + Next dev (:3000)
open http://localhost:3000
```

The first load:

1. Detects which agent CLIs you have on `PATH` and picks one automatically.
2. Loads 19 skills + 71 design systems.
3. Pops the welcome dialog so you can paste an Anthropic key (only needed for the BYOK fallback path).
4. **Auto-creates `./.od/`** — the local runtime folder for the SQLite project DB, per-project artifacts, and saved renders. There is no `od init` step; the daemon `mkdir`s everything it needs on boot.

Type a prompt, hit **Send**, watch the question form arrive, fill it, watch the todo card stream, watch the artifact render. Click **Save to disk** or download as a project ZIP.

### First-run state (`./.od/`)

The daemon owns one hidden folder at the repo root. Everything in it is gitignored and machine-local — never commit it.

```
.od/
├── app.sqlite                 ← projects · conversations · messages · open tabs
├── artifacts/                 ← one-off "Save to disk" renders (timestamped)
└── projects/<id>/             ← per-project working dir, also the agent's cwd
```

| Want to… | Do this |
|---|---|
| Inspect what's in there | `ls -la .od && sqlite3 .od/app.sqlite '.tables'` |
| Reset to a clean slate | stop the daemon, `rm -rf .od`, run `pnpm dev:all` again |
| Move it elsewhere | not supported yet — the path is hard-coded relative to the repo |

Full file map, scripts, and troubleshooting → [`QUICKSTART.md`](QUICKSTART.md).

## Repository structure

```
open-design/
├── README.md                      ← this file
├── README.zh-CN.md                ← 简体中文
├── QUICKSTART.md                  ← run / build / deploy guide
├── package.json                   ← pnpm workspace, single bin: od
│
├── daemon/                        ← Node + Express, the only server
│   ├── cli.js                     ← `od` bin entry point
│   ├── server.js                  ← /api/* routes (projects, chat, files, exports)
│   ├── agents.js                  ← PATH scanner + per-CLI argv builders
│   ├── claude-stream.js           ← streaming JSON parser for Claude Code stdout
│   ├── skills.js                  ← SKILL.md frontmatter loader
│   ├── design-systems.js          ← DESIGN.md loader + swatch extractor
│   ├── design-system-preview.js   ← live one-shot showcase per system
│   ├── design-system-showcase.js  ← multi-section gallery render
│   ├── lint-artifact.js           ← P0/P1 self-check on agent output
│   ├── projects.js                ← per-project filesystem helpers
│   ├── db.js                      ← SQLite schema (projects/messages/templates/tabs)
│   └── frontmatter.js             ← zero-dep YAML-subset parser
│
├── app/                           ← Next.js 16 App Router entrypoints
│   ├── layout.tsx                 ← root layout shell
│   ├── page.tsx                   ← main app entry
│   └── [[...slug]]/page.tsx       ← catch-all client shell for project routes
│
├── src/                           ← shared React + TS client modules for Next.js
│   ├── App.tsx                    ← routing, bootstrap, settings
│   ├── components/                ← 27 components (chat, composer, picker, preview, sketch, …)
│   ├── prompts/
│   │   ├── system.ts              ← composeSystemPrompt(base, skill, DS, metadata)
│   │   ├── official-system.ts     ← identity charter
│   │   ├── discovery.ts           ← turn-1 form + turn-2 branch + 5-dim critique
│   │   ├── directions.ts          ← 5 visual directions × OKLch palette + font stack
│   │   └── deck-framework.ts      ← deck nav / counter / print stylesheet
│   ├── artifacts/
│   │   ├── parser.ts              ← streaming <artifact> tag extractor
│   │   └── question-form.ts       ← <question-form> JSON schema + replay
│   ├── runtime/
│   │   ├── srcdoc.ts              ← iframe sandbox wrapper
│   │   ├── markdown.tsx           ← assistant message renderer
│   │   ├── exports.ts             ← HTML / PDF / ZIP export helpers
│   │   └── zip.ts                 ← project archive
│   ├── providers/
│   │   ├── daemon.ts              ← /api/chat SSE stream consumer
│   │   ├── anthropic.ts           ← BYOK Anthropic SDK path
│   │   └── registry.ts            ← /api/agents, /api/skills, /api/design-systems
│   └── state/                     ← config + projects (localStorage + daemon-backed)
│
├── skills/                        ← 19 SKILL.md skill bundles
│   ├── web-prototype/             ← default for prototype mode
│   ├── saas-landing/              ← marketing page (hero / features / pricing / CTA)
│   ├── dashboard/                 ← admin / analytics
│   ├── pricing-page/              ← standalone pricing + comparison
│   ├── docs-page/                 ← 3-column documentation
│   ├── blog-post/                 ← editorial long-form
│   ├── mobile-app/                ← phone-frame screen(s)
│   ├── simple-deck/               ← horizontal-swipe minimal
│   ├── guizang-ppt/               ← bundled magazine-web-ppt (default for deck)
│   │   ├── SKILL.md
│   │   ├── assets/template.html   ← seed
│   │   └── references/{themes,layouts,components,checklist}.md
│   ├── pm-spec/                   ← PM specification doc
│   ├── weekly-update/             ← team weekly
│   ├── meeting-notes/             ← decision log
│   ├── eng-runbook/               ← incident / runbook
│   ├── finance-report/            ← exec summary
│   ├── hr-onboarding/             ← role onboarding
│   ├── invoice/                   ← single-page invoice
│   ├── kanban-board/              ← board snapshot
│   ├── mobile-onboarding/         ← multi-screen mobile flow
│   └── team-okrs/                 ← OKR scoresheet
│
├── design-systems/                ← 71 DESIGN.md systems
│   ├── default/                   ← Neutral Modern (starter)
│   ├── warm-editorial/            ← Warm Editorial (starter)
│   ├── linear-app/  vercel/  stripe/  airbnb/  notion/  cursor/  apple/  …
│   └── README.md                  ← catalog overview
│
├── assets/
│   └── frames/                    ← shared device frames (used cross-skill)
│       ├── iphone-15-pro.html
│       ├── android-pixel.html
│       ├── ipad-pro.html
│       ├── macbook.html
│       └── browser-chrome.html
│
├── templates/
│   └── deck-framework.html        ← deck baseline (nav / counter / print)
│
├── next.config.ts                 ← dev rewrites + prod static export to out/
│
├── scripts/
│   └── sync-design-systems.mjs    ← re-import upstream awesome-design-md tarball
│
├── docs/
│   ├── spec.md                    ← product spec, scenarios, differentiation
│   ├── architecture.md            ← topologies, data flow, components
│   ├── skills-protocol.md         ← extended SKILL.md od: frontmatter
│   ├── agent-adapters.md          ← per-CLI detection + dispatch
│   ├── modes.md                   ← prototype / deck / template / design-system
│   ├── references.md              ← long-form provenance
│   ├── roadmap.md                 ← phased delivery
│   ├── schemas/                   ← JSON schemas
│   └── examples/                  ← canonical artifact examples
│
└── .od/                           ← runtime data, gitignored, auto-created
    ├── app.sqlite                 ← projects / conversations / messages / tabs
    ├── projects/<id>/             ← per-project working folder (agent's cwd)
    └── artifacts/                 ← saved one-off renders
```

## Design Systems

<p align="center">
  <img src="docs/assets/design-systems-library.png" alt="The 71 design systems library — style guide spread" width="100%" />
</p>

71 systems out of the box, each as a single [`DESIGN.md`](design-systems/README.md):

<details>
<summary><b>Full catalog</b> (click to expand)</summary>

**AI & LLM** — `claude` · `cohere` · `mistral-ai` · `minimax` · `together-ai` · `replicate` · `runwayml` · `elevenlabs` · `ollama` · `x-ai`

**Developer Tools** — `cursor` · `vercel` · `linear-app` · `framer` · `expo` · `clickhouse` · `mongodb` · `supabase` · `hashicorp` · `posthog` · `sentry` · `warp` · `webflow` · `sanity` · `mintlify` · `lovable` · `composio` · `opencode-ai` · `voltagent`

**Productivity** — `notion` · `figma` · `miro` · `airtable` · `superhuman` · `intercom` · `zapier` · `cal` · `clay` · `raycast`

**Fintech** — `stripe` · `coinbase` · `binance` · `kraken` · `mastercard` · `revolut` · `wise`

**E-Commerce** — `shopify` · `airbnb` · `uber` · `nike` · `starbucks` · `pinterest`

**Media** — `spotify` · `playstation` · `wired` · `theverge` · `meta`

**Automotive** — `tesla` · `bmw` · `ferrari` · `lamborghini` · `bugatti` · `renault`

**Other** — `apple` · `ibm` · `nvidia` · `vodafone` · `sentry` · `resend` · `spacex`

**Starters** — `default` (Neutral Modern) · `warm-editorial`

</details>

The library is imported via [`scripts/sync-design-systems.mjs`](scripts/sync-design-systems.mjs) from [`VoltAgent/awesome-design-md`][acd2]. Re-run to refresh.

## Visual directions

When the user has no brand spec, the agent emits a second form with five curated directions — the OD adaptation of [`huashu-design`'s "5 schools × 20 design philosophies" fallback](https://github.com/alchaincyf/huashu-design#%E8%AE%BE%E8%AE%A1%E6%96%B9%E5%90%91%E9%A1%BE%E9%97%AE-fallback). Each direction is a deterministic spec — palette in OKLch, font stack, layout posture cues, references — that the agent binds verbatim into the seed template's `:root`. One radio click → a fully specified visual system. No improvisation, no AI-slop.

| Direction | Mood | Refs |
|---|---|---|
| Editorial — Monocle / FT | Print magazine, ink + cream + warm rust | Monocle · FT Weekend · NYT Magazine |
| Modern minimal — Linear / Vercel | Cool, structured, minimal accent | Linear · Vercel · Stripe |
| Tech utility | Information density, monospace, terminal | Bloomberg · Bauhaus tools |
| Brutalist | Raw, oversized type, no shadows, harsh accents | Bloomberg Businessweek · Achtung |
| Soft warm | Generous, low contrast, peachy neutrals | Notion marketing · Apple Health |

Full spec → [`apps/web/src/prompts/directions.ts`](apps/web/src/prompts/directions.ts).

## Anti-AI-slop machinery

The whole machinery below is the [`huashu-design`](https://github.com/alchaincyf/huashu-design) playbook, ported into OD's prompt-stack and made enforceable per-skill via the side-file pre-flight. Read [`apps/web/src/prompts/discovery.ts`](apps/web/src/prompts/discovery.ts) for the live wording:

- **Question form first.** Turn 1 is `<question-form>` only — no thinking, no tools, no narration. The user chooses defaults at radio speed.
- **Brand-spec extraction.** When the user attaches a screenshot or URL, the agent runs a five-step protocol (locate · download · grep hex · codify `brand-spec.md` · vocalise) before writing CSS. **Never guesses brand colors from memory.**
- **Five-dim critique.** Before emitting `<artifact>`, the agent silently scores its output 1–5 across philosophy / hierarchy / execution / specificity / restraint. Anything under 3/5 is a regression — fix and rescore. Two passes is normal.
- **P0/P1/P2 checklist.** Every skill ships a `references/checklist.md` with hard P0 gates. The agent must pass P0 before emitting.
- **Slop blacklist.** Aggressive purple gradients, generic emoji icons, rounded card with left-border accent, hand-drawn SVG humans, Inter as a *display* face, invented metrics — explicitly forbidden in the prompt.
- **Honest placeholders > fake stats.** When the agent doesn't have a real number, it writes `—` or a labelled grey block, not "10× faster".

## Comparison

| Axis | [Claude Design][cd] (Anthropic) | [Open CoDesign][ocod] | **Open Design** |
|---|---|---|---|
| License | Closed | MIT | **Apache-2.0** |
| Form factor | Web (claude.ai) | Desktop (Electron) | **Web app + local daemon** |
| Deployable on Vercel | ❌ | ❌ | **✅** |
| Agent runtime | Bundled (Opus 4.7) | Bundled ([`pi-ai`][piai]) | **Delegated to user's existing CLI** |
| Skills | Proprietary | 12 custom TS modules + `SKILL.md` | **19 file-based [`SKILL.md`][skill] bundles, droppable** |
| Design system | Proprietary | `DESIGN.md` (v0.2 roadmap) | **`DESIGN.md` × 71 systems shipped** |
| Provider flexibility | Anthropic only | 7+ via [`pi-ai`][piai] | **Whatever your agent supports** |
| Init question form | ❌ | ❌ | **✅ Hard rule, turn 1** |
| Direction picker | ❌ | ❌ | **✅ 5 deterministic directions** |
| Live todo progress + tool stream | ❌ | ✅ | **✅** (UX pattern from open-codesign) |
| Sandboxed iframe preview | ❌ | ✅ | **✅** (pattern from open-codesign) |
| Comment-mode surgical edits | ❌ | ✅ | 🚧 roadmap (lift from open-codesign) |
| AI-emitted tweaks panel | ❌ | ✅ | 🚧 roadmap (lift from open-codesign) |
| Filesystem-grade workspace | ❌ | partial (Electron sandbox) | **✅ Real cwd, real tools, persisted SQLite** |
| 5-dim self-critique | ❌ | ❌ | **✅ Pre-emit gate** |
| Export formats | Limited | HTML / PDF / PPTX / ZIP / Markdown | **HTML / PDF / PPTX / ZIP / Markdown** |
| PPT skill reuse | N/A | Built-in | **[`guizang-ppt-skill`][guizang] drops in** |
| Minimum billing | Pro / Max / Team | BYOK | **BYOK** |

[cd]: https://x.com/claudeai/status/2045156267690213649
[ocod]: https://github.com/OpenCoworkAI/open-codesign
[piai]: https://github.com/mariozechner/pi-ai
[acd]: https://github.com/VoltAgent/awesome-claude-design
[guizang]: https://github.com/op7418/guizang-ppt-skill
[skill]: https://docs.anthropic.com/en/docs/claude-code/skills

## Supported coding agents

Auto-detected from `PATH` on daemon boot. No config required.

| Agent | Bin | Streaming | Notes |
|---|---|---|---|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `claude` | `--output-format stream-json` (typed events) | First-class — best fidelity |
| [Codex CLI](https://github.com/openai/codex) | `codex` | line-buffered | `codex exec <prompt>` |
| [Cursor Agent](https://www.cursor.com/cli) | `cursor-agent` | line-buffered | `cursor-agent -p` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `gemini` | line-buffered | `gemini -p` |
| [OpenCode](https://opencode.ai/) | `opencode` | line-buffered | `opencode run` |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | `qwen` | line-buffered | `qwen -p` |
| [GitHub Copilot CLI](https://github.com/features/copilot/cli) | `copilot` | `--output-format json` (typed events) | `copilot -p <prompt> --allow-all-tools --output-format json` |
| Anthropic API · BYOK | n/a | SSE direct | Browser fallback when no CLI is on PATH |

Adding a new CLI is one entry in [`apps/daemon/agents.js`](apps/daemon/agents.js). Streaming format is one of `claude-stream-json` (typed events) or `plain` (raw text).

## References & lineage

Every external project this repo borrows from. Each link goes to the source so you can verify the provenance.

| Project | Role here |
|---|---|
| [`Claude Design`][cd] | The closed-source product this repo is the open-source alternative to. |
| [**`alchaincyf/huashu-design`**](https://github.com/alchaincyf/huashu-design) | The design-philosophy core. Junior-Designer workflow, the 5-step brand-asset protocol, anti-AI-slop checklist, 5-dimensional self-critique, and the "5 schools × 20 design philosophies" library behind our direction picker — all distilled into [`apps/web/src/prompts/discovery.ts`](apps/web/src/prompts/discovery.ts) and [`apps/web/src/prompts/directions.ts`](apps/web/src/prompts/directions.ts). |
| [**`op7418/guizang-ppt-skill`**][guizang] | Magazine-web-PPT skill bundled verbatim under [`skills/guizang-ppt/`](skills/guizang-ppt/) with original LICENSE preserved. Default for deck mode. P0/P1/P2 checklist culture borrowed for every other skill. |
| [**`multica-ai/multica`**](https://github.com/multica-ai/multica) | The daemon + adapter architecture. PATH-scan agent detection, local daemon as the only privileged process, agent-as-teammate worldview. We adopt the model; we do not vendor the code. |
| [**`OpenCoworkAI/open-codesign`**][ocod] | The first open-source Claude-Design alternative and our closest peer. UX patterns adopted: streaming-artifact loop, sandboxed-iframe preview (vendored React 18 + Babel), live agent panel (todos + tool calls + interruptible), five-format export list (HTML/PDF/PPTX/ZIP/Markdown), local-first storage hub, `SKILL.md` taste-injection. UX patterns on our roadmap: comment-mode surgical edits, AI-emitted tweaks panel. **We deliberately do not vendor [`pi-ai`][piai]** — open-codesign bundles it as the agent runtime; we delegate to whichever CLI the user already has. |
| [`VoltAgent/awesome-claude-design`][acd] / [`awesome-design-md`][acd2] | Source of the 9-section `DESIGN.md` schema and 69 product systems imported via [`scripts/sync-design-systems.mjs`](scripts/sync-design-systems.mjs). |
| [`farion1231/cc-switch`](https://github.com/farion1231/cc-switch) | Inspiration for symlink-based skill distribution across multiple agent CLIs. |
| [Claude Code skills][skill] | The `SKILL.md` convention adopted verbatim — any Claude Code skill drops into `skills/` and is picked up by the daemon. |

Long-form provenance write-up — what we take from each, what we deliberately don't — lives at [`docs/references.md`](docs/references.md).

## Roadmap

- [x] Daemon + agent detection + skill registry + design-system catalog
- [x] Web app + chat + question form + todo progress + sandboxed preview
- [x] 19 skills + 71 design systems + 5 visual directions + 5 device frames
- [x] SQLite-backed projects · conversations · messages · tabs · templates
- [ ] Comment-mode surgical edits (click element → instruction → patch) — pattern from [`open-codesign`][ocod]
- [ ] AI-emitted tweaks panel (model surfaces the parameters worth tweaking) — pattern from [`open-codesign`][ocod]
- [ ] Vercel + tunnel deployment recipe (Topology B)
- [ ] One-command `npx od init` to scaffold a project with `DESIGN.md`
- [ ] Skill marketplace (`od skills install <github-repo>`)

Phased delivery → [`docs/roadmap.md`](docs/roadmap.md).

## Status

This is an early implementation — the closed loop (detect → pick skill + design system → chat → parse `<artifact>` → preview → save) runs end-to-end. The prompt stack and skill library are where most of the value lives, and they're stable. The component-level UI is shipping daily.

## Star us

<p align="center">
  <a href="https://github.com/nexu-io/open-design"><img src="docs/assets/star-us.png" alt="Star Open Design on GitHub — github.com/nexu-io/open-design" width="100%" /></a>
</p>

If this saved you thirty minutes — give it a ★. Stars don't pay rent, but they tell the next designer, agent, and contributor that this experiment is worth their attention. One click, three seconds, real signal: [github.com/nexu-io/open-design](https://github.com/nexu-io/open-design).

## Contributing

Issues, PRs, new skills, and new design systems are all welcome. The highest-leverage contributions are usually one folder, one Markdown file, or one PR-sized adapter:

- **Add a skill** — drop a folder into [`skills/`](skills/) following the [`SKILL.md`][skill] convention.
- **Add a design system** — drop a `DESIGN.md` into [`design-systems/<brand>/`](design-systems/) using the 9-section schema.
- **Wire up a new coding-agent CLI** — one entry in [`apps/daemon/agents.js`](apps/daemon/agents.js).

Full walkthrough, bar-for-merging, code style, and what we don't accept → [`CONTRIBUTING.md`](CONTRIBUTING.md) ([简体中文](CONTRIBUTING.zh-CN.md)).

## License

Apache-2.0. The bundled `skills/guizang-ppt/` retains its original [LICENSE](skills/guizang-ppt/LICENSE) (MIT) and authorship attribution to [op7418](https://github.com/op7418).
