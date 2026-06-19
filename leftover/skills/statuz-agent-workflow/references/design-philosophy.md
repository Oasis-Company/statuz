# Statuz Design Philosophy

The seven principles that should guide every action. Read this before editing any Statuz file.

---

## Principle 1: Status is not memory

> "Memory remembers the past. Status describes the present.

**What this means in practice:

| ✅ Belongs in Statuz | ❌ Does NOT belong in Statuz |
|----------------------|-----------------------------|
| "currently implementing login endpoint | Full chat transcripts |
| "next: implement logout | Bug discussion history |
| "chose JWT over sessions | Complete diffs and code snippets |
| "blocked: waiting for API key | Documentation |
| "task: refactor payment integration | API key value |

**Why:** Memory systems (chat history, embeddings, etc.) are about what was. Status is about what is. An agent should be able to pick up the task from a status file without reading the chat history. If the status file requires reading chat history to make sense, it has failed.

---

## Principle 2: Small enough to survive

> A status file should be readable in under 10 seconds.

A good rule of thumb: if you need to scroll to see the whole file, it is too long.

**Keep it compact:**

- Checkpoints: 1-3 lines each
- Total file: fits on one screen (40-60 lines maximum)
- Under 200 lines absolute ceiling

If your status file has grown beyond this, it is being misused. Prune. Move non-status content to documentation, git, or wherever it actually belongs.

---

## Principle 3: File-based, no server required

> Statuz begins as files. It does not need a database, a cloud service, or an always-on daemon.

**Why:** Portability. A Statuz project can be:**

- Copied to any machine with Node.js
- Read by humans in any text editor
- Validated with a single CLI command
- Version-controlled like any other file

This is deliberate. A status protocol that requires infrastructure to work is not a protocol; it is a SaaS product, and that is a different thing.

---

## Principle 4: One source of truth per concern

> runtime status in statuz.yaml.

**Each concern lives in one file.

| Concern | File | Schema |
|---------|------|--------|
| Runtime status | `.statuz/statuz.yaml` | `statuz.schema.json` |
| Ecological position | `.statuz/niche-manifest.yaml` | `niche-manifest.schema.json` |
| Cross-project topology | `.statuz/cluster.yaml` | `cluster.schema.json` |
| Strategic decisions | `.statuz/syn/*.yaml` | `syn-proposal.schema.json` |

**Why:** Splitting files adds synchronization cost. Only split when genuinely needed. A monolith-first.

---

## Principle 5: Truthful above all

> The status file must tell the truth about what agent is doing.

If the status file says `"implementing login" but the agent is actually working on payment integration, the status file is lying. A lying status file is actively harmful.

**Truth check before ending a session:

1. `current_state.task` reflects what I was actually doing?
2. `current_state.next_action` is specific enough another agent could pick it up?
3. `updated_at` was just updated?
4. Would another agent reading only the status file, would they know what to do next?

---

## Principle 6: Arrow Map is a graph of names, not a dashboard

> Arrow Map is for agent awareness. It names things and the relationships between them. It is not a monitoring dashboard. It is not an artifact. Each node is a name (project name). Not pages, views, URLs, pages.

**Good arrows represent: A depends on B, A calls B, A shares C

**Good nodes are: project-a, project-b, shared-auth-lib

**Why:** Names change slowly. A graph of names fits on a name. Names give the global positioning of where things stand in relation to each other.

---

## Principle 7: Humans decide strategic things

> SYN is not automated. Agents detect drift but cannot change. Calibration detects drift but cannot modify niche. Only a human being (or a human being) approve the SYN.

This is not because agents are incapable. It is because:

1. Strategic changes shape the project's ecological position
2. Position changes have downstream consequences for other projects
3. The cost of getting it wrong is higher than cost of asking
4. Humans want to know about meaningful changes to the plan

**Decision tree in short:

- routine implementation → no SYN, just work and write checkpoint
- boundary of the niche changes → SYN proposal for human approval
- new project discovered → SYN proposal to add it to cluster + create statuz
- architectural decision with lasting consequences → SYN request with options

---

## The anti-patterns — things you should never do

1. **Pasting chat into checkpoints. A checkpoint is a summary, not a transcript.
2. **Using statuz.yaml as a to-do list. Use your project management tool for that.
3. **Storing secrets. Ever. Even in comments. Even encrypted. Statuz is not a vault.
4. **Not updating status before ending a session. Leaving the next agent confused about who you were and what you were doing is the failure mode.
5. **Automatically generating 20 checkpoints per session. Checkpoints are for meaningful progress, not activity logging.
6. **Writing status files without validate after editing. Schema validation exists for a reason — it catches your mistakes before they confuse someone else.
