# ADR 0001: Statuz is status, not memory

Date: 2026-05-27  
Status: Accepted

## Context

Many AI systems already use memory systems: vector databases, knowledge graphs, memory MCP servers, transcript stores, and user preference stores.

The original Statuz insight is different: an AI may have access to knowledge but still lose track of its current operational state.

## Decision

Statuz will define itself as an **AI Agent Runtime Status Protocol**, not as an AI memory framework.

## Consequences

Statuz should stay compact. It should store current state, task phase, progress, relations, and next action.

Statuz may reference memory systems, but it does not replace them.

Future implementations may integrate with memory backends, MCP servers, and skills, but the protocol core remains status-oriented.
