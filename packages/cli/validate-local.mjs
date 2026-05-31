#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

const Ajv = AjvImport.default || AjvImport;
const addFormats = addFormatsImport.default || addFormatsImport;

const PROJECT_ROOT = resolve("E:/ceaserzhao/github projects/statuz");
const SPEC_DIR = resolve(PROJECT_ROOT, "spec/niche");
const EXAMPLES_DIR = resolve(PROJECT_ROOT, "examples/niche-example/.statuz/niche");
const PROJECT_NICHE_DIR = resolve(PROJECT_ROOT, ".statuz/niche");

function loadSchema(name) {
  const path = resolve(SPEC_DIR, name);
  if (!existsSync(path)) {
    console.error(`Schema not found: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadYaml(path) {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    return null;
  }
  return YAML.parse(readFileSync(path, "utf8"));
}

function validate(schema, data) {
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
  { file: resolve(EXAMPLES_DIR, "manifest.yaml"), schema: "niche-manifest.schema.json" },
  { file: resolve(EXAMPLES_DIR, "agent-backend.yaml"), schema: "niche-manifest.schema.json" },
  { file: resolve(EXAMPLES_DIR, "agent-frontend.yaml"), schema: "niche-manifest.schema.json" },
  { file: resolve(EXAMPLES_DIR, "agent-qa.yaml"), schema: "niche-manifest.schema.json" },
  { file: resolve(EXAMPLES_DIR, "signals/sig-001-api-contract-changed.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(EXAMPLES_DIR, "signals/sig-002-dependency-update.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(EXAMPLES_DIR, "signals/sig-003-security-advisory.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(EXAMPLES_DIR, "assessments/ast-001-api-changed-relevant.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(EXAMPLES_DIR, "assessments/ast-002-frontend-assesses-deps.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(EXAMPLES_DIR, "assessments/ast-003-backend-assesses-security.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(EXAMPLES_DIR, "assessments/ast-004-frontend-assesses-security.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(EXAMPLES_DIR, "contexts/ctx-001-frontend-to-qa.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(EXAMPLES_DIR, "contexts/ctx-002-frontend-to-qa.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(EXAMPLES_DIR, "contexts/ctx-003-backend-to-qa.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(EXAMPLES_DIR, "outcomes/out-001-qa-tests.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(EXAMPLES_DIR, "outcomes/out-002-dependency-updated.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(EXAMPLES_DIR, "outcomes/out-003-security-fixed.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(EXAMPLES_DIR, "calibrations/cal-001-scope-drift.yaml"), schema: "niche-calibration.schema.json" },
  { file: resolve(EXAMPLES_DIR, "calibrations/cal-002-collaboration-drift.yaml"), schema: "niche-calibration.schema.json" },
  { file: resolve(EXAMPLES_DIR, "syn/syn-001-request.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(EXAMPLES_DIR, "syn/syn-001-resolution.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(EXAMPLES_DIR, "syn/syn-002-request.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(EXAMPLES_DIR, "syn/syn-002-resolution.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "manifest.yaml"), schema: "niche-manifest.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "signals/sig-001-phase1-complete.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "signals/sig-002-phase2-complete.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "signals/sig-003-phase3-complete.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "signals/sig-004-phase4-complete.yaml"), schema: "niche-signal.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "assessments/ast-001-phase1-relevance.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "assessments/ast-002-phase2-relevance.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "assessments/ast-003-phase3-relevance.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "assessments/ast-004-phase4-relevance.yaml"), schema: "niche-assessment.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "contexts/ctx-001-phase1-record.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "contexts/ctx-002-phase2-record.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "contexts/ctx-003-phase3-record.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "contexts/ctx-004-phase4-record.yaml"), schema: "niche-context.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "outcomes/out-001-phase1-delivered.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "outcomes/out-002-phase2-delivered.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "outcomes/out-003-phase3-delivered.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "outcomes/out-004-phase4-delivered.yaml"), schema: "niche-outcome.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "calibrations/cal-001-scope-expansion.yaml"), schema: "niche-calibration.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "syn/syn-001-request.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "syn/syn-001-resolution.yaml"), schema: "niche-syn.schema.json" },
  { file: resolve(PROJECT_NICHE_DIR, "syn/syn-002-request.yaml"), schema: "niche-syn.schema.json" }
];

console.log("=== Niche Schema Validation ===\n");
console.log(`Schema dir: ${SPEC_DIR}\n`);

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
}

console.log(`\n=== Summary ===`);
console.log(`Passed: ${passCount}/${testCases.length}`);
console.log(`Failed: ${failCount}/${testCases.length}`);

if (failCount > 0) {
  process.exit(1);
}
