import { describe, expect, it } from 'vitest';

import { renderResearchCommandContract } from '../src/prompts/research-contract.js';

describe('renderResearchCommandContract', () => {
  it('requires /search runs to use the research command as the first tool action', () => {
    const prompt = renderResearchCommandContract('EV market 2025 trends');

    expect(prompt).toContain(
      'the first tool action must be the research command with this canonical query',
    );
    expect(prompt).toContain(
      'If the OD command fails because Tavily is not configured or unavailable',
    );
    expect(prompt).toContain(
      'use your own search capability as fallback and label the fallback clearly',
    );
    expect(prompt).toContain('EV market 2025 trends');
    expect(prompt).toContain('node "$OD_BIN" research search --query "<search query>" --max-sources 5');
  });
});
