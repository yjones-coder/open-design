import type { BoundedJsonObject } from './schema.js';

export const LIVE_ARTIFACT_RENDER_FORMAT = 'html_template_v1' as const;
export const LIVE_ARTIFACT_TEMPLATE_ENTRY = 'template.html' as const;
export const LIVE_ARTIFACT_DATA_ENTRY = 'data.json' as const;
export const LIVE_ARTIFACT_GENERATED_PREVIEW_ENTRY = 'index.html' as const;

export interface LiveArtifactRenderInput {
  templateHtml: string;
  dataJson: BoundedJsonObject;
}

export interface LiveArtifactRenderOutput {
  html: string;
}

export function escapeHtmlTemplateValue(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
