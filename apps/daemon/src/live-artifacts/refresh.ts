import type { LiveArtifactRefreshSourceMetadata } from './schema.js';

export const DEFAULT_LIVE_ARTIFACT_SOURCE_TIMEOUT_MS = 30_000;
export const DEFAULT_LIVE_ARTIFACT_TOTAL_TIMEOUT_MS = 120_000;

export type LiveArtifactRefreshAbortKind = 'cancelled' | 'source_timeout' | 'total_timeout';

export interface LiveArtifactRefreshTimeouts {
  sourceTimeoutMs: number;
  totalTimeoutMs: number;
}

export interface LiveArtifactRefreshRunScope {
  projectId: string;
  artifactId: string;
  refreshId: string;
}

export interface LiveArtifactRefreshRun extends LiveArtifactRefreshRunScope {
  readonly signal: AbortSignal;
  readonly startedAt: Date;
}

export interface LiveArtifactRefreshRunOptions extends LiveArtifactRefreshRunScope {
  totalTimeoutMs?: number;
  now?: Date;
}

export interface LiveArtifactRefreshSourceExecutionOptions {
  step: string;
  source?: LiveArtifactRefreshSourceMetadata;
  sourceTimeoutMs?: number;
}

export class LiveArtifactRefreshAbortError extends Error {
  readonly kind: LiveArtifactRefreshAbortKind;
  readonly projectId: string;
  readonly artifactId: string;
  readonly refreshId: string;
  readonly timeoutMs?: number;
  readonly step?: string;

  constructor(message: string, options: LiveArtifactRefreshRunScope & { kind: LiveArtifactRefreshAbortKind; timeoutMs?: number; step?: string }) {
    super(message);
    this.name = 'LiveArtifactRefreshAbortError';
    this.kind = options.kind;
    this.projectId = options.projectId;
    this.artifactId = options.artifactId;
    this.refreshId = options.refreshId;
    if (options.timeoutMs !== undefined) this.timeoutMs = options.timeoutMs;
    if (options.step !== undefined) this.step = options.step;
  }
}

interface ActiveRefreshRun extends LiveArtifactRefreshRun {
  readonly controller: AbortController;
  readonly totalTimeout: ReturnType<typeof setTimeout>;
}

function validateTimeoutMs(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${path} must be a positive safe integer`);
  }
  return value;
}

export function normalizeLiveArtifactRefreshTimeouts(options?: Partial<LiveArtifactRefreshTimeouts>): LiveArtifactRefreshTimeouts {
  return {
    sourceTimeoutMs: validateTimeoutMs(options?.sourceTimeoutMs ?? DEFAULT_LIVE_ARTIFACT_SOURCE_TIMEOUT_MS, 'sourceTimeoutMs'),
    totalTimeoutMs: validateTimeoutMs(options?.totalTimeoutMs ?? DEFAULT_LIVE_ARTIFACT_TOTAL_TIMEOUT_MS, 'totalTimeoutMs'),
  };
}

function refreshRunKey(scope: LiveArtifactRefreshRunScope): string {
  return `${scope.projectId}\0${scope.artifactId}\0${scope.refreshId}`;
}

function abortPromise(signal: AbortSignal): Promise<never> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

function toRefreshAbortError(reason: unknown, fallback: LiveArtifactRefreshRunScope): LiveArtifactRefreshAbortError {
  if (reason instanceof LiveArtifactRefreshAbortError) return reason;
  if (reason instanceof Error) {
    return new LiveArtifactRefreshAbortError(reason.message, { ...fallback, kind: 'cancelled' });
  }
  return new LiveArtifactRefreshAbortError(String(reason || 'live artifact refresh cancelled'), { ...fallback, kind: 'cancelled' });
}

export class LiveArtifactRefreshRunRegistry {
  private readonly runs = new Map<string, ActiveRefreshRun>();

  startRun(options: LiveArtifactRefreshRunOptions): LiveArtifactRefreshRun {
    const totalTimeoutMs = validateTimeoutMs(options.totalTimeoutMs ?? DEFAULT_LIVE_ARTIFACT_TOTAL_TIMEOUT_MS, 'totalTimeoutMs');
    const key = refreshRunKey(options);
    if (this.runs.has(key)) {
      throw new Error('live artifact refresh run already registered');
    }

    const controller = new AbortController();
    const totalTimeout = setTimeout(() => {
      controller.abort(new LiveArtifactRefreshAbortError('live artifact refresh timed out', {
        ...options,
        kind: 'total_timeout',
        timeoutMs: totalTimeoutMs,
      }));
    }, totalTimeoutMs);
    totalTimeout.unref?.();

    const run: ActiveRefreshRun = {
      projectId: options.projectId,
      artifactId: options.artifactId,
      refreshId: options.refreshId,
      startedAt: options.now ?? new Date(),
      signal: controller.signal,
      controller,
      totalTimeout,
    };
    this.runs.set(key, run);
    return run;
  }

  finishRun(run: LiveArtifactRefreshRunScope): void {
    const active = this.runs.get(refreshRunKey(run));
    if (active === undefined) return;
    clearTimeout(active.totalTimeout);
    this.runs.delete(refreshRunKey(run));
  }

  cancelRun(scope: LiveArtifactRefreshRunScope, reason = 'live artifact refresh cancelled by user'): boolean {
    const active = this.runs.get(refreshRunKey(scope));
    if (active === undefined) return false;
    active.controller.abort(new LiveArtifactRefreshAbortError(reason, { ...scope, kind: 'cancelled' }));
    return true;
  }

  hasRun(scope: LiveArtifactRefreshRunScope): boolean {
    return this.runs.has(refreshRunKey(scope));
  }
}

export const liveArtifactRefreshRunRegistry = new LiveArtifactRefreshRunRegistry();

export async function withLiveArtifactRefreshRun<T>(
  registry: LiveArtifactRefreshRunRegistry,
  options: LiveArtifactRefreshRunOptions,
  callback: (run: LiveArtifactRefreshRun) => Promise<T>,
): Promise<T> {
  const run = registry.startRun(options);
  try {
    return await Promise.race([callback(run), abortPromise(run.signal)]);
  } catch (error) {
    throw toRefreshAbortError(error, run);
  } finally {
    registry.finishRun(run);
  }
}

export async function withLiveArtifactRefreshSourceTimeout<T>(
  run: LiveArtifactRefreshRun,
  options: LiveArtifactRefreshSourceExecutionOptions,
  callback: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const sourceTimeoutMs = validateTimeoutMs(options.sourceTimeoutMs ?? DEFAULT_LIVE_ARTIFACT_SOURCE_TIMEOUT_MS, 'sourceTimeoutMs');
  const sourceController = new AbortController();
  const onRunAbort = (): void => sourceController.abort(run.signal.reason);
  if (run.signal.aborted) onRunAbort();
  else run.signal.addEventListener('abort', onRunAbort, { once: true });

  const sourceTimeout = setTimeout(() => {
    sourceController.abort(new LiveArtifactRefreshAbortError('live artifact refresh source timed out', {
      projectId: run.projectId,
      artifactId: run.artifactId,
      refreshId: run.refreshId,
      kind: 'source_timeout',
      timeoutMs: sourceTimeoutMs,
      step: options.step,
    }));
  }, sourceTimeoutMs);
  sourceTimeout.unref?.();

  try {
    return await Promise.race([callback(sourceController.signal), abortPromise(sourceController.signal)]);
  } catch (error) {
    throw toRefreshAbortError(error, run);
  } finally {
    clearTimeout(sourceTimeout);
    run.signal.removeEventListener('abort', onRunAbort);
  }
}
