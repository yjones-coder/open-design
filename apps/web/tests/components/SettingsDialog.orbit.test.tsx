// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConnectorDetail } from '@open-design/contracts';

import { SettingsDialog } from '../../src/components/SettingsDialog';
import { fetchConnectors, fetchSkills } from '../../src/providers/registry';
import type { AppConfig, SkillSummary } from '../../src/types';

vi.mock('../../src/providers/registry', async () => {
  const actual = await vi.importActual<typeof import('../../src/providers/registry')>(
    '../../src/providers/registry',
  );
  return {
    ...actual,
    fetchConnectors: vi.fn(),
    fetchSkills: vi.fn(),
  };
});

const originalFetch = globalThis.fetch;

const baseConfig: AppConfig = {
  mode: 'api',
  apiKey: 'sk-test',
  apiProtocol: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-sonnet-4-5',
  apiProviderBaseUrl: 'https://api.anthropic.com',
  agentId: null,
  skillId: null,
  designSystemId: null,
  composio: { apiKeyConfigured: true },
  orbit: {
    enabled: false,
    time: '09:00',
    templateSkillId: 'orbit-general',
  },
};

const connectedConnector: ConnectorDetail = {
  id: 'github',
  name: 'GitHub',
  provider: 'Composio',
  category: 'Code',
  status: 'connected',
  auth: { provider: 'composio', configured: true },
  tools: [],
};

const clipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');

const orbitSkills: SkillSummary[] = [
  {
    id: 'orbit-general',
    name: 'orbit-general',
    description: 'General daily digest',
    triggers: [],
    mode: 'prototype',
    scenario: 'orbit',
    previewType: 'HTML',
    designSystemRequired: false,
    defaultFor: [],
    upstream: null,
    featured: 10,
    hasBody: true,
    examplePrompt: 'Summarize connector activity.',
    aggregatesExamples: false,
  },
  {
    id: 'orbit-github',
    name: 'orbit-github',
    description: 'GitHub-focused digest',
    triggers: [],
    mode: 'prototype',
    scenario: 'orbit',
    previewType: 'HTML',
    designSystemRequired: false,
    defaultFor: [],
    upstream: null,
    featured: 5,
    hasBody: true,
    examplePrompt: 'Summarize GitHub activity.',
    aggregatesExamples: false,
  },
];

function renderOrbitSettings(
  initial: Partial<AppConfig> = {},
  options: {
    composioApiKeyConfigured?: boolean;
    onPersist?: ReturnType<typeof vi.fn>;
    onClose?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const onPersist = options.onPersist ?? vi.fn();
  const onClose = options.onClose ?? vi.fn();

  render(
    <SettingsDialog
      initial={{
        ...baseConfig,
        ...initial,
        composio: {
          apiKeyConfigured: options.composioApiKeyConfigured ?? true,
          ...(initial.composio ?? {}),
        },
      }}
      agents={[]}
      daemonLive
      appVersionInfo={null}
      initialSection="orbit"
      onPersist={onPersist}
      onPersistComposioKey={vi.fn()}
      onClose={onClose}
      onRefreshAgents={vi.fn()}
    />,
  );

  return { onPersist, onClose };
}

describe('SettingsDialog Orbit connector gate refresh', () => {
  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    if (clipboardDescriptor) {
      Object.defineProperty(window.navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator, 'clipboard');
    }
    vi.restoreAllMocks();
    vi.mocked(fetchConnectors).mockReset();
    vi.mocked(fetchSkills).mockReset();
  });

  it('rechecks connected connectors when the window regains focus', async () => {
    vi.mocked(fetchConnectors)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([connectedConnector]);
    vi.mocked(fetchSkills).mockResolvedValue([]);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/orbit/status') {
        return new Response(null, { status: 404 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    render(
      <SettingsDialog
        initial={baseConfig}
        agents={[]}
        daemonLive
        appVersionInfo={null}
        initialSection="orbit"
        onPersist={vi.fn()}
        onPersistComposioKey={vi.fn()}
        onClose={vi.fn()}
        onRefreshAgents={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('orbit-config-gate')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Run it now' }).hasAttribute('disabled')).toBe(true);

    fireEvent.focus(window);

    await waitFor(() => {
      expect(screen.queryByTestId('orbit-config-gate')).toBeNull();
      expect(screen.getByRole('button', { name: 'Run it now' }).hasAttribute('disabled')).toBe(false);
    });
  });

  it('locks Orbit controls until a connector is connected and routes the gate CTA to Connectors', async () => {
    vi.mocked(fetchConnectors).mockResolvedValue([]);
    vi.mocked(fetchSkills).mockResolvedValue(orbitSkills);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/orbit/status') {
        return new Response(null, { status: 404 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    renderOrbitSettings({}, { composioApiKeyConfigured: false });

    await waitFor(() => {
      expect(screen.getByTestId('orbit-config-gate')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Run it now' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('switch', { name: /Off/i }).hasAttribute('disabled')).toBe(true);
    expect((screen.getByLabelText('Daily Orbit run time') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Orbit prompt template') as HTMLSelectElement).disabled).toBe(true);

    fireEvent.click(screen.getByTestId('orbit-config-gate-action'));

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Connectors' }).length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('Paste Composio API key')).toBeTruthy();
    });
  });

  it('autosaves Orbit schedule and prompt template edits after connectors are available', async () => {
    vi.mocked(fetchConnectors).mockResolvedValue([connectedConnector]);
    vi.mocked(fetchSkills).mockResolvedValue(orbitSkills);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/orbit/status') {
        return new Response(
          JSON.stringify({
            running: false,
            nextRunAt: null,
            lastRun: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const { onPersist } = renderOrbitSettings({
      orbit: {
        enabled: false,
        time: '08:00',
        templateSkillId: 'orbit-general',
      },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('orbit-config-gate')).toBeNull();
      expect(screen.getByRole('button', { name: 'Run it now' }).hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(screen.getByRole('switch', { name: /Off/i }));
    fireEvent.change(screen.getByLabelText('Daily Orbit run time'), {
      target: { value: '01:30' },
    });
    fireEvent.change(screen.getByLabelText('Orbit prompt template'), {
      target: { value: 'orbit-github' },
    });

    await waitFor(() => {
      expect(onPersist).toHaveBeenCalledWith(
        expect.objectContaining({
          orbit: {
            enabled: true,
            time: '01:30',
            templateSkillId: 'orbit-github',
          },
        }),
        expect.any(Object),
      );
    });
  });

  it('renders the latest Orbit run receipt and supports copying its markdown', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.mocked(fetchConnectors).mockResolvedValue([connectedConnector]);
    vi.mocked(fetchSkills).mockResolvedValue(orbitSkills);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/orbit/status') {
        return new Response(
          JSON.stringify({
            running: false,
            nextRunAt: '2026-05-09T01:00:00.000Z',
            lastRun: {
              completedAt: new Date().toISOString(),
              trigger: 'manual',
              connectorsChecked: 3,
              connectorsSucceeded: 2,
              connectorsSkipped: 1,
              connectorsFailed: 0,
              artifactId: 'artifact-1',
              artifactProjectId: 'project-1',
              markdown: '## Daily Orbit\n- GitHub shipped',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    renderOrbitSettings({
      orbit: {
        enabled: true,
        time: '01:00',
        templateSkillId: 'orbit-general',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Last run')).toBeTruthy();
      expect(screen.getByText('Checked')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Daily Orbit activity summary')).toBeTruthy();
      expect(screen.getByRole('link', { name: /Open artifact/i }).getAttribute('href')).toBe(
        '/api/live-artifacts/artifact-1/preview?projectId=project-1',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('## Daily Orbit\n- GitHub shipped');
      expect(screen.getByText('Copied')).toBeTruthy();
    });
  });
});
