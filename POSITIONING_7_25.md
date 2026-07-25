# Statuz: Positioning & Narrative Alignment

**Status:** Canonical — supersedes conflicting language elsewhere in this repo (README, repo description, prior design notes)
**Date:** 2026-07-25
**Scope:** What statuz is, why it exists, how its layers fit together, and how we talk about it — internally and externally.

This document exists because our own materials currently disagree with each other. Where they do, this document wins; the other file should be edited to match, not the other way around.

---

## 1. One-Line Positioning

> **statuz is a persistent, cross-tool dependency-graph engine for AI agents, with an attention layer that decides what an agent needs to know right now.**

Two specific corrections this fixes:

- **"Protocol" is retired as a description.** statuz is not a wire format and does not specify how bytes move between parties — that is MCP's job, or any other transport's. statuz specifies what state *is* and how it changes. The accurate framing is **agent state infrastructure** — closer in kind to a filesystem or a version-control object model than to a protocol spec. "AI Agent Runtime Status Protocol" should not appear in the repo description going forward.
- **The kernel's query surface is fixed at three primitives: `traverse`, `impact`, `path`.** Any other operation (subgraph extraction, validation, CLI conveniences) is a composition or utility built on these three, not a fourth or fifth "core query." Documentation citing a different count is counting utilities as primitives; this document is the tie-breaker.

---

## 2. The Problem We're Solving

Every dominant paradigm for giving an LLM knowledge — RAG, long context windows, vector-store memory — shares one property: the agent actively retrieves, pulls text into context, and forgets. Context is a consumable. Every session rebuilds its picture of the world from near-zero.

That's tolerable for tasks where the agent knows what it doesn't know. It fails precisely on the tasks we care about most — **long-horizon, zero-to-one, and research/engineering-style work** — where the defining difficulty is that the agent doesn't know what to ask for, and where the *state* of the task matters more than any single fact inside it.

Our bet is that the fix is not a bigger window. It is an externalized, persistent, structured model of "what's going on right now" — one the agent inhabits rather than reads. The hippocampus analogy is directionally correct even if biologically loose: the hippocampus doesn't store memories, it stores an index — what's related to what, what changed recently, what matters right now. statuz is that index for an agent's world, not a database for its content.

The single sentence that separates this from every existing memory system: **information must be actively released, not passively retrieved.** RAG assumes the agent knows what to ask. Long-horizon agents don't. Everything in §4.4 exists to make that sentence implementable rather than aspirational.

---

## 3. What statuz Is Not

- **Not a vector store or RAG system.** RAG is retrieval on request. Our differentiating bet is release without request — the system decides what surfaces. This is unproven at production scale; see §6.
- **Not a message-passing protocol.** statuz does not move bytes between agents or tools. That's MCP's job. statuz is the state those messages are *about*.
- **Not a database for content.** statuz does not store meshes, source files, or documents. It stores the topology of how those things relate, change, and depend on one another.
- **Not (yet) a multi-cluster system.** See §5. Cross-cluster alignment is an open research problem we have deliberately chosen not to paper over with a false "coming soon."

---

## 4. Architecture: Three Layers

### 4.1 Kernel (Core Engine) — pure topology, no understanding

The kernel holds the **original graph**: the authoritative, edit-time, content-addressed representation of a Cluster. Pure topology — nodes, typed edges, structural weight. It does not interpret meaning; it computes reachability.

**Design commitment: the kernel is architecturally isomorphic to Blender's `depsgraph`.** Not because Blender is a design partner, but because its dependency-evaluation engine is twenty years of production-hardened prior art for the exact problem we have — a persistent graph of typed dependencies that must support incremental, partial recomputation. Four commitments are inherited directly:

1. **Dual-graph separation.** The Cluster (original graph) is never mutated by evaluation. Anything ranked, decayed, or task-contextualized lives in a derived, disposable **working-set projection**, recomputed per `(agent, task)` — never written back to the Cluster directly.
2. **`impact()` is the propagation primitive of the Loop, not just a read query.** Events tag changed nodes; `impact()` is the flush of that tag along dependency edges to affected downstream nodes. Only the flushed set is recomputed. The Loop is considered converged when a flush wave finishes propagating and no new nodes are tagged.
3. **Structural changes and value changes run on two different clocks.** An edge appearing or disappearing is rare, expensive, and must go through the proposal mechanism (§4.2) — it is kernel-authoritative. Updating attention, confidence, or derived weight is frequent, cheap, and lives entirely in the working-set projection. It never requires a proposal.
4. **Edges are field-qualified, not bare.** A relation connects a `(node, field)` pair, not two nodes in the abstract. The same entity can carry different dependency roles in different fields.

The kernel tolerates cycles rather than forbidding them at write time: detect, report, define a deterministic break-point for evaluation, degrade gracefully. Zero non-std dependencies in the graph core is correct and stays that way — the kernel's job is to be a physics engine for topology, not to hold opinions.

### 4.2 Representation Layer — semantics, judgment, everything fallible

Where `arrow-map`, `niche`, and `syn` live, along with the dashboard:

- **`arrow-map`** — input translator. Turns human or LLM language into typed arrows.
- **`niche`** — state interpreter. Drift detection, Improvement/Degradation judgment. Answers "is this graph getting better or worse," a question the kernel structurally cannot answer.
- **`syn`** — write-back gatekeeper. The proposal mechanism. An agent's write is a proposal, not a commit.

This layer is allowed to be wrong, to call an LLM, to hold opinions. Isolating fallible intelligence here is precisely what keeps the kernel trustworthy.

### 4.3 The Attention Layer — our actual research frontier

Set the kernel next to `depsgraph` and an asymmetry falls out immediately: everything statuz needs from a dependency-graph *engine*, `depsgraph` already does, in production, at scale, for two decades. The kernel is not where our novelty lives. Copying its architecture is the responsible move, not a compromise.

What `depsgraph` has never needed — because it has never had to serve a context-constrained consumer — is an **attention budget** (what to surface out of everything that's true), **decay** (what's gone stale), **cross-field spillover under a budget** (what to activate together), and **confidence** (its edges are ground truth from a closed world it fully controls; ours are beliefs ingested from tools we don't control).

This is where all research investment belongs. The engine is solved with prior art. The attention layer is not. Working memory, active release, weight decay, and field channels — the hardest items in our research backlog — are four faces of one problem: **task-seeded, decaying, cross-field-spillover attention over a graph.** Full algorithmic treatment lives in the companion research-priorities document, not here; this document states the conclusion, not the derivation.

This also fixes what "Better Engine / Better Diagram / Better Loop" means:
- **Better Engine** = the depsgraph-isomorphic kernel (§4.1).
- **Better Diagram** = the working-set projection — the attention-ranked view agents and humans actually see. It is the evaluated graph, never the original.
- **Better Loop** = tag → impact-flush → recompute attention, incremental and multi-rate.

### 4.4 Active Release — resolved layer ownership

Working memory is not a store with a capacity limit. It is a **pipeline**: the kernel emits pure topological signals (centrality, recency, diff-magnitude, seed-based random-walk score); the representation layer performs relevance arbitration over those signals for a specific `(agent, task)`; the result is the working-set projection the agent receives.

This resolves "which layer owns active release" for good: **neither layer, alone.** The kernel computes. The representation layer decides. Active release is the name for the pipeline running end to end — not a component either layer can claim in isolation.

### 4.5 Field Channels — resolved definition

A field channel is not a mechanism to design from scratch. It is what happens when a task-seeded random walk, computing the working-set projection, reaches a node shared across fields via a bridge, and its activation spills into the adjacent field. "Refrigerated truck lighting up fuel cost" is this spillover, observed.

---

## 5. Cluster Boundaries: A Deliberate Commitment, Not a Missing Feature

A Cluster is **the largest unit within which a shared ontology holds** — the maximal radius over which semantic self-consistency can be maintained. This is a definition, not an accident, and the boundary between clusters is its logical consequence, not a defect awaiting a fix.

Bridges inside a Cluster anchor on shared identity: the central node registry, one content-addressed space, one symbol system. Two Clusters have none of that in common — independent registries, independent address spaces. A bridge drawn across a Cluster boundary has endpoints that do not denote the same semantics. This is **not a link-building problem; it is a reference problem.**

Two things are frequently conflated here and must stay separate:

- **Transport** — solved. Moving bytes between systems is MCP's job, or any transport's.
- **Alignment** — open. Determining that Cluster A's "refrigerated truck" and Cluster B's "refrigerated truck" co-refer is ontology matching, a decades-old open problem in knowledge representation. It is arguably underdetermined in principle: "sameness" depends on the abstraction level of the observer, and no god's-eye view adjudicates that once and for all.

The same semantic closure that makes a Cluster powerful — every symbol's meaning is fixed by its position in that Cluster's structure — is the reason meaning cannot be losslessly carried across its boundary. These are two faces of one property, not a bug and a missing patch.

That said, **"naturally cannot be implemented" is not the correct phrasing, and this document retires it.** Two things keep it honest:

- Blender's own per-scene / per-view-layer / per-mode graphs interoperate freely because they share one underlying `bpy.data`. A shared identity layer makes multi-graph interop trivial. So the absence of cross-Cluster transport in statuz is not physics — it is the consequence of *not building* a centralized identity layer, which we do deliberately, to preserve each Cluster's semantic sovereignty.
- Humans and LLMs perform imperfect cross-ontology alignment constantly. It isn't impossible — it's unreliable, lossy, and requires external judgment. Which means it belongs to the representation layer, not the kernel, exactly like every other fallible operation in §4.2.

**The correct statement of the commitment:** we choose not to build a centralized cross-Cluster identity layer, and we refuse to place kernel-confident bridges where only representation-layer hypotheses can honestly exist. Both are architectural choices made for a reason — not laws of nature.

### 5.1 Redefining "Our Own A2A Mode"

Retire the framing of A2A as a messaging protocol between agents; that is a transport concern. "Our own A2A mode" means exactly one thing:

**The representation layer may generate confidence-weighted, always-revisable hypothesis mappings between Clusters.**

These mappings:
- carry confidence well below 1, because they are inferred correspondences across independent world-models, not observed dependencies inside one;
- are produced by the representation layer only, and never enter the kernel as edges;
- may come from an LLM, a human reviewer, or a heuristic matcher, and are disposable and recomputable like any other representation-layer artifact.

A cross-Cluster bridge that claims confidence ≈ 1 is a bug, not a feature.

---

## 6. North Star Metric

**Context-recovery cost**: the number of tool calls (or tokens) an agent needs, after a session boundary, to reach a state where it can work effectively on a long-horizon task.

This is chosen over engine-level metrics — query latency, storage efficiency, compression ratio — deliberately. Those measure the engine, and the engine is not the bet we're making (§4.3). Context-recovery cost measures the thing we actually claim to fix: that agents lose the shape of a task between sessions.

Secondary, diagnostic metrics: task completion rate on a fixed benchmark of real repository issues, deviation rate (actions requiring correction), and tool-call efficiency. All are measured by the `judge statuz` harness via paired A/B — same task, same base model, statuz-on vs. statuz-off.

---

## 7. Design Commitments (Non-Negotiable Until Revised Here)

- The kernel never performs semantic judgment. If a decision requires understanding *why*, it belongs in the representation layer.
- Structural facts — an edge exists or doesn't — never decay and are never garbage-collected. Only derived attention/confidence state decays, and only derived state is ever discarded.
- Structural writes (topology changes) always go through the proposal mechanism. Value and attention updates never do.
- A Cluster is the unit of semantic self-consistency. Nothing crosses a Cluster boundary as fact — only as a confidence-annotated hypothesis, generated in the representation layer.
- statuz is not a transport. It does not compete with MCP; it is the state that MCP-driven agents act on and reason about.
- Any claim about what statuz does for agents is treated as unvalidated until `judge statuz` can falsify it.

---

## 8. Explicitly Deferred

Stated here so silence is never mistaken for oversight:

- **Cross-Cluster ontology alignment** beyond confidence-weighted hypotheses (§5.1) — open research, not scheduled.
- **Semantic compression** (community detection / hierarchical collapse for 10k+ node graphs) and **native edge-first storage** — real problems, deferred until we have real graphs large enough to need them.
- **Full concurrency/identity infrastructure** (PKI-grade agent authentication) — deferred in favor of the minimal non-repudiation the proposal queue already provides.

---

## 9. Terminology (Canonical)

| Term | Definition |
|---|---|
| **Cluster** | The sole unit of storage; a self-consistent world model; the maximal radius over which a shared ontology holds. |
| **Field** | A facet or view within a Cluster. Nodes are shared across fields via the central registry; edges are field-qualified. |
| **Bridge** | A cross-field edge anchored on shared node identity. |
| **Working set** | The evaluated, task-contextualized, decayed projection an agent actually receives. Derived, disposable, recomputed per `(agent, task)`. |
| **Active release** | The end-to-end pipeline — kernel signal → representation-layer arbitration → working set — that surfaces relevant state without being asked. |
| **Proposal** | An agent-authored structural change, held for approval before it becomes part of the Cluster. |

---

*This document is the canonical statement of positioning until explicitly revised. Any README section, repo description, or design note that conflicts with it should be updated to match.*
