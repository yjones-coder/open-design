import {
  appendLiveArtifactRefreshLogEntry,
  commitLiveArtifactRefreshCandidate,
  getLiveArtifact,
  type LiveArtifactStoreRecord,
  withLiveArtifactRefreshLock,
} from './store.js';
import {
  buildLiveArtifactRefreshCandidate,
  executeLocalDaemonRefreshSource,
  liveArtifactRefreshRunRegistry,
  normalizeLiveArtifactRefreshTimeouts,
  withLiveArtifactRefreshRun,
  withLiveArtifactRefreshSourceTimeout,
} from './refresh.js';
import type { BoundedJsonObject, LiveArtifactRefreshErrorRecord, LiveArtifactRefreshSourceMetadata, LiveArtifactTile, LiveArtifactTileSource } from './schema.js';

export interface RefreshLiveArtifactOptions {
  projectsRoot: string;
  projectId: string;
  artifactId: string;
  now?: Date;
}

export interface RefreshLiveArtifactResult {
  artifact: LiveArtifactStoreRecord['artifact'];
  refresh: {
    id: string;
    status: 'succeeded';
    refreshedTileCount: number;
  };
}

function nowDate(): Date {
  return new Date();
}

function durationMs(startedAt: Date, finishedAt: Date): number {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}

function toRefreshErrorRecord(error: unknown): LiveArtifactRefreshErrorRecord {
  if (error instanceof Error) {
    return error.name === 'Error'
      ? { message: error.message }
      : { code: error.name, message: error.message };
  }
  return { message: String(error) };
}

function tileSourceMetadata(tile: LiveArtifactTile, source: LiveArtifactTileSource): LiveArtifactRefreshSourceMetadata {
  const metadata: LiveArtifactRefreshSourceMetadata = {
    sourceType: 'tile',
    tileId: tile.id,
  };
  if (source.toolName !== undefined) metadata.toolName = source.toolName;
  if (source.connector !== undefined) metadata.connector = source.connector;
  return metadata;
}

export async function refreshLiveArtifact(options: RefreshLiveArtifactOptions): Promise<RefreshLiveArtifactResult> {
  return withLiveArtifactRefreshLock(options, async (lock) => {
    const refreshId = lock.metadata.refreshId;
    let sequence = 0;

    const appendLog = async (entry: {
      step: string;
      status: 'running' | 'succeeded' | 'failed' | 'cancelled' | 'skipped';
      startedAt: Date;
      finishedAt?: Date;
      source?: LiveArtifactRefreshSourceMetadata;
      error?: unknown;
      metadata?: BoundedJsonObject;
    }): Promise<void> => {
      await appendLiveArtifactRefreshLogEntry({
        projectsRoot: options.projectsRoot,
        projectId: options.projectId,
        artifactId: options.artifactId,
        refreshId,
        sequence: sequence++,
        step: entry.step,
        status: entry.status,
        startedAt: entry.startedAt,
        ...(entry.finishedAt === undefined ? {} : { finishedAt: entry.finishedAt, durationMs: durationMs(entry.startedAt, entry.finishedAt) }),
        ...(entry.source === undefined ? {} : { source: entry.source }),
        ...(entry.error === undefined ? {} : { error: toRefreshErrorRecord(entry.error) }),
        ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
      });
    };

    const refreshStartedAt = options.now ?? nowDate();
    await appendLog({ step: 'refresh:start', status: 'running', startedAt: refreshStartedAt });

    try {
      const record = await getLiveArtifact(options);
      const artifact = record.artifact;
      const currentDataJson = artifact.document?.dataJson ?? {};
      const refreshableTiles = artifact.tiles.filter((tile) => tile.sourceJson?.refreshPermission === 'manual_refresh_granted_for_read_only');
      const timeouts = normalizeLiveArtifactRefreshTimeouts();

      const candidate = await withLiveArtifactRefreshRun(
        liveArtifactRefreshRunRegistry,
        {
          projectId: options.projectId,
          artifactId: options.artifactId,
          refreshId,
          totalTimeoutMs: timeouts.totalTimeoutMs,
          now: refreshStartedAt,
        },
        async (run) => {
          const tileOutputs: Array<{ tileId: string; output: BoundedJsonObject }> = [];
          for (const tile of refreshableTiles) {
            const source = tile.sourceJson;
            if (source === undefined) continue;
            const step = `tile:${tile.id}`;
            const sourceMetadata = tileSourceMetadata(tile, source);
            const tileStartedAt = nowDate();
            await appendLog({ step, status: 'running', startedAt: tileStartedAt, source: sourceMetadata });
            try {
              if (source.type !== 'daemon_tool') {
                throw new Error(`refresh source ${source.type} is not supported yet`);
              }
              const output = await withLiveArtifactRefreshSourceTimeout(
                run,
                { step, source: sourceMetadata, sourceTimeoutMs: timeouts.sourceTimeoutMs },
                (signal) => executeLocalDaemonRefreshSource({ projectsRoot: options.projectsRoot, projectId: options.projectId, source, signal }),
              );
              const tileFinishedAt = nowDate();
              await appendLog({ step, status: 'succeeded', startedAt: tileStartedAt, finishedAt: tileFinishedAt, source: sourceMetadata });
              tileOutputs.push({ tileId: tile.id, output });
            } catch (error) {
              const tileFinishedAt = nowDate();
              await appendLog({ step, status: 'failed', startedAt: tileStartedAt, finishedAt: tileFinishedAt, source: sourceMetadata, error });
              throw error;
            }
          }
          return buildLiveArtifactRefreshCandidate({ artifact, currentDataJson, tileOutputs, now: nowDate() });
        },
      );

      const committed = await commitLiveArtifactRefreshCandidate({
        projectsRoot: options.projectsRoot,
        projectId: options.projectId,
        artifactId: options.artifactId,
        refreshId,
        dataJson: candidate.dataJson,
        tiles: candidate.tiles,
        now: nowDate(),
      });

      const refreshFinishedAt = nowDate();
      await appendLog({
        step: 'refresh:commit',
        status: 'succeeded',
        startedAt: refreshStartedAt,
        finishedAt: refreshFinishedAt,
        metadata: { refreshedTileCount: refreshableTiles.length },
      });

      return {
        artifact: committed.artifact,
        refresh: { id: refreshId, status: 'succeeded', refreshedTileCount: refreshableTiles.length },
      };
    } catch (error) {
      const refreshFinishedAt = nowDate();
      await appendLog({ step: 'refresh:failed', status: 'failed', startedAt: refreshStartedAt, finishedAt: refreshFinishedAt, error }).catch(() => {});
      throw error;
    }
  });
}
