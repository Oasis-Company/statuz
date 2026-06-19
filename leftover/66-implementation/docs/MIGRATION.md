# Migration Guide: From niche to 66

> **Status:** Planning Document  
> **Version:** 0.1.0-draft  
> **Last Updated:** 2026-06-06

---

## What Changes?

The 66 layer does not replace niche. It **extends** it.

However, some concepts from niche will be reinterpreted through the topological lens:

| niche Concept | 66 Equivalent | Change |
|---------------|---------------|--------|
| `declared_position.does` | Node properties + outgoing arrows | More explicit relationships |
| `declared_position.does_not` | Missing arrows (negative topology) | Explicitly modeled as gaps |
| `relations.agent_graph` | Full Arrow Map | Formalized and enriched |
| `signals` | Arrow metadata + detector events | Signals become arrow discovery triggers |
| `assessments` | Arrow confidence scoring | Automated relevance assessment |
| `calibrations` | Topology drift detection | Detected via arrow comparison |
| `syn` | Invariant violations + escalation | SYN triggered by topological anomalies |

---

## Migration Path

### Step 1: Arrow Map Initialization (Zero Breaking Changes)

Existing projects continue to work unchanged. The Arrow Map is optional.

```bash
# Initialize Arrow Map for an existing project
statuz arrow-map init --from-niche
```

This command:
1. Reads existing `.statuz/niche/manifest.yaml`
2. Converts `declared_position` into StatuNodes
3. Converts `relations.agent_graph` into Arrows
4. Creates a new Arrow Map in the local registry (`~/.statuz/maps/`)
5. Adds an `arrow_map` reference to `.statuz/statuz.yaml`

### Step 2: Detector Bootstrapping

Run the Detector to discover arrows that niche did not capture:

```bash
statuz arrow-map detect --interactive
```

### Step 3: Gradual Enrichment

Over time, the Arrow Map becomes more complete:

- Week 1: Basic dependencies from package.json
- Week 2: Information flows from API definitions
- Week 3: Responsibility chains from code review data
- Week 4: Resource transfers from infrastructure configs

### Step 4: Runtime Integration

Once the Arrow Map is mature, enable runtime features:

```yaml
# .statuz/statuz.yaml
arrow_map:
  enabled: true
  map_id: "niche:microservice-backend-v1"
  instance_id: "my-project-backend"
```

---

## Backward Compatibility

| Feature | niche (1.0) | 66 (0.1.0) | Compatibility |
|---------|-------------|------------|---------------|
| `statuz.yaml` | ✅ Required | ✅ Unchanged | Full |
| `niche/manifest.yaml` | ✅ Required | ✅ Unchanged | Full |
| `niche/signals/` | ✅ Required | ✅ Unchanged | Full |
| Arrow Map registry | ❌ N/A | 🆕 Optional | Additive |
| `arrow_map` ref in statuz.yaml | ❌ N/A | 🆕 Optional | Additive |
| `arrow-map detect` | ❌ N/A | 🆕 New CLI | Additive |
| `relations.agent_graph` | ✅ Exists | 🔄 Enriched | Enhanced |

**No breaking changes.** Projects can adopt 66 at their own pace.

---

## Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| Phase 0 | Now | Schema design and documentation (this folder) |
| Phase 1 | 2 weeks | CLI commands: `arrow-map init`, `arrow-map validate` |
| Phase 2 | 4 weeks | Detector: manual mode |
| Phase 3 | 6 weeks | Detector: automatic mode |
| Phase 4 | 8 weeks | VS Code Extension: Arrow Map viewer |
| Phase 5 | 12 weeks | Runtime engine: dependency propagation |
| Phase 6 | 16 weeks | Niche Genome: shared map registry |

---

## References

- [66 Manifesto](../66%20Manifesto.md)
- [66 Overview](66-OVERVIEW.md)
- [NICHE_MANIFEST.md](../docs/NICHE_MANIFEST.md)
- [ROADMAP.md](../ROADMAP.md)
