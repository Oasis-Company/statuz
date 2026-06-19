# niche Example: Multi-Agent Web Project

This is a complete example of Statuz niche in action for a multi-agent web project.

## Scenario

We have a project with 3 agents:
- **backend-agent**: Manages the API backend (Python/FastAPI)
- **frontend-agent**: Manages the frontend (React)
- **qa-agent**: Runs tests and quality checks

And a human principal (project-owner).

---

## Files in this Example

```
examples/niche-example/
├── .statuz/
│   ├── statuz.yaml                           (Core: current status)
│   └── niche/
│       ├── manifest.yaml                     (Project-level manifest)
│       ├── agent-backend.yaml                (Backend agent manifest)
│       ├── agent-frontend.yaml               (Frontend agent manifest)
│       ├── agent-qa.yaml                    (QA agent manifest)
│       ├── signals/
│       │   ├── sig-001-api-contract-changed.yaml
│       │   ├── sig-002-dependency-update.yaml
│       │   └── sig-003-security-advisory.yaml
│       ├── assessments/
│       │   ├── ast-001-api-changed-relevant.yaml
│       │   ├── ast-002-frontend-assesses-deps.yaml
│       │   ├── ast-003-backend-assesses-security.yaml
│       │   └── ast-004-frontend-assesses-security.yaml
│       ├── contexts/
│       │   ├── ctx-001-frontend-to-qa.yaml
│       │   ├── ctx-002-frontend-to-qa.yaml
│       │   └── ctx-003-backend-to-qa.yaml
│       ├── outcomes/
│       │   ├── out-001-qa-tests.yaml
│       │   ├── out-002-dependency-updated.yaml
│       │   └── out-003-security-fixed.yaml
│       ├── calibrations/
│       │   ├── cal-001-scope-drift.yaml
│       │   └── cal-002-collaboration-drift.yaml
│       └── syn/
│           ├── syn-001-request.yaml
│           ├── syn-001-resolution.yaml
│           ├── syn-002-request.yaml
│           └── syn-002-resolution.yaml
└── README.md
```

---

## Signal Chains

### Chain 1: API Contract Change

1. **Signal** ([sig-001](.statuz/niche/signals/sig-001-api-contract-changed.yaml)): backend-agent publishes an API contract change
2. **Assessment** ([ast-001](.statuz/niche/assessments/ast-001-api-changed-relevant.yaml)): frontend-agent determines it's affected (relevance: 0.95)
3. **Context** ([ctx-001](.statuz/niche/contexts/ctx-001-frontend-to-qa.yaml)): frontend-agent sends context to qa-agent
4. **Outcome** ([out-001](.statuz/niche/outcomes/out-001-qa-tests.yaml)): qa-agent runs tests, records success
5. **Calibration** ([cal-001](.statuz/niche/calibrations/cal-001-scope-drift.yaml)): Scope drift detected (65% task drift)
6. **SYN** ([syn-001](.statuz/niche/syn/syn-001-request.yaml)): Human principal decides to update scope

### Chain 2: Dependency Update

1. **Signal** ([sig-002](.statuz/niche/signals/sig-002-dependency-update.yaml)): React 18.3.0 released
2. **Assessment** ([ast-002](.statuz/niche/assessments/ast-002-frontend-assesses-deps.yaml)): frontend-agent evaluates impact (relevance: 0.60, will NOT act)
3. **Context** ([ctx-002](.statuz/niche/contexts/ctx-002-frontend-to-qa.yaml)): frontend-agent requests QA verification
4. **Outcome** ([out-002](.statuz/niche/outcomes/out-002-dependency-updated.yaml)): QA confirms all tests pass

### Chain 3: Security Advisory

1. **Signal** ([sig-003](.statuz/niche/signals/sig-003-security-advisory.yaml)): CVE-2026-1234 in lodash
2. **Assessment** ([ast-003](.statuz/niche/assessments/ast-003-backend-assesses-security.yaml)): backend-agent evaluates (relevance: 1.0)
3. **Assessment** ([ast-004](.statuz/niche/assessments/ast-004-frontend-assesses-security.yaml)): frontend-agent evaluates (relevance: 0.80)
4. **Context** ([ctx-003](.statuz/niche/contexts/ctx-003-backend-to-qa.yaml)): backend-agent requests QA verification
5. **Outcome** ([out-003](.statuz/niche/outcomes/out-003-security-fixed.yaml)): Security fix verified
6. **SYN** ([syn-002](.statuz/niche/syn/syn-002-request.yaml)): Human decides immediate deployment

---

## Agent-Specific Manifests

### Backend Agent ([agent-backend.yaml](.statuz/niche/agent-backend.yaml))
- **Does**: API development, database operations, authentication
- **Does Not**: Frontend, testing, deployment
- **Relevant Signals**: `vcs:commit:backend/*`, `api:*`, `dependency:*`

### Frontend Agent ([agent-frontend.yaml](.statuz/niche/agent-frontend.yaml))
- **Does**: UI components, API client, accessibility
- **Does Not**: Backend, database, testing
- **Relevant Signals**: `vcs:commit:frontend/*`, `api:contract-changed`, `design:*`

### QA Agent ([agent-qa.yaml](.statuz/niche/agent-qa.yaml))
- **Does**: Testing, quality checks, reports
- **Does Not**: Feature development, bug fixing
- **Relevant Signals**: `vcs:pr-opened`, `test:*`, `api:*`

---

## Calibration Examples

### cal-001: Scope Drift
- **File**: [cal-001-scope-drift.yaml](.statuz/niche/calibrations/cal-001-scope-drift.yaml)
- **Type**: Task drift detected (65% > threshold 25%)
- **Finding**: 65% of frontend tasks about "user roles" (not declared)
- **Proposal**: Update manifest to include user role management
- **SYN Triggered**: Yes ([syn-001](.statuz/niche/syn/syn-001-request.yaml))

### cal-002: Collaboration Drift
- **File**: [cal-002-collaboration-drift.yaml](.statuz/niche/calibrations/cal-002-collaboration-drift.yaml)
- **Type**: Collaboration pattern drift (55% > threshold 20%)
- **Finding**: 55% time with backend-agent (declared 25%)
- **Proposal**: Maintain position, update expectations
- **SYN Triggered**: No (within acceptable bounds)

---

## SYN Decision Examples

### syn-001: Scope Update
- **File**: [syn-001-request.yaml](.statuz/niche/syn/syn-001-request.yaml)
- **Resolution**: [syn-001-resolution.yaml](.statuz/niche/syn/syn-001-resolution.yaml)
- **Trigger**: Calibration detected scope drift
- **Options**: Update scope, reduce drift, or reassign
- **Decision**: Update scope to include user role management (Option A)

### syn-002: Security Deployment
- **File**: [syn-002-request.yaml](.statuz/niche/syn/syn-002-request.yaml)
- **Resolution**: [syn-002-resolution.yaml](.statuz/niche/syn/syn-002-resolution.yaml)
- **Trigger**: Security vulnerability requires rollout decision
- **Options**: Immediate, scheduled, or staged deployment
- **Decision**: Immediate hotfix deployment (IMMEDIATE)

---

## How This Differs from Just Core

Statuz Core could track each agent's individual status, but niche adds:

- **Shared understanding** of who is responsible for what
- **Auditable reasoning** about why changes are relevant
- **Human-in-the-loop governance** for strategic decisions
- **Long-term calibration** to keep the project on track

### Key Differences

| Aspect | Core Only | Core + niche |
|--------|-----------|--------------|
| Current status | ✅ | ✅ |
| Declarations | ❌ | ✅ (manifest) |
| Change awareness | ❌ | ✅ (signals) |
| Relevance reasoning | ❌ | ✅ (assessments) |
| Collaboration context | ❌ | ✅ (contexts) |
| Result tracking | ❌ | ✅ (outcomes) |
| Drift detection | ❌ | ✅ (calibrations) |
| Human governance | ❌ | ✅ (SYN) |

---

## Validation

All files in this example validate against their respective schemas:

```bash
# Validate all niche files
node scripts/validate-niche.mjs
```

### Schema Files

All schemas are located in `spec/niche/`:

- [niche-manifest.schema.json](../../spec/niche/niche-manifest.schema.json)
- [niche-signal.schema.json](../../spec/niche/niche-signal.schema.json)
- [niche-assessment.schema.json](../../spec/niche/niche-assessment.schema.json)
- [niche-context.schema.json](../../spec/niche/niche-context.schema.json)
- [niche-outcome.schema.json](../../spec/niche/niche-outcome.schema.json)
- [niche-calibration.schema.json](../../spec/niche/niche-calibration.schema.json)
- [niche-syn.schema.json](../../spec/niche/niche-syn.schema.json)

---

## Learning Points

1. **niche is an ecological position**: It declares where the agent stands in the ecosystem
2. **Assessments require reasoning**: Every assessment explains *why* it's relevant
3. **Calibration needs evidence**: Drift detection is based on outcomes, not assumptions
4. **SYN is for humans**: Agents suggest, humans decide
5. **Minimal disclosure**: Context contains only what's needed, not everything
