# openwork / AionUi / alaude-desktop 端到端能力调研与整合方案

> 调研日期:2026-05-04
> 调研范围:`different-ai/openwork` (默认分支 `dev`) · `iOfficeAI/AionUi` (默认分支 `main`) · `alsayadi/alaude-desktop`(品牌名 Labaik,默认分支 `main`)
> 整合目标:Open Design (`apps/{web,daemon,desktop,packaged}` + `packages/{contracts,sidecar,sidecar-proto,platform}` + `tools/{dev,pack}`)
> 文档读者:Open Design 维护者与外部贡献者
>
> **本文不是 PR,是分析。** 文中列出的 P0/P1/P2 抽取项各自带"为什么有用 / 为什么 open-design 需要 / 最小落地形态",但代码尚未接入主干 —— 见 §6 路线图。最小可用代码起点放在 `apps/daemon/src/research/`。

## 目录

1. 一句话结论
2. Open Design 现状基线(对照基准)
3. 三方调研要点
   - 3.1 openwork
   - 3.2 AionUi
   - 3.3 alaude-desktop (Labaik)
4. 横向能力矩阵
5. 抽取清单(P0 / P1 / P2)
   - 5.1 P0:立刻补齐的硬缺口
   - 5.2 P1:战略性升级
   - 5.3 P2:观察项 / 不建议抄
6. 落地路线图与最小代码起点
7. 不建议借鉴的反例与陷阱

---

## 1. 一句话结论

三个项目在"端到端 Agent 客户端"赛道上各有侧重:**openwork** 把 GitHub 当成 skill registry、把 share-link 当成分发协议、把 audit log + token scopes 当成团队/合规底座;**AionUi** 把 ACP 协议做到第一公民、把 Team Mode + Mailbox + Cron 做到产品级、把 Conversation Command Queue 做到体验细节;**alaude-desktop (Labaik)** 把分层 memory(Profile + Episodic + Recall + Incognito)和复用 Electron BrowserWindow 的 browser-use 做到极简实现。

对 Open Design 来说,**最高 ROI 的三件事**是:

1. **Memory 子系统**:在现有 SQLite 基础上加 `memories` 表 + system-prompt 注入 + UI Inspector(借 Labaik 的分层思想 + AionUi 的"委托底层 agent"思路 + Open Design 已有的 SQLite 工程化优势)
2. **Browser-use**:daemon 内置 `chrome-devtools-mcp` 启动器,通过 MCP 协议让所有现有 adapter(claude-code / codex / gemini-cli / cursor-agent / opencode / copilot 等)同时获得能力,**不自研 Electron BrowserWindow 那一套**
3. **Skill Hub + Share-link bundle**:把 GitHub repo 当 skill / design-system 注册中心,加 deep-link 单文件分发 —— 让 design-system 的"复用与传播"从代码里走到用户手里

剩下的能力(Audit log、Reload-watcher、Command Queue、ACP Detector、Multi-key 轮转、Team Mode 等)按价值/成本分别落到 P1/P2。

---

## 2. Open Design 现状基线

(详见仓库内 `docs/spec.md`、`docs/architecture.md`、`docs/agent-adapters.md`、`docs/skills-protocol.md` 与 `apps/daemon/src/db.ts`,本节只做"已有什么 / 还缺什么"的清单。)

### 2.1 已有的能力底座

| 维度 | 现状 | 关键文件 |
|---|---|---|
| 应用骨架 | `apps/{web,daemon,desktop,packaged}` 四端,daemon 为唯一权限源 | `apps/*/AGENTS.md` |
| 契约层 | 纯 TS `packages/contracts`(API/SSE/Prompts) | `packages/contracts/src/` |
| Sidecar/IPC | `packages/{sidecar-proto,sidecar,platform}` 三层切分 | 同上 |
| 持久化 | SQLite (`.od/app.sqlite`),7 张表:`projects` / `conversations` / `messages` / `preview_comments` / `tabs` / `templates` / `deployments`,forward-compatible ALTER 迁移 | `apps/daemon/src/db.ts` (L38-183) |
| 工件存储 | `.od/projects/<id>/` 下 plain files,`.od/history.jsonl` 日志(可选) | `docs/spec.md` §10 |
| Agent 适配器 | claude-code / api-fallback (P0) + codex / devin / cursor-agent (P1) + gemini-cli / opencode / copilot / kiro / vibe (P2) | `apps/daemon/src/agents.ts`,`docs/agent-adapters.md` |
| Skills | 65+ 个 artifact-shape skills(prototype / deck / template / design-system / image / video / audio) | `skills/` |
| Design Systems | 140+ 品牌 DESIGN.md(9 节标准 schema) | `design-systems/` |
| Craft | 4 个 universal 规则(typography / color / anti-ai-slop / 占位) | `craft/` |
| Web UI | 44 个 React 组件:Chat / FileWorkspace / FileViewer / PreviewModal / Comment Mode / Sliders / Settings | `apps/web/src/components/` |
| 数据获取 | Claude Design ZIP 导入、Codex Pets sync、Prompt Templates 库、媒体生成(gpt-image-2 / Seedance / HyperFrames) | `apps/daemon/src/{claude-design-import,codex-pets,prompt-templates,media}.ts` |
| 导出 | HTML(自包含)、ZIP、Markdown、Vercel 部署 | `apps/web/src/runtime/{exports,zip}.ts`,`apps/daemon/src/deploy.ts` |
| 控制面 | `tools-dev`(开发生命周期) / `tools-pack`(打包) | `tools/{dev,pack}/` |

### 2.2 明确的空白(本调研要补的)

| 缺口 | 影响 | 优先级判断 |
|---|---|---|
| **没有 long-term memory** | 跨会话个性化、项目级"记住我做过的决定"全靠重新粘贴 | P0 |
| **没有 browser-use** | Agent 无法读外部页面/抓品牌参考/验证生成 UI 与真实站点的差距 | P0 |
| **没有 Skill / Design-system Hub** | 第三方贡献的 skill / design-system 必须 fork repo 才能装,劝退 | P0 |
| **没有 share-link / deep-link 分发** | 无法"发个链接让队友打开 app 就装好同一套配置" | P0 |
| **没有 audit log** | "为什么这次生成长这样"不可回溯;团队/合规场景天花板 | P1 |
| **没有 reload-watcher** | 改 DESIGN.md / SKILL.md / craft 文件后必须重启 daemon 才生效 | P1 |
| **没有 ACP 一等公民化** | 多 adapter 现在是 `agents.ts` 里手写的常量表,新增一个 CLI 要改源码 | P1 |
| **没有 Conversation Command Queue** | Agent 跑长任务期间用户消息会丢失或打断 | P1 |
| **没有 multi-key 轮转 / 协议转换** | BYOK 用户配多个 key 抗限流要自己写脚本 | P2 |
| **没有 Team Mode / Mailbox** | 多 agent 协作场景空白 | P2 |
| **没有 Cron 服务** | "每日 PR review / 每周报告"类自动化无法实现 | P2 |

---

## 3. 三方调研要点

### 3.1 openwork (`different-ai/openwork`)

**定位**:OpenCode 的"薄壳"—— "OpenCode is the engine, OpenWork is the experience"。Apache-MIT 主仓 + Fair Source `ee/`。Stars 14.7k,日活级迭代。

**最值得抄的 7 件**(详见 §5):

1. **Skill Hub (GitHub-as-registry)** — `apps/server/src/skill-hub.ts` ~200 行,默认拉 `different-ai/openwork-hub@main`,GitHub Contents API 列目录、parse `SKILL.md` frontmatter、5 分钟 cache、path 越界防护。**零运维注册中心**。
2. **Share-link bundle + deep link** — `apps/share/`(Next.js + Vercel Blob)+ `openwork://import-bundle?ow_bundle=<url>` 协议,用户拖 skill/agent/commands/`opencode.json` 上传 → 拿到不可猜公开 URL → 桌面 app 一键 import。
3. **Audit log per workspace** — JSONL 单文件 `~/.openwork/openwork-server/audit/<workspaceId>.jsonl`,每次 mutation 写一行,`GET /workspace/:id/audit?limit=25` 暴露;`OPENWORK_DATA_DIR` 可重定位;`workspace-export-safety.ts` 导出时剥离敏感字段。
4. **Reload-watcher** — `apps/server/src/reload-watcher.ts` watch `.opencode/{skills,agents,commands}/` + `opencode.json[c]` + `AGENTS.md`,750ms debounce,产生 `ReloadEvent`,前端在 idle 时热加载、busy 时排队提示。
5. **Streaming UI 性能优化** — `session-sync.ts` 把 SSE delta 用 `requestAnimationFrame` coalesce 到一帧一次 `setQueryData`(注释里写过原因:"a long response produces a setQueryData per token … starves the main thread"),配 12 个 hot event key 的 perf-log throttle。
6. **Token scopes (owner/collaborator/viewer)** — proxy 层在 forward 到 opencode 之前先做 scope 检查,`viewer` 只能 GET/HEAD,`collaborator` 不能 reply 权限请求(关键:防止低权限用户自己批准 permission prompt)。
7. **Sandbox mode (Docker / Apple container)** — `--sandbox auto|docker|container`,sidecar 全装容器,workspace bind-mount,额外 mount 走 `~/.config/openwork/sandbox-mount-allowlist.json` 显式声明。

**反面信号**:三个 server 实现并存(server / server-v2 / opencode-router)、桌面 shell 双轨(Tauri + Electron 迁移中)、`/ee/*` Fair Source、过度耦合 OpenCode primitives;issues 里 "high latency when typing"、"deleted session tab leaks RAM" 显示性能/稳定性是已知短板。

### 3.2 AionUi (`iOfficeAI/AionUi`)

**定位**:"Cowork app for Gemini CLI / Claude Code / Codex / Qwen / Goose / OpenClaw / 24+ CLIs"。Apache-2.0,Stars 23.7k,极高频迭代(24h 内 PR 合并)。

**最值得抄的 7 件**(详见 §5):

1. **ACP 协议第一公民化** — `@agentclientprotocol/sdk` + `src/process/acp/{runtime,session,infra}/` 9 文件;`AcpDetector` 用 batch `command -v`(POSIX 单 shell 调用)+ 并行 `where`(Windows fallback) 高效扫描 PATH;`getEnhancedEnv` 用 `dscl`/`getent` 解析 login shell PATH,**修复 macOS Finder/launchd 启动找不到 CLI 的老问题**。
2. **Team Mode**(`src/process/team/`) — main 进程内开 TCP MCP server(`net.createServer` 0 端口 + `crypto.randomUUID()` token)→ `team-mcp-stdio.js` bridge → 注入到每个 agent 的 ACP `session/new mcpServers` → `aion_create_team` / `aion_navigate` / spawn/rename/remove agent / mailbox / task_board 工具。Lead agent 通过 system prompt 引导用户自然进入 team 模式。
3. **Conversation Command Queue** — `src/renderer/pages/conversation/platforms/useConversationCommandQueue.ts` 726 行,AI busy 时用户消息进 sessionStorage 队列(20 条 / 256KB / 单条 ≤20K 字符 / ≤50 附件),AI idle 后自动出队,可暂停 / 编辑 / 拖拽 / 删除。**纯前端 hook,后端 0 改动**。
4. **Multi-tab Preview**(`src/renderer/pages/conversation/Preview/`) — 13+ viewer(MD / Code / Image / Diff / PDF / Office / Excel / HTML / URL)+ 3 editor(Markdown / Monaco / HTML)+ git 版本历史(`previewHistoryService.ts`)+ Cmd+S/W + split-screen scroll sync + dirty detect + 实时流式更新(agent 写文件时自动跟刷)。
5. **@-mention 文件 + Workspace 自动刷新** — `AtFileMenu/index.tsx` 列 `FileOrFolderItem`(path / relativePath)注入 prompt;`useWorkspaceEvents` 监听 4 类 agent stream 事件(`tool_group` / `tool_call` / `acp_tool_call` / `codex_tool_call`)自动重载文件树。
6. **Multi-key 轮转 + 协议转换** — `src/common/api/{RotatingApiClient,ApiKeyManager,ClientFactory,OpenAI2Anthropic/Gemini Converter}.ts`,一根 key 字符串可逗号/换行分隔多个,`{401,429,503}` 触发切 key;converter 把 OpenAI 请求转 Anthropic / Gemini 形态。
7. **Extension SDK 4 件套** — zod-validated manifest(`engine.aionui` semver / `permissions` filesystem `extension-only|workspace|full` 三档 / lifecycle `onInstall|onActivate|onDeactivate|onUninstall`)+ Figma-style sandboxed iframe UI 协议(`extensions/protocol/uiProtocol.ts`,`postMessage` 双线程模型)+ hot-reload + extension hub。

**反面信号**:量级巨大(TS 源码 ~10.5MB)、强 Bun + Arco + UnoCSS 依赖、`AcpAgent` / `AcpAgentV2` 老旧并存、没有 contracts 包(DTO 散在 `src/common/types/`)、品牌词重(OpenClaw / Aionrs 强耦合)。

### 3.3 alaude-desktop (Labaik, `alsayadi/alaude-desktop`)

**定位**:"Every AI. One desktop." —— 单作者 Electron 多 provider 桌面客户端,30 commits、0 star/0 fork、品牌从 `.claude/` → `.alaude/` → `.labaik/` 二次迁移。MIT。**README 宣称的能力与代码实际有出入(尤其 memory 部分,见下)**。

**值得抄的 3 件 + 1 件警示**:

1. **分层 memory(`renderer/js/memory/*` + `renderer/js/profile/*`)** — `MemoryStore`(episodic 记忆,scope `global|workspace`,500 条 × 1000 字)+ `ProfileStore`(always-on 用户画像,20 条 × 200 字)+ `MemoryRecall`(`semantic`/`keyword`/`auto` 三种召回模式,cosine 噪声地板 0.35,top-N=5)+ `Incognito` toggle 一键熔断。**Embeddings 直接挂在 entry 对象里**(浮点数组),不引向量库 —— 在 500 条上限下 cosine 全表扫 <1ms。注入策略**专门用 `<user-profile>` + `<memory-context>` prefix 挂到 last user message 的 content 之前**,而非 `role:'system'`,绕开 Anthropic API 限制,跨 provider 通用。
   > **重要修正**:横向调研发现 README 第三层"Embedding-based recall"在 `electron/api-worker.js` 里**没有挂载**(`buildSystemPrompt()` 不读 memory.json),只有渲染层有完整实现。说明 Labaik 的 memory 是 renderer-driven(浏览器存,主进程透传),架构上更像 ChatGPT 而非 Claude API。Open Design 抄"形态"即可,不抄"实现细节"。
2. **Browser Agent 复用 Electron BrowserWindow**(`electron/browser-agent.js` ~250 行) — 一个 singleton `BrowserWindow`(独立 partition `persist:alaude-agent`,与用户 Chrome 隔离;`contextIsolation:true` + `sandbox:true` + `nodeIntegration:false`;URL scheme 白名单 http(s)/about)+ `executeJavaScript()` 注入页面驱动 DOM。5 个工具:`browser_navigate / get_text / click / fill / screenshot`。**`fill` 用 prototype value-setter + 派发 input/change 事件,专门兼容 React/Vue 受控组件**。
   > **Open Design 不直接抄此路径**(见 §5.1.B 的取舍论证),但技术细节(独立 partition、URL 白名单、React 兼容 fill)值得抄进 chrome-devtools-mcp 的封装层。
3. **Permission Modes (`observe / careful / flow / autopilot`)+ Protected Paths 白名单** — `electron/permissions.js` 是**纯函数**(无 IO,跨 main/renderer/worker 共享),`observe` 模式直接拦截 `WRITE_TOOLS` Set;`PROTECTED_GLOBS`(`.git/**` / `.env*` / `.ssh/**` / lockfiles / shell rc) + `PROTECTED_HOME_PREFIXES` 永远 prompt,UI 不允许给这些路径加 "approve always"。
4. **(警示)零自动化测试 / 729KB 单文件 `renderer/index.html` / 静默吞错(`try{}catch{}` 散布)** —— 抄"思想"不抄"代码"。

**Memory + browser-use 横向修正(很重要)**:

| 项 | openwork | AionUi | Labaik |
|---|---|---|---|
| Long-term memory | 无(只有 git markdown skills) | Partial(完全委托 Gemini CLI 的 `save_memory`) | **README 宣称三层但代码里 main 进程没接;只有 renderer 有完整实现** |
| Browser-use 给 agent 用 | **Yes,外接 `chrome-devtools-mcp@0.17.0` MCP server** | No(只有给 user 看的 webview) | Yes,自研 ~7KB Electron BrowserWindow |
| 计算机控制(屏幕级) | No | No | Yes(`screen-control.js`,**无人工确认**,Anthropic Computer Use 路线) |

**结论**:browser-use 路径选 openwork(MCP 外接,所有 adapter 通吃);memory 路径**自研**(三方都不够好,见 §5.1.A)。

---

## 4. 横向能力矩阵

> ✓ 完整;◐ 部分/弱;✗ 无。**重点列出 Open Design 还没有的维度**。

| 能力 | openwork | AionUi | Labaik | Open Design 现状 | 抽取价值 |
|---|---|---|---|---|---|
| Long-term memory(项目+对话双层) | ✗ | ◐ 委托 Gemini | ◐ renderer-only | ✗ | **P0** |
| Browser-use(给 agent) | ✓ MCP 外接 | ✗ | ✓ 自研 | ✗ | **P0** |
| Skill / DS Hub(GitHub-as-registry) | ✓ | ✗ | ✗ | ✗ | **P0** |
| Share-link bundle + deep link | ✓ | ✗ | ✗ | ✗ | **P0** |
| Audit log per project | ✓ JSONL | ✗ | ✗ | ✗ | **P1** |
| Reload-watcher / hot reload | ✓ | ◐ 扩展用 | ✗ | ✗ | **P1** |
| ACP 协议第一公民化 | ✗ 走 opencode | ✓ | ✗ | ◐ 部分 acp.ts | **P1** |
| Conversation Command Queue | ✗ | ✓ | ✗ | ✗ | **P1** |
| Multi-tab Preview + git history | ✗ | ✓ | ✗ | ◐ live-reload iframe | P1 |
| @-mention 文件 + 工作区自动刷新 | ◐ Lexical mention | ✓ | ✗ | ✗ | P1 |
| Multi-key 轮转 + 协议转换 | ✗ 走 opencode | ✓ | ✗ | ✗ | P2 |
| Team Mode + Mailbox | ✗ | ✓ | ✗ | ✗ | P2 |
| Cron 服务 + agent 自助创建 | ✗ | ✓ | ◐ skills.json 微 cron | ✗ | P2 |
| Permission Modes + Protected Paths | ◐ token scopes | ◐ extension perm schema | ✓ 纯函数 | ✗ | P2 |
| Token scopes (owner/collab/viewer) | ✓ | ✗ | ✗ | ✗ | P2 |
| Sandbox(Docker/Apple container) | ✓ | ✗ | ✗ | ✗ | P2 |
| File-session 协议(远端虚拟挂载) | ✓ | ✗ | ✗ | ✗ | P2 |
| Streaming UI rAF coalesce | ✓ | ◐ | ✗ | ✗ | P2 |
| Lexical composer + paste-as-chip | ✓ | ◐ AtFileMenu | ✗ | ✗ | P2 |
| Extension SDK(zod manifest + sandbox) | ✗ skill 是 markdown | ✓ 完整 | ✗ | ◐ skills 协议 | P2 |
| Multi-mode 同源运行(GUI/webui/server/channel) | ◐ | ✓ | ✗ | ◐ daemon+web 已分离 | 不抄 |
| Computer Use(屏幕级) | ✗ | ✗ | ✓ 无 gating | ✗ | **不抄** |

---

## 5. 抽取清单

每条格式:**特性**(出处)→ 为什么有用 → 为什么 Open Design 需要 → 最小落地形态。

### 5.1 P0:立刻补齐的硬缺口

#### A. Memory 子系统(项目级 + 对话级双层,SQLite 原生)

**出处**:Labaik `renderer/js/memory/*`(分层思想);AionUi `src/process/agent/gemini/index.ts`(`refreshServerHierarchicalMemory` 委托模式);自研存储 schema。

**为什么有用**:
- 用户在多个会话里反复粘贴"我们的品牌主色是 #00FFA3、字体用 Inter / Domaine Display、anti-AI-slop 偏好关掉 gradient"是糟糕体验。
- 跨 agent 共享:同一个项目里 claude-code 写出的设计决定,api-fallback / codex / gemini-cli 也应该看得到 —— 这正是 AionUi"per-agent 委托"模式做不到的。
- 设计场景比 chat 场景更需要 memory:design system 决策的"为什么"很重,但每次都重新解释成本高。

**为什么 Open Design 需要**:
- Open Design 的核心叙事是"项目 + 对话 + design-system + skills"四层组合,memory 是把"用户在这次组合里做的决定"持久化的最后一块拼图。
- 已有 SQLite 基础设施(7 张表 + ALTER 迁移),加一张表是最小工程量;不需要引入向量库或 JSON 存储。
- 三方都不够好:openwork 的 markdown 是 git-tracked 行为记忆而非用户事实,AionUi 委托 Gemini CLI 锁死单 agent,Labaik 只在 renderer 实现且不真注入 —— Open Design 是唯一同时满足"daemon 拥有 + 跨 adapter 共享 + SQLite 字段化"的设计点。

**最小落地形态**(P0 范围):

```sql
-- apps/daemon/src/db.ts 加 migration
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,             -- ulid
  scope TEXT NOT NULL,             -- 'project' | 'conversation' | 'global'
  scope_id TEXT,                   -- projects.id / conversations.id / NULL
  kind TEXT NOT NULL,              -- 'fact' | 'preference' | 'decision' | 'todo' | 'link'
  content TEXT NOT NULL,           -- 1-2 句自然语言
  source TEXT NOT NULL,            -- 'user_pin' | 'agent_save' | 'auto_summary'
  source_message_id TEXT,
  source_agent TEXT,
  tags TEXT,                       -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  archived INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope, scope_id, archived);
CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
```

写入路径(三种,优先级递减):
1. **`agent_save`**:暴露给所有 adapter 的 MCP 工具 `od_remember(content, scope, kind, tags?)` —— 模式直接抄 Gemini 的 `save_memory`(AionUi 已验证可行)
2. **`user_pin`**:消息上下文菜单加 "📌 Pin to memory"
3. **`auto_summary`**:**P2 才做**,先不上(避免 Labaik 那种"宣称未实现"的反例)

注入策略(关键):
- 进入对话时,daemon 取当前 project 的 `scope='project'` 前 50 条(按 `updated_at` desc)+ 当前 conversation 的全量 memory,**作为 `<memory>` 块 prefix 到 last user message 的 content 之前**(不是 `role:'system'` —— Anthropic API 限制 + 跨 provider 通用,直接抄 Labaik `injectIntoLastUser` 模式)。
- 先纯关键词/全注入(50 条 ×100 字 ≈ 5KB,远低于 context 上限),embedding 检索是 P2。

UI(P1 才做):
- `apps/web` 项目页加 Memory Inspector 抽屉,列表 / 编辑 / 归档 / 按 scope+kind 过滤;消息一键 pin。

**最小代码起点**:`apps/daemon/src/research/memory-schema.ts`(本调研已落地,见 §6)。

---

#### B. Browser-use(daemon 内置 `chrome-devtools-mcp` 启动器)

**出处**:openwork `apps/desktop/scripts/chrome-devtools-mcp-shim.ts` + `apps/app/data/commands/browser-setup.md`(模式)。

**为什么有用**:
- Agent 在生成 React 组件 / landing page 时,经常需要"参考某个真实站点的 hero 布局 / 文案 tone / 配色"—— 没有 browser-use 时只能让用户截图粘贴,流程断裂。
- 设计系统场景:Agent 可以在生成 design system 之后**实时打开 preview 站点验证"我生成的与品牌官网视觉一致吗"**。
- 调试场景:Agent 可以打开 user 部署的 Vercel URL 直接读 console / 网络面板,而不是让用户手动复制错误日志。

**为什么 Open Design 需要**:
- 当前所有 agent 都是 sandboxed("只能读 .od/projects/<id>/ 下的文件 + 调 LLM"),数据获取面向"本地文件 + 媒体 API",缺一条"开放 web"通道。
- preview iframe 是 sandboxed 的 vendored React+Babel,**不能跨域 fetch**,所以不能让 user 让 preview 自己去抓数据;browser-use 把这条路在另一端打开。
- Electron desktop 已经在 deps 里了,**但不应该走 Labaik 的"自研 BrowserWindow"路径**:那条路只对 Electron 生效,web 模式失效;且需要对每个 adapter 单独注册 tool schema,失去 MCP 的复用优势。

**为什么选 MCP 而非自研**:
- `chrome-devtools-mcp@0.17.0` 是 Google 官方维护的 npm 包(CDP 协议封装),自研无优势。
- MCP 协议天生跨 adapter:claude-code / codex / gemini-cli / cursor-agent / opencode 都已支持 MCP;接一次,所有 adapter 同时获得能力。
- 安全模型(独立 profile + tool consent)是 MCP 标准,不需要自己重做。

**最小落地形态**(P0 范围):

```ts
// apps/daemon/src/research/browser-mcp.ts(草稿)
import { spawn } from 'node:child_process';

export interface BrowserMcpConfig {
  pinnedVersion: string;        // '0.17.0',避免 latest 漂移
  profileDir: string;           // .od/browser-profile/(独立,不复用 user Chrome)
  enabled: boolean;             // settings 默认 false
}

export function spawnBrowserMcp(cfg: BrowserMcpConfig) {
  // npm exec --yes chrome-devtools-mcp@<pinned> -- --user-data-dir=<profileDir>
  // stdio JSON-RPC,daemon 把 endpoint 注入到所有 adapter 的 MCP 配置
}
```

P0 阶段只解锁 3 个只读工具:`browser_navigate` / `browser_get_text` / `browser_screenshot`(交互 click/fill 留 P1)。

UI:settings 加开关 "Allow agents to browse web",默认关。

**为什么不抄 Labaik 的 BrowserWindow 路径**:
1. 只在 Electron 模式有 BrowserWindow;web 模式(浏览器访问 daemon)拿不到。
2. 必须为每个 adapter 单独写 tool schema 注入,OpenAI 风格 / Anthropic 风格 / Gemini 风格各一份,失去协议复用。
3. 无法跨标签 / 无法 stealth / 没有 wait-for-selector(Labaik 用固定 800ms `setTimeout`,SPA 长任务会脆)。

---

#### C. Skill Hub + Share-link bundle(GitHub-as-registry + deep-link)

**出处**:openwork `apps/server/src/skill-hub.ts`(注册中心) + `apps/share/`(分发) + `openwork://import-bundle?ow_bundle=<url>` 协议。

**为什么有用**:
- 65+ skills 和 140+ design-systems 是 Open Design 的核心资产,但**当前只能通过 fork repo + 编辑代码安装**,劝退非工程用户。
- "GitHub repo 当注册中心"是零运维方案 —— 信任面=固定 repo,用户可以 fork 自建,无后端依赖。
- Share-link 的核心价值是"传播":一位设计师想让团队全员用同一套品牌 design-system + 配套 skill,目前没有任何方法;有了 share-link,只需要发一个 URL。

**为什么 Open Design 需要**:
- 当前的 `.od/skills/` 和 `design-systems/` 都是 repo-vendored,缺"用户态发现 + 安装"。
- Open Design 主打"design system 可复用",而**当前缺的恰恰是分发**。
- Skill Hub 实现 < 200 行,Share-link 实现 < 500 行(Vercel Blob + Next.js 单页),**ROI 极高**。

**最小落地形态**:

```ts
// apps/daemon/src/research/skill-hub.ts(草稿)
const HUB_REPO = process.env.OD_SKILL_HUB_REPO ?? 'pftom/open-design-hub';
const HUB_BRANCH = 'main';
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function listHubSkills(): Promise<HubSkillEntry[]> {
  // GET https://api.github.com/repos/{HUB_REPO}/contents/skills?ref={HUB_BRANCH}
  // 5 分钟缓存;parse 每个目录的 SKILL.md frontmatter
}

export async function installHubSkill(name: string): Promise<void> {
  // resolveSafeChild(name) 防路径越界
  // GET raw SKILL.md + assets;落 ./skills/<name>/  或 ~/.open-design/skills/<name>/
}
```

Share-link bundle 协议:

```
od://import-bundle?bundle=<url>&intent=new_project|merge&source=share
```

bundle 内容(JSON):

```json
{
  "version": 1,
  "skills": [{ "name": "...", "files": { "SKILL.md": "...", "example.html": "..." } }],
  "design_systems": [{ "id": "...", "files": { "DESIGN.md": "..." } }],
  "craft": [{ "name": "...", "content": "..." }]
}
```

加一个 `apps/share/`(可选,先不上;先做本地 import-from-URL 即可)。

---

### 5.2 P1:战略性升级

| # | 特性 | 出处 | 一句话价值 | 最小落地 |
|---|---|---|---|---|
| 1 | **Audit log per project (JSONL)** | openwork `apps/server/src/audit.ts` | 每次 mutation 写一行,可 export,支持调试 + 合规 | `.od/projects/<id>/audit.jsonl` + `GET /api/projects/:id/audit?limit=50` 路由 + `apps/web` 抽屉展示 |
| 2 | **Reload-watcher** | openwork `apps/server/src/reload-watcher.ts` | watch `skills/`+`design-systems/`+`craft/` 目录,750ms debounce,idle 时热加载 / busy 时排队提示 | daemon 加 `chokidar` watcher + SSE event;web 收到后清缓存 |
| 3 | **ACP 协议一等公民化 + AcpDetector** | AionUi `src/process/acp/` + `src/process/agent/acp/AcpDetector.ts` | batch `command -v` + Windows fallback `where` + `getEnhancedEnv` 解析 login shell PATH;`POTENTIAL_ACP_CLIS` 表新增 CLI 不改源码 | 从 `agents.ts` 把 ACP 类 adapter 抽成"通过 sdk 连接 + 一行 detector 注册"的形态 |
| 4 | **Conversation Command Queue** | AionUi `src/renderer/.../useConversationCommandQueue.ts` | AI busy 时缓冲用户消息,空闲后出队;sessionStorage 持久化;可暂停/编辑/拖拽 | 纯前端 hook,后端 0 改动 |
| 5 | **Memory Inspector UI** | 自研 + Labaik UI 形态 | 列表 / 编辑 / 归档 / scope+kind 过滤 / 一键 pin | `apps/web/src/components/MemoryInspector.tsx`(P0 表上线后做) |
| 6 | **Browser-use 完整工具集 + tool consent UI** | openwork MCP 同意流 | 解锁 click/fill;每个写操作弹一次确认 | 升级 P0 的 browser-mcp 启动器,放开工具 filter |
| 7 | **Multi-tab Preview + git history** | AionUi `Preview/` | 13+ viewer + 3 editor + git 版本历史 + Cmd+S/W + split-screen | 升级现有 PreviewModal,渐进式叠加 viewer |
| 8 | **@-mention 文件** | AionUi `AtFileMenu/` | sendbox 上 `@` 选目录文件注入 prompt | 改 ChatComposer + 后端在 spawn agent 前 expand 路径 |
| 9 | **Streaming UI rAF coalesce** | openwork `session-sync.ts` | SSE delta 用 requestAnimationFrame 合并,避免 setQueryData per token starve main thread | 重构 web 流式 pipeline,加 12 个 hot-event throttle |

### 5.3 P2:观察项 / 不建议抄

| # | 特性 | 取舍 |
|---|---|---|
| 1 | Multi-key 轮转 + 协议转换 | AionUi `RotatingApiClient` 抽出独立 package(~2k LOC);只有 BYOK 用户多 key 抗限流时才需要 |
| 2 | Team Mode + Mailbox + TaskBoard | 价值高但工程量大(TCP MCP server + stdio bridge + 2 张 SQLite 表);先做 §5.1.A 让 memory 跨 adapter 共享,team 是后续叙事 |
| 3 | Cron 服务 + agent 自助创建 | 用 `croner` + `CronBusyGuard` + `powerSaveBlocker`;开发场景刚需(每日 PR review)但需先有 audit log |
| 4 | Token scopes (owner/collab/viewer) | 单机阶段不刚需;一旦 daemon 上 cloud 立刻必做 |
| 5 | Sandbox mode (Docker / Apple container) | 把 daemon + sidecar + agent 装容器;价值高但需重构 IPC,优先级在 audit log + reload 之后 |
| 6 | File-session 协议(远端虚拟挂载) | 只有要做 mobile / hosted demo 时才必要 |
| 7 | Lexical composer + paste-as-chip + 图片自动压缩 | 体验提升明显但工程量大(整个 editor 重写) |
| 8 | Extension SDK 4 件套(zod manifest + Figma iframe + hot-reload + hub) | AionUi 已经做完,但 Open Design 的 skills 协议形态不一样,**先把 skills 跑顺再考虑扩展**;manifest schema 可先抄 |
| 9 | Permission Modes(observe/careful/flow/autopilot) | Labaik 是纯函数实现,可放进 `packages/contracts` 当 capability 内核;刚性需求等到 cloud 阶段 |
| **不抄** | Computer Use(屏幕级 cliclick + osascript) | 风险/收益比差,且无 gating;Open Design 不是通用 agent,跳过 |
| **不抄** | 双桌面 shell(Tauri + Electron 并存) | openwork 是被动迁移,不是主动设计;Open Design 已纯 Electron,无需倒退 |
| **不抄** | OpenWork `/ee/*` cloud 控制平面 | Fair Source license,代码不可抄(架构可以借鉴 connect URL + token + sandbox provisioner 模式) |
| **不抄** | AionUi 强 Bun + Arco + UnoCSS 依赖 | 与 Open Design 的 Next.js + 自有组件库栈不兼容 |

---

## 6. 落地路线图与最小代码起点

### 6.1 路线图

```
Phase 1(本调研周期已交付):
  [✓] 完成三方调研 + 横向 memory/browser-use 专项
  [✓] 完成 Open Design 现状基线梳理
  [✓] 完成抽取清单 + 取舍论证(本文档)
  [✓] 落地最小代码起点(apps/daemon/src/research/,见 §6.2)

Phase 2(下一阶段,2-3 周):
  [ ] P0-A Memory 表 + 注入(memory schema 接入 db.ts + system prompt 注入)
  [ ] P0-C Skill Hub fetcher(本地 install + 5 分钟 cache)
  [ ] P1-1 Audit log per project(JSONL 写入器接入 server.ts)
  [ ] P1-4 Conversation Command Queue(纯前端 hook)

Phase 3(再下一阶段,1 个月):
  [ ] P0-B Browser-use(daemon spawn chrome-devtools-mcp + settings 开关)
  [ ] P1-2 Reload-watcher(chokidar 监听 + SSE 事件)
  [ ] P0-C Share-link bundle(本地 import-from-URL 形态,先不上 share 服务)
  [ ] P1-5 Memory Inspector UI

Phase 4(后续,看反馈):
  [ ] P1-3 ACP 协议一等公民化(重构 agents.ts)
  [ ] P1-7 Multi-tab Preview + git history
  [ ] P1-8 @-mention 文件
  [ ] P2 列表中的高分项(按 user 反馈排)
```

### 6.2 最小代码起点

为避免污染主干代码,本调研落地的最小可用代码放在 **`apps/daemon/src/research/`** 子目录,**未接入主 server.ts**,只作为"形态参考 + 后续 PR 起点":

```
apps/daemon/src/research/
├── README.md           — 子目录说明,声明这是调研产物
├── memory-schema.ts    — P0-A:memories 表的 SQL + TypeScript 类型
├── audit-log.ts        — P1-1:JSONL audit writer + reader
└── skill-hub.ts        — P0-C:GitHub-as-registry fetcher 草稿
```

接入主干由后续 PR 完成(每个 P0/P1 一个 PR,带 contracts 类型 + 测试)。

### 6.3 验收标准

每个抽取项落地完成后,需要满足:

1. **类型契约**:涉及 web ↔ daemon 的字段都加进 `packages/contracts`
2. **持久化迁移**:涉及 SQLite 的都走 `db.ts` 的 forward-compatible ALTER 模式(参考现有 `migrate()`)
3. **测试覆盖**:每个 P0/P1 至少一个 vitest 单元测试 + 一个 e2e 路径
4. **文档同步**:更新 `docs/spec.md`、`docs/architecture.md` 或 `docs/skills-protocol.md` 对应章节
5. **不引入**:新数据库 / 新 IPC 协议 / 新 sidecar 类型(都用现有基础设施)
6. **可关闭**:每个能力都加 settings 开关,默认值跟 Open Design "本地优先 + 隐私优先" 取向一致(memory 默认开但可 incognito;browser-use 默认关需用户启用;audit log 默认开;skill hub 默认开但 source 可换)

---

## 7. 不建议借鉴的反例与陷阱

为后续维护者留备忘录:

1. **Labaik 的 README ≠ 代码**:README 宣称的"分层 memory + embedding 召回"在 main 进程实际未挂载(`api-worker.js` 的 `buildSystemPrompt()` 不读 `memory.json`),只在 renderer 有完整实现。**抄"思想"不抄"声称"**,验证以代码为准。
2. **openwork 的 "minimal Tauri" 是后悔不是设计**:Tauri / Electron 双轨并存是迁移期产物(`ARCHITECTURE.md` 明说"We move most of the functionality to the openwork server"),不要照抄"双 shell"模式。
3. **AionUi 的 `AcpAgent` / `AcpAgentV2` 并存**:典型快速迭代后欠的债,抄之前先确认哪个是当前路径。
4. **不要抄 Computer Use(屏幕级)**:Labaik 的 `screen-control.js` 没有人工确认 gating,作者注释承认"Careful / Flow approval prompts"未实现。Open Design 不需要这条能力。
5. **不要抄"renderer-only" 的 memory 实现**:Labaik 把 memory 放在浏览器 localStorage,跨 daemon 实例不共享。Open Design 必须放 daemon SQLite。
6. **不要把 browser-use 写在 api-fallback 专用 path**:那样会把能力锁在一个 adapter,失去 MCP 协议的复用优势(claude-code / codex / gemini-cli 等同时受益的模式)。
7. **不要在抄能力时连带抄品牌 / commercial gating**:openwork 的 `forceSignin` flag、AionUi 的 "OpenClaw" 命名、Labaik 的 "Labaik" 品牌 prompt 注入,**抄之前先剥**。

---

## 附录:关键参考路径

### openwork
- README:https://github.com/different-ai/openwork
- ARCHITECTURE.md:https://github.com/different-ai/openwork/blob/dev/ARCHITECTURE.md
- Skill Hub:`apps/server/src/skill-hub.ts`
- Share bundle:`apps/server/src/share-bundles.ts`,`apps/share/`
- Audit:`apps/server/src/audit.ts`
- Reload:`apps/server/src/reload-watcher.ts`
- Token scopes:`apps/server/src/server.ts` `assertOpencodeProxyAllowed()`
- Streaming UI:`apps/app/src/react-app/domains/session/sync/{session-sync,usechat-adapter}.ts`
- Browser shim:`apps/desktop/scripts/chrome-devtools-mcp-shim.ts`
- Browser docs:`packages/docs/start-here/do-work-with-it/control-the-browser.mdx`

### AionUi
- 架构总览:https://github.com/iOfficeAI/AionUi/blob/main/docs/architecture/overview.md
- ACP detector:https://github.com/iOfficeAI/AionUi/blob/main/docs/architecture/acp-detector.md
- Command Queue:https://github.com/iOfficeAI/AionUi/blob/main/docs/architecture/queue-and-acp-state.md
- Team flow:https://github.com/iOfficeAI/AionUi/blob/main/docs/architecture/agent-team-guide-flow.md
- ACP backends:`src/common/types/acpTypes.ts`(`AcpBackendAll`)
- Team:`src/process/team/{TeamSession,Mailbox,TaskManager,mcp/team/TeamMcpServer}.ts`
- Preview:`src/renderer/pages/conversation/Preview/README.en.md`
- Workspace:`src/renderer/pages/conversation/Workspace/README.en.md`
- @-file:`src/renderer/components/chat/AtFileMenu/index.tsx`
- LLM API:`src/common/api/{RotatingApiClient,ApiKeyManager,ClientFactory}.ts`
- Extension types:`src/process/extensions/types.ts`
- Extension UI Protocol:`src/process/extensions/protocol/uiProtocol.ts`

### alaude-desktop (Labaik)
- 仓库:https://github.com/alsayadi/alaude-desktop
- Memory(renderer):`renderer/js/memory/{memory-store,memory-recall,memory-extract,memory-embeddings,memory-ui}.js`
- Profile:`renderer/js/profile/`
- Browser agent:`electron/browser-agent.js`
- Permissions:`electron/permissions.js`(纯函数,可直接搬)
- MCP client(无 SDK 250 行):`electron/mcp.js`
- Cron skills:`electron/skills.js`
- Provider registry:`electron/provider-registry.js`
- API worker(LLM 主循环):`electron/api-worker.js`
- 主进程:`electron/main.js`(IPC + tray + globalShortcut + screencapture)

### Open Design 自身
- 现状基线:本仓 `docs/spec.md`、`docs/architecture.md`、`docs/agent-adapters.md`、`docs/skills-protocol.md`
- DB schema:`apps/daemon/src/db.ts` (L38-183)
- Maintainability roadmap:`specs/current/maintainability-roadmap.md`
