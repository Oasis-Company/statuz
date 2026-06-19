# 66 Implementation — Verification Checklist

> Use this checklist to verify the 66 layer implementation before committing or merging.
> Each item maps to a specific file or behavior. Check every box.

---

## 1. Schema Integrity

### 1.1 Arrow Schema (`spec/arrow.schema.json`)

- [ ] `$id` is set to `https://statuz.org/schemas/66/arrow.schema.json`
- [ ] `id`, `source`, `target`, `type` are in `required`
- [ ] `type` enum has exactly 7 values: `dependency`, `information_flow`, `responsibility`, `validation`, `resource_transfer`, `influence`, `constraint`
- [ ] `properties.criticality` enum has exactly 4 values: `critical`, `high`, `medium`, `low`
- [ ] `properties.weight` is number with `minimum: 0`, `maximum: 1`
- [ ] `type_properties` uses `oneOf` with a branch for each arrow type
- [ ] `temporal.effective_from` and `effective_until` use `format: "date-time"`
- [ ] `metadata.discovery_method` enum has exactly 4 values: `manual`, `inferred`, `detected`, `imported`
- [ ] `additionalProperties: false` is set at root level
- [ ] No syntax errors (valid JSON)

### 1.2 StatuNode Schema (`spec/statu-node.schema.json`)

- [ ] `$id` is set to `https://statuz.org/schemas/66/statu-node.schema.json`
- [ ] `id` and `type` are in `required`
- [ ] `type` field is a plain `string` (NOT an enum) — extensibility is enabled
- [ ] `type` description mentions `domain:type` pattern for custom types
- [ ] `properties` field allows `additionalProperties: true` — custom types can define any properties
- [ ] `status` enum has exactly 4 values: `active`, `inactive`, `deprecated`, `planned`
- [ ] `additionalProperties: false` is set at root level
- [ ] No syntax errors (valid JSON)

### 1.3 Arrow Map Schema (`spec/arrow-map.schema.json`)

- [ ] `$id` is set to `https://statuz.org/schemas/66/arrow-map.schema.json`
- [ ] `arrow_map_version`, `id`, `nodes`, `arrows` are in `required`
- [ ] `arrow_map_version` uses `const: "0.1.0"`
- [ ] `nodes` items `$ref` uses **relative path** (`statu-node.schema.json`), NOT remote URL
- [ ] `arrows` items `$ref` uses **relative path** (`arrow.schema.json`), NOT remote URL
- [ ] `storage` field exists with `canonical_path`, `registry`, `local_cache`
- [ ] `invariants` array exists with `description`, `expression`, `severity`
- [ ] `templates` array exists with `name`, `description`, `default`, `required`
- [ ] `extends` array exists with `map_id`, `version`, `override`
- [ ] `status` enum: `draft`, `experimental`, `stable`, `deprecated`, `archived`
- [ ] `additionalProperties: false` is set at root level
- [ ] No syntax errors (valid JSON)

---

## 2. Example YAML Compliance

### 2.1 Arrow Example (`examples/arrow-example.yaml`)

- [ ] Has `id`, `source`, `target`, `type` (required fields)
- [ ] `type` value is one of the 7 valid enum values
- [ ] `properties.criticality` is one of the 4 valid values
- [ ] `properties.weight` is between 0.0 and 1.0
- [ ] `temporal.effective_from` is ISO 8601 format
- [ ] `metadata.discovery_method` is one of the 4 valid values
- [ ] Parses as valid YAML (no syntax errors)

### 2.2 StatuNode Example (`examples/statu-node-example.yaml`)

- [ ] Has `id` and `type` (required fields)
- [ ] `type` is one of the 7 built-in values
- [ ] `status` is one of the 4 valid values
- [ ] `properties` match the node type (component → technology, interface_type)
- [ ] Parses as valid YAML

### 2.3 Arrow Map Example (`examples/arrow-map-example.yaml`)

- [ ] Has `arrow_map_version: "0.1.0"`, `id`, `nodes`, `arrows` (required fields)
- [ ] `nodes` array has at least 1 node
- [ ] Every node has `id` and `type`
- [ ] Every arrow has `id`, `source`, `target`, `type`
- [ ] Every arrow `source` and `target` reference an existing node `id`
- [ ] `storage` field is present (project-independent design)
- [ ] `invariants` array is present
- [ ] `templates` array is present
- [ ] `version` and `status` fields are present
- [ ] Parses as valid YAML

### 2.4 Project Reference (`examples/project-reference.yaml`)

- [ ] Demonstrates `arrow_map` reference (NOT an Arrow Map itself)
- [ ] Has `map_id`, `version`, `instance_id`
- [ ] Has `registry` field (project-independent storage)
- [ ] Has `parameters` for template instantiation
- [ ] Has `extensions` for project-specific nodes/arrows
- [ ] Parses as valid YAML

### 2.5 Custom Node Types (`examples/custom-node-types.yaml`)

- [ ] Has `arrow_map_version: "0.1.0"`, `id`, `nodes`, `arrows` (required fields)
- [ ] Contains at least one custom type with `domain:type` pattern (e.g., `microservice:service`)
- [ ] Custom type nodes have custom `properties` that don't match built-in schemas
- [ ] Built-in type nodes still have correct properties
- [ ] `version` and `status` fields are present
- [ ] Parses as valid YAML

---

## 3. Documentation Consistency

### 3.1 66-OVERVIEW.md

- [ ] Describes **four layers** (not three): Project Files → Core → niche → 66
- [ ] Decision 1 states Arrow Maps are **project-independent** (stored in registry)
- [ ] Decision 2 states StatuNode types are **extensible** (`domain:type` pattern)
- [ ] Decision 3 states Arrows are **typed and executable**
- [ ] Decision 4 states **discovery before management**
- [ ] Decision 5 states **minimal disclosure**
- [ ] Open Questions section marks answered questions with ✅
- [ ] Integration section uses registry references, NOT `.statuz/arrow-map.yaml`
- [ ] No mentions of Arrow Maps being stored inside project directories

### 3.2 DETECTOR.md

- [ ] 6 core questions are listed: depends-on, depends-on-reverse, value-source, value-sink, validator, missing-arrow
- [ ] 3 detection modes: Manual (interactive), Automatic (heuristic), Inference (topological)
- [ ] Confidence thresholds table: 0.9-1.0 auto, 0.7-0.89 suggest, 0.4-0.69 propose, 0.0-0.39 flag
- [ ] 66 Integration section says Detector writes to **registry/local cache**, NOT `.statuz/arrow-map.yaml`
- [ ] CLI commands section lists: `detect --interactive`, `detect --auto`, `review`, `approve`, `reject`, `detect --watch`

### 3.3 MIGRATION.md

- [ ] States 66 **extends** niche, does not replace it
- [ ] `statuz arrow-map init --from-niche` creates map in **registry** (`~/.statuz/maps/`), NOT in project
- [ ] Backward compatibility table shows **zero breaking changes**
- [ ] Table does NOT list `arrow-map.yaml` as a file (it's registry-based)
- [ ] Timeline is present with phases

### 3.4 README.md (project root)

- [ ] No merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] 🔮 66 (Arrow Maps) section is present
- [ ] Section says "This is not an incremental update. It is a new layer."
- [ ] Links to `66-implementation/` folder

### 3.5 66-implementation/README.md

- [ ] Four-layer architecture diagram is present (not three)
- [ ] "The Long Path" section lists 6 stages
- [ ] Reading order is provided
- [ ] Links to all spec files, docs, and examples

---

## 4. Cross-Cutting Design Principles

### 4.1 Project Independence

- [ ] No document says Arrow Maps are stored in `.statuz/arrow-map.yaml`
- [ ] Arrow Map Schema has `storage` field with `registry` and `local_cache`
- [ ] Project reference example shows `arrow_map.map_id` + `arrow_map.registry`
- [ ] Detector writes to registry, not project directory
- [ ] Migration guide creates maps in `~/.statuz/maps/`

### 4.2 Extensibility

- [ ] StatuNode Schema `type` field is NOT an enum (plain string)
- [ ] StatuNode Schema `properties` allows `additionalProperties: true`
- [ ] Custom node types example uses `domain:type` pattern
- [ ] At least 3 different custom types demonstrated in examples

### 4.3 New Abstraction Layer

- [ ] 66 is described as a layer **above** niche and Core (not replacing)
- [ ] Four-layer model: Project Files → Core → niche → 66
- [ ] Each layer abstracts the one below it
- [ ] 66 "sees niche and Core from above" as nodes in a topology

---

## 5. Code Implementation (Post-PLAN.md Execution)

### 5.1 Dependencies

- [ ] `ajv` is in `packages/cli/package.json` dependencies
- [ ] `ajv-formats` is in `packages/cli/package.json` dependencies
- [ ] `yaml` is in `packages/cli/package.json` dependencies
- [ ] `npm install` completes without errors

### 5.2 TypeScript Types (`packages/cli/src/arrow-map/types.ts`)

- [ ] `Arrow` interface matches JSON Schema (all fields present)
- [ ] `StatuNode` interface matches JSON Schema
- [ ] `ArrowMap` interface matches JSON Schema
- [ ] `Arrow.type` is a union of exactly 7 string literals
- [ ] `StatuNode.type` is `string` (NOT a union — extensibility)
- [ ] `metadata.discovery_method` is a union of 4 string literals

### 5.3 Validation (`packages/cli/src/arrow-map/validate.ts`)

- [ ] Loads all 3 JSON Schemas from `66-implementation/spec/`
- [ ] Uses `ajv` with `allErrors: true`
- [ ] `validateArrowMapYaml()` returns `{ valid, errors?, data? }`
- [ ] `validateArrowMapFile()` reads file then calls `validateArrowMapYaml()`
- [ ] Error messages include instance path and message

### 5.4 CLI Command (`packages/cli/src/arrow-map/command.ts`)

- [ ] `statuz arrow-map init` registered
- [ ] `statuz arrow-map validate <file>` registered
- [ ] `statuz arrow-map detect` registered
- [ ] `--from-niche` option on `init`
- [ ] `--template` option on `init`
- [ ] `--interactive` option on `detect`
- [ ] `--auto` option on `detect`
- [ ] `--confidence-threshold` option on `detect`

### 5.5 Init (`packages/cli/src/arrow-map/init.ts`)

- [ ] Creates blank map when no options provided
- [ ] `--from-niche` reads `.statuz/niche/manifest.yaml` and converts to Arrow Map
- [ ] `--template` reads from `~/.statuz/maps/` registry
- [ ] Output is valid YAML that passes schema validation
- [ ] Generated map has `storage.local_cache` field

### 5.6 Manual Detector (`packages/cli/src/detector/manual.ts`)

- [ ] Asks all 6 core questions
- [ ] Each answer generates correct Arrow type
- [ ] Generated arrows have `confidence: 1.0` and `discovery_method: "manual"`
- [ ] Outputs discovered arrow count and list

### 5.7 Auto Detector (`packages/cli/src/detector/auto.ts`)

- [ ] Scans `package.json` for dependencies (confidence: 0.9)
- [ ] Scans `docker-compose.yml` for `depends_on` (confidence: 0.95)
- [ ] Scans source files for imports (confidence: 0.8)
- [ ] Filters by confidence threshold
- [ ] Reports total candidates vs. above-threshold count

### 5.8 Inference (`packages/cli/src/detector/infer.ts`)

- [ ] Transitive: A→B, B→C suggests A→C (confidence: 0.6)
- [ ] Symmetry: A validates B suggests B informs A (confidence: 0.5)
- [ ] Completeness: nodes with no incoming arrows flagged (confidence: 0.3)
- [ ] Does not suggest arrows that already exist

### 5.9 Tests

- [ ] `tests/arrow-map/validate.test.ts` — all example YAMLs pass validation
- [ ] `tests/arrow-map/validate.test.ts` — invalid YAMLs fail with correct error messages
- [ ] `tests/arrow-map/init.test.ts` — blank init creates valid map
- [ ] `tests/detector/manual.test.ts` — mock readline produces correct arrows
- [ ] `tests/detector/auto.test.ts` — mock fs produces correct dependency arrows
- [ ] All tests pass: `npx jest tests/`

---

## 6. Git Hygiene

- [ ] All new files are committed
- [ ] No merge conflict markers in any file
- [ ] Commit messages use English
- [ ] Commit messages follow conventional format: `feat(66):`, `test(66):`, `fix(66):`
- [ ] No staged but uncommitted changes
- [ ] No `node_modules/` or build artifacts committed

---

## 7. Final Smoke Test

- [ ] `statuz arrow-map validate 66-implementation/examples/arrow-map-example.yaml` → ✅ Valid
- [ ] `statuz arrow-map validate 66-implementation/examples/custom-node-types.yaml` → ✅ Valid
- [ ] `statuz arrow-map init --output /tmp/test-map.yaml` → creates file, passes validation
- [ ] `statuz arrow-map detect --auto --confidence-threshold 0.7` → scans and reports arrows
- [ ] `npx jest tests/` → all tests pass
- [ ] `npm run build` (if applicable) → compiles without errors

---

> **Total items: 120**
> 
> Minimum pass rate for merge: **100%**
