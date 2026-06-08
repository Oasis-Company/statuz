# 66 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 66 layer from design documents to working CLI — starting with Schema validation tests, then a minimal Arrow Map CLI, then the Detector discovery engine.

**Architecture:** The 66 layer is a new topological abstraction above Core and niche. It consists of three JSON Schemas (Arrow, StatuNode, Arrow Map), a CLI for map management, and a Detector for automatic arrow discovery. All code lives in `packages/cli/src/arrow-map/` and `packages/cli/src/detector/`.

**Tech Stack:** TypeScript, Node.js, `ajv` for JSON Schema validation, `yaml` for YAML parsing, existing `@statuz/cli` infrastructure.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/cli/src/arrow-map/validate.ts` | Validate Arrow Map YAML against JSON Schema |
| `packages/cli/src/arrow-map/init.ts` | Create a new Arrow Map from niche manifest or scratch |
| `packages/cli/src/arrow-map/detect.ts` | Run the Detector to discover arrows |
| `packages/cli/src/detector/manual.ts` | Interactive mode: ask user 6 core questions |
| `packages/cli/src/detector/auto.ts` | Automatic mode: scan project files for structural clues |
| `packages/cli/src/detector/infer.ts` | Topological inference: transitive, symmetry, completeness |
| `packages/cli/src/arrow-map/types.ts` | TypeScript types generated from JSON Schemas |
| `tests/arrow-map/validate.test.ts` | Test: schema validation for all example YAMLs |
| `tests/arrow-map/init.test.ts` | Test: `arrow-map init` creates valid maps |
| `tests/detector/manual.test.ts` | Test: interactive detector generates correct arrows |

---

## Phase E: Schema Validation Tests

### Task E1: Install `ajv` and `yaml` dependencies

**Files:**
- Modify: `packages/cli/package.json`

- [ ] **Step 1: Add dependencies**

```json
{
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "yaml": "^2.3.4"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd packages/cli && npm install`
Expected: `ajv`, `ajv-formats`, `yaml` added to `node_modules/`

- [ ] **Step 3: Commit**

```bash
git add packages/cli/package.json packages/cli/package-lock.json
git commit -m "deps(cli): add ajv and yaml for 66 schema validation"
```

---

### Task E2: Create TypeScript types from JSON Schemas

**Files:**
- Create: `packages/cli/src/arrow-map/types.ts`

- [ ] **Step 1: Define Arrow type**

```typescript
export interface Arrow {
  id: string;
  source: string;
  target: string;
  type: 'dependency' | 'information_flow' | 'responsibility' | 'validation' | 'resource_transfer' | 'influence' | 'constraint';
  description?: string;
  properties?: {
    reason?: string;
    criticality?: 'critical' | 'high' | 'medium' | 'low';
    weight?: number;
  };
  type_properties?: Record<string, unknown>;
  temporal?: {
    effective_from?: string;
    effective_until?: string;
  };
  tags?: string[];
  metadata?: {
    discovered_at?: string;
    confidence?: number;
    detector_id?: string;
    discovery_method?: 'manual' | 'inferred' | 'detected' | 'imported';
  };
}
```

- [ ] **Step 2: Define StatuNode type**

```typescript
export interface StatuNode {
  id: string;
  type: string; // extensible: built-in or custom domain:type
  name?: string;
  description?: string;
  properties?: Record<string, unknown>;
  labels?: string[];
  tags?: string[];
  status?: 'active' | 'inactive' | 'deprecated' | 'planned';
  metadata?: {
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    source?: string;
  };
}
```

- [ ] **Step 3: Define ArrowMap type**

```typescript
export interface ArrowMap {
  arrow_map_version: '0.1.0';
  id: string;
  name?: string;
  description?: string;
  niche_category?: string;
  version?: string;
  status?: 'draft' | 'experimental' | 'stable' | 'deprecated' | 'archived';
  nodes: StatuNode[];
  arrows: Arrow[];
  namespaces?: Record<string, string>;
  invariants?: Array<{
    description: string;
    expression?: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  templates?: Array<{
    name: string;
    description: string;
    default?: unknown;
    required?: boolean;
  }>;
  extends?: Array<{
    map_id: string;
    version?: string;
    override?: boolean;
  }>;
  storage?: {
    canonical_path?: string;
    registry?: string;
    local_cache?: string;
  };
  metadata?: {
    created_at?: string;
    updated_at?: string;
    author?: string;
    organization?: string;
    license?: string;
    source_url?: string;
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/arrow-map/types.ts
git commit -m "feat(arrow-map): add TypeScript types for Arrow, StatuNode, ArrowMap"
```

---

### Task E3: Write schema validation utility

**Files:**
- Create: `packages/cli/src/arrow-map/validate.ts`

- [ ] **Step 1: Create validator with Ajv**

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { ArrowMap } from './types';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Load schemas
const arrowSchema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../../66-implementation/spec/arrow.schema.json'), 'utf8'
));
const statuNodeSchema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../../66-implementation/spec/statu-node.schema.json'), 'utf8'
));
const arrowMapSchema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../../66-implementation/spec/arrow-map.schema.json'), 'utf8'
));

// Register schemas
ajv.addSchema(arrowSchema, 'arrow.schema.json');
ajv.addSchema(statuNodeSchema, 'statu-node.schema.json');

const validateArrowMap = ajv.compile(arrowMapSchema);

export function validateArrowMapYaml(yamlContent: string): { valid: boolean; errors?: string[]; data?: ArrowMap } {
  const data = yaml.parse(yamlContent) as ArrowMap;
  const valid = validateArrowMap(data);
  
  if (!valid) {
    const errors = validateArrowMap.errors?.map(e => 
      `${e.instancePath || 'root'}: ${e.message}`
    ) || ['Unknown validation error'];
    return { valid: false, errors };
  }
  
  return { valid: true, data };
}

export function validateArrowMapFile(filePath: string): { valid: boolean; errors?: string[]; data?: ArrowMap } {
  const content = fs.readFileSync(filePath, 'utf8');
  return validateArrowMapYaml(content);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/arrow-map/validate.ts
git commit -m "feat(arrow-map): add schema validation utility with Ajv"
```

---

### Task E4: Write validation tests

**Files:**
- Create: `tests/arrow-map/validate.test.ts`

- [ ] **Step 1: Test valid examples pass validation**

```typescript
import { validateArrowMapFile } from '../../packages/cli/src/arrow-map/validate';
import * as path from 'path';

describe('Arrow Map Validation', () => {
  const examplesDir = path.join(__dirname, '../../66-implementation/examples');

  test('arrow-map-example.yaml should be valid', () => {
    const result = validateArrowMapFile(path.join(examplesDir, 'arrow-map-example.yaml'));
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.nodes.length).toBe(9);
    expect(result.data!.arrows.length).toBe(10);
  });

  test('custom-node-types.yaml should be valid', () => {
    const result = validateArrowMapFile(path.join(examplesDir, 'custom-node-types.yaml'));
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.nodes.some(n => n.type === 'microservice:service')).toBe(true);
    expect(result.data!.nodes.some(n => n.type === 'k8s:deployment')).toBe(true);
  });

  test('arrow-example.yaml should be valid as Arrow', () => {
    // arrow-example.yaml is a single Arrow, not an Arrow Map
    // This test verifies we can validate it against the Arrow schema
    const fs = require('fs');
    const yaml = require('yaml');
    const content = fs.readFileSync(path.join(examplesDir, 'arrow-example.yaml'), 'utf8');
    const arrow = yaml.parse(content);
    
    expect(arrow.id).toBe('arrow-auth-dep');
    expect(arrow.type).toBe('dependency');
    expect(arrow.source).toBe('api-gateway');
    expect(arrow.target).toBe('auth-service');
  });

  test('statu-node-example.yaml should be valid as StatuNode', () => {
    const fs = require('fs');
    const yaml = require('yaml');
    const content = fs.readFileSync(path.join(examplesDir, 'statu-node-example.yaml'), 'utf8');
    const node = yaml.parse(content);
    
    expect(node.id).toBe('auth-service');
    expect(node.type).toBe('component');
    expect(node.properties.technology).toBe('Node.js / Express');
  });
});
```

- [ ] **Step 2: Test invalid examples fail validation**

```typescript
describe('Arrow Map Validation - Invalid Cases', () => {
  test('missing required field should fail', () => {
    const { validateArrowMapYaml } = require('../../packages/cli/src/arrow-map/validate');
    const invalidYaml = `
      arrow_map_version: "0.1.0"
      # missing 'id' and 'nodes'
      arrows: []
    `;
    const result = validateArrowMapYaml(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('id'))).toBe(true);
  });

  test('invalid arrow type should fail', () => {
    const { validateArrowMapYaml } = require('../../packages/cli/src/arrow-map/validate');
    const invalidYaml = `
      arrow_map_version: "0.1.0"
      id: "test"
      nodes:
        - id: "a"
          type: "component"
      arrows:
        - id: "bad-arrow"
          source: "a"
          target: "a"
          type: "invalid_type"
    `;
    const result = validateArrowMapYaml(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.errors!.some(e => e.includes('type'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd packages/cli && npx jest tests/arrow-map/validate.test.ts`
Expected: All 6 tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/arrow-map/validate.test.ts
git commit -m "test(arrow-map): add schema validation tests for all examples"
```

---

## Phase A: CLI MVP

### Task A1: Add `arrow-map` command to CLI

**Files:**
- Modify: `packages/cli/src/index.ts` (or existing CLI entry point)

- [ ] **Step 1: Register arrow-map subcommand**

Find the existing CLI command registration (likely using `commander` or similar). Add:

```typescript
import { arrowMapCommand } from './arrow-map/command';

// In your CLI setup:
program.addCommand(arrowMapCommand);
```

- [ ] **Step 2: Create command definition**

Create: `packages/cli/src/arrow-map/command.ts`

```typescript
import { Command } from 'commander';
import { initArrowMap } from './init';
import { validateArrowMapFile } from './validate';
import { detectArrows } from './detect';

export const arrowMapCommand = new Command('arrow-map')
  .description('Manage Arrow Maps — the 66 topological layer')
  .addCommand(new Command('init')
    .description('Create a new Arrow Map')
    .option('--from-niche', 'Initialize from existing niche manifest')
    .option('--template <template>', 'Use a template map as starting point')
    .option('--output <path>', 'Output file path', './arrow-map.yaml')
    .action(initArrowMap))
  .addCommand(new Command('validate')
    .description('Validate an Arrow Map YAML file')
    .argument('<file>', 'Path to Arrow Map YAML file')
    .action((file: string) => {
      const result = validateArrowMapFile(file);
      if (result.valid) {
        console.log(`✅ Valid Arrow Map: ${result.data!.id}`);
        console.log(`   Nodes: ${result.data!.nodes.length}`);
        console.log(`   Arrows: ${result.data!.arrows.length}`);
      } else {
        console.error(`❌ Validation failed:`);
        result.errors!.forEach(e => console.error(`   - ${e}`));
        process.exit(1);
      }
    }))
  .addCommand(new Command('detect')
    .description('Run the Detector to discover arrows')
    .option('--interactive', 'Interactive mode: ask user questions')
    .option('--auto', 'Automatic mode: scan project files')
    .option('--confidence-threshold <n>', 'Minimum confidence for auto-detection', '0.7')
    .action(detectArrows));
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/arrow-map/command.ts packages/cli/src/index.ts
git commit -m "feat(cli): add arrow-map subcommand with init, validate, detect"
```

---

### Task A2: Implement `arrow-map init`

**Files:**
- Create: `packages/cli/src/arrow-map/init.ts`

- [ ] **Step 1: Create from scratch**

```typescript
import * as fs from 'fs';
import * as yaml from 'yaml';
import { ArrowMap } from './types';

interface InitOptions {
  fromNiche?: boolean;
  template?: string;
  output: string;
}

export async function initArrowMap(options: InitOptions): Promise<void> {
  let arrowMap: ArrowMap;

  if (options.fromNiche) {
    arrowMap = await initFromNiche();
  } else if (options.template) {
    arrowMap = await initFromTemplate(options.template);
  } else {
    arrowMap = createBlankMap();
  }

  const yamlContent = yaml.stringify(arrowMap);
  fs.writeFileSync(options.output, yamlContent);
  console.log(`✅ Arrow Map created: ${options.output}`);
  console.log(`   ID: ${arrowMap.id}`);
  console.log(`   Nodes: ${arrowMap.nodes.length}`);
  console.log(`   Arrows: ${arrowMap.arrows.length}`);
}

function createBlankMap(): ArrowMap {
  return {
    arrow_map_version: '0.1.0',
    id: `project:${Date.now()}`,
    name: 'New Arrow Map',
    description: 'Created by statuz arrow-map init',
    version: '1.0.0',
    status: 'draft',
    nodes: [],
    arrows: [],
    storage: {
      local_cache: './.statuz/arrow-maps/'
    }
  };
}

async function initFromNiche(): Promise<ArrowMap> {
  // Read .statuz/niche/manifest.yaml
  const nichePath = './.statuz/niche/manifest.yaml';
  if (!fs.existsSync(nichePath)) {
    throw new Error('No niche manifest found at .statuz/niche/manifest.yaml');
  }
  
  const nicheContent = fs.readFileSync(nichePath, 'utf8');
  const niche = yaml.parse(nicheContent);
  
  // Convert declared_position.does into StatuNodes
  const nodes: StatuNode[] = (niche.declared_position?.does || []).map((task: string, i: number) => ({
    id: `task-${i}`,
    type: 'component',
    name: task,
    description: `Task from niche manifest: ${task}`
  }));
  
  // Convert relations.agent_graph into Arrows
  const arrows: Arrow[] = (niche.relations?.agent_graph || []).map((rel: any, i: number) => ({
    id: `arrow-${i}`,
    source: rel.from,
    target: rel.to,
    type: rel.type || 'dependency',
    properties: {
      reason: 'Imported from niche agent_graph'
    }
  }));
  
  return {
    arrow_map_version: '0.1.0',
    id: `niche:${niche.declared_position?.name || 'unknown'}`,
    name: `${niche.declared_position?.name || 'Project'} Topology`,
    description: 'Auto-generated from niche manifest',
    version: '1.0.0',
    status: 'draft',
    nodes,
    arrows,
    storage: {
      local_cache: './.statuz/arrow-maps/'
    }
  };
}

async function initFromTemplate(templateId: string): Promise<ArrowMap> {
  // Fetch template from registry
  const registryPath = `~/.statuz/maps/${templateId}.yaml`;
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  const templateContent = fs.readFileSync(registryPath, 'utf8');
  const template = yaml.parse(templateContent) as ArrowMap;
  
  // Create instance from template
  return {
    ...template,
    id: `${templateId}-instance-${Date.now()}`,
    version: '1.0.0',
    status: 'draft'
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/arrow-map/init.ts
git commit -m "feat(cli): implement arrow-map init with --from-niche and --template"
```

---

### Task A3: Implement `arrow-map detect` (stub)

**Files:**
- Create: `packages/cli/src/arrow-map/detect.ts`

- [ ] **Step 1: Create detect dispatcher**

```typescript
import { detectManual } from '../detector/manual';
import { detectAuto } from '../detector/auto';

interface DetectOptions {
  interactive?: boolean;
  auto?: boolean;
  confidenceThreshold: string;
}

export async function detectArrows(options: DetectOptions): Promise<void> {
  const threshold = parseFloat(options.confidenceThreshold);
  
  if (options.interactive) {
    await detectManual();
  } else if (options.auto) {
    await detectAuto(threshold);
  } else {
    // Default: run auto first, then manual for low-confidence arrows
    await detectAuto(threshold);
    await detectManual();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/arrow-map/detect.ts
git commit -m "feat(cli): add arrow-map detect dispatcher"
```

---

### Task A4: Test CLI commands

**Files:**
- Create: `tests/arrow-map/init.test.ts`

- [ ] **Step 1: Test init from scratch**

```typescript
import { initArrowMap } from '../../packages/cli/src/arrow-map/init';
import * as fs from 'fs';
import * as yaml from 'yaml';

describe('arrow-map init', () => {
  const testOutput = './test-arrow-map.yaml';

  afterEach(() => {
    if (fs.existsSync(testOutput)) {
      fs.unlinkSync(testOutput);
    }
  });

  test('creates blank map', async () => {
    await initArrowMap({ output: testOutput });
    
    expect(fs.existsSync(testOutput)).toBe(true);
    const content = fs.readFileSync(testOutput, 'utf8');
    const map = yaml.parse(content);
    
    expect(map.arrow_map_version).toBe('0.1.0');
    expect(map.nodes).toEqual([]);
    expect(map.arrows).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/cli && npx jest tests/arrow-map/init.test.ts`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add tests/arrow-map/init.test.ts
git commit -m "test(cli): add arrow-map init tests"
```

---

## Phase B: Detector

### Task B1: Implement manual detector (interactive mode)

**Files:**
- Create: `packages/cli/src/detector/manual.ts`

- [ ] **Step 1: Ask 6 core questions**

```typescript
import * as readline from 'readline';
import { Arrow, StatuNode } from '../arrow-map/types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

export async function detectManual(): Promise<void> {
  console.log('🔍 Manual Arrow Detection');
  console.log('Answer the following questions to discover arrows.\n');
  
  // Get or create the target node
  const nodeId = await ask('What node are we examining? (e.g., auth-service): ');
  const nodeName = await ask(`What is the name of "${nodeId}"? (optional): `);
  
  const node: StatuNode = {
    id: nodeId,
    type: 'component',
    name: nodeName || nodeId
  };
  
  const arrows: Arrow[] = [];
  
  // Question 1: What depends on this?
  const dependents = await ask(`\n1. What depends on "${nodeId}"? (comma-separated, or "none"): `);
  if (dependents !== 'none' && dependents !== '') {
    for (const dep of dependents.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: dep,
        target: nodeId,
        type: 'dependency',
        properties: {
          reason: `Discovered: ${dep} depends on ${nodeId}`,
          criticality: 'high'
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  // Question 2: What does this depend on?
  const dependencies = await ask(`2. What does "${nodeId}" depend on? (comma-separated, or "none"): `);
  if (dependencies !== 'none' && dependencies !== '') {
    for (const dep of dependencies.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: nodeId,
        target: dep,
        type: 'dependency',
        properties: {
          reason: `Discovered: ${nodeId} depends on ${dep}`,
          criticality: 'high'
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  // Question 3: Who validates this?
  const validators = await ask(`3. Who validates "${nodeId}"? (comma-separated, or "none"): `);
  if (validators !== 'none' && validators !== '') {
    for (const validator of validators.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: validator,
        target: nodeId,
        type: 'validation',
        properties: {
          reason: `Discovered: ${validator} validates ${nodeId}`
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  // Question 4: What information flows into this?
  const infoIn = await ask(`4. What information flows INTO "${nodeId}"? (comma-separated, or "none"): `);
  if (infoIn !== 'none' && infoIn !== '') {
    for (const source of infoIn.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: source,
        target: nodeId,
        type: 'information_flow',
        properties: {
          reason: `Discovered: information flows from ${source} to ${nodeId}`
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  // Question 5: What information flows out of this?
  const infoOut = await ask(`5. What information flows OUT OF "${nodeId}"? (comma-separated, or "none"): `);
  if (infoOut !== 'none' && infoOut !== '') {
    for (const target of infoOut.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: nodeId,
        target: target,
        type: 'information_flow',
        properties: {
          reason: `Discovered: information flows from ${nodeId} to ${target}`
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  // Question 6: What constraints apply?
  const constraints = await ask(`6. What constraints apply to "${nodeId}"? (comma-separated, or "none"): `);
  if (constraints !== 'none' && constraints !== '') {
    for (const constraint of constraints.split(',').map(s => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: constraint,
        target: nodeId,
        type: 'constraint',
        properties: {
          reason: `Discovered: ${constraint} constrains ${nodeId}`
        },
        metadata: {
          confidence: 1.0,
          discovery_method: 'manual',
          discovered_at: new Date().toISOString()
        }
      });
    }
  }
  
  rl.close();
  
  // Output discovered arrows
  console.log(`\n✅ Discovered ${arrows.length} arrows:`);
  for (const arrow of arrows) {
    console.log(`   ${arrow.type}: ${arrow.source} → ${arrow.target}`);
  }
  
  // Save to arrow-map.yaml (or append to existing)
  // TODO: Implement save logic
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/detector/manual.ts
git commit -m "feat(detector): implement interactive manual detection with 6 core questions"
```

---

### Task B2: Implement automatic detector

**Files:**
- Create: `packages/cli/src/detector/auto.ts`

- [ ] **Step 1: Scan package.json for dependencies**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { Arrow } from '../arrow-map/types';

interface DetectedArrow {
  arrow: Arrow;
  confidence: number;
  source: string; // e.g., 'package.json', 'docker-compose.yml'
}

export async function detectAuto(threshold: number): Promise<DetectedArrow[]> {
  const detected: DetectedArrow[] = [];
  
  // Scan package.json
  detected.push(...scanPackageJson());
  
  // Scan docker-compose.yml
  detected.push(...scanDockerCompose());
  
  // Scan import statements in source files
  detected.push(...scanImports());
  
  // Filter by confidence threshold
  const filtered = detected.filter(d => d.confidence >= threshold);
  
  console.log(`🔍 Auto-detection complete:`);
  console.log(`   Total candidates: ${detected.length}`);
  console.log(`   Above threshold (${threshold}): ${filtered.length}`);
  
  for (const d of filtered) {
    console.log(`   [${d.confidence.toFixed(2)}] ${d.arrow.type}: ${d.arrow.source} → ${d.arrow.target} (${d.source})`);
  }
  
  return filtered;
}

function scanPackageJson(): DetectedArrow[] {
  const arrows: DetectedArrow[] = [];
  const packagePath = './package.json';
  
  if (!fs.existsSync(packagePath)) {
    return arrows;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Detect dependencies
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(deps)) {
    arrows.push({
      arrow: {
        id: `auto-dep-${name}`,
        source: pkg.name || 'this-project',
        target: name,
        type: 'dependency',
        properties: {
          reason: `Dependency in package.json: ${name}@${version}`,
          criticality: 'high'
        },
        metadata: {
          confidence: 0.9,
          discovery_method: 'detected',
          discovered_at: new Date().toISOString(),
          detector_id: 'package-json-scanner'
        }
      },
      confidence: 0.9,
      source: 'package.json'
    });
  }
  
  return arrows;
}

function scanDockerCompose(): DetectedArrow[] {
  const arrows: DetectedArrow[] = [];
  const composePath = './docker-compose.yml';
  
  if (!fs.existsSync(composePath)) {
    return arrows;
  }
  
  // Parse docker-compose and detect service dependencies
  // Simplified: look for 'depends_on' and 'links'
  const content = fs.readFileSync(composePath, 'utf8');
  
  // Basic regex-based detection (production would use proper YAML parsing)
  const dependsOnMatches = content.matchAll(/depends_on:\s*\n((\s+-\s+\w+\s*\n)+)/g);
  for (const match of dependsOnMatches) {
    const serviceName = content.substring(0, match.index).match(/(\w+):\s*\n[^\n]*$/)?.[1];
    const deps = match[1].matchAll(/-\s+(\w+)/g);
    for (const dep of deps) {
      arrows.push({
        arrow: {
          id: `auto-compose-${serviceName}-${dep[1]}`,
          source: serviceName || 'unknown',
          target: dep[1],
          type: 'dependency',
          properties: {
            reason: `Docker Compose depends_on: ${serviceName} depends on ${dep[1]}`,
            criticality: 'critical'
          },
          metadata: {
            confidence: 0.95,
            discovery_method: 'detected',
            discovered_at: new Date().toISOString(),
            detector_id: 'docker-compose-scanner'
          }
        },
        confidence: 0.95,
        source: 'docker-compose.yml'
      });
    }
  }
  
  return arrows;
}

function scanImports(): DetectedArrow[] {
  // Scan source files for import/require statements
  // This is a simplified version — production would use AST parsing
  const arrows: DetectedArrow[] = [];
  const srcDirs = ['./src', './lib', './apps'];
  
  for (const dir of srcDirs) {
    if (!fs.existsSync(dir)) continue;
    
    // Recursively find .ts, .js files
    const files = findFiles(dir, ['.ts', '.js']);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Detect internal imports (relative paths)
      const importMatches = content.matchAll(/from\s+['"]\.\/(.+?)['"]/g);
      for (const match of importMatches) {
        const sourceModule = path.basename(file, path.extname(file));
        const targetModule = path.basename(match[1]);
        
        arrows.push({
          arrow: {
            id: `auto-import-${sourceModule}-${targetModule}`,
            source: sourceModule,
            target: targetModule,
            type: 'dependency',
            properties: {
              reason: `Import in ${file}: ${sourceModule} imports ${targetModule}`,
              criticality: 'medium'
            },
            metadata: {
              confidence: 0.8,
              discovery_method: 'detected',
              discovered_at: new Date().toISOString(),
              detector_id: 'import-scanner'
            }
          },
          confidence: 0.8,
          source: file
        });
      }
    }
  }
  
  return arrows;
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/detector/auto.ts
git commit -m "feat(detector): implement automatic detection for package.json, docker-compose, and imports"
```

---

### Task B3: Implement topological inference

**Files:**
- Create: `packages/cli/src/detector/infer.ts`

- [ ] **Step 1: Infer transitive dependencies**

```typescript
import { Arrow, ArrowMap } from '../arrow-map/types';

interface InferredArrow {
  arrow: Arrow;
  inference_type: 'transitive' | 'symmetry' | 'completeness' | 'pattern';
  explanation: string;
}

export function inferArrows(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  
  inferred.push(...inferTransitive(arrowMap));
  inferred.push(...inferSymmetry(arrowMap));
  inferred.push(...inferCompleteness(arrowMap));
  
  return inferred;
}

function inferTransitive(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  const arrows = arrowMap.arrows;
  
  // If A → B and B → C, suggest A → C
  for (const ab of arrows) {
    if (ab.type !== 'dependency') continue;
    
    for (const bc of arrows) {
      if (bc.type !== 'dependency') continue;
      if (ab.target !== bc.source) continue;
      
      // Check if A → C already exists
      const exists = arrows.some(a => 
        a.source === ab.source && a.target === bc.target && a.type === 'dependency'
      );
      
      if (!exists) {
        inferred.push({
          arrow: {
            id: `inferred-transitive-${ab.source}-${bc.target}`,
            source: ab.source,
            target: bc.target,
            type: 'dependency',
            properties: {
              reason: `Inferred: ${ab.source} → ${ab.target} and ${bc.source} → ${bc.target}, therefore ${ab.source} → ${bc.target}`,
              criticality: 'medium'
            },
            metadata: {
              confidence: 0.6,
              discovery_method: 'inferred',
              discovered_at: new Date().toISOString(),
              detector_id: 'transitive-inference'
            }
          },
          inference_type: 'transitive',
          explanation: `Transitive closure: ${ab.source} → ${ab.target} → ${bc.target}`
        });
      }
    }
  }
  
  return inferred;
}

function inferSymmetry(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  
  // If A validates B, suggest B informs A
  for (const arrow of arrowMap.arrows) {
    if (arrow.type !== 'validation') continue;
    
    const exists = arrowMap.arrows.some(a => 
      a.source === arrow.target && a.target === arrow.source && a.type === 'information_flow'
    );
    
    if (!exists) {
      inferred.push({
        arrow: {
          id: `inferred-symmetry-${arrow.target}-${arrow.source}`,
          source: arrow.target,
          target: arrow.source,
          type: 'information_flow',
          properties: {
            reason: `Inferred: ${arrow.source} validates ${arrow.target}, so ${arrow.target} should inform ${arrow.source}`
          },
          metadata: {
            confidence: 0.5,
            discovery_method: 'inferred',
            discovered_at: new Date().toISOString(),
            detector_id: 'symmetry-inference'
          }
        },
        inference_type: 'symmetry',
        explanation: `Symmetry: ${arrow.source} validates ${arrow.target} → ${arrow.target} should inform ${arrow.source}`
      });
    }
  }
  
  return inferred;
}

function inferCompleteness(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  
  // Find nodes with no incoming arrows (potential orphans)
  for (const node of arrowMap.nodes) {
    const hasIncoming = arrowMap.arrows.some(a => a.target === node.id);
    if (!hasIncoming && node.type !== 'project') {
      inferred.push({
        arrow: {
          id: `inferred-completeness-${node.id}`,
          source: 'unknown',
          target: node.id,
          type: 'dependency',
          properties: {
            reason: `Inferred: ${node.id} has no incoming arrows — something must depend on it or it is orphaned`
          },
          metadata: {
            confidence: 0.3,
            discovery_method: 'inferred',
            discovered_at: new Date().toISOString(),
            detector_id: 'completeness-inference'
          }
        },
        inference_type: 'completeness',
        explanation: `Completeness: ${node.id} has no incoming arrows — may be orphaned`
      });
    }
  }
  
  return inferred;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/detector/infer.ts
git commit -m "feat(detector): implement topological inference (transitive, symmetry, completeness)"
```

---

### Task B4: Test Detector

**Files:**
- Create: `tests/detector/manual.test.ts`

- [ ] **Step 1: Test manual detector output**

```typescript
import { detectManual } from '../../packages/cli/src/detector/manual';

// Mock readline for testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((q: string, cb: (answer: string) => void) => {
      // Mock answers for testing
      const answers: Record<string, string> = {
        'What node are we examining?': 'auth-service',
        'What is the name of': 'Authentication Service',
        'What depends on': 'api-gateway, mobile-app',
        'What does': 'user-db, redis-cache',
        'Who validates': 'qa-team',
        'What information flows INTO': 'login-credentials',
        'What information flows OUT OF': 'auth-tokens',
        'What constraints apply': 'gdpr-compliant'
      };
      
      for (const [key, value] of Object.entries(answers)) {
        if (q.includes(key)) {
          cb(value);
          return;
        }
      }
      cb('none');
    }),
    close: jest.fn()
  }))
}));

describe('Manual Detector', () => {
  test('discovers arrows from mock answers', async () => {
    // This test verifies the detector runs without error
    // In a real test, we'd capture the output and verify arrow counts
    await expect(detectManual()).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Test auto detector**

Create: `tests/detector/auto.test.ts`

```typescript
import { detectAuto } from '../../packages/cli/src/detector/auto';
import * as fs from 'fs';

jest.mock('fs');

describe('Auto Detector', () => {
  test('scans package.json for dependencies', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      name: 'test-project',
      dependencies: {
        'express': '^4.18.0',
        'lodash': '^4.17.0'
      }
    }));
    
    const arrows = await detectAuto(0.5);
    
    expect(arrows.length).toBe(2);
    expect(arrows[0].arrow.type).toBe('dependency');
    expect(arrows[0].arrow.target).toBe('express');
    expect(arrows[0].confidence).toBe(0.9);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd packages/cli && npx jest tests/detector/`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/detector/
git commit -m "test(detector): add tests for manual and auto detection"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task | Status |
|-------------|------|--------|
| Schema validation (E) | E1-E4 | ✅ Covered |
| CLI `arrow-map init` (A) | A1-A2 | ✅ Covered |
| CLI `arrow-map validate` (A) | A1 | ✅ Covered |
| CLI `arrow-map detect` (A) | A1, A3 | ✅ Covered |
| Manual Detector (B) | B1 | ✅ Covered |
| Auto Detector (B) | B2 | ✅ Covered |
| Inference Engine (B) | B3 | ✅ Covered |
| Project-independent storage | A2 (initFromTemplate) | ✅ Covered |
| Extensible StatuNode types | Types definition | ✅ Covered |

### Placeholder Scan

- ❌ No "TBD", "TODO", "implement later"
- ❌ No "Add appropriate error handling" without code
- ❌ No "Similar to Task N" references
- ⚠️ One `TODO` in manual.ts Step 1: `// TODO: Implement save logic` — this is intentional; saving logic depends on Arrow Map registry implementation which is out of scope for this plan

### Type Consistency

- ✅ `Arrow`, `StatuNode`, `ArrowMap` types used consistently across all tasks
- ✅ `confidence` is always `number` (0.0–1.0)
- ✅ `discovery_method` values match enum: `'manual' | 'inferred' | 'detected' | 'imported'`
- ✅ Arrow `type` values match enum across all detector modes

---

## Execution Handoff

**Plan complete and saved to `66-implementation/PLAN.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
