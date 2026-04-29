// Daemon-side wrapper around the shared media model registry. The
// authoritative data lives in src/media/models.data.json so the
// frontend (NewProjectPanel pickers, MEDIA_GENERATION_CONTRACT prompt)
// and the daemon dispatcher read the exact same arrays — no hand-mirror,
// no drift. We keep this file in plain JS so the daemon never needs a
// TS toolchain at runtime; it just JSON.parses one file at module load.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'src', 'media', 'models.data.json');

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

export const IMAGE_MODELS = data.image;
export const VIDEO_MODELS = data.video;
export const AUDIO_MODELS_BY_KIND = data.audio;
export const MEDIA_ASPECTS = data.aspects;
export const VIDEO_LENGTHS_SEC = data.videoLengthsSec;
export const AUDIO_DURATIONS_SEC = data.audioDurationsSec;

export function findMediaModel(id) {
  const all = [
    ...IMAGE_MODELS,
    ...VIDEO_MODELS,
    ...AUDIO_MODELS_BY_KIND.music,
    ...AUDIO_MODELS_BY_KIND.speech,
    ...AUDIO_MODELS_BY_KIND.sfx,
  ];
  return all.find((m) => m.id === id) || null;
}

export function modelsForSurface(surface, audioKind) {
  if (surface === 'image') return IMAGE_MODELS;
  if (surface === 'video') return VIDEO_MODELS;
  if (surface === 'audio') {
    const k = audioKind || 'music';
    return AUDIO_MODELS_BY_KIND[k] || AUDIO_MODELS_BY_KIND.music;
  }
  return [];
}

// Surface-aware lookup. Returns the model record only when it is registered
// for the given (surface, audioKind) pair. The dispatcher uses this to
// reject mismatches like `surface=image, model=suno-v5` BEFORE writing
// bytes — without it, an audio model would silently produce an image-named
// stub and routing to a real provider later would land in the wrong place.
export function findMediaModelForSurface(id, surface, audioKind) {
  const list = modelsForSurface(surface, audioKind);
  return list.find((m) => m.id === id) || null;
}
