/**
 * TypeScript view onto the shared media-generation registry.
 *
 * Both the frontend (NewProjectPanel pickers, MEDIA_GENERATION_CONTRACT
 * prompt) and the daemon (`od media generate` dispatcher) read the same
 * arrays out of ./models.data.json so there is exactly one source of
 * truth — no hand-mirroring between TS and the daemon's plain JS file,
 * which used to be a drift hazard whenever a new model was added on
 * only one side.
 *
 * Adding or removing a model is a one-line edit in models.data.json;
 * both surfaces pick it up on next reload.
 */
import type { AudioKind, MediaAspect } from '../types';
import data from './models.data.json';

export interface MediaModel {
  /** Stable ID used in metadata.imageModel / videoModel / audioModel. */
  id: string;
  /** Short label shown in pickers — usually equals id. */
  label: string;
  /** Vendor / context hint shown under the label. */
  hint: string;
  /**
   * Capabilities the agent may rely on when planning. Used downstream by
   * the dispatcher to decide which provider call to make.
   */
  caps?: string[];
}

export const IMAGE_MODELS: MediaModel[] = data.image;
export const VIDEO_MODELS: MediaModel[] = data.video;
export const AUDIO_MODELS_BY_KIND: Record<AudioKind, MediaModel[]> = data.audio;

export const MEDIA_ASPECTS: MediaAspect[] = data.aspects as MediaAspect[];
export const VIDEO_LENGTHS_SEC: number[] = data.videoLengthsSec;
export const AUDIO_DURATIONS_SEC: number[] = data.audioDurationsSec;

export const DEFAULT_IMAGE_MODEL = IMAGE_MODELS[0]!.id;
export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0]!.id;
export const DEFAULT_AUDIO_MODEL: Record<AudioKind, string> = {
  music: AUDIO_MODELS_BY_KIND.music[0]!.id,
  speech: AUDIO_MODELS_BY_KIND.speech[0]!.id,
  sfx: AUDIO_MODELS_BY_KIND.sfx[0]!.id,
};

/**
 * Look up a model record across all surfaces by ID. Returns null if the
 * agent passes an unknown model — the dispatcher rejects with a clear
 * error so the agent re-plans instead of silently falling back.
 */
export function findMediaModel(id: string): MediaModel | null {
  const all: MediaModel[] = [
    ...IMAGE_MODELS,
    ...VIDEO_MODELS,
    ...AUDIO_MODELS_BY_KIND.music,
    ...AUDIO_MODELS_BY_KIND.speech,
    ...AUDIO_MODELS_BY_KIND.sfx,
  ];
  return all.find((m) => m.id === id) ?? null;
}

/** All model IDs grouped by surface, used for prompt-side disclosure. */
export function modelIdsBySurface(): {
  image: string[];
  video: string[];
  audio: { music: string[]; speech: string[]; sfx: string[] };
} {
  return {
    image: IMAGE_MODELS.map((m) => m.id),
    video: VIDEO_MODELS.map((m) => m.id),
    audio: {
      music: AUDIO_MODELS_BY_KIND.music.map((m) => m.id),
      speech: AUDIO_MODELS_BY_KIND.speech.map((m) => m.id),
      sfx: AUDIO_MODELS_BY_KIND.sfx.map((m) => m.id),
    },
  };
}
