#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exampleDir = path.join(__dirname, "..");
const schemaDir = path.join(__dirname, "../../spec/niche");

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const schemaMap = {
  manifest: "niche-manifest.schema.json",
  "agent-backend": "niche-manifest.schema.json",
  "agent-frontend": "niche-manifest.schema.json",
  "agent-qa": "niche-manifest.schema.json",
  signal: "niche-signal.schema.json",
  assessment: "niche-assessment.schema.json",
  context: "niche-context.schema.json",
  outcome: "niche-outcome.schema.json",
  calibration: "niche-calibration.schema.json",
  syn: "niche-syn.schema.json",
};

function getSchemaForFile(filePath) {
  const basename = path.basename(filePath, ".yaml");

  if (basename.startsWith("sig-")) return schemaMap.signal;
  if (basename.startsWith("ast-")) return schemaMap.assessment;
  if (basename.startsWith("ctx-")) return schemaMap.context;
  if (basename.startsWith("out-")) return schemaMap.outcome;
  if (basename.startsWith("cal-")) return schemaMap.calibration;
  if (basename.startsWith("syn-")) return schemaMap.syn;
  if (basename.startsWith("agent-")) return schemaMap[basename] || schemaMap.manifest;
  if (basename === "manifest") return schemaMap.manifest;

  return null;
}

function loadSchema(schemaName) {
  const schemaPath = path.join(schemaDir, schemaName);
  if (!fs.existsSync(schemaPath)) {
    return null;
  }
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  return JSON.parse(schemaContent);
}

function validateYaml(data, schema) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid, errors: validate.errors };
}

function validateFile(filePath) {
  const schemaName = getSchemaForFile(filePath);
  if (!schemaName) {
    return { valid: true, skipped: true, reason: "No schema mapping" };
  }

  const schema = loadSchema(schemaName);
  if (!schema) {
    return { valid: false, error: `Schema not found: ${schemaName}` };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = YAML.parse(content);
    return validateYaml(data, schema);
  } catch (err) {
    return { valid: false, error: `Parse error: ${err.message}` };
  }
}

function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log("🔍 Validating niche example files...\n");

const statuzDir = path.join(exampleDir, ".statuz");
const yamlFiles = walkDir(statuzDir);

let passed = 0;
let failed = 0;
let skipped = 0;

for (const file of yamlFiles) {
  const relativePath = path.relative(exampleDir, file);
  const result = validateFile(file);

  if (result.skipped) {
    console.log(`⏭️  SKIP  ${relativePath} (${result.reason})`);
    skipped++;
  } else if (result.valid) {
    console.log(`✅ PASS  ${relativePath}`);
    passed++;
  } else {
    console.log(`❌ FAIL  ${relativePath}`);
    if (result.errors) {
      for (const err of result.errors) {
        console.log(`       - ${err.instancePath}: ${err.message}`);
      }
    }
    if (result.error) {
      console.log(`       - ${result.error}`);
    }
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

process.exit(failed > 0 ? 1 : 0);
