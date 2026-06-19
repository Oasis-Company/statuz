/**
 * Phase 0.1 E2E test: project scan → SYN proposal → approval → file creation.
 *
 * Run: node test-e2e.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const CLI = path.join(ROOT, "packages", "cli", "dist", "index.js");
const BACKEND = path.join(ROOT, "test-e2e-backend");
const FRONTEND = path.join(ROOT, "test-e2e-frontend");
const CLUSTER_FILE = path.join(ROOT, "test-e2e-cluster.yaml");

function log(title, body) {
  console.log("\n=== " + title + " ===");
  if (body) console.log(body);
}

function cleanup() {
  [BACKEND, FRONTEND].forEach((p) => {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
  });
  if (fs.existsSync(CLUSTER_FILE)) fs.unlinkSync(CLUSTER_FILE);
  const synDir = path.join(ROOT, ".statuz", "syn");
  if (fs.existsSync(synDir)) fs.rmSync(synDir, { recursive: true });
  console.log("Cleaned up.");
}

function createFixtures() {
  // Backend
  fs.mkdirSync(path.join(BACKEND, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(BACKEND, "package.json"),
    JSON.stringify(
      { name: "taskflow-backend", dependencies: { express: "4.0.0" } },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(BACKEND, "src", "server.ts"),
    'import express from "express";\nconst app = express();\n'
  );

  // Frontend
  fs.mkdirSync(path.join(FRONTEND, "src", "components"), { recursive: true });
  fs.writeFileSync(
    path.join(FRONTEND, "package.json"),
    JSON.stringify(
      { name: "taskflow-frontend", dependencies: { react: "18.0.0", axios: "1.0.0" } },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(FRONTEND, "src", "components", "App.tsx"),
    'import React from "react";\nimport axios from "axios";\nexport default function App() { return React.createElement("div"); }\n'
  );

  console.log("Fixtures created.");
}

function run(cmd) {
  console.log("\n$ " + cmd);
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8" });
    console.log(out);
    return out;
  } catch (e) {
    console.log("[stderr/stdout] " + e.stdout + e.stderr);
    return null;
  }
}

function main() {
  cleanup();
  createFixtures();

  log("Step 1: cluster init");
  run(
    `node "${CLI}" cluster init --id taskflow --name "TaskFlow" ` +
    `--map "taskflow-backend:1.0.0:product" --output "test-e2e-cluster.yaml"`
  );

  log("Step 2: agent discover frontend");
  run(`node "${CLI}" agent discover ./test-e2e-frontend --cluster test-e2e-cluster.yaml`);

  const proposalPath = path.join(ROOT, ".statuz", "syn", "PROP-001.yaml");
  log("Step 3: show proposal");
  run(`node "${CLI}" syn show-proposal "${proposalPath}"`);

  log("Step 4: approve proposal");
  run(`node "${CLI}" syn approve "${proposalPath}" --principal "e2e-test" --cluster test-e2e-cluster.yaml`);

  log("Step 5: verify generated files");
  const expected = [
    CLUSTER_FILE,
    path.join(FRONTEND, ".statuz", "statuz.yaml"),
    path.join(FRONTEND, ".statuz", "arrow-map.yaml"),
    path.join(FRONTEND, ".statuz", "niche.yaml"),
  ];
  let ok = true;
  for (const f of expected) {
    const exists = fs.existsSync(f);
    console.log((exists ? "[OK] " : "[MISSING] ") + f);
    if (!exists) ok = false;
    if (exists) {
      console.log("  " + fs.readFileSync(f, "utf8").slice(0, 200).replace(/\n/g, "\n  "));
    }
  }

  log("Summary", ok ? "SUCCESS: Phase 0.1 loop works end-to-end." : "FAIL: some files missing.");
}

main();
