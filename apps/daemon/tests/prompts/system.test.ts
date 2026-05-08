import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { composeSystemPrompt } from '../../src/prompts/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const liveArtifactRoot = path.join(repoRoot, 'skills/live-artifact');
const liveArtifactSkillPath = path.join(repoRoot, 'skills/live-artifact/SKILL.md');
const liveArtifactSkillMarkdown = readFileSync(liveArtifactSkillPath, 'utf8');
const liveArtifactSkillBody = [
  `> **Skill root (absolute):** \`${liveArtifactRoot}\``,
  '>',
  '> This skill ships side files alongside `SKILL.md`. When the workflow',
  '> below references side files such as `references/artifact-schema.md`, resolve',
  '> them against the skill root above and open them via their full absolute path.',
  '>',
  '> Known side files in this skill: `references/artifact-schema.md`, `references/connector-policy.md`, `references/refresh-contract.md`.',
  '',
  '',
  liveArtifactSkillMarkdown.replace(/^---[\s\S]*?---\n\n/, '').trim(),
].join('\n');

const hyperframesRoot = path.join(repoRoot, 'skills/hyperframes');
const hyperframesSkillPath = path.join(repoRoot, 'skills/hyperframes/SKILL.md');
const hyperframesSkillMarkdown = readFileSync(hyperframesSkillPath, 'utf8');
const hyperframesSkillBody = [
  `> **Skill root (absolute):** \`${hyperframesRoot}\``,
  '>',
  '> This skill ships side files alongside `SKILL.md`. Resolve references',
  '> like `references/html-in-canvas.md` against the skill root above.',
  '',
  '',
  hyperframesSkillMarkdown.replace(/^---[\s\S]*?---\n\n/, '').trim(),
].join('\n');

describe('composeSystemPrompt', () => {
  it('injects live-artifact skill guidance and metadata intent', () => {
    const prompt = composeSystemPrompt({
      skillName: 'live-artifact',
      skillMode: 'prototype',
      skillBody: liveArtifactSkillBody,
      metadata: {
        kind: 'prototype',
        intent: 'live-artifact',
      } as any,
    });

    expect(prompt).toContain('## Active skill — live-artifact');
    expect(prompt).toContain(`> **Skill root (absolute):** \`${liveArtifactRoot}\``);
    expect(prompt).not.toContain('**Pre-flight (do this before any other tool):** Read `assets/template.html`');
    expect(prompt).not.toContain('live-artifact/references/layouts.md');
    expect(prompt).not.toContain('live-artifact/assets/template.html');
    expect(prompt).toContain('`references/artifact-schema.md`');
    expect(prompt).toContain('`references/connector-policy.md`');
    expect(prompt).toContain('`references/refresh-contract.md`');
    expect(prompt).toContain('The wrapper reads injected `OD_NODE_BIN`, `OD_BIN`, `OD_DAEMON_URL`, and `OD_TOOL_TOKEN`');
    expect(prompt).toContain('Do not include or invent `projectId`; the daemon derives project/run scope from the token.');
    expect(prompt).toContain('"$OD_NODE_BIN" "$OD_BIN" tools live-artifacts create --input artifact.json');
    expect(prompt).toContain('if the user names a connector/source (for example Notion)');
    expect(prompt).toContain('list connectors before asking where the data comes from');
    expect(prompt).toContain('a connected `notion` connector plus a user brief that names Notion is enough to start with `notion.notion_search`');
    expect(prompt).toContain('Prefer the `live-artifact` skill workflow when available');
    expect(prompt).toContain('The first output should be a live artifact/dashboard/report');
  });

  // The daemon composer (this file) is what apps/daemon/src/server.ts wires
  // into live chat runs. The contracts copy at packages/contracts/src/prompts
  // /system.ts exists for non-daemon contexts and was updated in the
  // hyperframes PR; without this test the two copies drift silently and the
  // main HyperFrames flow misses its preflight directive in production.
  it('injects the html-in-canvas preflight for the hyperframes skill', () => {
    const prompt = composeSystemPrompt({
      skillName: 'hyperframes',
      skillMode: 'video',
      skillBody: hyperframesSkillBody,
      metadata: {
        kind: 'video',
        videoModel: 'hyperframes-html',
      } as any,
    });

    expect(prompt).toContain('## Active skill — hyperframes');
    expect(prompt).toContain('**Pre-flight (do this before any other tool):**');
    expect(prompt).toContain('`references/html-in-canvas.md`');
  });
});
