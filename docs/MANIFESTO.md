# The Statuz Manifesto

AI agents are becoming more capable, but they remain strangely disoriented.

They can write code, search the web, call tools, run tests, generate documents, and coordinate workflows. Yet after a context reset, an interruption, a model switch, or a task handoff, they often fail to answer the most basic operational question:

> What was I doing?

This is not only a memory problem. It is a **status problem**.

## Memory is not enough

A memory system can store the past. But the agent also needs a compact, current, operational view of the present.

It needs to know:

- I am this agent;
- I serve this user or project;
- I am in this phase of work;
- I have completed these steps;
- I am blocked by this issue;
- I should ask this other agent for help;
- I should not violate these boundaries;
- my next useful action is this.

This is the missing runtime layer.

## The present deserves a protocol

Developers already have files that describe dependencies, packages, environments, tasks, and builds.

AI projects need a file that describes agent status.

Statuz is that file.

## Small enough to survive

A status protocol should be small enough to read at session start, simple enough to be written by humans, and structured enough to be used by machines.

Statuz should not require a database. It should not require a cloud service. It should begin as a file, then grow into SDKs, MCP servers, dashboards, and shared runtime infrastructure.

## The principle

> Memory lets an AI remember the past. Statuz lets an AI understand its present.
