<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="100" />
</div>

# Statuz 0.1 Specification Draft

Status: Draft 0.1  
Owner: Oasis Company  
Scope: AI Agent Runtime Status Protocol

## 1. Purpose

Statuz defines a small, portable, machine-readable status format for AI agents.

The goal is to let an agent recover, explain, transfer, and coordinate its current state across:

- sessions;
- tasks;
- tools;
- IDEs;
- products;
- organizations;
- agent teams;
- long-running creative or engineering workflows.

## 2. Core distinction

Statuz is different from memory.

Memory answers:

> What is known?

Statuz answers:

> What is happening now?

A memory system may contain millions of embeddings, facts, files, notes, and transcripts. A Statuz object should be compact enough to load at the beginning of a session.

## 3. Canonical file locations

An implementation SHOULD support at least one of the following locations:

```text
.statuz/statuz.yaml
.statuz/status.yaml
statuz.yaml
statuz/status.yaml
```

For project-local agents, `.statuz/statuz.yaml` is recommended.

For shared workspace agents, `statuz/status.yaml` is acceptable.

## 4. Required top-level fields

A valid Statuz 0.1 document MUST include:

```yaml
statuz_version: "0.1"
identity: {}
current_state: {}
```

A useful Statuz document SHOULD include:

```yaml
role: {}
goal: {}
progress: {}
relations: {}
rules: {}
checkpoints: []
```

## 5. Top-level object

```yaml
statuz_version: "0.1"
updated_at: "2026-05-27T12:00:00Z"

identity:
  agent_name: dev-agent
  agent_id: optional-stable-id
  project_name: example-project
  organization: Oasis Company
  environment: local-dev

role:
  name: implementation-assistant
  responsibilities:
    - implement code
    - preserve architecture
  boundaries:
    - do not deploy without user approval

current_state:
  stage: implementation
  task: add status persistence
  status: in_progress
  last_checkpoint: schema drafted
  next_action: implement validation

progress:
  completed:
    - created schema draft
  blocked_by:
    - choose persistence backend
  open_questions:
    - should status be YAML or JSON by default?

relations:
  related_agents:
    - doc-agent
  related_projects:
    - MuseRock
  related_files:
    - apps/api/src/memory
  related_tools:
    - git
    - test-runner

rules:
  should:
    - read Statuz at session start
    - write checkpoint after important decisions
  should_not:
    - overwrite existing checkpoints without appending history

checkpoints:
  - id: cp-001
    at: "2026-05-27T12:00:00Z"
    summary: Created initial Statuz draft.
    next_action: Implement CLI validation.
```

## 6. Status values

The `current_state.status` field SHOULD use one of:

- `idle`
- `in_progress`
- `blocked`
- `waiting_for_user`
- `waiting_for_tool`
- `completed`
- `paused`
- `failed`

Custom values MAY be used, but tools SHOULD preserve unknown values instead of rejecting them.

## 7. Stage values

`current_state.stage` is domain-specific.

Examples:

- software: `planning`, `implementation`, `testing`, `review`, `release`;
- writing: `prime`, `drafting`, `reflection`, `revision`;
- research: `scoping`, `searching`, `reading`, `synthesizing`, `writing`;
- support: `triage`, `investigation`, `resolution`, `followup`.

## 8. Checkpoints

Checkpoints are compact decision records. They SHOULD NOT be full transcripts.

A checkpoint SHOULD contain:

- `id`;
- `at`;
- `summary`;
- `decision` when relevant;
- `evidence` when relevant;
- `next_action`.

## 9. Agent coordination

`relations.related_agents` names other agents that may be relevant to the current state.

A multi-agent system MAY extend this with relationship metadata:

```yaml
relations:
  agent_graph:
    - from: dev-agent
      to: qa-agent
      type: requests_validation_from
    - from: doc-agent
      to: dev-agent
      type: consumes_output_from
```

## 10. Reading and writing rules

A Statuz-aware agent SHOULD:

1. read Statuz at session start;
2. summarize the recovered state to the user when helpful;
3. update Statuz after meaningful progress;
4. append checkpoints rather than overwriting history;
5. keep Statuz compact;
6. avoid storing secrets;
7. avoid storing private personal data unless explicitly required and approved.

## 11. Security and privacy

Statuz files may contain sensitive task context. Implementations SHOULD:

- avoid secrets;
- support `.gitignore` patterns for private local status;
- allow project owners to decide whether `.statuz/` is committed;
- separate public role/status data from private runtime data.

## 12. Compatibility

Statuz may be used with:

- CLI agents;
- IDE agents;
- MCP servers;
- Agent Skills;
- writing agents;
- research agents;
- customer-support agents;
- multi-agent orchestration frameworks.

## 13. Non-goals for 0.1

Statuz 0.1 does not define:

- a network protocol;
- a vector store;
- a complete permissions model;
- a dashboard API;
- a mandatory database;
- a universal ontology for every possible agent.

Those may appear in later versions.
