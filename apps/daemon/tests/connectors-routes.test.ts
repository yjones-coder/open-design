// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startServer } from '../src/server.js';
import { composioConnectorProvider } from '../src/connectors/composio.js';
import { readComposioConfig, writeComposioConfig } from '../src/connectors/composio-config.js';
import { deleteConnectorCredentialsByProvider } from '../src/connectors/service.js';
import { CHAT_TOOL_ENDPOINTS, CHAT_TOOL_OPERATIONS, toolTokenRegistry } from '../src/tool-tokens.js';

let server;
let baseUrl;
let originalComposioConfig;
const originalFetch = globalThis.fetch;
let lastComposioLinkRequest;
let composioDiscoveryRequestCounts;

function composioJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockComposioFetch(options = {}) {
  const {
    authConfigs = [{ id: 'ac_github', status: 'ENABLED', toolkit: { slug: 'github' } }],
    linkResponse = { connected_account_id: 'ca_github', status: 'ACTIVE', account_label: 'octocat@example.com' },
  } = options;
  composioDiscoveryRequestCounts = { authConfigs: 0, toolkits: 0, tools: 0 };
  vi.stubGlobal('fetch', async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
      return originalFetch(input, init);
    }
    const parsed = new URL(url);
    if (parsed.pathname === '/api/v3/auth_configs') {
      composioDiscoveryRequestCounts.authConfigs += 1;
      return composioJson({ items: authConfigs });
    }
    if (parsed.pathname === '/api/v3.1/toolkits') {
      composioDiscoveryRequestCounts.toolkits += 1;
      return composioJson({ items: [{ slug: 'github', name: 'GitHub', description: 'GitHub toolkit', categories: [{ name: 'Developer' }] }] });
    }
    if (parsed.pathname === '/api/v3.1/tools' && parsed.searchParams.get('toolkit_slug') === 'github') {
      composioDiscoveryRequestCounts.tools += 1;
      return composioJson({ items: [{ slug: 'GITHUB_SEARCH_REPOSITORIES', name: 'Search repositories', description: 'Search public and private repositories', toolkit: { slug: 'github' }, input_parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false }, tags: ['read'] }] });
    }
    if (parsed.pathname === '/api/v3.1/connected_accounts/link') {
      lastComposioLinkRequest = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      return composioJson(linkResponse);
    }
    if (parsed.pathname === '/api/v3/connected_accounts/ca_github') {
      return composioJson({ connected_account_id: 'ca_github', status: 'ACTIVE', account_label: 'octocat@example.com', toolkit: { slug: 'github' }, auth_config: { id: 'ac_github' } });
    }
    if (parsed.pathname === '/api/v3.1/tools/execute/GITHUB_SEARCH_REPOSITORIES') {
      return composioJson({ successful: true, data: { results: [] }, log_id: 'log_1' });
    }
    if (parsed.pathname === '/api/v3/connected_accounts/ca_github' && init?.method === 'DELETE') {
      return composioJson({ ok: true });
    }
    return composioJson({ message: `Unhandled Composio mock: ${url}` }, 404);
  });
}

beforeEach(async () => {
  originalComposioConfig = readComposioConfig();
  lastComposioLinkRequest = undefined;
  mockComposioFetch();
  const started = await startServer({ port: 0, returnServer: true });
  server = started.server;
  baseUrl = started.url;
  await jsonFetch(`${baseUrl}/api/connectors/composio/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'cmp_test' }),
  });
});

afterEach(async () => {
  deleteConnectorCredentialsByProvider('composio');
  writeComposioConfig(originalComposioConfig ?? { apiKey: '' });
  composioConnectorProvider.clearDiscoveryCache();
  await new Promise((resolve, reject) => {
    if (!server) return resolve(undefined);
    server.close((error) => (error ? reject(error) : resolve(undefined)));
  });
  server = undefined;
  toolTokenRegistry.clear();
  vi.unstubAllGlobals();
});

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

function mintConnectorToolToken(projectId = 'connector-route-project', runId = 'connector-route-run', overrides = {}) {
  return toolTokenRegistry.mint({
    projectId,
    runId,
    allowedEndpoints: CHAT_TOOL_ENDPOINTS,
    allowedOperations: CHAT_TOOL_OPERATIONS,
    ...overrides,
  }).token;
}

describe('connector routes', () => {
  it('lists catalog connectors without hitting Composio discovery endpoints', async () => {
    const response = await jsonFetch(`${baseUrl}/api/connectors`);

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['github', 'notion', 'google_drive']);
    const github = response.body.connectors.find((connector) => connector.id === 'github');
    expect(github).toMatchObject({
      id: 'github',
      name: 'GitHub',
      provider: 'composio',
      auth: { provider: 'composio', configured: false },
    });
    expect(github.tools).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'github.github_search_repositories' })]));
    expect(response.body.connectors.find((connector) => connector.id === 'google_drive')).toMatchObject({
      id: 'google_drive',
      auth: { provider: 'composio', configured: false },
    });
    expect(response.body.connectors.find((connector) => connector.id === 'notion')).toMatchObject({
      id: 'notion',
      auth: { provider: 'composio', configured: false },
    });
    expect(composioDiscoveryRequestCounts).toEqual({ authConfigs: 0, toolkits: 0, tools: 0 });
  });

  it('reuses Composio discovery results across consecutive discovery requests', async () => {
    const first = await jsonFetch(`${baseUrl}/api/connectors/discovery`);
    const second = await jsonFetch(`${baseUrl}/api/connectors/discovery`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.connectors.map((connector) => connector.id)).toEqual(['github', 'notion', 'google_drive']);
    expect(second.body.connectors.map((connector) => connector.id)).toEqual(['github', 'notion', 'google_drive']);
    expect(first.body.meta).toMatchObject({ provider: 'composio' });
    expect(composioDiscoveryRequestCounts).toEqual({ authConfigs: 1, toolkits: 1, tools: 1 });
  });

  it('returns connector statuses by connectorId', async () => {
    await jsonFetch(`${baseUrl}/api/connectors/github/connect`, { method: 'POST' });

    const response = await jsonFetch(`${baseUrl}/api/connectors/status`);

    expect(response.status).toBe(200);
    expect(response.body.statuses.github).toMatchObject({ status: 'connected', accountLabel: 'octocat@example.com' });
    expect(response.body.statuses.notion).toMatchObject({ status: 'available' });
    expect(response.body.statuses.google_drive).toMatchObject({ status: 'available' });
  });

  it('returns static catalog connectors even when Composio auth configs are empty', async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve(undefined)));
    });
    mockComposioFetch({ authConfigs: [] });
    const started = await startServer({ port: 0, returnServer: true });
    server = started.server;
    baseUrl = started.url;
    await jsonFetch(`${baseUrl}/api/connectors/composio/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'cmp_test' }),
    });

    const response = await jsonFetch(`${baseUrl}/api/connectors`);

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['github', 'notion', 'google_drive']);
    expect(response.body.connectors.every((connector) => connector.auth?.configured === false)).toBe(true);
  });

  it('returns static catalog connectors before Composio is configured', async () => {
    writeComposioConfig({ apiKey: '' });
    composioConnectorProvider.clearDiscoveryCache();

    const response = await jsonFetch(`${baseUrl}/api/connectors`);

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['github', 'notion', 'google_drive']);
    expect(response.body.connectors.every((connector) => connector.auth?.configured === false)).toBe(true);
  });

  it('returns connector detail and 404 for unknown connectors', async () => {
    const detail = await jsonFetch(`${baseUrl}/api/connectors/github`);

    expect(detail.status).toBe(200);
    expect(detail.body.connector).toMatchObject({ id: 'github', name: 'GitHub' });

    const missing = await jsonFetch(`${baseUrl}/api/connectors/missing`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CONNECTOR_NOT_FOUND');
  });

  it('connects and disconnects a Composio connector', async () => {
    const connect = await jsonFetch(`${baseUrl}/api/connectors/github/connect`, { method: 'POST' });

    expect(connect.status).toBe(200);
    expect(connect.body.connector).toMatchObject({ id: 'github', status: 'connected', accountLabel: 'octocat@example.com' });

    const disconnect = await jsonFetch(`${baseUrl}/api/connectors/github/connection`, { method: 'DELETE' });
    expect(disconnect.status).toBe(200);
    expect(disconnect.body.connector).toMatchObject({ id: 'github', status: 'available' });
  });

  it('returns branded callback HTML that notifies the opener', async () => {
    await new Promise((resolve, reject) => {
      if (!server) return resolve(undefined);
      server.close((error) => (error ? reject(error) : resolve(undefined)));
    });
    mockComposioFetch({
      linkResponse: {
        connected_account_id: 'ca_github',
        status: 'INITIATED',
        redirect_url: 'https://example.com/oauth',
      },
    });
    const started = await startServer({ port: 0, returnServer: true });
    server = started.server;
    baseUrl = started.url;
    await jsonFetch(`${baseUrl}/api/connectors/composio/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'cmp_test' }),
    });

    const connect = await jsonFetch(`${baseUrl}/api/connectors/github/connect`, { method: 'POST' });
    expect(connect.status).toBe(200);
    expect(connect.body.auth).toMatchObject({ kind: 'redirect_required' });
    const callbackUrl = new URL(lastComposioLinkRequest.callback_url);

    const response = await fetch(
      `${baseUrl}/api/connectors/oauth/callback/github?state=${encodeURIComponent(callbackUrl.searchParams.get('state'))}&status=success&connected_account_id=ca_github`,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<main aria-labelledby="callback-title">');
    expect(html).toContain('GitHub connected');
    expect(html).toContain('Open Design');
    expect(html).toContain('open-design:connector-connected');
    expect(html).not.toContain('<p>Connector connected. You can close this window.</p>');
  });

  it('lists connected Composio tools through run-scoped tool auth', async () => {
    await jsonFetch(`${baseUrl}/api/connectors/github/connect`, { method: 'POST' });
    const token = mintConnectorToolToken();

    const response = await jsonFetch(`${baseUrl}/api/tools/connectors/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['github']);
    expect(response.body.connectors[0].tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'github.github_search_repositories', safety: expect.objectContaining({ sideEffect: 'read', approval: 'auto' }) }),
    ]));
  });

  it('executes connected Composio tools through run-scoped tool auth', async () => {
    await jsonFetch(`${baseUrl}/api/connectors/github/connect`, { method: 'POST' });
    const token = mintConnectorToolToken('connector-execute-project', 'connector-execute-run');

    const response = await jsonFetch(`${baseUrl}/api/tools/connectors/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ connectorId: 'github', toolName: 'github.github_search_repositories', input: { query: 'open-design' } }),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, connectorId: 'github', accountLabel: 'octocat@example.com', toolName: 'github.github_search_repositories' });
    expect(response.body.output).toMatchObject({ toolName: 'github.github_search_repositories', providerToolId: 'GITHUB_SEARCH_REPOSITORIES', data: { results: [] } });
  });

  it('rejects connector tool requests outside token scope', async () => {
    const listOnlyToken = mintConnectorToolToken('connector-scope-project', 'connector-scope-run', {
      allowedEndpoints: ['/api/tools/connectors/list'],
      allowedOperations: ['connectors:list'],
    });

    const execute = await jsonFetch(`${baseUrl}/api/tools/connectors/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${listOnlyToken}` },
      body: JSON.stringify({ connectorId: 'github', toolName: 'github.github_search_repositories', input: { query: 'open-design' } }),
    });

    expect(execute.status).toBe(403);
    expect(execute.body.error.code).toBe('TOOL_ENDPOINT_DENIED');
  });
});
