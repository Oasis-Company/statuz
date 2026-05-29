# Statuz Next Step Execution

## Overview

This document defines the execution plan for Statuz's next phase, from public positioning convergence to SYN project-level MVP.

## Phase 0: Public Positioning Convergence (Completed)

- [x] Update README.md - Add Core, niche, SYN positioning
- [x] Update ROADMAP.md - Reflect actual status, add niche/SYN
- [x] Update CHANGELOG.md - Add all version records

## Phase 1: Core Trustworthy Foundation and Consistency

### Goals

Before extending the protocol, make the currently existing Core, CLI, SDK, and MCP server verifiable, compatible, and maintainable.

### Tasks

#### Task 1.1: Create Conformance Fixtures
- [ ] Create `spec/fixtures/valid/` directory
- [ ] Create `spec/fixtures/invalid/` directory
- [ ] Add valid examples: minimal, full-featured
- [ ] Add invalid examples: missing fields, wrong types, bad formats

**Files to Create:**
- `spec/fixtures/valid/minimal.yaml`
- `spec/fixtures/valid/full-featured.yaml`
- `spec/fixtures/invalid/missing-identity.yaml`
- `spec/fixtures/invalid/wrong-version.yaml`
- `spec/fixtures/invalid/bad-date-format.yaml`

#### Task 1.2: Unify SDK Parsing Behavior
- [ ] Ensure CLI, TS SDK, Python SDK, and MCP server output consistently for the same files
- [ ] Validate logic consistency
- [ ] Error message consistency
- [ ] YAML parsing consistency

#### Task 1.3: Expand CI Coverage
- [ ] TypeScript SDK build and tests
- [ ] Python SDK build and tests
- [ ] MCP server build
- [ ] All packages pass in CI

#### Task 1.4: Fix MCP Tool Documentation Consistency
- [ ] Verify all 8 tools are implemented
- [ ] Remove or complete placeholder tools
- [ ] Update docs/mcp-server.md

#### Task 1.5: Improve MCP Security Boundary Tests
- [ ] Path traversal protection tests
- [ ] Sensitive directory access denial tests
- [ ] allowedRoots configuration tests

### Checkpoints

- [ ] A set of fixtures passes validation across CLI, TS SDK, Python SDK, and MCP server
- [ ] Invalid fixtures are rejected in all implementations
- [ ] Stable tools listed in MCP documentation actually exist in source code and are testable
- [ ] MCP cannot access files beyond allowed workspace root
- [ ] Checkpoint identification strategy should not have significant collision risks after concurrency, merging, or history deletion

## Phase 2: niche Technical Charter

### Goals

Define niche's immutable principles and extension boundaries before writing implementation code.

### Tasks

#### Task 2.1: Improve NICHE_MANIFEST.md
- [ ] Write formal definition of niche
- [ ] Write layered relationship between niche and Core
- [ ] Write boundaries between niche and Memory, MCP, A2A, and project management tools
- [ ] Clarify actor types and principals
- [ ] Clarify three positioning states: declared, observed, calibrated
- [ ] Clarify first set of objects
- [ ] Clarify automation boundaries
- [ ] Clarify security and privacy principles
- [ ] Clarify extension mechanisms and compatibility rules

#### Task 2.2: Create ADR - Protocol Boundaries
- [ ] ADR: Statuz does not replace MCP/A2A
- [ ] Clarify transport neutrality principle
- [ ] Clarify boundaries with other systems

#### Task 2.3: Create ADR - Core/niche Layering
- [ ] ADR: Core and niche layering principles
- [ ] Prevent Core bloat
- [ ] Prevent niche from becoming static configuration

### Checkpoints

- [ ] A developer not involved in discussions can accurately state what niche solves and what it doesn't after reading the technical charter
- [ ] No ambiguous statements like "agent automatically gains new permissions based on long-term behavior" exist in the document
- [ ] Document clearly states that Statuz does not undertake cross-agent transport and does not replace A2A
- [ ] Document clearly states that SYN is for human principals

## Phase 3: niche Minimum Object Set

### Goals

Translate niche from concept to verifiable working draft, but control scope without immediately building a large runtime system.

### Tasks

#### Task 3.1: Define niche manifest schema
- [ ] Define minimal field set for `niche manifest`
- [ ] Include declared_niche, does, does_not, strategic_bets, success_signals

#### Task 3.2: Define niche signal schema
- [ ] Define minimal field set for `niche signal`
- [ ] Include id, type, source, content, relevance_criteria, timestamp

#### Task 3.3: Define niche assessment schema
- [ ] Define minimal field set for `niche assessment`
- [ ] Include signal_id, agent_id, relevance_score, impact_analysis, confidence, rationale

#### Task 3.4: Define niche context schema
- [ ] Define minimal field set for `niche context`
- [ ] Include from_agent, to_agent, task_summary, relevant_signals, relevant_assessments, constraints

#### Task 3.5: Define niche outcome schema
- [ ] Define minimal field set for `niche outcome`
- [ ] Include task_id, status, result_summary, impacted_signals, next_steps

#### Task 3.6: Define niche calibration schema
- [ ] Define minimal field set for `niche calibration`
- [ ] Include proposal_id, declared_vs_observed, evidence_window, drift_rationale, proposed_changes, approval_required

#### Task 3.7: Define SYN schema
- [ ] Define minimal field set for `SYN request`
- [ ] Define minimal field set for `SYN resolution`
- [ ] Create valid/invalid examples for each object type

### Checkpoints

- [ ] Each object can explain its unique responsibility in one sentence
- [ ] `manifest` ≠ `state`; declaration and observation must not be confused
- [ ] `assessment` must contain explainable basis for "why relevant"
- [ ] `context` must embody minimal disclosure principle
- [ ] `calibration` must contain evidence window, drift rationale, proposed changes, and approval requirements
- [ ] `SYN resolution` must identify the principal or governance process authorized to confirm changes

## Phase 4: niche Vertical Demo

### Goals

Instead of building comprehensive integrations first, prove the killer feature with a sufficiently clear demo.

### Tasks

#### Task 4.1: Create Example Actor Positioning
- [ ] Create backend agent manifest
- [ ] Create frontend agent manifest
- [ ] Create qa agent manifest
- [ ] Create project-owner manifest

#### Task 4.2: Create signal→assessment Chain
- [ ] backend publishes api.contract.changed signal
- [ ] frontend generates assessment to judge relevance

#### Task 4.3: Create context→outcome Chain
- [ ] frontend generates niche context for qa-agent
- [ ] qa-agent produces outcome
- [ ] outcome affects frontend status

#### Task 4.4: Create Calibration and SYN Examples
- [ ] calibration proposal (drift proposal after repeated occurrences)
- [ ] SYN request (requires human confirmation)
- [ ] SYN resolution (human decision)

### Checkpoints

- [ ] Observers can understand the difference between Statuz and ordinary status files from the demo without understanding the entire protocol
- [ ] Demo clearly shows "why this change is relevant to this agent"
- [ ] Demo clearly shows "why this collaborator was chosen"
- [ ] Demo clearly shows "which changes can be handled automatically and which must be escalated to users for decision"

## Phase 5: SYN Project-level MVP

### Goals

First use Statuz itself as the calibrated object to verify whether SYN can truly help users clarify positioning and strategy.

### Tasks

#### Task 5.1: Create Statuz Project niche Manifest
- [ ] Create project-level niche manifest
- [ ] Write declared position, does, does_not, strategic bets, success signals

#### Task 5.2: Generate Observed Direction
- [ ] Observe what the Statuz team is actually doing
- [ ] Compare declared position with observed behavior

#### Task 5.3: Generate Calibration Proposal
- [ ] Generate proposal from observed direction
- [ ] Explain drift rationale
- [ ] List proposed changes

#### Task 5.4: Generate SYN Request
- [ ] Request project owner to decide on Core and niche relationship
- [ ] Include options, benefits, risks, and recommendations

#### Task 5.5: Generate SYN Resolution
- [ ] Project owner approves an option
- [ ] Record rationale and effective_date

### Checkpoints

- [ ] SYN must not just ask "which one?"; it must provide evidence, options, benefits, risks, and recommended rationale
- [ ] Before resolution, the project manifest's formal strategic positioning must not be silently modified
- [ ] Principal's approval scope must be clear
- [ ] The number and intrusiveness level of SYN must be controllable

## Execution Reminders

### Don't Make Core Heavier Because the Vision Grows

Core's value comes from simplicity, stability, and ease of adoption. niche and SYN should first appear as optional standards tracks, not immediately requiring all `.statuz/statuz.yaml` files to carry strategy, relationships, calibration, and user approval objects.

### Don't Equate Observation with Authority

Must always uphold:
- observed niche can be automatically generated
- calibration proposal can be automatically generated
- low-risk routing preferences can be automatically adjusted when explicit policy allows
- permissions, trust, privacy, formal roles, and strategic positioning must NOT automatically take effect based solely on observation

### Don't Turn SYN Into an Annoying Question System

SYN should only be used for decision points that truly require synchronization. Must plan for:
- Severity levels
- Merging strategies
- Deferral strategies
- Daily or per-cycle request limits

### Don't Split the Repo First

Continue maintaining monorepo in the next phase. One protocol repository; multiple packages; shared schema; shared fixtures; shared conformance tests; shared roadmap and governance.

## Minimum Completion Definition for Next Round Delivery

### Must Deliver

- [x] Updated README positioning section
- [x] Updated ROADMAP
- [x] This execution document
- [ ] Initial technical charter for `docs/NICHE_MANIFEST.md`
- [ ] Two core ADRs: protocol boundaries, Core/niche layering
- [ ] Core conformance fixtures planning or first batch of fixtures
- [ ] Alignment between MCP documentation and actual tool surface
- [ ] A project-level niche manifest example
- [ ] A SYN request / resolution example

### Can Be Postponed

- [ ] Complete niche SDK
- [ ] A2A extension implementation
- [ ] VS Code / Cursor UI
- [ ] Dashboard
- [ ] Large-scale framework adapters