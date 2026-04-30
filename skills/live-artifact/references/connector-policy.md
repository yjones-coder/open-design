# Connector Policy Reference

Live artifacts may use connector or local data, but they must persist only compact, preview-oriented data and provenance. Never persist credentials or raw provider envelopes inside live artifact files.

## Connector safety model

Connector tools are classified by side effect and approval requirement:

- `read` + `auto`: eligible for agent preview and potential refresh.
- `write` + `confirm`: not refreshable; requires explicit user confirmation if exposed later.
- `destructive` + `disabled`: never refreshable.
- `unknown` + `confirm` or `disabled`: fail closed until classified.

If a tool name, scope, or description suggests write/create/update/delete/admin/send/post/manage behavior, treat it as write-capable unless the daemon catalog explicitly proves otherwise. Destructive hints must be disabled for refresh.

## Execution boundaries

- Use daemon wrapper commands or `/api/tools/connectors/*`; do not call provider APIs directly from the artifact workflow when a daemon connector exists.
- Tool endpoints require the injected `OD_TOOL_TOKEN`; do not invent or pass `projectId`.
- Agent calls and refresh-runner calls must share the same daemon connector execution service.
- Re-check connector status, allowlists, current scopes, tool safety, and refresh eligibility at execution time.
- For connector-backed refresh, saved `connectorId`, `accountLabel`, tool name, input shape, and approval policy must still match current connector state.

## Persistence rules

Persist only:

- compact normalized values needed by the preview in `data.json`;
- high-level provenance in `provenance.json`;
- connector references and refresh metadata in `sourceJson`.

Never persist:

- OAuth tokens, API keys, cookies, headers, authorization values, or session material;
- raw provider HTTP bodies, envelopes, payloads, or full responses;
- credential-like values under alternate names;
- connector credentials under `.live-artifacts/`.

Credential storage is daemon-controlled and outside project artifact directories. Artifacts may contain connector IDs and non-sensitive account labels only.

## Output protection

Connector outputs must be bounded and redacted before returning to agents or entering artifact files. Use compact summaries and selected fields. If redaction cannot prove the result is safe, fail with a validation error instead of storing it.
