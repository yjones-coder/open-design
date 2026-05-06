// Audit log per project — research starter (not wired into server.ts).
//
// Source: docs/research/openwork-aionui-alaude-integration.md §5.2 (P1-1)
// Inspired by openwork apps/server/src/audit.ts: append-only JSONL,
// `OPENWORK_DATA_DIR` overridable, `GET /workspace/:id/audit?limit=25`.
//
// Open Design twist: per-project file under `.od/projects/<id>/audit.jsonl`
// (alongside the project's plain artifact files), so that an exported project
// folder carries its own audit history.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

export type AuditAction =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'conversation.create'
  | 'conversation.delete'
  | 'message.send'
  | 'message.delete'
  | 'skill.set'
  | 'design_system.set'
  | 'craft.toggle'
  | 'file.write'
  | 'file.delete'
  | 'memory.create'
  | 'memory.archive'
  | 'memory.update'
  | 'deploy.start'
  | 'deploy.complete'
  | 'export.bundle'
  | 'import.bundle'
  | 'agent.spawn'
  | 'agent.cancel';

export interface AuditEntry {
  timestamp: number;          // ms epoch
  projectId: string;
  conversationId?: string;
  action: AuditAction;
  actor: 'user' | 'agent' | 'system';
  agentId?: string;           // when actor === 'agent'
  detail?: Record<string, unknown>;
}

interface AuditOptions {
  projectRoot: string;        // open-design project root (where `.od/` lives)
  dataDir?: string;           // OD_DATA_DIR override
}

function auditFile(projectId: string, opts: AuditOptions): string {
  const root = opts.dataDir
    ? path.resolve(opts.dataDir)
    : path.join(opts.projectRoot, '.od');
  const dir = path.join(root, 'projects', projectId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'audit.jsonl');
}

/**
 * Append a single audit entry. Atomic at the line level on POSIX (write(2)
 * is atomic for buffers smaller than PIPE_BUF, and JSONL stays well below).
 */
export function appendAuditEntry(entry: AuditEntry, opts: AuditOptions): void {
  const file = auditFile(entry.projectId, opts);
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(file, line, { encoding: 'utf8' });
}

interface ReadOptions extends AuditOptions {
  limit?: number;             // default 50, max 1000
  since?: number;             // ms epoch, only entries with ts >= since
  actions?: AuditAction[];    // filter by action types
}

/**
 * Read the most recent N audit entries. Reads from the end of the file
 * line-by-line and stops once `limit` matching entries are accumulated.
 *
 * For the v0 implementation we read the whole file. For projects with
 * very large audit logs (>1MB) a backwards-streaming reader should be
 * used instead — track this in the integration PR.
 */
export async function readAuditEntries(
  projectId: string,
  opts: ReadOptions,
): Promise<AuditEntry[]> {
  const file = auditFile(projectId, opts);
  if (!fs.existsSync(file)) return [];
  const limit = Math.min(opts.limit ?? 50, 1000);
  const since = opts.since ?? 0;
  const filterActions = opts.actions ? new Set(opts.actions) : null;

  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const buffer: AuditEntry[] = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (entry.timestamp < since) continue;
      if (filterActions && !filterActions.has(entry.action)) continue;
      buffer.push(entry);
    } catch {
      // skip malformed lines — JSONL append-only loses single rows at most
    }
  }
  return buffer.slice(-limit).reverse();
}

/**
 * Sensitive-data stripper for export.
 * Source: openwork apps/server/src/workspace-export-safety.ts
 *
 * For Open Design we currently strip nothing automatically because the
 * audit entries don't carry credentials. Kept as a typed seam so future
 * fields (e.g. agent stdin previews) can be redacted without a refactor.
 */
export function redactForExport(entry: AuditEntry): AuditEntry {
  return entry;
}
