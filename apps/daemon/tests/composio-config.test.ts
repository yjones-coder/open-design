import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  configureComposioConfigStore,
  deleteComposioAuthConfigId,
  readComposioConfig,
  readPublicComposioConfig,
  setComposioAuthConfigId,
  writeComposioConfig,
} from '../src/connectors/composio-config.js';
import { composioConnectorProvider } from '../src/connectors/composio.js';
import type { ConnectorCatalogDefinition } from '../src/connectors/catalog.js';

async function useTempComposioStore(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'od-composio-config-'));
  configureComposioConfigStore(dir);
  composioConnectorProvider.clearDiscoveryCache();
  return dir;
}

function composioDefinition(id = 'github'): ConnectorCatalogDefinition {
  return {
    id,
    name: id,
    provider: 'composio',
    category: 'code',
    authentication: 'composio',
    tools: [],
    allowedToolNames: [],
  };
}

describe('composio config', () => {
  it('stores Composio settings in the configured data directory', async () => {
    const dir = await useTempComposioStore();

    const publicConfig = writeComposioConfig({
      apiKey: 'cmp_secret_1234',
    });

    expect(publicConfig).toEqual({
      configured: true,
      apiKeyTail: '1234',
    });
    expect(readComposioConfig()).toMatchObject({ apiKey: 'cmp_secret_1234', authConfigIds: {} });
    await expect(readFile(path.join(dir, 'connectors', 'composio-config.json'), 'utf8')).resolves.toContain('cmp_secret_1234');
  });

  it('preserves and updates persisted auth config ids', async () => {
    await useTempComposioStore();
    writeComposioConfig({ apiKey: 'stored_secret', authConfigIds: { github: 'ac_github' } });

    writeComposioConfig({});
    setComposioAuthConfigId('slack', 'ac_slack');
    deleteComposioAuthConfigId('github');

    expect(readComposioConfig()).toEqual({
      apiKey: 'stored_secret',
      authConfigIds: { slack: 'ac_slack' },
    });
  });

  it('does not read Composio credentials from environment variables', async () => {
    await useTempComposioStore();
    const originalApiKey = process.env.COMPOSIO_API_KEY;
    try {
      process.env.COMPOSIO_API_KEY = 'env_secret';

      expect(readPublicComposioConfig()).toMatchObject({ configured: false, apiKeyTail: '' });
      expect(composioConnectorProvider.isConfigured(composioDefinition())).toBe(false);

      writeComposioConfig({ apiKey: 'stored_secret' });
      expect(readPublicComposioConfig()).toMatchObject({ configured: true, apiKeyTail: 'cret' });
    } finally {
      if (originalApiKey === undefined) delete process.env.COMPOSIO_API_KEY;
      else process.env.COMPOSIO_API_KEY = originalApiKey;
    }
  });

  it('can clear the stored API key through settings', async () => {
    await useTempComposioStore();
    writeComposioConfig({ apiKey: 'stored_secret' });

    const publicConfig = writeComposioConfig({ apiKey: '' });

    expect(publicConfig.configured).toBe(false);
    expect(composioConnectorProvider.isConfigured(composioDefinition())).toBe(false);
    expect(readComposioConfig()).toEqual({ apiKey: '', authConfigIds: {} });
  });

  it('clears stored auth config ids when the API key changes', async () => {
    await useTempComposioStore();
    writeComposioConfig({ apiKey: 'stored_secret', authConfigIds: { github: 'ac_github' } });

    const publicConfig = writeComposioConfig({ apiKey: 'new_secret' });

    expect(publicConfig).toEqual({ configured: true, apiKeyTail: 'cret' });
    expect(readComposioConfig()).toEqual({ apiKey: 'new_secret', authConfigIds: {} });
  });

  it('ignores stale unsupported persisted technical fields', async () => {
    await useTempComposioStore();
    writeComposioConfig({ apiKey: 'stored_secret' });

    const publicConfig = writeComposioConfig({ apiKey: '', baseUrl: '', userId: '', timeoutMs: null });

    expect(publicConfig).toEqual({ configured: false, apiKeyTail: '' });
    expect(readComposioConfig()).toEqual({ apiKey: '', authConfigIds: {} });
  });
});
