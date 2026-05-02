import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectorDetail, ConnectorStatusResponse } from '@open-design/contracts';
import { useT } from '../i18n';
import {
  DEFAULT_AUDIO_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
} from '../media/models';
import type {
  AgentInfo,
  AppConfig,
  DesignSystemSummary,
  Project,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  PromptTemplateSummary,
  SkillSummary,
} from '../types';
import { DesignsTab } from './DesignsTab';
import { DesignSystemPreviewModal } from './DesignSystemPreviewModal';
import { DesignSystemsTab } from './DesignSystemsTab';
import { ExamplesTab } from './ExamplesTab';
import { AppChromeHeader, SettingsIconButton } from './AppChromeHeader';
import { Icon } from './Icon';
import { LanguageMenu } from './LanguageMenu';
import { CenteredLoader } from './Loading';
import { NewProjectPanel, type CreateInput } from './NewProjectPanel';
import {
  connectConnector,
  disconnectConnector,
  fetchConnectorDiscovery,
  fetchConnectors,
  fetchConnectorStatuses,
} from '../providers/registry';

import { PromptTemplatePreviewModal } from './PromptTemplatePreviewModal';
import { PromptTemplatesTab } from './PromptTemplatesTab';

type TopTab = 'designs' | 'examples' | 'design-systems' | 'connectors' | 'image-templates' | 'video-templates';

interface Props {
  skills: SkillSummary[];
  designSystems: DesignSystemSummary[];
  projects: Project[];
  templates: ProjectTemplate[];
  promptTemplates: PromptTemplateSummary[];
  defaultDesignSystemId: string | null;
  config: AppConfig;
  agents: AgentInfo[];
  loading?: boolean;
  onCreateProject: (input: CreateInput & { pendingPrompt?: string }) => void;
  onImportClaudeDesign: (file: File) => Promise<void> | void;
  onOpenProject: (id: string) => void;
  onOpenLiveArtifact: (projectId: string, artifactId: string) => void;
  onDeleteProject: (id: string) => void;
  onChangeDefaultDesignSystem: (id: string) => void;
  onOpenSettings: (section?: 'execution' | 'media' | 'composio' | 'language' | 'about') => void;
}

const SIDEBAR_MIN = 320;
const SIDEBAR_MAX = 560;
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_STORAGE_KEY = 'od-entry-sidebar-width';
const CONNECTOR_CALLBACK_MESSAGE_TYPE = 'open-design:connector-connected';

export function isTrustedConnectorCallbackOrigin(origin: string, currentOrigin?: string): boolean {
  const expectedOrigin = currentOrigin ?? (typeof window === 'undefined' ? '' : window.location.origin);
  if (origin === expectedOrigin) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1';
  } catch {
    return false;
  }
}

function loadSidebarWidth(): number {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!raw) return SIDEBAR_DEFAULT;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return SIDEBAR_DEFAULT;
    return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n));
  } catch {
    return SIDEBAR_DEFAULT;
  }
}

function mergeConnectors(current: ConnectorDetail[], incoming: ConnectorDetail[]): ConnectorDetail[] {
  if (!incoming.length) return current;
  const incomingById = new Map(incoming.map((connector) => [connector.id, connector]));
  const merged = current.map((connector) => incomingById.get(connector.id) ?? connector);
  const currentIds = new Set(current.map((connector) => connector.id));
  for (const connector of incoming) {
    if (!currentIds.has(connector.id)) merged.push(connector);
  }
  return merged;
}

function applyConnectorStatuses(
  current: ConnectorDetail[],
  statuses: ConnectorStatusResponse['statuses'],
): ConnectorDetail[] {
  if (!Object.keys(statuses).length) return current;
  return current.map((connector) => {
    const next = statuses[connector.id];
    if (!next) return connector;
    const { accountLabel: _accountLabel, lastError: _lastError, ...base } = connector;
    return {
      ...base,
      status: next.status,
      ...(next.accountLabel === undefined ? {} : { accountLabel: next.accountLabel }),
      ...(next.lastError === undefined ? {} : { lastError: next.lastError }),
    };
  });
}

export function EntryView({
  skills,
  designSystems,
  projects,
  templates,
  promptTemplates,
  defaultDesignSystemId,
  config,
  agents,
  loading = false,
  onCreateProject,
  onImportClaudeDesign,
  onOpenProject,
  onOpenLiveArtifact,
  onDeleteProject,
  onChangeDefaultDesignSystem,
  onOpenSettings,
}: Props) {
  const t = useT();
  const [topTab, setTopTab] = useState<TopTab>('designs');
  const [previewSystemId, setPreviewSystemId] = useState<string | null>(null);
  const [previewPromptTemplate, setPreviewPromptTemplate] =
    useState<PromptTemplateSummary | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => loadSidebarWidth());
  const [resizing, setResizing] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorDetail[]>([]);
  const [connectorsLoading, setConnectorsLoading] = useState(false);

  const currentAgent = useMemo(
    () => agents.find((a) => a.id === config.agentId) ?? null,
    [agents, config.agentId],
  );

  const envMetaLine = useMemo(() => {
    if (config.mode === 'api') {
      try {
        return `${config.model} · ${new URL(config.baseUrl).host}`;
      } catch {
        return config.model;
      }
    }
    return currentAgent
      ? `${currentAgent.name}${currentAgent.version ? ` · ${currentAgent.version}` : ''}`
      : t('settings.noAgentSelected');
  }, [config.mode, config.model, config.baseUrl, currentAgent, t]);

  // 'Use this prompt' on an example card is a fast path — skip the form and
  // create the project immediately with sane defaults derived from the skill,
  // seeding the chat composer with the example prompt via pendingPrompt.
  function usePromptFromSkill(skill: SkillSummary) {
    onCreateProject({
      name: skill.name,
      skillId: skill.id,
      designSystemId: null,
      metadata: metadataForSkill(skill),
      pendingPrompt: skill.examplePrompt || skill.description,
    });
  }

  function previewDesignSystem(id: string) {
    setPreviewSystemId(id);
  }

  const previewSystem = useMemo(
    () => (previewSystemId ? designSystems.find((d) => d.id === previewSystemId) ?? null : null),
    [designSystems, previewSystemId],
  );

  function handleCreate(input: CreateInput) {
    onCreateProject(input);
  }

  const startWidthRef = useRef(0);
  const startXRef = useRef(0);

  useEffect(() => {
    if (!resizing) return;
    function onMove(e: MouseEvent) {
      const dx = e.clientX - startXRef.current;
      const next = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, startWidthRef.current + dx),
      );
      setSidebarWidth(next);
    }
    function onUp() {
      setResizing(false);
    }
    document.body.classList.add('entry-resizing');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.classList.remove('entry-resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    } catch {
      /* ignore */
    }
  }, [sidebarWidth]);

  const reloadConnectors = useCallback(async (options: { showLoading?: boolean } = {}) => {
    if (options.showLoading ?? true) setConnectorsLoading(true);
    const next = await fetchConnectors();
    setConnectors(next);
    setConnectorsLoading(false);
  }, []);

  const reloadConnectorStatuses = useCallback(async () => {
    const statuses = await fetchConnectorStatuses();
    setConnectors((curr) => applyConnectorStatuses(curr, statuses));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Fetch connectors on mount so the New project panel can show
    // already-configured connectors on the live-artifact tab without
    // waiting for the user to open the Connectors tab.
    setConnectorsLoading(true);
    (async () => {
      const next = await fetchConnectors();
      if (cancelled) return;
      setConnectors(next);
      setConnectorsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (topTab !== 'connectors') return;
    let cancelled = false;
    // Slow Composio discovery is only needed for enriched toolkit metadata
    // and auth configuration. Keep the initial catalog/status path fast.
    (async () => {
      const next = await fetchConnectorDiscovery();
      if (cancelled) return;
      setConnectors((curr) => mergeConnectors(curr, next));
    })();
    return () => {
      cancelled = true;
    };
  }, [topTab]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object' || (data as { type?: unknown }).type !== CONNECTOR_CALLBACK_MESSAGE_TYPE) return;
      if (!isTrustedConnectorCallbackOrigin(event.origin)) return;
      void reloadConnectorStatuses();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [reloadConnectorStatuses]);

  function updateConnector(next: ConnectorDetail | null) {
    if (!next) return;
    setConnectors((curr) => curr.map((connector) => (connector.id === next.id ? next : connector)));
  }

  return (
    <div className="entry-shell">
      <AppChromeHeader
        actions={(
          <SettingsIconButton
            onClick={() => onOpenSettings()}
            title={t('entry.openSettingsTitle')}
            ariaLabel={t('entry.openSettingsAria')}
          />
        )}
      />
      <div
        className="entry"
        style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
      >
        <aside className="entry-side" style={{ width: sidebarWidth }}>
          <NewProjectPanel
            skills={skills}
            designSystems={designSystems}
            defaultDesignSystemId={defaultDesignSystemId}
            templates={templates}
            onCreate={handleCreate}
            onImportClaudeDesign={onImportClaudeDesign}
            mediaProviders={config.mediaProviders}
            connectors={connectors}
            connectorsLoading={connectorsLoading}
            onOpenConnectorsTab={() => setTopTab('connectors')}
            loading={loading}
          />
          <div className="entry-side-foot">
            <button
              type="button"
              className="foot-pill"
              onClick={() => onOpenSettings()}
              title={t('settings.envConfigure')}
            >
              <Icon name="settings" size={12} />
              <span>
                {config.mode === 'daemon'
                  ? t('settings.localCli')
                  : t('settings.anthropicApi')}
              </span>
              <span style={{ color: 'var(--text-faint)' }}>·</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {envMetaLine}
              </span>
            </button>
            <LanguageMenu />
          </div>
          <button
            type="button"
            aria-label={t('entry.resizeAria')}
            className={`entry-side-resizer${resizing ? ' dragging' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              startWidthRef.current = sidebarWidth;
              startXRef.current = e.clientX;
              setResizing(true);
            }}
          />
        </aside>
        <main className="entry-main">
          <div className="entry-header">
            <div className="entry-tabs" role="tablist">
              <TopTabButton current={topTab} value="designs" label={t('entry.tabDesigns')} onClick={setTopTab} />
              <TopTabButton current={topTab} value="examples" label={t('entry.tabExamples')} onClick={setTopTab} />
              <TopTabButton
                current={topTab}
                value="design-systems"
                label={t('entry.tabDesignSystems')}
                onClick={setTopTab}
              />
              <TopTabButton current={topTab} value="connectors" label={t('entry.tabConnectors')} onClick={setTopTab} />
              <TopTabButton
                current={topTab}
                value="image-templates"
                label={t('entry.tabImageTemplates')}
                onClick={setTopTab}
              />
              <TopTabButton
                current={topTab}
                value="video-templates"
                label={t('entry.tabVideoTemplates')}
                onClick={setTopTab}
              />
            </div>
          </div>
          <div className="entry-tab-content">
            {loading ? (
              <CenteredLoader label={t('entry.loadingWorkspace')} />
            ) : (
              <>
                {topTab === 'designs' ? (
                  <DesignsTab
                    projects={projects}
                    skills={skills}
                    designSystems={designSystems}
                    onOpen={onOpenProject}
                    onOpenLiveArtifact={onOpenLiveArtifact}
                    onDelete={onDeleteProject}
                  />
                ) : null}
                {topTab === 'examples' ? (
                  <ExamplesTab skills={skills} onUsePrompt={usePromptFromSkill} />
                ) : null}
                {topTab === 'design-systems' ? (
                  <DesignSystemsTab
                    systems={designSystems}
                    selectedId={defaultDesignSystemId}
                    onSelect={onChangeDefaultDesignSystem}
                    onPreview={previewDesignSystem}
                  />
                ) : null}
                {topTab === 'connectors' ? (
                  <ConnectorsTab
                    connectors={connectors}
                    loading={connectorsLoading}
                    composioConfigured={Boolean(config.composio?.apiKeyConfigured)}
                    onOpenSettings={onOpenSettings}
                    onConnect={async (connectorId) => updateConnector(await connectConnector(connectorId))}
                    onDisconnect={async (connectorId) => updateConnector(await disconnectConnector(connectorId))}
                  />
                ) : null}
                {topTab === 'image-templates' ? (
                  <PromptTemplatesTab
                    surface="image"
                    templates={promptTemplates}
                    onPreview={setPreviewPromptTemplate}
                  />
                ) : null}
                {topTab === 'video-templates' ? (
                  <PromptTemplatesTab
                    surface="video"
                    templates={promptTemplates}
                    onPreview={setPreviewPromptTemplate}
                  />
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>
      {previewSystem ? (
        <DesignSystemPreviewModal
          system={previewSystem}
          onClose={() => setPreviewSystemId(null)}
        />
      ) : null}
      {previewPromptTemplate ? (
        <PromptTemplatePreviewModal
          summary={previewPromptTemplate}
          onClose={() => setPreviewPromptTemplate(null)}
        />
      ) : null}
    </div>
  );
}

function ConnectorsTab({
  connectors,
  loading,
  composioConfigured,
  onOpenSettings,
  onConnect,
  onDisconnect,
}: {
  connectors: ConnectorDetail[];
  loading: boolean;
  composioConfigured: boolean;
  onOpenSettings: (section?: 'execution' | 'media' | 'composio' | 'language' | 'about') => void;
  onConnect: (connectorId: string) => Promise<void> | void;
  onDisconnect: (connectorId: string) => Promise<void> | void;
}) {
  const t = useT();
  const [pendingConnectorAction, setPendingConnectorAction] = useState<{
    connectorId: string;
    action: 'connect' | 'disconnect';
  } | null>(null);

  // Mask the grid whenever no Composio-backed connector has its auth
  // configured. We also honor the local config.composio flag so the mask
  // appears immediately when the key is cleared, before the next list fetch.
  const anyComposioAuthConfigured = useMemo(
    () =>
      connectors.some(
        (connector) => connector.auth?.provider === 'composio' && connector.auth.configured,
      ),
    [connectors],
  );
  const needsComposioKey = !composioConfigured && !anyComposioAuthConfigured;

  async function runConnectorAction(connectorId: string, action: 'connect' | 'disconnect') {
    if (pendingConnectorAction) return;
    setPendingConnectorAction({ connectorId, action });
    try {
      if (action === 'connect') {
        await onConnect(connectorId);
      } else {
        await onDisconnect(connectorId);
      }
    } finally {
      setPendingConnectorAction(null);
    }
  }

  return (
    <div className="tab-panel connectors-panel">
      <div className="tab-panel-toolbar">
        <div className="toolbar-left connectors-heading">
          <div>
            <h2>{t('connectors.title')}</h2>
            <p>{t('connectors.subtitle')}</p>
          </div>
        </div>
      </div>
      {loading ? (
        <CenteredLoader label={t('common.loading')} />
      ) : (
        <div
          className={`connector-grid-wrap${needsComposioKey ? ' is-masked' : ''}`}
          data-testid="connector-grid-wrap"
        >
          <div
            className="connector-grid"
            aria-hidden={needsComposioKey || undefined}
          >
            {connectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                disabled={needsComposioKey}
                pendingAction={
                  pendingConnectorAction?.connectorId === connector.id
                    ? pendingConnectorAction.action
                    : null
                }
                onConnect={(connectorId) => runConnectorAction(connectorId, 'connect')}
                onDisconnect={(connectorId) => runConnectorAction(connectorId, 'disconnect')}
              />
            ))}
          </div>
          {needsComposioKey ? (
            <div
              className="connector-gate"
              role="region"
              aria-label={t('connectors.gateTitle')}
              data-testid="connector-gate"
            >
              <div className="connector-gate-card">
                <div className="connector-gate-icon" aria-hidden>
                  <Icon name="settings" size={20} />
                </div>
                <h3 className="connector-gate-title">{t('connectors.gateTitle')}</h3>
                <p className="connector-gate-body">{t('connectors.gateBody')}</p>
                <button
                  type="button"
                  className="primary connector-gate-action"
                  onClick={() => onOpenSettings('composio')}
                  data-testid="connector-gate-action"
                >
                  {t('connectors.gateAction')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ConnectorCard({
  connector,
  disabled = false,
  pendingAction,
  onConnect,
  onDisconnect,
}: {
  connector: ConnectorDetail;
  disabled?: boolean;
  pendingAction: 'connect' | 'disconnect' | null;
  onConnect: (connectorId: string) => Promise<void> | void;
  onDisconnect: (connectorId: string) => Promise<void> | void;
}) {
  const t = useT();
  const isConnecting = pendingAction === 'connect';
  const isDisconnecting = pendingAction === 'disconnect';
  const isPending = pendingAction !== null;
  const canConnect = !disabled && !isPending && connector.status === 'available';
  const canDisconnect = !disabled && !isPending && connector.status === 'connected';
  const accountLabel = getDisplayableConnectorAccountLabel(connector);

  return (
    <article className={`connector-card status-${connector.status}${disabled ? ' is-locked' : ''}`}>
      <div className="connector-card-top">
        <div>
          <div className="connector-name-row">
            <h3>{connector.name}</h3>
            <span className={`connector-status status-${connector.status}`}>
              {statusLabel(connector.status, t)}
            </span>
          </div>
          <div className="connector-meta">
            <span>{connector.category}</span>
            <span aria-hidden>·</span>
            <span>{connector.provider}</span>
          </div>
        </div>
      </div>
      {connector.description ? <p className="connector-description">{connector.description}</p> : null}
      <dl className="connector-details">
        {accountLabel ? (
          <div>
            <dt>{t('connectors.account')}</dt>
            <dd>{accountLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('connectors.tools')}</dt>
          <dd>{connector.tools.length ? String(connector.tools.length) : t('common.none')}</dd>
        </div>
      </dl>
      <div className="connector-actions">
        <button
          type="button"
          className={`primary connector-action${isConnecting ? ' is-loading' : ''}`}
          disabled={!canConnect}
          aria-busy={isConnecting || undefined}
          tabIndex={disabled ? -1 : undefined}
          onClick={() => onConnect(connector.id)}
        >
          {isConnecting ? <Icon name="spinner" size={12} /> : null}
          <span>{isConnecting || connector.status === 'available' ? t('connectors.connect') : statusLabel(connector.status, t)}</span>
        </button>
        <button
          type="button"
          className={`ghost connector-action${isDisconnecting ? ' is-loading' : ''}`}
          disabled={!canDisconnect}
          aria-busy={isDisconnecting || undefined}
          tabIndex={disabled ? -1 : undefined}
          onClick={() => onDisconnect(connector.id)}
        >
          {isDisconnecting ? <Icon name="spinner" size={12} /> : null}
          <span>{t('connectors.disconnect')}</span>
        </button>
      </div>
    </article>
  );
}

function statusLabel(status: ConnectorDetail['status'], t: ReturnType<typeof useT>): string {
  switch (status) {
    case 'available':
      return t('connectors.statusAvailable');
    case 'connected':
      return t('connectors.statusConnected');
    case 'error':
      return t('connectors.statusError');
    case 'disabled':
      return t('connectors.statusDisabled');
  }
}

function getDisplayableConnectorAccountLabel(connector: ConnectorDetail): string | undefined {
  if (!connector.accountLabel) return undefined;
  const provider = connector.auth?.provider ?? connector.provider.toLowerCase();
  if (provider === 'composio') return undefined;
  return connector.accountLabel;
}

function TopTabButton({
  current,
  value,
  label,
  onClick,
}: {
  current: TopTab;
  value: TopTab;
  label: string;
  onClick: (v: TopTab) => void;
}) {
  return (
    <button
      role="tab"
      data-testid={`entry-tab-${value}`}
      aria-selected={current === value}
      className={`entry-tab ${current === value ? 'active' : ''}`}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
  );
}

// Map a skill's declared mode to project metadata. Falls back to the same
// defaults the new-project form would apply (high-fidelity prototype, no
// speaker notes on decks, no template animations) so 'Use this prompt'
// produces a project indistinguishable from one created via the form. Per-
// skill hints in SKILL.md frontmatter (od.fidelity, od.speaker_notes,
// od.animations) override the defaults so each example reproduces the
// shipped example.html — e.g. wireframe-sketch declares fidelity:wireframe.
function metadataForSkill(skill: SkillSummary): ProjectMetadata {
  const kind = kindForSkill(skill);
  if (kind === 'prototype') {
    return { kind, fidelity: skill.fidelity ?? 'high-fidelity' };
  }
  if (kind === 'deck') {
    return {
      kind,
      speakerNotes:
        typeof skill.speakerNotes === 'boolean' ? skill.speakerNotes : false,
    };
  }
  if (kind === 'template') {
    return {
      kind,
      animations:
        typeof skill.animations === 'boolean' ? skill.animations : false,
    };
  }
  if (kind === 'image') {
    return { kind, imageModel: DEFAULT_IMAGE_MODEL, imageAspect: '1:1' };
  }
  if (kind === 'video') {
    return { kind, videoModel: DEFAULT_VIDEO_MODEL, videoAspect: '16:9', videoLength: 5 };
  }
  if (kind === 'audio') {
    return {
      kind,
      audioKind: 'speech',
      audioModel: DEFAULT_AUDIO_MODEL.speech,
      audioDuration: 10,
    };
  }
  return { kind: 'other' };
}

function kindForSkill(skill: SkillSummary): ProjectKind {
  if (skill.mode === 'deck') return 'deck';
  if (skill.mode === 'prototype') return 'prototype';
  if (skill.mode === 'template') return 'template';
  if (skill.mode === 'image' || skill.surface === 'image') return 'image';
  if (skill.mode === 'video' || skill.surface === 'video') return 'video';
  if (skill.mode === 'audio' || skill.surface === 'audio') return 'audio';
  return 'other';
}
