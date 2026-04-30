import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runLiveArtifactsToolCli } from '../src/tools-live-artifacts-cli.js';

const ORIGINAL_ENV = { ...process.env };

describe('live artifact tool CLI environment', () => {
  let stdoutWrite: { mockRestore: () => void };
  let stderrWrite: { mockRestore: () => void };
  let stderrOutput: string[];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    stderrOutput = [];
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrOutput.push(String(chunk));
      return true;
    });
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ artifacts: [] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
    process.env = ORIGINAL_ENV;
  });

  it('reads OD_DAEMON_URL and OD_TOOL_TOKEN from the injected environment', async () => {
    process.env.OD_DAEMON_URL = 'http://127.0.0.1:7456/base/';
    process.env.OD_TOOL_TOKEN = 'agent-run-token';

    const result = await runLiveArtifactsToolCli(['list']);

    expect(result.exitCode).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:7456/base/api/tools/live-artifacts/list',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer agent-run-token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('fails before making a request when the injected environment is missing', async () => {
    delete process.env.OD_DAEMON_URL;
    delete process.env.OD_TOOL_TOKEN;

    const result = await runLiveArtifactsToolCli(['list']);

    expect(result.exitCode).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stderrOutput.join('')).toContain('OD_DAEMON_URL is required');
  });

  it('requires OD_TOOL_TOKEN from the injected environment', async () => {
    process.env.OD_DAEMON_URL = 'http://127.0.0.1:7456';
    delete process.env.OD_TOOL_TOKEN;

    const result = await runLiveArtifactsToolCli(['list']);

    expect(result.exitCode).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stderrOutput.join('')).toContain('OD_TOOL_TOKEN is required');
  });
});
