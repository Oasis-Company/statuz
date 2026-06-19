# Phase 0.1 Known Issues & Hard Problems

This document captures the significant limitations and challenges identified during Phase 0.1 implementation that require more sophisticated solutions.

---

## Issue 1: Cross-Map Arrow Inference

### Problem Statement
The current implementation can only infer cross-project dependencies based on simplistic name pattern matching (e.g., detecting "backend" or "api" in map names). This approach is fragile and cannot handle complex project relationships.

### Current Behavior
- Only generates arrows when a project is typed as "frontend" and another map contains "backend" or "api" in its ID
- Does not analyze actual code imports or package dependencies
- Cannot infer relationships like `dashboard → auth-service` or `payment-processor → notification-service`

### Desired Behavior
- Analyze actual import statements and package.json dependencies to infer real relationships
- Support monorepo workspace analysis to understand project boundaries
- Generate meaningful arrow types and descriptions based on actual code usage

### Known Challenges
- Cross-project import analysis requires understanding path aliases and module resolution
- Determining arrow direction (consumer vs producer) from static code analysis
- Handling indirect dependencies through shared libraries

### Proposed Approaches
1. Parse TypeScript/JavaScript import statements and map to project names
2. Build a dependency graph from monorepo workspace configuration
3. Use LLM to analyze import patterns and suggest relationship types

---

## Issue 2: Niche Positioning Generation

### Problem Statement
The niche.yaml content is generated using static templates based only on project type (frontend/backend). This produces generic, uninformative positioning statements.

### Current Behavior
- Frontend: "Renders UI and handles user interaction", "Makes API calls to backend services"
- Backend: "Provides RESTful APIs", "Handles database operations"
- Does not reflect actual business purpose or unique value

### Desired Behavior
- Extract meaningful positioning from README, package.json description, or code comments
- Generate unique "does" and "does not" statements based on actual project characteristics
- Infer technical stack and architectural patterns from code

### Known Challenges
- Natural language understanding to extract key business capabilities
- Distinguishing implementation details from core purpose
- Generating concise, meaningful "does not" statements

### Proposed Approaches
1. Parse README.md for project description and features
2. Analyze keyword frequency in documentation and comments
3. Use LLM to summarize project purpose from available text sources

---

## Issue 3: Proposal Deduplication & Change Tracking

### Problem Statement
The SYN proposal system creates a new proposal file on every `agent discover` run, even if the project has not changed. There is no mechanism to detect duplicate proposals or track incremental changes.

### Current Behavior
- Each discover operation generates a new PROP-xxx.yaml file
- No deduplication of identical proposals
- Cluster maps are not updated when re-discovering an already-tracked project
- No diff visualization between proposal versions

### Desired Behavior
- Detect when a project's status has not changed since last proposal
- Generate content hashes to skip duplicate proposals
- Support update mode to refresh existing map entries in cluster
- Show change diffs when proposing updates

### Known Challenges
- Defining what constitutes a "meaningful change" in project state
- Handling version increments and migration paths
- Maintaining proposal history and audit trail

### Proposed Approaches
1. Generate SHA-256 hash of proposal content for deduplication
2. Compare against existing approved maps before creating new proposals
3. Add version tracking to cluster maps

---

## Issue 4: Cluster ID Validation Restrictions

### Problem Statement
The cluster init command requires IDs in `scope:name` format, which is unnecessarily restrictive for simple use cases and testing.

### Current Behavior
- Cluster ID must match `^[a-z]+:[a-z]+$` pattern
- Simple IDs like "taskflow" or "my-project" are rejected
- Error message suggests specific format without clear rationale

### Desired Behavior
- Support simpler ID formats for local development and testing
- Maintain the scope:name format for production/enterprise use
- Provide clearer error messaging with examples

### Proposed Approaches
1. Relax validation to allow single-word IDs for local use
2. Document the scope:name pattern as a best practice rather than a strict requirement

---

## Priority Ranking

1. **High**: Issue 3 (Proposal Deduplication) - Prevents proposal spam
2. **High**: Issue 1 (Cross-Map Arrows) - Core to Arrow Map vision
3. **Medium**: Issue 2 (Niche Positioning) - Improves documentation quality
4. **Low**: Issue 4 (Cluster ID Validation) - Quality of life improvement

---

## Notes for Future Implementation

These issues are intentionally left unresolved in Phase 0.1 to deliver a working end-to-end flow. They represent opportunities for:
- Integration with AI/LLM services for more intelligent analysis
- Advanced static code analysis techniques
- Improved developer experience through better tooling