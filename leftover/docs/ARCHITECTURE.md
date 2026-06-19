# Architecture

Statuz can be implemented in four levels.

## Level 0: File

A single YAML or JSON document:

```text
.statuz/statuz.yaml
```

This is the recommended starting point.

## Level 1: Folder

A project-local folder:

```text
.statuz/
  statuz.yaml
  checkpoints.log
  agents/
    dev-agent.yaml
    doc-agent.yaml
```

This is useful when multiple agents share one project.

## Level 2: SDK

A library reads and writes Statuz files:

```ts
const status = await readStatuz()
status.current_state.next_action = "run tests"
await writeStatuz(status)
```

## Level 3: Service

A Statuz service exposes status over local or network APIs.

Possible endpoints:

```text
GET  /statuz/projects/:projectId
POST /statuz/projects/:projectId/checkpoint
GET  /statuz/projects/:projectId/resume
POST /statuz/projects/:projectId/agent-status
```

## Level 4: MCP Server

A Statuz MCP server lets MCP-compatible clients query and update runtime status.

Possible tools:

- `statuz.read`
- `statuz.write_checkpoint`
- `statuz.get_resume_brief`
- `statuz.update_agent_status`
- `statuz.list_related_agents`

## Recommended evolution

Start with a file. Then build SDK helpers. Only add a service or MCP server when multiple tools or agents need shared access.
