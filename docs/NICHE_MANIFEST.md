# Statuz NICHE_MANIFEST - Technical Charter

> **Status:** Working Draft  
> **Version:** 1.0  
> **Authors:** Statuz Core Team  
> **Last Updated:** 2026-05-30

---

## Executive Summary

Statuz **niche** (Ecological Positioning) extends Statuz Core with a structured layer for expressing where an agent stands in the ecosystem, what changes affect it, and when calibration or human direction is required.

**niche is not:**
- A long-term memory database
- An agent-to-agent transport protocol
- A project management tool
- A static configuration file

**niche is:**
- A living record of ecological position
- A signal processing layer for environmental awareness
- A calibration framework for strategic drift
- A human governance interface (SYN) for critical decisions

---

## 1. Problem Statement

### 1.1 The Gap

Today, AI agents know their immediate task but lack awareness of their broader ecological context:

1. **I don't know what changes affect me.** An agent cannot automatically know which ecosystem changes are relevant to its current work.
2. **I don't know where I stand.** The agent has no structured way to express its declared position, observed behavior, and the gap between them.
3. **I don't know when to ask for direction.** There is no clear protocol for when an agent should escalate strategic questions to human principals.
4. **I don't know my boundaries.** Agents lack a structured way to declare what they do and do not handle.

### 1.2 The Opportunity

By adding an ecological positioning layer, agents can:

1. Receive and process ecosystem signals
2. Assess relevance and impact automatically
3. Calibrate declared vs. observed position over time
4. Request human synchronization (SYN) for critical decisions
5. Maintain minimal disclosure contexts for collaboration

---

## 2. Three-Layer Architecture

Statuz defines three layers of situated alignment (all required):

| Layer | Purpose | Status |
|-------|---------|--------|
| **Statuz Core** | Compact runtime status | Stable |
| **niche** | Ecological position & long-term calibration | Working Draft |
| **SYN** | Human governance for strategic decisions | Working Draft |

### 2.1 Statuz Core

The minimal situation layer. Answers:
- Who am I?
- What am I doing?
- What is my current state?
- What progress have I made?
- What should happen next?

**Files:**
- `.statuz/statuz.yaml`

**See also:** [ADR 0004: Core/niche Separation](adr/0004-core-niche-separation.md)

### 2.2 niche

The ecological positioning layer. Answers:
- Where do I stand in the ecosystem?
- What changes are happening around me?
- What changes actually affect me?
- Should I take action? Why?
- Who should I collaborate with?

**Files:**
- `.statuz/niche/manifest.yaml`
- `.statuz/niche/signals/`
- `.statuz/niche/assessments/`
- `.statuz/niche/contexts/`
- `.statuz/niche/outcomes/`
- `.statuz/niche/calibrations/`

### 2.3 SYN

The human synchronization layer. Answers:
- When must I request human direction?
- How do I present strategic options with evidence?
- How do I record decisions and track accountability?

**Files:**
- `.statuz/niche/syn/`

---

## 3. Core Concepts

### 3.1 Actors and Principals

#### Actors
- **Agent:** An AI system operating with Statuz
- **Project:** A shared goal with defined deliverables
- **Product:** A shipped artifact serving users
- **Team:** A group collaborating on a project
- **Organization:** A company or entity with strategy
- **Human Principal:** A person with authority to make strategic decisions

#### Roles
- **Agent** operates within a **Project** or **Product**
- **Project** or **Product** is owned by a **Team**
- **Team** is part of an **Organization**
- **Human Principal** represents the ultimate authority for critical decisions

### 3.2 Three States of Position

Every actor has three potential states:

1. **Declared Position** (What I say I do)
   - Written in manifest
   - Public commitment
   - Can be audited

2. **Observed Position** (What I actually do)
   - Generated from signals
   - Empirical evidence
   - Tracked over time

3. **Calibrated Position** (What we agree I do)
   - Result of SYN process
   - Approved by principal
   - Tracked in revision history

### 3.3 Key Principle: Declaration ≠ Authority

> **Observed behavior does not automatically grant authority.**

The fact that an agent repeatedly takes certain actions does not automatically mean it should have permission, trust, or formal role in those areas. Calibration requires human approval.

---

## 4. Object Model

### 4.1 Overview

```
niche manifest       → Declared position (what I say I do)
niche signal         → Environmental event (something happened)
niche assessment     → Relevance judgment (does it affect me?)
niche context        → Collaboration payload (here's what I need)
niche outcome        → Result record (what happened)
niche calibration    → Drift proposal (I notice something off)
SYN request          → Human escalation (I need direction)
SYN resolution       → Human decision (here's what we agreed)
```

### 4.2 Object Relationships

```text
manifest → declares position
signal → may trigger assessment
assessment → references signal
context → references assessments
outcome → may trigger calibration
calibration → compares manifest vs. observed
SYN → triggered by calibration (or agent judgment)
resolution → updates manifest (after approval)
```

### 4.3 Minimal Disclosure Principle

Every object should contain only the minimum information necessary for its purpose:

- **Signal:** What happened, not the full event payload
- **Assessment:** Why it's relevant, not the full analysis
- **Context:** What the collaborator needs to know, not the entire project history
- **Outcome:** What changed, not every detail of the work

---

## 5. Automation Boundaries

### 5.1 What Can Be Automated

The following can be generated or processed automatically:

1. **Signal Generation**
   - Monitor ecosystem for relevant events
   - Emit structured signals

2. **Relevance Assessment**
   - Score relevance based on declared position
   - Generate impact analysis

3. **Context Assembly**
   - Collect relevant signals and assessments
   - Assemble minimal disclosure payload

4. **Position Observation**
   - Track behavior against declared position
   - Generate observed direction records

5. **Calibration Proposal**
   - Compare declared vs. observed
   - Generate drift proposals with evidence

### 5.2 What Cannot Be Automated

The following require human approval:

1. **Formal Role Assignment**
   - Cannot auto-grant permissions or trust
   - Requires principal approval

2. **Strategic Changes**
   - Cannot auto-modify declared position
   - Requires SYN process

3. **Authority Expansion**
   - Cannot auto-increase scope
   - Requires explicit principal decision

4. **Boundary Modifications**
   - Cannot auto-update does/not_does
   - Requires formal change process

### 5.3 What Can Be Auto-Adjusted (With Clear Policy)

The following can be auto-adjusted if explicit policy allows:

1. **Low-Risk Routing Preferences**
   - Within defined boundaries
   - With clear escape hatches
   - With audit trail

2. **Task Prioritization**
   - Within project constraints
   - With principal-defined weights

---

## 6. Protocol Boundaries

### 6.1 What Statuz Is Not

**Statuz is NOT a transport protocol.** It does not move messages between agents. For agent-to-agent communication, consider:

- **MCP (Model Context Protocol):** For tool access and local operations
- **A2A (Agent-to-Agent):** For cross-agent communication (future)

**Statuz CAN work with these protocols:**
- MCP tools can read/write Statuz files
- Agents can use Statuz as a shared reference
- SYN requests can trigger cross-agent coordination

**See also:** [ADR 0003: Protocol Boundaries](adr/0003-protocol-boundaries.md)

### 6.2 What Statuz Is Not (Continued)

**Statuz is NOT a memory system.** It does not store conversation history, learned facts, or long-term knowledge. For memory, consider:

- Vector databases
- Knowledge graphs
- Project documentation

**Statuz CAN complement memory:**
- Statuz provides context for memory queries
- Memory provides substance for Statuz signals

### 6.3 What Statuz Is Not (Continued)

**Statuz is NOT a project management tool.** It does not track human tasks, sprints, or roadmaps. For project management, consider:

- Linear
- Jira
- GitHub Issues

**Statuz CAN link to project management:**
- Signals can reference project events
- Outcomes can update project status
- SYN can escalate project decisions

---

## 7. Security and Privacy

### 7.1 File Access Control

- **Core files** (.statuz/statuz.yaml) should be readable by authorized agents
- **niche files** may contain sensitive strategic information
- **SYN resolutions** should be auditable by principals

### 7.2 Sensitive Information

- Avoid storing credentials in Statuz files
- Use .gitignore for sensitive directories
- Implement access control at the application layer

### 7.3 Audit Trail

- All SYN requests and resolutions should be logged
- Calibration proposals should include evidence
- Position changes should be tracked in revision history

---

## 8. Extension Mechanisms

### 8.1 Schema Evolution

- Use JSON Schema with explicit version
- Maintain backward compatibility where possible
- Provide migration guides for breaking changes

### 8.2 Custom Fields

- Extensions can add optional fields
- Core implementations should ignore unknown fields
- Validation should warn, not fail, on unknown fields

### 8.3 New Object Types

- Can be added without breaking existing objects
- Should follow minimal disclosure principle
- Should have clear relationships to existing objects

---

## 9. Implementation Status

### 9.1 Core (Statuz Core)

| Component | Status |
|-----------|--------|
| Schema | Stable |
| CLI | Stable |
| TypeScript SDK | Stable |
| Python SDK | Stable |
| MCP Server | Stable |

### 9.2 niche

| Component | Status |
|-----------|--------|
| Technical Charter | This document (Working Draft) |
| Manifest Schema | Working Draft (v1.0) |
| Signal Schema | Working Draft (v1.0) |
| Assessment Schema | Working Draft (v1.0) |
| Context Schema | Working Draft (v1.0) |
| Outcome Schema | Working Draft (v1.0) |
| Calibration Schema | Working Draft (v1.0) |
| SYN Schema | Working Draft (v1.0) |
| Schema Versioning ADR | ADR 0005 |

### 9.3 SYN

| Component | Status |
|-----------|--------|
| Protocol Design | Working Draft |
| Human Interface | In Progress (VS Code Extension) |
| Governance Workflow | In Progress |

---

## 10. Answered Questions (Previously Open Questions)

### 10.1 Manifest Scope

**Question:** Should niche manifest be project-level, agent-level, or both?

**Answer:** Both.

- **Project-level manifest** (`.statuz/niche/manifest.yaml`): Declares the project's overall position, responsibilities, and boundaries. This is the primary manifest.
- **Agent-level manifest** (optional, `.statuz/niche/agent-{name}.yaml`): Declares a specific agent's position within the project.

**Rationale:** Some decisions apply to the entire project, while others are agent-specific. Both levels are useful.

### 10.2 SYN Trigger

**Question:** Is SYN triggered automatically (by calibration) or manually (by agent judgment)?

**Answer:** Both.

- **Auto-triggered by calibration:** When a drift is detected beyond a configured threshold, a calibration proposal may automatically generate a SYN request.
- **Manual agent judgment:** An agent may escalate to SYN at any time if it encounters uncertainty, ambiguity, or high-risk decisions.

**Rationale:** Automation handles the routine cases, but agents need the flexibility to escalate when they're unsure.

### 10.3 Evidence Window

**Question:** How long is "long-term" for calibration? How do we quantify drift?

**Answer:**

- **Default evidence window:** 30 days (configurable per project)
- **Quantifying drift:** Track at least 3 dimensions:
  1. **Task drift:** % of tasks outside declared scope
  2. **Collaboration drift:** % of time spent with un-declared collaborators
  3. **Boundary drift:** Frequency of rule/constraint exceptions

**Rationale:** 30 days is a reasonable default to see patterns but not so long that drift becomes problematic before detection. Multiple dimensions prevent gaming any single metric.

### 10.4 Signal Sources

**Question:** What ecosystem events should generate signals?

**Answer:**

**Recommended signal sources:**
1. **VCS events:** Commits, PRs, issues, reviews
2. **Dependency events:** Version changes, security advisories
3. **API events:** Contract changes, deprecations, outages
4. **Agent events:** Handoffs, errors, status changes
5. **Human events:** Directives, approvals, feedback

**Rationale:** These are the most common events that affect agent work, and they're already available in most development environments.

### 10.5 Assessment Criteria

**Question:** How do we ensure consistent relevance scoring?

**Answer:**

- **Relevance is defined in the manifest:** Each manifest declares what signals are relevant to it.
- **Assessment includes clear rationale:** Every assessment must explain *why* it judged a signal relevant (or not).
- **Assessments are auditable:** Stored in `.statuz/niche/assessments/` for later review.

**Rationale:** Consistency comes from clear criteria + auditable decisions, not black-box scoring.

---

## 11. References

- [Statuz Core Specification](../SPEC.md)
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/release-notes)
- [ADR 0001: Status ≠ Memory](adr/0001-status-not-memory.md)
- [ADR 0002: YAML-First](adr/0002-yaml-first.md)
- [ADR 0003: Protocol Boundaries](adr/0003-protocol-boundaries.md)
- [ADR 0004: Core/niche Separation](adr/0004-core-niche-separation.md)

---

## 12. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1 | 2026-05-30 | Statuz Core Team | Updated status to Working Draft; all schemas + docs complete; production tooling (VS Code Extension + publishing) in progress |
| 1.0 | 2026-05-30 | Statuz Core Team | Answered all open questions, added ADR references |
| 0.1 | 2026-05-29 | Statuz Core Team | Initial working draft |

---
