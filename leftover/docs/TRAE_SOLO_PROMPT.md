# Trae SOLO Prompt: Create the Statuz Repository

Use this prompt in Trae SOLO to recreate or extend this repository.

```text
We are creating an open-source repository under Oasis-Company called statuz.

Statuz is an AI Agent Runtime Status Protocol. It is not memory, not MCP, and not a skill. It is the status layer that lets AI agents know who they are, what they are doing, why they are doing it, what progress has been made, what is connected, and what should happen next.

Please create a production-quality open-source repository with:

1. README.md with a sharp positioning statement.
2. SPEC.md for Statuz 0.1.
3. docs/MANIFESTO.md, docs/CONCEPTS.md, docs/ARCHITECTURE.md, docs/COMPARISON.md.
4. JSON Schema under spec/statuz.schema.json.
5. Examples for basic, multi-agent, and creative-writing use cases.
6. A TypeScript CLI scaffold under packages/cli with commands:
   - init
   - validate
   - resume
7. A statuz-bootstrap Agent Skill draft under skills/statuz-bootstrap.
8. GitHub issue templates and a CI workflow.
9. Apache-2.0 license.
10. A roadmap that starts from file-based Statuz and evolves toward SDK, MCP server, dashboard, and integrations.

Keep the design small, protocol-first, and human-readable.

Do not overbuild the first version. The 0.1 version should be easy enough that any AI project can add a .statuz/statuz.yaml file in five minutes.
```
