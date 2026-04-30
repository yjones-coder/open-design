import type { LiveArtifact } from './schema.js';

export type LiveArtifactSummary = Omit<LiveArtifact, 'document' | 'tiles'> & {
  tileCount: number;
  hasDocument: boolean;
};

export const LIVE_ARTIFACTS_DIR_NAME = '.live-artifacts' as const;
export const LIVE_ARTIFACT_ARTIFACT_FILE = 'artifact.json' as const;
export const LIVE_ARTIFACT_TEMPLATE_FILE = 'template.html' as const;
export const LIVE_ARTIFACT_PREVIEW_FILE = 'index.html' as const;
export const LIVE_ARTIFACT_DATA_FILE = 'data.json' as const;
export const LIVE_ARTIFACT_PROVENANCE_FILE = 'provenance.json' as const;
export const LIVE_ARTIFACT_REFRESHES_FILE = 'refreshes.jsonl' as const;
export const LIVE_ARTIFACT_TILES_DIR = 'tiles' as const;
export const LIVE_ARTIFACT_SNAPSHOTS_DIR = 'snapshots' as const;

export interface LiveArtifactStorePaths {
  projectDir: string;
  rootDir: string;
  artifactDir: string;
  artifactJsonPath: string;
  templateHtmlPath: string;
  generatedPreviewHtmlPath: string;
  dataJsonPath: string;
  provenanceJsonPath: string;
  tilesDir: string;
  refreshesJsonlPath: string;
  snapshotsDir: string;
}

export interface LiveArtifactStoreSummary {
  artifact: LiveArtifactSummary;
  paths: LiveArtifactStorePaths;
}

export interface LiveArtifactStoreRecord {
  artifact: LiveArtifact;
  paths: LiveArtifactStorePaths;
}
