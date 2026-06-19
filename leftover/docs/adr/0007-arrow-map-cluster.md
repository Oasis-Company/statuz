# ADR 0007: Arrow Map Cluster for Organization-Level Ecosystem

## Status

Accepted

## Context

Statuz's Arrow Maps describe project-level topologies — how nodes within a single project connect. However, organizations need to understand relationships across multiple projects:

- "Which project owns authentication?"
- "What services depend on the shared logging infrastructure?"
- "How does MuseRock connect to Statuz?"

The current Arrow Map design cannot express cross-project relationships. Each Arrow Map is isolated, making it impossible to query the "company universe ecosystem."

## Decision

We introduce **Arrow Map Cluster** — a new concept that aggregates multiple Arrow Maps into an organization-level topology.

**Key features:**

1. **Maps aggregation** — A cluster references multiple Arrow Maps by ID and version
2. **Cross-map arrows** — Arrows with `from_map`/`to_map` fields connecting nodes across projects
3. **Wildcard support** — `from_map: "*"` enables organization-wide patterns (e.g., "all projects depend on shared logging")
4. **Description required** — Every cross-map arrow must explain why the relationship exists

**Schema location:** `66-implementation/spec/arrow-map-cluster.schema.json`

**Example structure:**

```yaml
cluster_version: "1.0.0"
id: "oasis:company-atlas"
name: "Oasis Company Ecosystem Atlas"
maps:
  - map_id: "statuz:core-system"
    version: "1.0.0"
    scope: "internal"
    alias: "statuz"
cross_map_arrows:
  - id: "muserock→statuz-sdk"
    from_map: "muserock"
    from_node: "creative-state-agent"
    to_map: "statuz"
    to_node: "sdk-ts"
    type: "dependency"
    description: "MuseRock's creative-state-agent uses Statuz SDK-TS as the state layer"
```

## Consequences

### Positive

- Agents can query the cluster to find "who owns X" across all projects
- Organization-wide patterns (like shared infrastructure dependencies) can be expressed with wildcards
- New team members can understand company architecture from a single cluster view
- Enables "global niche awareness" at the organization level

### Negative

- Adds a new layer of complexity (Layer 4.1 in SPEC.md)
- Requires cluster maintenance as projects evolve
- Cross-map arrows may become stale if referenced Arrow Maps change

### Mitigation

- Arrow Map Cluster is optional — projects can use Arrow Maps without clusters
- Cluster validation checks that referenced maps exist and are valid
- Cross-map arrows go through the same Arrow Proposal workflow as regular arrows

## Implementation

- Schema: `66-implementation/spec/arrow-map-cluster.schema.json`
- SDK: `packages/sdk-ts/src/arrow-map/cluster.ts` — ArrowMapClusterIO class
- Example: `66-implementation/examples/arrow-map-cluster-example.yaml`
- Documentation: SPEC.md Layer 4.1

## Related

- ADR 0004: Core-Niche Separation (niche = single-project boundary, Arrow Map = cross-project topology)
- SPEC.md Layer 4: Arrow Maps
- 66-OVERVIEW.md Section 3: Arrow Map design principles