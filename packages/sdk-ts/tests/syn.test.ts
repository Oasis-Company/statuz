import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SynRequestIO } from "../src/syn/request.js";
import { SynResolutionIO } from "../src/syn/resolution.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const TEST_DIR = resolve(process.cwd(), ".test-syn-temp");

describe("SynRequestIO", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read a valid SYN request YAML", () => {
    const yaml = `
syn_version: "1.0"
id: "syn-001"
type: "human_decision_required"
source: "calibration-001"
timestamp: "2026-06-10T14:00:00Z"
priority: "high"
summary: "Should auth be split from payment service?"
context:
  evidence_summary: "Agent spending 60% time on auth"
  evidence_window: "2026-05-10 to 2026-06-10"
options:
  - id: "keep"
    title: "Keep auth in-house"
    description: "Maintain current architecture"
    pros: ["Simpler deployment"]
    cons: ["Violates niche boundary"]
  - id: "split"
    title: "Split into separate service"
    description: "Create auth-service"
    pros: ["Clear boundary", "Independent scaling"]
    cons: ["More complexity"]
recommendation: "split"
requested_decision_by: "2026-06-10T16:00:00Z"
`;
    const filePath = join(TEST_DIR, "syn-request.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const request = SynRequestIO.read(filePath);

    expect(request.syn_version).toBe("1.0");
    expect(request.id).toBe("syn-001");
    expect(request.type).toBe("human_decision_required");
    expect(request.priority).toBe("high");
    expect(request.options).toHaveLength(2);
    expect(request.recommendation).toBe("split");
  });

  it("should round-trip SYN request", () => {
    const yaml = `
syn_version: "1.0"
id: "syn-002"
type: "human_decision_required"
source: "agent-judgment"
timestamp: "2026-06-10T15:00:00Z"
priority: "medium"
summary: "Which database to use?"
options:
  - id: "postgres"
    title: "PostgreSQL"
    description: "Relational database"
  - id: "mongodb"
    title: "MongoDB"
    description: "Document database"
recommendation: "postgres"
`;
    const filePath = join(TEST_DIR, "syn-rt.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const request = SynRequestIO.read(filePath);
    const outputPath = join(TEST_DIR, "syn-rt-out.yaml");
    SynRequestIO.write(outputPath, request);

    const readBack = SynRequestIO.read(outputPath);
    expect(readBack).toEqual(request);
  });

  it("should validate a valid SYN request", () => {
    const request = {
      syn_version: "1.0" as const,
      id: "syn-003",
      type: "human_decision_required" as const,
      source: "test",
      timestamp: "2026-06-10T15:00:00Z",
      priority: "medium" as const,
      summary: "Test decision",
      context: { evidence_summary: "test" },
      options: [{ id: "a", title: "A", description: "Option A" }],
      recommendation: "a",
    };

    const result = SynRequestIO.validate(request);
    expect(result.valid).toBe(true);
  });
});

describe("SynResolutionIO", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read a valid SYN resolution YAML", () => {
    const yaml = `
syn_resolution_version: "1.0"
id: "syn-001-resolution"
syn_request_id: "syn-001"
principal: "developer@example.com"
timestamp: "2026-06-10T14:35:00Z"
decision: "split"
decision_summary: "Split auth into separate service"
rationale: "Auth is becoming a significant chunk of our codebase"
effective_date: "2026-06-11T00:00:00Z"
next_steps:
  - "Create auth-service project"
  - "Define API contract"
  - "Update Arrow Map"
audit_trail:
  - "syn-001-request.yaml"
  - "syn-001-resolution.yaml"
`;
    const filePath = join(TEST_DIR, "syn-resolution.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const resolution = SynResolutionIO.read(filePath);

    expect(resolution.syn_resolution_version).toBe("1.0");
    expect(resolution.syn_request_id).toBe("syn-001");
    expect(resolution.decision).toBe("split");
    expect(resolution.next_steps).toHaveLength(3);
    expect(resolution.audit_trail).toHaveLength(2);
  });

  it("should round-trip SYN resolution", () => {
    const yaml = `
syn_resolution_version: "1.0"
id: "syn-002-resolution"
syn_request_id: "syn-002"
principal: "admin@example.com"
timestamp: "2026-06-10T15:30:00Z"
decision: "postgres"
decision_summary: "Use PostgreSQL"
rationale: "Better ACID support"
`;
    const filePath = join(TEST_DIR, "syn-rt.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const resolution = SynResolutionIO.read(filePath);
    const outputPath = join(TEST_DIR, "syn-rt-out.yaml");
    SynResolutionIO.write(outputPath, resolution);

    const readBack = SynResolutionIO.read(outputPath);
    expect(readBack).toEqual(resolution);
  });
});
