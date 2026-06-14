Do not start with SDKs, dashboards, databases, or MCP servers before the CLI and schema are working.

## Repository Areas

Important paths:

- `README.md`  
  Human-facing project overview.

- `SPEC.md`  
  Main protocol specification.

- `ROADMAP.md`  
  Development plan and staged priorities.

- `spec/statuz.schema.json`  
  JSON Schema for validating Statuz YAML files.

- `examples/basic/statuz.yaml`  
  Minimal valid Statuz example.

- `examples/multi-agent/statuz.yaml`  
  Multi-agent example.

- `examples/muserock/statuz.yaml`  
  Creative workflow example for MuseRock-style use cases.

- `packages/cli`  
  TypeScript CLI package.

- `skills/statuz-bootstrap`  
  Draft Agent Skill for generating Statuz files.

- `docs`  
  Supporting design notes, architecture documents, ADRs, and smoke tests.

## CLI Expectations

The CLI should remain small.

Required commands for the early version:

```bash
statuz init
statuz validate <file>
statuz resume <file>

Expected local verification:

cd packages/cli
npm install
npm run build
npm run validate:example

The CLI must produce clear human-readable errors.

Do not expose raw stack traces for normal validation failures.

Schema Expectations

The schema must validate the official examples.

The schema should prioritize clarity over cleverness.

Do not over-model the world.

The early schema should focus on:

statuz_version
updated_at
identity
role
goal
current_state
progress
relations
rules
checkpoints

Avoid adding complex memory, embedding, permission, or database concepts in the 0.1 stage.

Example Expectations

Every example should be:

Valid YAML.
Easy to read.
Compatible with the schema.
Useful as a copy-paste starting point.
Focused on runtime status, not long-term knowledge storage.

If an example cannot pass statuz validate, fix the example or the schema before adding new features.

Code Style

Use TypeScript for the CLI.

Prefer simple, dependency-light code.

Use clear names.

Prefer explicit validation and helpful errors.

Do not add frameworks unless they are clearly necessary.

Do not introduce network calls in P0.

Do not introduce databases in P0.

Documentation Style

Write documentation in clear English.

Be precise.

Avoid hype inside technical docs.

The philosophical positioning is important, but implementation docs should stay operational.

Good sentence:

Statuz records the current runtime state of an AI agent.

Bad sentence:

Statuz is a revolutionary consciousness layer that changes everything.

Use the strong vision in the README and manifesto, but keep engineering docs practical.

Non-Negotiable Product Principles
Status is not memory.
Runtime state must be inspectable by humans.
The protocol must be portable across tools.
The first version must work without a server.
Agents should be able to resume from Statuz without reading an entire chat history.
Statuz should help agents know what to do next.
Statuz should remain small enough to be understood quickly.
P0 Definition of Done

P0 is complete only when all of the following are true:

npm install works in packages/cli.
npm run build works in packages/cli.
npm run validate:example passes.
examples/basic/statuz.yaml is valid.
statuz validate <file> works.
statuz resume <file> works.
statuz init generates a valid status file.
GitHub Actions CI runs on push and pull request.
docs/CLI_SMOKE_TEST.md exists.
No major philosophical or architectural scope creep was introduced.
Things Agents Must Not Do

Do not rewrite the whole repository.

Do not replace the protocol with a database.

Do not turn Statuz into generic memory.


Do not remove the core thesis.

Do not change the license without explicit human approval.

Do not make breaking changes to the schema without updating examples and docs.

When Unsure

If a task is ambiguous, use this decision rule:

If it helps the agent know its current state, it may belong in Statuz.
If it only helps the agent remember facts, it probably belongs in memory.
If it connects tools, it probably belongs in MCP.
If it describes a reusable workflow, it may belong in a Skill.
If it tracks human project tasks, it may belong in an issue tracker.

Keep Statuz focused on runtime status.

Handoff Rule

At the end of every meaningful change, summarize:

What changed.
Why it changed.
How to verify it.
What remains unresolved.
What the next agent should do.

This project is building a protocol for agent continuity.

Every agent working on this repository should leave the next agent with a clearer status than it found.