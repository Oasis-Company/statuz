---
name: statuz-bootstrap
description: Create a Statuz runtime status folder for any AI project.
version: 0.1.0
license: Apache-2.0
---

# Statuz Bootstrap Skill

Use this skill when the user asks to initialize Statuz, create a status layer, help an AI remember what it is doing, or generate a `.statuz/` folder for a project.

## Purpose

Generate a small Statuz folder that lets an AI agent know:

- who it is;
- what project it belongs to;
- what role it plays;
- what it is currently doing;
- what progress has been made;
- what is related;
- what the next action should be.

## Workflow

### Step 1: Inspect the project

Use `scripts/analyze_project.py` to infer:

- project name;
- likely language/runtime;
- notable files;
- package metadata if available.

### Step 2: Generate `.statuz/`

Use `scripts/generate_statuz.py` to create:

```text
.statuz/
  statuz.yaml
  checkpoints.log
  agents/
    default-agent.yaml
```

### Step 3: Explain how to use it

Tell the user:

- where the files were created;
- how the AI should read the status at session start;
- how checkpoints should be appended;
- what fields should be edited first.

## Rules

- Do not overwrite an existing `.statuz/statuz.yaml` without asking.
- Do not store secrets.
- Keep status compact.
- Do not turn Statuz into a chat transcript.
- Emphasize that Statuz is status, not memory.
