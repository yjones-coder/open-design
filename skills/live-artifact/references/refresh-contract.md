# Refresh Contract Reference

Refresh updates live artifact data without redesigning the presentation. The refresh runner updates `data.json`, tile render JSON, provenance, and audit history; it does not allow arbitrary template rewrites.

## Refreshable source metadata

Refreshable tiles or documents use `sourceJson`:

```json
{
  "type": "connector_tool",
  "toolName": "list_releases",
  "input": {},
  "connector": {
    "connectorId": "github",
    "accountLabel": "example/org",
    "toolName": "list_releases",
    "approvalPolicy": "manual_refresh_granted_for_read_only"
  },
  "outputMapping": {
    "dataPaths": [{ "from": "items", "to": "releases" }],
    "transform": "compact_table"
  },
  "refreshPermission": "manual_refresh_granted_for_read_only"
}
```

Supported source types:

- `local_file`
- `daemon_tool`
- `connector_tool`

Supported output transforms:

- `identity`
- `compact_table`
- `metric_summary`

## Permission model

- New refreshable sources start with `refreshPermission: "none"` unless the user grants refresh.
- First manual refresh requires user confirmation.
- After approval, the daemon may persist `manual_refresh_granted_for_read_only` for read-only refreshable sources.
- Users must be able to revoke refresh permission from the Source tab.
- Write, destructive, unknown, or drifted connector tools are never refreshable.

## Commit behavior

Refresh is all-or-nothing:

1. Acquire one active refresh lock per artifact.
2. Execute each refreshable source with timeouts and current safety checks.
3. Build candidate `data.json`, tile render JSON, provenance, and preview.
4. Validate all candidates with the same schemas used for create/update.
5. Commit only if every refreshable tile succeeds.
6. Preserve the previous valid preview if any step fails.

Refresh IDs must be monotonic so stale runs cannot overwrite newer committed data.

## Audit storage

- Append compact records to `refreshes.jsonl`.
- Successful refresh snapshots live under `snapshots/<refreshId>/` and may include `data.json`, render JSON, and provenance.
- Failed refreshes are summarized in `refreshes.jsonl` without leaking raw provider output or credentials.
- On daemon startup, stale running refreshes should be marked failed or timed out while preserving the last valid preview.
