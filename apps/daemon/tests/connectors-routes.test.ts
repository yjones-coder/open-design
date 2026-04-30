// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

let server;
let baseUrl;

beforeEach(async () => {
  const started = await startServer({ port: 0, returnServer: true });
  server = started.server;
  baseUrl = started.url;
});

afterEach(async () => {
  await new Promise((resolve, reject) => {
    if (!server) return resolve(undefined);
    server.close((error) => (error ? reject(error) : resolve(undefined)));
  });
  server = undefined;
});

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

describe('connector routes', () => {
  it('lists the built-in connectors', async () => {
    const response = await jsonFetch(`${baseUrl}/api/connectors`);

    expect(response.status).toBe(200);
    expect(response.body.connectors.map((connector) => connector.id)).toEqual(['project_files', 'git']);
  });

  it('returns connector detail and 404 for unknown connectors', async () => {
    const detail = await jsonFetch(`${baseUrl}/api/connectors/project_files`);

    expect(detail.status).toBe(200);
    expect(detail.body.connector).toMatchObject({
      id: 'project_files',
      name: 'Project files',
      status: 'connected',
    });

    const missing = await jsonFetch(`${baseUrl}/api/connectors/missing`);

    expect(missing.status).toBe(404);
    expect(missing.body).toMatchObject({
      error: {
        code: 'CONNECTOR_NOT_FOUND',
        message: 'connector not found',
      },
    });
  });

  it('connects and disconnects an existing connector', async () => {
    const connect = await jsonFetch(`${baseUrl}/api/connectors/git/connect`, { method: 'POST' });

    expect(connect.status).toBe(200);
    expect(connect.body.connector).toMatchObject({
      id: 'git',
      status: 'connected',
      accountLabel: 'Current repository',
    });

    const disconnect = await jsonFetch(`${baseUrl}/api/connectors/git/connection`, { method: 'DELETE' });

    expect(disconnect.status).toBe(200);
    expect(disconnect.body.connector).toMatchObject({
      id: 'git',
      status: 'connected',
      accountLabel: 'Current repository',
    });
  });
});
