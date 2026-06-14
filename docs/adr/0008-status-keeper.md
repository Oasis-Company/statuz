# ADR 0008: Status Keeper for Regular Health Checks

## Status

Accepted

## Context

Statuz relies on YAML files for runtime state (statuz.yaml), ecological position (niche manifest), and topology (Arrow Maps). However, there is no mechanism to:

1. Check if required files exist before an agent session starts
2. Detect stale checkpoints (work may have stalled)
3. Validate schema compliance proactively
4. Alert users to critical issues before they become blockers

Currently, validation only happens when users explicitly run `statuz validate`. This is reactive, not proactive.

## Decision

We introduce **Status Keeper** — a component that performs regular health checks on Statuz files.

**Key features:**

1. **Multiple check types:**
   - `file_exists` — Check if required files exist
   - `checkpoint_freshness` — Check if checkpoints are within a configurable age threshold
   - `arrow_map_valid` — Validate Arrow Map schema compliance
   - `niche_manifest_valid` — Validate niche manifest schema compliance
   - `cluster_valid` — Validate Arrow Map Cluster schema compliance

2. **Severity levels:**
   - `critical` — Agent cannot function (e.g., statuz.yaml missing)
   - `warning` — Some features may not work (e.g., niche manifest missing)
   - `info` — Optional files missing or validation warnings

3. **Schedule options:**
   - `session_start` — Run checks when agent session starts (default)
   - `daily` — Run checks at a scheduled time each day
   - `hourly` — Run checks every hour
   - `manual` — Only run when explicitly triggered

4. **Health report output:**
   - Written to `.statuz/health-report.yaml`
   - Contains overall status (healthy/degraded/critical)
   - Contains individual check results
   - Contains actionable recommendations

**Schema location:** `spec/status-keeper.schema.json`

**Example configuration:**

```yaml
keeper_version: "1.0.0"
schedule:
  health_check: "session_start"
checks:
  - type: "file_exists"
    target: ".statuz/statuz.yaml"
    severity: "critical"
  - type: "checkpoint_freshness"
    target: ".statuz/statuz.yaml"
    severity: "warning"
    max_age_hours: 48
output:
  format: "yaml"
  path: ".statuz/health-report.yaml"
  notify_on_critical: true
```

## Consequences

### Positive

- Agents can detect issues before they become blockers
- Users get proactive alerts when work stalls (checkpoint freshness)
- Organization can enforce schema compliance through regular validation
- Health reports provide a clear summary of system status

### Negative

- Adds overhead at session start (though checks are fast)
- Requires configuration maintenance
- May generate noise if thresholds are too aggressive

### Mitigation

- Checks are lightweight (file existence, basic YAML parsing)
- Default configuration is conservative (48-hour checkpoint threshold)
- Users can disable individual checks or adjust severity levels
- `notify_on_critical: true` ensures only critical issues interrupt users

## Implementation

- Schema: `spec/status-keeper.schema.json`
- SDK: `packages/sdk-ts/src/status-keeper/engine.ts` — StatusKeeperEngine class
- Types: `packages/sdk-ts/src/status-keeper/types.ts`
- Default config: `StatusKeeperEngine.getDefaultConfig()`

## Related

- ADR 0001: Status Not Memory (Status Keeper checks status files, not memory)
- ADR 0002: YAML First (Status Keeper validates YAML files)
- SPEC.md: The Statuz Loop (Status Keeper fits into session start phase)