# Statuz 0.1 Field Guide

## Minimal document

```yaml
statuz_version: "0.1"
identity:
  agent_name: dev-agent
  project_name: example-project
current_state:
  status: idle
  task: none
  next_action: ask user for a goal
```

## Recommended document

```yaml
statuz_version: "0.1"
updated_at: "2026-05-27T12:00:00Z"
identity:
  agent_name: dev-agent
  project_name: example-project
role:
  name: implementation-assistant
  responsibilities:
    - implement code
current_state:
  stage: implementation
  task: add Statuz
  status: in_progress
  last_checkpoint: created schema
  next_action: add CLI validator
progress:
  completed:
    - schema draft
  blocked_by: []
relations:
  related_files:
    - spec/statuz.schema.json
rules:
  should:
    - validate schema before release
checkpoints: []
```

## Naming convention

Use lowercase kebab-case names for agents and projects:

```text
dev-agent
qa-agent
muserock
queue-desk
```

## Human-first design

Statuz should be readable by humans. If a status file cannot be understood in 30 seconds, it is probably too large.
