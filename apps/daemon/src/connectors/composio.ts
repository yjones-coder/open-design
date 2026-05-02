import crypto from 'node:crypto';

import type { BoundedJsonObject, BoundedJsonValue } from '../live-artifacts/schema.js';
import { defineConnectorTool, type ConnectorCatalogDefinition, type ConnectorCatalogToolDefinition } from './catalog.js';
import { readComposioConfig } from './composio-config.js';
import { ConnectorServiceError, type ConnectorCredentialMaterial } from './service.js';

const DEFAULT_COMPOSIO_BASE_URL = 'https://backend.composio.dev';
const DEFAULT_COMPOSIO_TIMEOUT_MS = 30_000;
const DEFAULT_COMPOSIO_USER_ID = 'open-design-local-user';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const DISCOVERY_CACHE_TTL_MS = 60_000;

const STATIC_COMPOSIO_CATALOG: ConnectorCatalogDefinition[] = [
  {
    id: 'github',
    name: 'GitHub',
    provider: 'composio',
    category: 'Developer',
    description: 'Search and inspect GitHub repositories, issues, and pull requests.',
    providerConnectorId: 'GITHUB',
    authentication: 'composio',
    tools: [
      defineConnectorTool({
        name: 'github.github_search_repositories',
        providerToolId: 'GITHUB_SEARCH_REPOSITORIES',
        title: 'Search repositories',
        description: 'Search public and private repositories.',
        inputSchemaJson: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['read'],
      }),
      defineConnectorTool({
        name: 'github.github_get_issue',
        providerToolId: 'GITHUB_GET_ISSUE',
        title: 'Get issue',
        description: 'Read a GitHub issue by owner, repository, and issue number.',
        inputSchemaJson: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, issue_number: { type: 'number' } }, required: ['owner', 'repo', 'issue_number'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['issues:read'],
      }),
    ],
    allowedToolNames: ['github.github_search_repositories', 'github.github_get_issue'],
    featuredToolNames: ['github.github_search_repositories', 'github.github_get_issue'],
    minimumApproval: 'auto',
  },
  {
    id: 'notion',
    name: 'Notion',
    provider: 'composio',
    category: 'Productivity',
    description: 'Search and read Notion pages and databases.',
    providerConnectorId: 'NOTION',
    authentication: 'composio',
    tools: [
      defineConnectorTool({
        name: 'notion.notion_search',
        providerToolId: 'NOTION_SEARCH',
        title: 'Search Notion',
        description: 'Search Notion pages and databases.',
        inputSchemaJson: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['read'],
      }),
      defineConnectorTool({
        name: 'notion.notion_fetch_database',
        providerToolId: 'NOTION_FETCH_DATABASE',
        title: 'Fetch database',
        description: 'Read a Notion database by id.',
        inputSchemaJson: { type: 'object', properties: { database_id: { type: 'string' } }, required: ['database_id'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['databases:read'],
      }),
    ],
    allowedToolNames: ['notion.notion_search', 'notion.notion_fetch_database'],
    featuredToolNames: ['notion.notion_search', 'notion.notion_fetch_database'],
    minimumApproval: 'auto',
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    provider: 'composio',
    category: 'Storage',
    description: 'Search and read files from Google Drive.',
    providerConnectorId: 'GOOGLEDRIVE',
    authentication: 'composio',
    tools: [
      defineConnectorTool({
        name: 'google_drive.googledrive_search',
        providerToolId: 'GOOGLEDRIVE_SEARCH',
        title: 'Search Drive',
        description: 'Search files in Google Drive.',
        inputSchemaJson: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['drive.readonly'],
      }),
      defineConnectorTool({
        name: 'google_drive.googledrive_get_file',
        providerToolId: 'GOOGLEDRIVE_GET_FILE',
        title: 'Get file',
        description: 'Read Google Drive file metadata by id.',
        inputSchemaJson: { type: 'object', properties: { file_id: { type: 'string' } }, required: ['file_id'], additionalProperties: false },
        outputSchemaJson: { type: 'object', additionalProperties: true },
        requiredScopes: ['drive.readonly'],
      }),
    ],
    allowedToolNames: ['google_drive.googledrive_search', 'google_drive.googledrive_get_file'],
    featuredToolNames: ['google_drive.googledrive_search', 'google_drive.googledrive_get_file'],
    minimumApproval: 'auto',
  },
];

interface ComposioConnectedAccountResponse {
  id?: unknown;
  nanoid?: unknown;
  connected_account_id?: unknown;
  connectedAccountId?: unknown;
  status?: unknown;
  redirect_url?: unknown;
  redirectUrl?: unknown;
  user_id?: unknown;
  userId?: unknown;
  account_id?: unknown;
  accountId?: unknown;
  account_label?: unknown;
  accountLabel?: unknown;
  name?: unknown;
  email?: unknown;
  auth_config?: { id?: unknown };
  toolkit?: { slug?: unknown };
  metadata?: unknown;
}

interface ComposioAuthConfigResponse {
  id?: unknown;
  status?: unknown;
  toolkit?: { slug?: unknown };
  toolkit_slug?: unknown;
  toolkitSlug?: unknown;
  auth_config?: { id?: unknown };
}

interface ComposioToolkitResponse {
  slug?: unknown;
  name?: unknown;
  logo?: unknown;
  description?: unknown;
  categories?: unknown;
}

interface ComposioToolResponse {
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  human_description?: unknown;
  humanDescription?: unknown;
  input_parameters?: unknown;
  inputParameters?: unknown;
  tags?: unknown;
  scopes?: unknown;
  oauth_scopes?: unknown;
  oauthScopes?: unknown;
  auth_scopes?: unknown;
  authScopes?: unknown;
  toolkit?: { slug?: unknown };
}

interface ComposioToolExecuteResponse {
  data?: unknown;
  error?: unknown;
  successful?: unknown;
  session_info?: unknown;
  sessionInfo?: unknown;
  log_id?: unknown;
  logId?: unknown;
}

export interface ComposioConnectionStart {
  kind: 'redirect_required' | 'pending' | 'connected';
  redirectUrl?: string;
  providerConnectionId?: string;
  expiresAt?: string;
  accountLabel?: string;
  credentials?: ConnectorCredentialMaterial;
}

export interface ComposioPendingConnection {
  connectorId: string;
  state: string;
  providerConnectionId?: string;
  expiresAtMs: number;
}

export interface ComposioConnectionCompletion {
  connectorId: string;
  accountLabel: string;
  credentials: ConnectorCredentialMaterial;
}

export class ComposioConnectorProvider {
  private discoveredAuthConfigIds: Record<string, string> | undefined;
  private definitionsCache: { definitions: ConnectorCatalogDefinition[]; expiresAtMs: number } | undefined;
  private definitionsPromise: Promise<ConnectorCatalogDefinition[]> | undefined;
  private readonly pendingConnections = new Map<string, ComposioPendingConnection>();

  isConfigured(definition: ConnectorCatalogDefinition): boolean {
    return Boolean(this.getApiKey() && this.discoveredAuthConfigIds?.[definition.id]);
  }

  clearDiscoveryCache(): void {
    this.discoveredAuthConfigIds = undefined;
    this.definitionsCache = undefined;
    this.definitionsPromise = undefined;
  }

  async listDefinitions(signal?: AbortSignal): Promise<ConnectorCatalogDefinition[]> {
    const now = Date.now();
    if (this.definitionsCache && this.definitionsCache.expiresAtMs > now) {
      return this.definitionsCache.definitions;
    }
    if (this.definitionsPromise) return this.definitionsPromise;

    const promise = this.fetchDefinitions(signal)
      .then((definitions) => {
        this.definitionsCache = { definitions, expiresAtMs: Date.now() + DISCOVERY_CACHE_TTL_MS };
        return definitions;
      })
      .finally(() => {
        if (this.definitionsPromise === promise) this.definitionsPromise = undefined;
      });
    this.definitionsPromise = promise;
    return promise;
  }

  private async fetchDefinitions(signal?: AbortSignal): Promise<ConnectorCatalogDefinition[]> {
    const apiKey = this.getApiKey();
    const authConfigs = apiKey ? await this.listAuthConfigsSafe(signal) : [];
    const configuredByConnectorId = new Map<string, { authConfigId: string; toolkitSlug: string }>();
    const discoveredAuthConfigIds: Record<string, string> = {};
    for (const item of authConfigs) {
      const authConfigId = getComposioAuthConfigId(item);
      const toolkitSlug = getComposioToolkitSlug(item);
      const status = getString(item.status)?.toUpperCase();
      if (!authConfigId || !toolkitSlug || (status && status !== 'ENABLED')) continue;
      const connectorId = connectorIdForToolkitSlug(toolkitSlug);
      discoveredAuthConfigIds[connectorId] = authConfigId;
      if (!configuredByConnectorId.has(connectorId)) configuredByConnectorId.set(connectorId, { authConfigId, toolkitSlug });
    }
    this.discoveredAuthConfigIds = discoveredAuthConfigIds;
    const toolkits = apiKey ? await this.listToolkitsSafe(signal) : [];
    const toolkitBySlug = new Map(toolkits.map((toolkit) => [normalizeComposioSlug(getString(toolkit.slug) ?? ''), toolkit]));
    const definitions: ConnectorCatalogDefinition[] = [];
    for (const staticDefinition of STATIC_COMPOSIO_CATALOG) {
      const configuredEntry = configuredByConnectorId.get(staticDefinition.id);
      const toolkitSlug = configuredEntry?.toolkitSlug ?? staticDefinition.providerConnectorId ?? staticDefinition.id;
      const toolkit = toolkitBySlug.get(normalizeComposioSlug(toolkitSlug));
      definitions.push(await this.definitionFromToolkit(staticDefinition, toolkitSlug, toolkit, signal));
    }
    return definitions;
  }

  async getDefinition(connectorId: string, signal?: AbortSignal): Promise<ConnectorCatalogDefinition | undefined> {
    const discovered = (await this.listDefinitions(signal)).find((definition) => definition.id === connectorId);
    if (discovered) return discovered;
    return undefined;
  }

  async connect(definition: ConnectorCatalogDefinition, callbackUrl: string, signal?: AbortSignal): Promise<ComposioConnectionStart> {
    const authConfigId = await this.getAuthConfigId(definition, signal);
    if (!authConfigId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio auth config is not configured for this connector', 503, {
        connectorId: definition.id,
        setting: 'apiKey',
      });
    }

    const state = crypto.randomBytes(24).toString('base64url');
    const expiresAtMs = Date.now() + OAUTH_STATE_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const response = await this.requestJson<ComposioConnectedAccountResponse>('/api/v3.1/connected_accounts/link', {
      method: 'POST',
      body: JSON.stringify({
        auth_config_id: authConfigId,
        user_id: this.getUserId(),
        connection_data: { state_prefix: state },
        callback_url: appendOAuthStateToCallbackUrl(callbackUrl, state),
      }),
      ...(signal === undefined ? {} : { signal }),
    });

    const providerConnectionId = getComposioConnectionId(response);
    const redirectUrl = getString(response.redirect_url) ?? getString(response.redirectUrl);
    const status = getString(response.status)?.toUpperCase();
    this.pendingConnections.set(state, { connectorId: definition.id, state, ...(providerConnectionId ? { providerConnectionId } : {}), expiresAtMs });

    return {
      kind: redirectUrl ? 'redirect_required' : status === 'ACTIVE' ? 'connected' : 'pending',
      ...(redirectUrl ? { redirectUrl } : {}),
      ...(providerConnectionId ? { providerConnectionId } : {}),
      expiresAt,
      ...(status === 'ACTIVE' && providerConnectionId ? this.connectionToCredentials(definition, providerConnectionId, response) : {}),
    };
  }

  async completeConnection(input: { definition: ConnectorCatalogDefinition; state: string; providerConnectionId?: string; status?: string; signal?: AbortSignal }): Promise<ComposioConnectionCompletion> {
    const connectorId = input.definition.id;
    const pending = this.pendingConnections.get(input.state);
    this.pendingConnections.delete(input.state);
    if (!pending || pending.connectorId !== connectorId || pending.expiresAtMs < Date.now()) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio OAuth state is missing or expired', 400, { connectorId });
    }
    if (input.status && input.status.toLowerCase() !== 'success') {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio OAuth did not complete successfully', 400, { connectorId });
    }
    const providerConnectionId = input.providerConnectionId ?? pending.providerConnectionId;
    if (input.providerConnectionId && pending.providerConnectionId && input.providerConnectionId !== pending.providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio callback connection id did not match pending connection', 403, { connectorId });
    }
    if (!providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio callback did not include a connection id', 400, { connectorId });
    }
    const response = await this.requestJson<ComposioConnectedAccountResponse>(`/api/v3/connected_accounts/${encodeURIComponent(providerConnectionId)}`, {
      method: 'GET',
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    const providerUserId = getString(response.user_id) ?? getString(response.userId);
    if (providerUserId && providerUserId !== this.getUserId()) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different user', 403, { connectorId });
    }
    const expectedAuthConfigId = await this.getAuthConfigId(input.definition, input.signal);
    const providerAuthConfigId = getString(response.auth_config?.id);
    if (expectedAuthConfigId && providerAuthConfigId && expectedAuthConfigId !== providerAuthConfigId) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different auth configuration', 403, { connectorId });
    }
    const expectedToolkitSlug = input.definition.providerConnectorId;
    const providerToolkitSlug = getString(response.toolkit?.slug);
    if (expectedToolkitSlug && providerToolkitSlug && connectorIdForToolkitSlug(expectedToolkitSlug) !== connectorIdForToolkitSlug(providerToolkitSlug)) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio account belongs to a different toolkit', 403, { connectorId });
    }
    return this.connectionToCredentials(input.definition, providerConnectionId, response);
  }

  async disconnect(credentials: ConnectorCredentialMaterial | undefined, signal?: AbortSignal): Promise<void> {
    const providerConnectionId = credentials ? getString(credentials.providerConnectionId) : undefined;
    if (!providerConnectionId || !this.getApiKey()) return;
    const response = await this.request(`/api/v3/connected_accounts/${encodeURIComponent(providerConnectionId)}`, { method: 'DELETE', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok && response.status !== 404) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', `Composio disconnect failed with HTTP ${response.status}`, 502, { httpStatus: response.status });
    }
  }

  async execute(definition: ConnectorCatalogDefinition, tool: ConnectorCatalogToolDefinition, input: BoundedJsonObject, credentials: ConnectorCredentialMaterial | undefined, signal?: AbortSignal): Promise<BoundedJsonObject> {
    const providerConnectionId = credentials ? getString(credentials.providerConnectionId) : undefined;
    if (!providerConnectionId) {
      throw new ConnectorServiceError('CONNECTOR_NOT_CONNECTED', 'Composio connector is not connected', 403, { connectorId: definition.id });
    }
    const providerToolId = tool.providerToolId ?? tool.name;
    const response = await this.requestJson<ComposioToolExecuteResponse>(`/api/v3.1/tools/execute/${encodeURIComponent(providerToolId)}`, {
      method: 'POST',
      body: JSON.stringify({
        connected_account_id: providerConnectionId,
        user_id: this.getUserId(),
        arguments: input,
      }),
      ...(signal === undefined ? {} : { signal }),
    });
    if (response.successful === false || response.error) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio tool execution failed', 502, {
        connectorId: definition.id,
        toolName: tool.name,
        error: toBoundedJsonValue(response.error),
      });
    }
    const output = toBoundedJsonValue(response.data);
    return {
      toolName: tool.name,
      providerToolId,
      data: output,
      ...(getString(response.log_id) ?? getString(response.logId) ? { providerExecutionId: (getString(response.log_id) ?? getString(response.logId))! } : {}),
      ...(toBoundedJsonValue(response.session_info ?? response.sessionInfo) !== null ? { sessionInfo: toBoundedJsonValue(response.session_info ?? response.sessionInfo) } : {}),
    };
  }

  private async getAuthConfigId(definition: ConnectorCatalogDefinition, signal?: AbortSignal): Promise<string | undefined> {
    if (!this.discoveredAuthConfigIds) this.discoveredAuthConfigIds = await this.discoverAuthConfigIds(signal);
    return this.discoveredAuthConfigIds[definition.id];
  }

  private async discoverAuthConfigIds(signal?: AbortSignal): Promise<Record<string, string>> {
    if (!this.getApiKey()) return {};
    const items = await this.listAuthConfigsSafe(signal);
    const discovered: Record<string, string> = {};
    for (const item of items) {
      const authConfigId = getComposioAuthConfigId(item);
      const toolkitSlug = getComposioToolkitSlug(item);
      const status = getString(item.status)?.toUpperCase();
      if (!authConfigId || !toolkitSlug || (status && status !== 'ENABLED')) continue;
      discovered[connectorIdForToolkitSlug(toolkitSlug)] = authConfigId;
    }
    return discovered;
  }

  private async listAuthConfigs(signal?: AbortSignal): Promise<ComposioAuthConfigResponse[]> {
    const response = await this.request('/api/v3/auth_configs', { method: 'GET', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok) return [];
    const payload = await response.json() as { items?: unknown; data?: unknown };
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
    return items.filter((item): item is ComposioAuthConfigResponse => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }

  private async listAuthConfigsSafe(signal?: AbortSignal): Promise<ComposioAuthConfigResponse[]> {
    try {
      return await this.listAuthConfigs(signal);
    } catch {
      return [];
    }
  }

  private async listToolkits(signal?: AbortSignal): Promise<ComposioToolkitResponse[]> {
    const response = await this.request('/api/v3.1/toolkits?limit=1000', { method: 'GET', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok) return [];
    const payload = await response.json() as { items?: unknown; data?: unknown };
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
    return items.filter((item): item is ComposioToolkitResponse => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }

  private async listToolkitsSafe(signal?: AbortSignal): Promise<ComposioToolkitResponse[]> {
    try {
      return await this.listToolkits(signal);
    } catch {
      return [];
    }
  }

  private async listTools(toolkitSlug: string, signal?: AbortSignal): Promise<ComposioToolResponse[]> {
    const searchParams = new URLSearchParams({ toolkit_slug: toolkitSlug.toLowerCase(), limit: '1000' });
    const response = await this.request(`/api/v3.1/tools?${searchParams.toString()}`, { method: 'GET', ...(signal === undefined ? {} : { signal }) });
    if (!response.ok) return [];
    const payload = await response.json() as { items?: unknown; data?: unknown };
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.data) ? payload.data : [];
    return items.filter((item): item is ComposioToolResponse => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }

  private async listToolsSafe(toolkitSlug: string, signal?: AbortSignal): Promise<ComposioToolResponse[]> {
    try {
      return await this.listTools(toolkitSlug, signal);
    } catch {
      return [];
    }
  }

  private async definitionFromToolkit(staticDefinition: ConnectorCatalogDefinition, toolkitSlug: string, toolkit: ComposioToolkitResponse | undefined, signal?: AbortSignal): Promise<ConnectorCatalogDefinition> {
    const connectorId = staticDefinition.id;
    const liveTools = (await this.listToolsSafe(toolkitSlug, signal))
      .filter((tool) => {
        const toolToolkitSlug = getString(tool.toolkit?.slug);
        return !toolToolkitSlug || normalizeComposioSlug(toolToolkitSlug) === normalizeComposioSlug(toolkitSlug);
      })
      .map((tool) => this.toolDefinitionFromComposioTool(connectorId, tool));
    const liveToolsByName = new Map(liveTools.map((tool) => [tool.name, tool]));
    const tools = staticDefinition.tools.map((tool) => mergeToolDefinition(tool, liveToolsByName.get(tool.name)));
    const name = getString(toolkit?.name) ?? staticDefinition.name;
    const category = firstCategoryName(toolkit?.categories) ?? staticDefinition.category;
    const description = getString(toolkit?.description) ?? staticDefinition.description;
    return {
      ...staticDefinition,
      id: connectorId,
      name,
      providerConnectorId: staticDefinition.providerConnectorId ?? toolkitSlug,
      category,
      ...(description === undefined ? {} : { description }),
      tools,
      allowedToolNames: staticDefinition.allowedToolNames,
      ...(staticDefinition.featuredToolNames === undefined ? {} : { featuredToolNames: staticDefinition.featuredToolNames }),
    };
  }

  private toolDefinitionFromComposioTool(connectorId: string, tool: ComposioToolResponse): ConnectorCatalogToolDefinition {
    const providerToolId = getString(tool.slug) ?? getString(tool.name) ?? `${connectorId.toUpperCase()}_TOOL`;
    const description = getString(tool.description) ?? getString(tool.human_description) ?? getString(tool.humanDescription) ?? '';
    const requiredScopes = getStringArray(tool.scopes ?? tool.oauth_scopes ?? tool.oauthScopes ?? tool.auth_scopes ?? tool.authScopes ?? tool.tags);
    return defineConnectorTool({
      name: `${connectorId}.${normalizeToolName(providerToolId)}`,
      providerToolId,
      title: getString(tool.name) ?? titleFromSlug(providerToolId),
      ...(description ? { description } : {}),
      inputSchemaJson: toBoundedJsonObject(tool.input_parameters ?? tool.inputParameters) ?? { type: 'object', additionalProperties: true },
      outputSchemaJson: { type: 'object', additionalProperties: true },
      requiredScopes,
    });
  }

  private connectionToCredentials(_definition: ConnectorCatalogDefinition, providerConnectionId: string, response: ComposioConnectedAccountResponse): ComposioConnectionCompletion {
    const accountLabel = getString(response.account_label)
      ?? getString(response.accountLabel)
      ?? getString(response.email)
      ?? getString(response.name)
      ?? providerConnectionId;
    const accountId = getString(response.account_id) ?? getString(response.accountId);
    return {
      connectorId: _definition.id,
      accountLabel,
      credentials: {
        provider: 'composio',
        providerConnectionId,
        ...(accountId ? { accountId } : {}),
      },
    };
  }

  private async requestJson<T extends object>(path: string, input: { method: string; body?: string; signal?: AbortSignal }): Promise<T> {
    const response = await this.request(path, input);
    if (!response.ok) {
      const message = await getComposioErrorMessage(response);
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', message ?? `Composio request failed with HTTP ${response.status}`, response.status === 401 ? 401 : 502, { httpStatus: response.status });
    }
    const value = await response.json() as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio returned an invalid response', 502);
    }
    return value as T;
  }

  private async request(path: string, input: { method: string; body?: string; signal?: AbortSignal }): Promise<Response> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ConnectorServiceError('CONNECTOR_EXECUTION_FAILED', 'Composio provider is not configured', 503, { setting: 'apiKey' });
    }
    const timeout = AbortSignal.timeout(DEFAULT_COMPOSIO_TIMEOUT_MS);
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
    return fetch(`${this.getBaseUrl().replace(/\/+$/, '')}${path}`, {
      method: input.method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'OpenDesign/0.1 ComposioConnectorProvider',
        'x-api-key': apiKey,
      },
      ...(input.body ? { body: input.body } : {}),
      signal,
    });
  }

  private getApiKey(): string | undefined {
    return readComposioConfig().apiKey || undefined;
  }

  private getBaseUrl(): string {
    return DEFAULT_COMPOSIO_BASE_URL;
  }

  private getUserId(): string {
    return DEFAULT_COMPOSIO_USER_ID;
  }
}

function mergeToolDefinition(staticTool: ConnectorCatalogToolDefinition, liveTool: ConnectorCatalogToolDefinition | undefined): ConnectorCatalogToolDefinition {
  if (!liveTool) return staticTool;
  return {
    ...staticTool,
    ...(liveTool.description === undefined ? {} : { description: liveTool.description }),
    ...(liveTool.inputSchemaJson === undefined ? {} : { inputSchemaJson: liveTool.inputSchemaJson }),
    ...(liveTool.outputSchemaJson === undefined ? {} : { outputSchemaJson: liveTool.outputSchemaJson }),
    ...(liveTool.providerToolId === undefined ? {} : { providerToolId: liveTool.providerToolId }),
    requiredScopes: liveTool.requiredScopes.length > 0 ? liveTool.requiredScopes : staticTool.requiredScopes,
    safety: liveTool.safety,
    refreshEligible: liveTool.refreshEligible,
  };
}

export const composioConnectorProvider = new ComposioConnectorProvider();

export function getStaticComposioCatalogDefinitions(): ConnectorCatalogDefinition[] {
  return STATIC_COMPOSIO_CATALOG.map((definition) => ({
    ...definition,
    tools: definition.tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      ...(tool.description === undefined ? {} : { description: tool.description }),
      ...(tool.inputSchemaJson === undefined ? {} : { inputSchemaJson: toBoundedJsonObject(tool.inputSchemaJson)! }),
      ...(tool.outputSchemaJson === undefined ? {} : { outputSchemaJson: toBoundedJsonObject(tool.outputSchemaJson)! }),
      safety: { ...tool.safety },
      refreshEligible: tool.refreshEligible,
      requiredScopes: [...tool.requiredScopes],
      ...(tool.providerToolId === undefined ? {} : { providerToolId: tool.providerToolId }),
    })),
    allowedToolNames: [...definition.allowedToolNames],
    ...(definition.featuredToolNames === undefined ? {} : { featuredToolNames: [...definition.featuredToolNames] }),
  }));
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function getComposioAuthConfigId(response: ComposioAuthConfigResponse): string | undefined {
  return getString(response.id) ?? getString(response.auth_config?.id);
}

function getComposioToolkitSlug(response: ComposioAuthConfigResponse): string | undefined {
  return getString(response.toolkit?.slug) ?? getString(response.toolkit_slug) ?? getString(response.toolkitSlug);
}

function getComposioConnectionId(response: ComposioConnectedAccountResponse): string | undefined {
  return getString(response.connected_account_id) ?? getString(response.connectedAccountId) ?? getString(response.id) ?? getString(response.nanoid);
}

function appendOAuthStateToCallbackUrl(callbackUrl: string, state: string): string {
  const url = new URL(callbackUrl);
  url.searchParams.set('state', state);
  return url.toString();
}

function connectorIdForToolkitSlug(toolkitSlug: string): string {
  const normalized = normalizeComposioSlug(toolkitSlug);
  if (normalized === 'googledrive' || normalized === 'gdrive' || normalized === 'drive') return 'google_drive';
  return normalized;
}

function normalizeComposioSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeToolName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'tool';
}

function titleFromSlug(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`);
}

function firstCategoryName(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) return item.trim();
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      const name = getString(record.name) ?? getString(record.slug);
      if (name) return name;
    }
  }
  return undefined;
}

async function getComposioErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.json() as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
    const record = payload as Record<string, unknown>;
    return getString(record.message) ?? getString(record.error) ?? getString(record.detail);
  } catch {
    return undefined;
  }
}

function toBoundedJsonValue(value: unknown): BoundedJsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => toBoundedJsonValue(item));
  if (value && typeof value === 'object') {
    const output: BoundedJsonObject = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) output[key] = toBoundedJsonValue(child);
    return output;
  }
  return null;
}

function toBoundedJsonObject(value: unknown): BoundedJsonObject | undefined {
  const bounded = toBoundedJsonValue(value);
  return bounded && typeof bounded === 'object' && !Array.isArray(bounded) ? bounded : undefined;
}
