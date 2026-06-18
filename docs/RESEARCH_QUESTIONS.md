# Statuz Research Questions — Expert Consultation Document

> Compiled for academic consultation. Last updated: 2026-06-16

---

## Executive Summary

Statuz is a protocol for AI agent runtime status management. While we have implemented the basic protocol, we face several fundamental research challenges that require expert guidance:

1. **Information Compression** — How to compress vast project context into navigable structures
2. **Graph-Based Topology** — Scalable representation of cross-project relationships
3. **State Closure Detection** — Determining when we have sufficient context to act
4. **Niche Search Engine** — Semantic search for ecological positioning
5. **Cross-Project Influence Analysis** — Predicting ripple effects across the ecosystem

---

## Table of Contents

1. [Problem 1: Information Compression](#problem-1-information-compression)
2. [Problem 2: True Global State](#problem-2-true-global-state)
3. [Problem 3: Graph-Based Topology & Query](#problem-3-graph-based-topology--query)
4. [Problem 4: Niche Search Engine](#problem-4-niche-search-engine)
5. [Problem 5: State Closure Detection](#problem-5-state-closure-detection)
6. [Problem 6: Cross-Project Influence Analysis](#problem-6-cross-project-influence-analysis)
7. [Technical Architecture Questions](#technical-architecture-questions)
8. [References & Related Work](#references--related-work)

---

## Problem 1: Information Compression

### The Problem

AI agents working on complex projects accumulate massive amounts of context:
- Code changes
- Design decisions
- Conversation history
- Documentation
- External dependencies

Current approaches (embeddings, vector databases) have limitations:
- Lossy compression
- Difficulty in maintaining structural relationships
- Query latency at scale
- "Lost in the middle" problem — relevant information buried in context window

### Current State

- We use YAML files for structured state (`statuz.yaml`, `niche.yaml`, `arrow-map.yaml`)
- Checkpoint mechanism captures key decisions at intervals
- LLM used for summarization but without intelligent pruning

### Questions for Expert

1. What are the most promising approaches for lossless or near-lossless information compression in this context?
2. How can we maintain semantic relationships while compressing?
3. What theoretical frameworks (information theory, Kolmogorov complexity) apply here?
4. Are there existing algorithms for "intelligent forgetting" that preserve critical context?

### Proposed Research Directions

- Hierarchical compression strategies
- Semantic-aware pruning
- Attention mechanisms for context prioritization
- Mathematical formalization of "critical information"

---

## Problem 2: True Global State

### The Problem

Current statuz is **per-project**, stored as separate YAML files. To achieve true agent continuity across projects, we need:
- A unified view of state across all projects in a cluster
- Efficient querying of "what's happening now" across the entire ecosystem
- Real-time synchronization without central server dependency

### Current State

- `cluster.yaml` aggregates project metadata but not runtime state
- Arrow Map shows static relationships, not dynamic state
- No mechanism to answer "what is every agent in this cluster currently doing?"

### Questions for Expert

1. How can we design a distributed global state system that doesn't require a central server?
2. What consistency models are appropriate for agent state (strong vs eventual)?
3. How to handle versioning and conflicts in a file-based system?
4. Are there existing distributed systems patterns that apply here?

### Proposed Research Directions

- CRDTs (Conflict-free Replicated Data Types)
- Event sourcing patterns
- DAG-based state representation
- P2P state synchronization

---

## Problem 3: Graph-Based Topology & Query

### The Problem

Project relationships are inherently graph-structured, but our current implementation uses YAML files which are:
- Slow to query for complex patterns
- Difficult to traverse for influence analysis
- Not optimized for graph operations (shortest path, centrality, community detection)

We believe this requires a dedicated graph database or custom C++ implementation.

### Current State

- Arrow Map stores edges in YAML as `cross_map_arrows`
- No graph traversal algorithms implemented
- Basic validation only (does this arrow exist?)

### Questions for Expert

1. What graph database technologies are most suitable for this use case?
2. Should we build a custom graph engine in C++ for performance?
3. What graph algorithms are essential for project ecosystem analysis?
4. How to balance performance with file-based portability?

### Proposed Research Directions

- Graph representation formats (RDF, Property Graphs)
- Query languages for project topology (Cypher, Gremlin)
- Graph embedding for similarity search
- Distributed graph processing

---

## Problem 4: Niche Search Engine

### The Problem

Niche (ecological positioning) requires more than keyword search. We need:
- Semantic understanding of "what this project does"
- Contextual matching against ecosystem needs
- Detection of positioning drift
- Recommendation of complementary projects

This needs to be fast enough for real-time queries, potentially requiring C++ implementation.

### Current State

- Niche is stored as `declared_position.does` / `declared_position.does_not` lists
- LLM used for generating these lists but not for search
- No semantic search capability

### Questions for Expert

1. What search architectures support semantic understanding of project positioning?
2. How to index and query "ecological niche" effectively?
3. What machine learning approaches work for positioning similarity?
4. Is C++ necessary, or can modern vector databases suffice?

### Proposed Research Directions

- Semantic search engines
- Knowledge graph embeddings
- Contrastive learning for positioning
- Graph neural networks for ecosystem analysis

---

## Problem 5: State Closure Detection

### The Problem

How does an agent know when it has **enough information** to make a decision? This is the "state closure" problem:
- Detecting when context is sufficient for action
- Identifying missing information that could affect decisions
- Balancing thoroughness with efficiency

### Current State

- No closure detection mechanism
- Agents rely on human approval via SYN proposals for major decisions
- No automated way to say "I need more context before proceeding"

### Questions for Expert

1. What formal models exist for determining information sufficiency?
2. How can we quantify "epistemic uncertainty" in agent decision-making?
3. Are there game theory or decision theory frameworks applicable here?
4. How to balance exploration (gathering more info) vs exploitation (acting)?

### Proposed Research Directions

- Epistemic logic
- Information gap analysis
- Active learning for context acquisition
- Bayesian decision theory

---

## Problem 6: Cross-Project Influence Analysis

### The Problem

When Project A changes, which other projects in the cluster might be affected? This requires:
- Understanding dependency chains across project boundaries
- Predicting ripple effects of architectural changes
- Prioritizing affected projects for review

### Current State

- Arrow Map shows direct dependencies via `cross_map_arrows`
- No transitive dependency analysis
- No change impact prediction

### Questions for Expert

1. What graph algorithms are most effective for influence propagation?
2. How to handle indirect and implicit dependencies?
3. Can we learn influence weights from historical data?
4. What temporal considerations apply to change propagation?

### Proposed Research Directions

- Influence maximization algorithms
- Temporal graph analysis
- Bayesian networks for dependency inference
- Causality detection in software ecosystems

---

## Technical Architecture Questions

### C++ Backend Considerations

We're considering a C++ backend for:
- Graph database implementation
- High-performance search
- Graph traversal algorithms

**Questions:**
1. What C++ libraries/frameworks are recommended for graph processing?
2. How to design a clean API boundary between C++ core and TypeScript frontend?
3. What are the trade-offs between custom implementation vs using existing libraries (Boost Graph Library, GraphBLAS)?
4. Memory considerations for graph storage at scale?

### LLM Integration

**Questions:**
1. How can LLMs be effectively used for graph reasoning?
2. What techniques exist for grounding LLM outputs in structured graph data?
3. How to handle hallucinations when LLMs generate graph edges?
4. Can LLMs help discover implicit relationships not captured in explicit arrows?

---

## References & Related Work

### Areas to Explore

1. **Graph Theory**
   - Graph databases (Neo4j, JanusGraph)
   - Graph algorithms (NetworkX, Boost Graph Library)
   - Graph neural networks

2. **Distributed Systems**
   - CRDTs for distributed state
   - Event sourcing
   - P2P protocols

3. **Information Theory**
   - Compression algorithms
   - Kolmogorov complexity
   - Information bottleneck theory

4. **AI/ML**
   - Vector databases for semantic search
   - Knowledge graphs
   - Decision theory for AI agents

---

## Next Steps

1. [ ] Review this document with domain experts
2. [ ] Prioritize questions based on feedback
3. [ ] Conduct literature review on identified topics
4. [ ] Develop research prototypes for highest-priority problems
5. [ ] Iterate based on findings

---

**Document Version**: 1.0  
**Author**: Statuz Team  
**Last Updated**: 2026-06-16  
**For**: Expert Consultation