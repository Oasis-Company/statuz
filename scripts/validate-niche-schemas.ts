#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

const Ajv = AjvImport.default || AjvImport;
const addFormats = addFormatsImport.default || addFormatsImport;

const PROJECT_ROOT = "E:/ceaserzhao/github projects/statuz";
const SPEC_DIR = resolve(PROJECT_ROOT, "spec/niche");
const EXAMPLES_DIR = resolve(PROJECT_ROOT, "examples/niche-example/.statuz/niche");

interface ValidationResult {
  file: string;
  schema: string;
  valid: boolean;
  errors?: string[];
}

function loadSchema(name: string): Record<string, unknown> | null {
  const path = resolve(SPEC_DIR, name);
  if (!existsSync(path)) {
    console.error(`Schema not found: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadYaml(path: string): unknown | null {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    return null;
  }
  return YAML.parse(readFileSync(path, "utf8"));
}

function validate(schema: Record<string, unknown>, data: unknown): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid && validate.errors) {
    return validate.errors.map(e => `${e.instancePath || "(root)"}: ${e.message}`);
  }
  return [];
}

const testCases = [
  {
    file: resolve(EXAMPLES_DIR, "manifest.yaml"),
    schema: "niche-manifest.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "signals/sig-001-api-contract-changed.yaml"),
    schema: "niche-signal.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "assessments/ast-001-api-changed-relevant.yaml"),
    schema: "niche-assessment.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "contexts/ctx-001-frontend-to-qa.yaml"),
    schema: "niche-context.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "outcomes/out-001-qa-tests.yaml"),
    schema: "niche-outcome.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "calibrations/cal-001-scope-drift.yaml"),
    schema: "niche-calibration.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "syn/syn-001-request.yaml"),
    schema: "niche-syn.schema.json"
  },
  {
    file: resolve(EXAMPLES_DIR, "syn/syn-001-resolution.yaml"),
    schema: "niche-syn.schema.json"
  }
];

console.log("=== Niche Schema Validation ===\n");
console.log(`Schema dir: ${SPEC_DIR}\n`);

const results: ValidationResult[] = [];
let passCount = 0;
let failCount = 0;

for (const tc of testCases) {
  const schema = loadSchema(tc.schema);
  if (!schema) continue;
  
  const data = loadYaml(tc.file);
  if (!data) continue;
  
  const errors = validate(schema, data);
  const valid = errors.length === 0;
  
  const relativePath = tc.file.replace(PROJECT_ROOT, "");
  if (valid) {
    console.log(`✅ PASS: ${relativePath}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${relativePath}`);
    errors.forEach(e => console.log(`   ${e}`));
    failCount++;
  }
  results.push({ file: tc.file, schema: tc.schema, valid, errors });
}

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passCount}/${testCases.length}`);
console.log(`Failed: ${failCount}/${testCases.length}`);

if (failCount > 0) {
  process.exit(1);
}
