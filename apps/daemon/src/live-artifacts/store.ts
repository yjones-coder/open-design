import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureProject, projectDir } from '../projects.js';
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

const SAFE_LIVE_ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const LIVE_ARTIFACT_ID_PREFIX = 'la';
const LIVE_ARTIFACT_ID_RANDOM_BYTES = 6;
const LIVE_ARTIFACT_ID_RANDOM_SUFFIX_LENGTH = LIVE_ARTIFACT_ID_RANDOM_BYTES * 2;
const MAX_LIVE_ARTIFACT_STORAGE_ID_LENGTH = 128;
const MAX_LIVE_ARTIFACT_SLUG_LENGTH = 128;
const FALLBACK_LIVE_ARTIFACT_SLUG = 'live-artifact';

function isPathInside(parentDir: string, targetPath: string): boolean {
  const relative = path.relative(parentDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveInside(parentDir: string, relativePath: string, escapeMessage: string): string {
  if (path.isAbsolute(relativePath) || relativePath.includes('\0')) {
    throw new Error(escapeMessage);
  }
  const targetPath = path.resolve(parentDir, relativePath);
  if (!isPathInside(parentDir, targetPath)) {
    throw new Error(escapeMessage);
  }
  return targetPath;
}

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

export interface GenerateLiveArtifactIdOptions {
  title: string;
  slug?: string;
  randomSuffix?: string;
}

function truncateSlugAtSegmentBoundary(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) return slug;
  const truncated = slug.slice(0, maxLength).replace(/-+$/g, '');
  return truncated.length > 0 ? truncated : slug.slice(0, maxLength);
}

export function generateLiveArtifactSlug(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return truncateSlugAtSegmentBoundary(slug || FALLBACK_LIVE_ARTIFACT_SLUG, MAX_LIVE_ARTIFACT_SLUG_LENGTH);
}

export function generateLiveArtifactId(options: GenerateLiveArtifactIdOptions): string {
  const randomSuffix = options.randomSuffix ?? randomBytes(LIVE_ARTIFACT_ID_RANDOM_BYTES).toString('hex');
  if (!/^[a-f0-9]+$/i.test(randomSuffix) || randomSuffix.length === 0) {
    throw new Error('invalid live artifact id random suffix');
  }

  const suffix = randomSuffix.toLowerCase();
  const maxSlugLength = MAX_LIVE_ARTIFACT_STORAGE_ID_LENGTH - LIVE_ARTIFACT_ID_PREFIX.length - suffix.length - 2;
  if (maxSlugLength < 1) {
    throw new Error('invalid live artifact id random suffix');
  }
  const slug = truncateSlugAtSegmentBoundary(generateLiveArtifactSlug(options.slug ?? options.title), maxSlugLength);
  return validateLiveArtifactStorageId(`${LIVE_ARTIFACT_ID_PREFIX}-${slug}-${suffix}`);
}

export function validateLiveArtifactStorageId(artifactId: string): string {
  if (!SAFE_LIVE_ARTIFACT_ID.test(artifactId) || artifactId === '.' || artifactId === '..') {
    throw new Error('invalid live artifact id');
  }
  return artifactId;
}

export function liveArtifactsRootDir(projectsRoot: string, projectId: string): string {
  const projectDirPath = path.resolve(projectDir(projectsRoot, projectId));
  return resolveInside(projectDirPath, LIVE_ARTIFACTS_DIR_NAME, 'live artifact path escapes project dir');
}

export function liveArtifactStorePaths(
  projectsRoot: string,
  projectId: string,
  artifactId: string,
): LiveArtifactStorePaths {
  const safeArtifactId = validateLiveArtifactStorageId(artifactId);
  const projectDirPath = path.resolve(projectDir(projectsRoot, projectId));
  const rootDir = liveArtifactsRootDir(projectsRoot, projectId);
  const artifactDir = resolveInside(rootDir, safeArtifactId, 'live artifact path escapes storage root');
  if (!isPathInside(projectDirPath, artifactDir)) throw new Error('live artifact path escapes project dir');

  return {
    projectDir: projectDirPath,
    rootDir,
    artifactDir,
    artifactJsonPath: resolveInside(artifactDir, LIVE_ARTIFACT_ARTIFACT_FILE, 'live artifact path escapes artifact dir'),
    templateHtmlPath: resolveInside(artifactDir, LIVE_ARTIFACT_TEMPLATE_FILE, 'live artifact path escapes artifact dir'),
    generatedPreviewHtmlPath: resolveInside(artifactDir, LIVE_ARTIFACT_PREVIEW_FILE, 'live artifact path escapes artifact dir'),
    dataJsonPath: resolveInside(artifactDir, LIVE_ARTIFACT_DATA_FILE, 'live artifact path escapes artifact dir'),
    provenanceJsonPath: resolveInside(artifactDir, LIVE_ARTIFACT_PROVENANCE_FILE, 'live artifact path escapes artifact dir'),
    tilesDir: resolveInside(artifactDir, LIVE_ARTIFACT_TILES_DIR, 'live artifact path escapes artifact dir'),
    refreshesJsonlPath: resolveInside(artifactDir, LIVE_ARTIFACT_REFRESHES_FILE, 'live artifact path escapes artifact dir'),
    snapshotsDir: resolveInside(artifactDir, LIVE_ARTIFACT_SNAPSHOTS_DIR, 'live artifact path escapes artifact dir'),
  };
}

export function liveArtifactTilePath(paths: LiveArtifactStorePaths, tileId: string): string {
  const safeTileId = validateLiveArtifactStorageId(tileId);
  const tilesDir = path.resolve(paths.tilesDir);
  const tilePath = resolveInside(tilesDir, `${safeTileId}.json`, 'live artifact tile path escapes tiles dir');
  if (!isPathInside(path.resolve(paths.projectDir), tilePath)) throw new Error('live artifact path escapes project dir');
  return tilePath;
}

export async function ensureLiveArtifactStoreLayout(
  projectsRoot: string,
  projectId: string,
  artifactId: string,
): Promise<LiveArtifactStorePaths> {
  await ensureProject(projectsRoot, projectId);
  const paths = liveArtifactStorePaths(projectsRoot, projectId, artifactId);
  await mkdir(paths.tilesDir, { recursive: true });
  await mkdir(paths.snapshotsDir, { recursive: true });
  await writeFile(paths.refreshesJsonlPath, '', { flag: 'a' });
  return paths;
}
