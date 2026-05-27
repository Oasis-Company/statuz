# Comparison

## Statuz vs Memory

| Question | Memory | Statuz |
|---|---|---|
| What does the agent know? | Yes | Sometimes |
| What is the agent doing now? | Usually no | Yes |
| What is the next action? | Maybe | Yes |
| Is it compact enough to load every session? | Often no | Yes |
| Is it optimized for recovery? | Maybe | Yes |

## Statuz vs MCP

MCP connects AI applications to external tools, data, and workflows.

Statuz describes the current runtime status of an agent or agent team.

They are complementary. A future Statuz MCP server can expose status to MCP clients.

## Statuz vs Skills

Skills package reusable abilities and workflows.

Statuz records the current state of an agent using those skills.

A skill can generate, update, or consume Statuz files.

## Statuz vs Project documentation

Documentation explains the project.

Statuz explains where the agent is within the project right now.

## Statuz vs Task management

Task managers assign and track tasks for humans and teams.

Statuz gives an agent a compact operational state and recovery point.

A Statuz checkpoint may reference a task manager ticket, but it should not replace the whole task manager.
