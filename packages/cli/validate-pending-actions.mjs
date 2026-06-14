#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

const Ajv = AjvImport.default || AjvImport;
const addFormats = addFormatsImport.default || addFormatsImport;

const PROJECT_ROOT = resolve("E:/ceaserzhao/github projects/statuz");
const SCHEMA_PATH = resolve(PROJECT_ROOT, "spec/pending-actions.schema.json");
const VALID_DIR = resolve(PROJECT_ROOT, "spec/fixtures/valid");
const INVALID_DIR = resolve(PROJECT_ROOT, "spec/fixtures/invalid");

function loadSchema() {
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
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
  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);
  if (!valid && validateFn.errors) {
    return validateFn.errors.map(e => `${e.instancePath || "(root)"}: ${e.message}`);
  }
  return [];
}

const schema = loadSchema();
let passCount = 0;
let failCount = 0;

console.log("=== Pending Actions Schema Validation ===\n");

// ── Valid fixtures: MUST pass ──
const validFixtures = [
  "pending-actions-minimal.yaml",
  "pending-actions-full.yaml",
];
console.log("── Valid fixtures (MUST pass) ──");
for (const name of validFixtures) {
  const filePath = resolve(VALID_DIR, name);
  const data = loadYaml(filePath);
  if (!data) { failCount++; continue; }
  const errors = validate(schema, data);
  if (errors.length === 0) {
    console.log(`  ✅ PASS  ${name}`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL  ${name}`);
    errors.forEach(e => console.log(`      ${e}`));
    failCount++;
  }
}

// ── Invalid fixtures: MUST fail ──
const invalidFixtures = [
  { file: "pending-actions-wrong-version.yaml",  desc: "wrong version '2.0'" },
  { file: "pending-actions-bad-id.yaml",          desc: "bad id format 'action-01'" },
  { file: "pending-actions-missing-status.yaml",   desc: "missing required 'status'" },
  { file: "pending-actions-bad-status.yaml",       desc: "invalid status 'completed'" },
];
console.log("\n── Invalid fixtures (MUST fail) ──");
for (const { file, desc } of invalidFixtures) {
  const filePath = resolve(INVALID_DIR, file);
  const data = loadYaml(filePath);
  if (!data) { failCount++; continue; }
  const errors = validate(schema, data);
  if (errors.length > 0) {
    console.log(`  ✅ PASS  ${file} (rejected: ${desc})`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL  ${file} (expected rejection: ${desc})`);
    failCount++;
  }
}

// ── Edge case: empty array (valid per minItems=0) ──
console.log("\n── Edge case ──");
const emptyPath = resolve(INVALID_DIR, "pending-actions-empty-array.yaml");
const emptyData = loadYaml(emptyPath);
if (emptyData) {
  const errors = validate(schema, emptyData);
  if (errors.length === 0) {
    console.log(`  ✅ PASS  pending-actions-empty-array.yaml (empty array = valid)`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL  pending-actions-empty-array.yaml (should accept empty array)`);
    errors.forEach(e => console.log(`      ${e}`));
    failCount++;
  }
}

const total = validFixtures.length + invalidFixtures.length + 1;
console.log(`\n=== Summary: ${passCount}/${total} passed, ${failCount} failed ===`);

if (failCount > 0) process.exit(1);
