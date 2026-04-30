import { executeLocalDaemonRefreshSource } from '../live-artifacts/refresh.js';
import type { BoundedJsonObject, BoundedJsonValue } from '../live-artifacts/schema.js';

import {
  classifyConnectorToolSafety,
  connectorDefinitionToDetail,
  getConnectorCatalogDefinition,
  isRefreshEligibleConnectorToolSafety,
  listConnectorCatalogDefinitions,
  type ConnectorDetail,
  type ConnectorCatalogDefinition,
  type ConnectorCatalogToolDefinition,
  type ConnectorToolSafety,
  type ConnectorStatus,
} from './catalog.js';

export interface ConnectorExecuteRequest {
  connectorId: string;
  toolName: string;
  input: BoundedJsonObject;
  expectedAccountLabel?: string;
  expectedApprovalPolicy?: ConnectorCatalogDefinition['minimumApproval'];
}

export interface ConnectorExecuteResponse {
  ok: true;
  connectorId: string;
  accountLabel?: string;
  toolName: string;
  safety: ConnectorCatalogDefinition['tools'][number]['safety'];
  output: BoundedJsonValue;
  outputSummary?: string;
  metadata?: BoundedJsonObject;
}

export type ConnectorServiceErrorCode =
  | 'CONNECTOR_NOT_FOUND'
  | 'CONNECTOR_NOT_CONNECTED'
  | 'CONNECTOR_DISABLED'
  | 'CONNECTOR_TOOL_NOT_FOUND'
  | 'CONNECTOR_SAFETY_DENIED'
  | 'CONNECTOR_INPUT_SCHEMA_MISMATCH'
  | 'CONNECTOR_EXECUTION_FAILED';

export class ConnectorServiceError extends Error {
  constructor(
    readonly code: ConnectorServiceErrorCode,
    message: string,
    readonly status: number,
    readonly details?: BoundedJsonObject,
  ) {
    super(message);
    this.name = 'ConnectorServiceError';
  }
}

export interface ConnectorConnectionStatus {
  status: ConnectorStatus;
  accountLabel?: string;
  lastError?: string;
}

export interface ConnectorConnectionRecord extends ConnectorConnectionStatus {
  updatedAt: string;
}

export interface ConnectorStatusServiceOptions {
  initialStatuses?: Record<string, ConnectorConnectionStatus>;
}

const LOCAL_CONNECTOR_ACCOUNT_LABELS: Record<string, string> = {
  project_files: 'Local project',
  git: 'Current repository',
};

function nowIso(): string {
  return new Date().toISOString();
}

function cloneStatus(status: ConnectorConnectionStatus): ConnectorConnectionStatus {
  return {
    status: status.status,
    ...(status.accountLabel === undefined ? {} : { accountLabel: status.accountLabel }),
    ...(status.lastError === undefined ? {} : { lastError: status.lastError }),
  };
}

function isLocalAutoConnected(definition: ConnectorCatalogDefinition): boolean {
  return definition.provider === 'open-design' && definition.tools.every((tool) => tool.requiredScopes.length === 0);
}

function approvalRank(approval: ConnectorCatalogDefinition['minimumApproval']): number {
  switch (approval) {
    case 'auto':
      return 0;
    case 'confirm':
      return 1;
    case 'disabled':
      return 2;
    default:
      return 2;
  }
}

function stricterApproval(
  left: ConnectorCatalogDefinition['minimumApproval'] | undefined,
  right: ConnectorCatalogDefinition['minimumApproval'] | undefined,
): ConnectorCatalogDefinition['minimumApproval'] | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return approvalRank(left) >= approvalRank(right) ? left : right;
}

function runtimeSafetyForTool(tool: ConnectorCatalogToolDefinition): ConnectorToolSafety {
  const classified = classifyConnectorToolSafety(tool);
  if (classified.sideEffect !== 'read' || classified.approval !== 'auto') return classified;
  return tool.safety;
}

function assertJsonSchemaMatches(value: BoundedJsonValue, schema: BoundedJsonObject | undefined, path = 'input'): void {
  if (schema === undefined) return;
  const type = schema.type;
  if (typeof type === 'string') {
    const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (type === 'number') {
      if (typeof value !== 'number') throw new Error(`${path} must be a number`);
    } else if (type !== actualType) {
      throw new Error(`${path} must be a ${type}`);
    }
  }
  if (type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
    const objectValue = value as BoundedJsonObject;
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];
    for (const key of required) {
      if (objectValue[key] === undefined) throw new Error(`${path}.${key} is required by connector input schema`);
    }
    const properties = schema.properties;
    const propertySchemas = properties !== null && typeof properties === 'object' && !Array.isArray(properties)
      ? properties as Record<string, BoundedJsonObject>
      : {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(objectValue)) {
        if (propertySchemas[key] === undefined) throw new Error(`${path}.${key} is not allowed by connector input schema`);
      }
    }
    for (const [key, childSchema] of Object.entries(propertySchemas)) {
      if (objectValue[key] !== undefined && childSchema !== null && typeof childSchema === 'object' && !Array.isArray(childSchema)) {
        assertJsonSchemaMatches(objectValue[key]!, childSchema, `${path}.${key}`);
      }
    }
  }
  if (type === 'string' && typeof value === 'string') {
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) throw new Error(`${path} exceeds connector input schema maxLength`);
  }
  if (type === 'number' && typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) throw new Error(`${path} is below connector input schema minimum`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) throw new Error(`${path} exceeds connector input schema maximum`);
  }
}

function defaultConnectedAccountLabel(definition: ConnectorCatalogDefinition): string {
  return LOCAL_CONNECTOR_ACCOUNT_LABELS[definition.id] ?? definition.name;
}

export class ConnectorStatusService {
  private readonly statuses = new Map<string, ConnectorConnectionRecord>();

  constructor(options: ConnectorStatusServiceOptions = {}) {
    for (const [connectorId, status] of Object.entries(options.initialStatuses ?? {})) {
      this.statuses.set(connectorId, { ...cloneStatus(status), updatedAt: nowIso() });
    }
  }

  getStatus(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const stored = this.statuses.get(definition.id);
    if (stored) return cloneStatus(stored);

    if (isLocalAutoConnected(definition)) {
      return { status: 'connected', accountLabel: defaultConnectedAccountLabel(definition) };
    }

    return { status: 'available' };
  }

  connect(definition: ConnectorCatalogDefinition, accountLabel?: string): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const next: ConnectorConnectionRecord = {
      status: 'connected',
      accountLabel: accountLabel ?? defaultConnectedAccountLabel(definition),
      updatedAt: nowIso(),
    };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  disconnect(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    if (isLocalAutoConnected(definition)) {
      this.statuses.delete(definition.id);
      return this.getStatus(definition);
    }

    const next: ConnectorConnectionRecord = { status: 'available', updatedAt: nowIso() };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  setError(definition: ConnectorCatalogDefinition, lastError: string, accountLabel?: string): ConnectorConnectionStatus {
    if (definition.disabled) return { status: 'disabled' };

    const next: ConnectorConnectionRecord = {
      status: 'error',
      ...(accountLabel === undefined ? {} : { accountLabel }),
      lastError,
      updatedAt: nowIso(),
    };
    this.statuses.set(definition.id, next);
    return cloneStatus(next);
  }

  clear(connectorId: string): void {
    this.statuses.delete(connectorId);
  }
}

export interface ConnectorExecutionContext {
  projectsRoot: string;
  projectId: string;
  runId?: string;
  purpose?: 'agent_preview' | 'artifact_refresh';
  signal?: AbortSignal;
}

export class ConnectorService {
  constructor(private readonly statusService = new ConnectorStatusService()) {}

  listDefinitions(): ConnectorCatalogDefinition[] {
    return listConnectorCatalogDefinitions();
  }

  getDefinition(connectorId: string): ConnectorCatalogDefinition | undefined {
    return getConnectorCatalogDefinition(connectorId);
  }

  getStatus(definition: ConnectorCatalogDefinition): ConnectorConnectionStatus {
    return this.statusService.getStatus(definition);
  }

  listConnectors(): ConnectorDetail[] {
    return this.listDefinitions().map((definition) => this.toDetail(definition));
  }

  getConnector(connectorId: string): ConnectorDetail {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    return this.toDetail(definition);
  }

  async connect(connectorId: string): Promise<ConnectorDetail> {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    const status = this.statusService.connect(definition);
    if (status.status === 'disabled') {
      throw new ConnectorServiceError('CONNECTOR_DISABLED', 'connector is disabled', 403);
    }
    return this.toDetail(definition);
  }

  async disconnect(connectorId: string): Promise<ConnectorDetail> {
    const definition = this.getDefinition(connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    this.statusService.disconnect(definition);
    return this.toDetail(definition);
  }

  async execute(request: ConnectorExecuteRequest, context: ConnectorExecutionContext): Promise<ConnectorExecuteResponse> {
    const definition = this.getDefinition(request.connectorId);
    if (!definition) {
      throw new ConnectorServiceError('CONNECTOR_NOT_FOUND', 'connector not found', 404);
    }
    const connector = this.toDetail(definition);
    if (connector.status === 'disabled') {
      throw new ConnectorServiceError('CONNECTOR_DISABLED', 'connector is disabled', 403);
    }
    if (connector.status !== 'connected') {
      throw new ConnectorServiceError('CONNECTOR_NOT_CONNECTED', 'connector is not connected', 403, {
        connectorId: request.connectorId,
        status: connector.status,
      });
    }
    if (request.expectedAccountLabel !== undefined && connector.accountLabel !== request.expectedAccountLabel) {
      throw new ConnectorServiceError('CONNECTOR_NOT_CONNECTED', 'connector account changed since refresh approval', 409, {
        connectorId: request.connectorId,
        expectedAccountLabel: request.expectedAccountLabel,
        currentAccountLabel: connector.accountLabel ?? null,
      });
    }
    if (!definition.allowedToolNames.includes(request.toolName)) {
      throw new ConnectorServiceError('CONNECTOR_TOOL_NOT_FOUND', 'connector tool is not allowed', 404, {
        connectorId: request.connectorId,
        toolName: request.toolName,
      });
    }
    const tool = definition.tools.find((candidate) => candidate.name === request.toolName);
    if (!tool) {
      throw new ConnectorServiceError('CONNECTOR_TOOL_NOT_FOUND', 'connector tool not found', 404);
    }
    const runtimeSafety = runtimeSafetyForTool(tool);
    const effectiveApproval = stricterApproval(stricterApproval(definition.minimumApproval, tool.safety.approval), runtimeSafety.approval);
    if (effectiveApproval !== 'auto') {
      throw new ConnectorServiceError('CONNECTOR_SAFETY_DENIED', 'connector tool is not auto-approved read-only by current safety policy', 403, {
        connectorId: request.connectorId,
        toolName: request.toolName,
        approvalPolicy: effectiveApproval ?? null,
        safety: { ...runtimeSafety },
      });
    }
    if (request.expectedApprovalPolicy !== undefined && effectiveApproval !== request.expectedApprovalPolicy) {
      throw new ConnectorServiceError('CONNECTOR_SAFETY_DENIED', 'connector approval policy changed since refresh approval', 403, {
        connectorId: request.connectorId,
        toolName: request.toolName,
        expectedApprovalPolicy: request.expectedApprovalPolicy,
        currentApprovalPolicy: effectiveApproval ?? null,
        safety: { ...runtimeSafety },
      });
    }
    if (context.purpose === 'artifact_refresh') {
      if (!definition.allowedToolNames.includes(tool.name) || !tool.refreshEligible || !isRefreshEligibleConnectorToolSafety(runtimeSafety)) {
        throw new ConnectorServiceError('CONNECTOR_SAFETY_DENIED', 'connector tool is not eligible for artifact refresh', 403, {
          connectorId: request.connectorId,
          toolName: request.toolName,
          refreshEligible: tool.refreshEligible,
          safety: { ...runtimeSafety },
        });
      }
    }
    try {
      assertJsonSchemaMatches(request.input, tool.inputSchemaJson);
    } catch (error) {
      throw new ConnectorServiceError('CONNECTOR_INPUT_SCHEMA_MISMATCH', error instanceof Error ? error.message : String(error), 400, {
        connectorId: request.connectorId,
        toolName: request.toolName,
      });
    }

    const output = await executeLocalDaemonRefreshSource({
      projectsRoot: context.projectsRoot,
      projectId: context.projectId,
      source: {
        type: 'daemon_tool',
        toolName: request.toolName,
        input: request.input,
        refreshPermission: 'none',
      },
      ...(context.signal === undefined ? {} : { signal: context.signal }),
    });
    const outputSummary = summarizeConnectorOutput(output);

    return {
      ok: true,
      connectorId: request.connectorId,
      ...(connector.accountLabel === undefined ? {} : { accountLabel: connector.accountLabel }),
      toolName: request.toolName,
      safety: { ...runtimeSafety },
      output,
      ...(outputSummary === undefined ? {} : { outputSummary }),
      metadata: {
        connectorId: request.connectorId,
        toolName: request.toolName,
        purpose: context.purpose ?? 'agent_preview',
        ...(context.runId === undefined ? {} : { runId: context.runId }),
      },
    };
  }

  private toDetail(definition: ConnectorCatalogDefinition): ConnectorDetail {
    const detail = connectorDefinitionToDetail(definition);
    const status = this.getStatus(definition);
    return {
      ...detail,
      status: status.status,
      ...(status.accountLabel === undefined ? {} : { accountLabel: status.accountLabel }),
      ...(status.lastError === undefined ? {} : { lastError: status.lastError }),
    };
  }
}

export const connectorService = new ConnectorService();

function summarizeConnectorOutput(output: BoundedJsonValue): string | undefined {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) return undefined;
  const maybeToolName = output.toolName;
  if (typeof maybeToolName === 'string') {
    if (typeof output.count === 'number') return `${maybeToolName}: ${output.count} result${output.count === 1 ? '' : 's'}`;
    if (typeof output.path === 'string') return `${maybeToolName}: ${output.path}`;
    if (typeof output.isRepository === 'boolean') return `${maybeToolName}: ${output.isRepository ? 'repository found' : 'not a repository'}`;
    return maybeToolName;
  }
  return undefined;
}
