# ADR 0005: Schema Versioning Strategy

**Status:** Accepted  
**Date:** 2026-05-30  
**Authors:** Statuz Core Team

---

## Context

As Statuz niche schemas evolve, we need a clear versioning strategy to:
1. Maintain backward compatibility
2. Communicate breaking changes clearly
3. Enable schema validation across versions

---

## Decision

We will use **Semantic Versioning (SemVer)** for all Statuz niche schemas:

- **MAJOR** version: Breaking changes (e.g., removing required fields, changing field types)
- **MINOR** version: Non-breaking additions (e.g., adding optional fields)
- **PATCH** version: Bug fixes and clarifications (no schema change)

### Version Format

All schemas include:
1. A `version` field in the document (e.g., `niche_version: "1.0"`)
2. A `$id` in the schema that includes the version (e.g., `.../niche-manifest.schema.json`)

### Schema Compatibility

| Change Type | Example | Version Bump |
|-------------|---------|--------------|
| Breaking | Remove required field | MAJOR |
| Breaking | Change field type | MAJOR |
| Breaking | Change field meaning | MAJOR |
| Non-breaking | Add optional field | MINOR |
| Non-breaking | Add new enum value | MINOR |
| Non-breaking | Relax constraints | MINOR |
| Non-breaking | Add documentation | PATCH |
| Non-breaking | Fix typos | PATCH |

### Document Version vs Schema Version

- **Document version**: Stored in the YAML file (e.g., `niche_version: "1.0"`)
- **Schema version**: Part of the schema `$id` and used to validate documents

Documents declare their version; schemas enforce compatibility.

---

## Consequences

### Positive

- Clear communication of changes
- Predictable migration paths
- Easy to determine compatibility
- Widely understood pattern

### Negative

- Schema evolution is slower (can't make breaking changes easily)
- Multiple schema versions must be maintained

---

## Implementation

### Schema File Naming

```
niche-manifest.schema.json    # Latest stable
niche-manifest.v1.schema.json # Versioned copy (optional)
```

### Document Version Declaration

Each niche document MUST declare its version:

```yaml
niche_version: "1.0"        # Manifest
signal_version: "1.0"        # Signal
assessment_version: "1.0"    # Assessment
```

### Validation Strategy

1. Load the appropriate schema based on document version
2. Validate document against schema
3. Report version mismatch warnings

---

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [JSON Schema Versioning Considerations](https://json-schema.org/understanding-json-schema/basic.html)
