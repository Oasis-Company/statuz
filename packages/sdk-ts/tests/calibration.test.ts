/**
 * Calibration Engine tests.
 * Covers:
 * - Drift analysis with known inputs
 * - Evidence window filtering
 * - Calibration document generation
 * - has_drift flag and proposed_change type
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CalibrationEngine } from "../src/calibration/engine.js";
import type { EvidenceItem } from "../src/calibration/types.js";

const TMP = resolve(process.cwd(), "tmp-calibration-test");

const MANIFEST_GOOD = {
  niche_version: "1.0",
  declared_position: {
    project_name: "statuz",
    purpose: "AI agent runtime status protocol",
    does: ["write protocols", "validate yaml", "test code"],
    does_not: ["build websites", "run databases"],
  },
  drift_thresholds: {
    task_drift: 0.3,
    collaboration_drift: 0.25,
    boundary_drift: 0.15,
  },
};

const STATUS_WITH_ALIGNED_CHECKPOINTS = {
  statuz_version: "0.1",
  updated_at: new Date().toISOString(),
  identity: {
    agent_name: "test-agent",
    project_name: "statuz",
  },
  current_state: {
    stage: "implementation",
    status: "in_progress",
  },
  checkpoints: [
    {
      id: "cp-001",
      at: new Date().toISOString(),
      summary: "Write protocols for agent runtime",
    },
    {
      id: "cp-002",
      at: new Date().toISOString(),
      summary: "Validate yaml schema examples",
    },
    {
      id: "cp-003",
      at: new Date().toISOString(),
      summary: "Test code with vitest",
    },
  ],
};

const STATUS_WITH_DENORMALIZED_CHECKPOINTS = {
  statuz_version: "0.1",
  updated_at: new Date().toISOString(),
  identity: {
    agent_name: "test-agent",
    project_name: "statuz",
  },
  current_state: {
    stage: "implementation",
    status: "in_progress",
  },
  checkpoints: [
    {
      id: "cp-001",
      at: new Date().toISOString(),
      summary: "Write protocols for agent runtime",
    },
    {
      id: "cp-002",
      at: new Date().toISOString(),
      summary: "Build websites for customers",
    },
    {
      id: "cp-003",
      at: new Date().toISOString(),
      summary: "Run databases on production servers",
    },
    {
      id: "cp-004",
      at: new Date().toISOString(),
      summary: "Validate yaml schema examples",
    },
  ],
};

function writeTmp(name: string, data: unknown): string {
  const path = resolve(TMP, name);
  mkdirSync(TMP, { recursive: true });
  writeFileSync(
    path,
    "niche_version" in (data as any) || "calibration_version" in (data as any)
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data, null, 2),
    "utf8"
  );
  return path;
}

function writeTmpYaml(name: string, data: unknown): string {
  const path = resolve(TMP, name);
  mkdirSync(TMP, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  // Simulate yaml by writing JSON — YAML.parse handles both
  return path;
}

describe("CalibrationEngine.drift analysis", () => {
  beforeEach(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  test("aligned checkpoints show low task drift", () => {
    const evidence: EvidenceItem[] =
      STATUS_WITH_ALIGNED_CHECKPOINTS.checkpoints!.map((cp) => ({
        id: cp.id,
        timestamp: cp.at,
        summary: cp.summary,
        tags: ["checkpoint"],
      }));

    const drift = CalibrationEngine.analyzeDrift(MANIFEST_GOOD, evidence);
    expect(drift.task_drift).toBeLessThan(MANIFEST_GOOD.drift_thresholds!.task_drift!);
    expect(drift.boundary_drift).toBe(0);
    expect(drift.collaboration_drift).toBe(0);
    expect(drift.evidence_count).toBe(3);
  });

  test("does_not keywords trigger boundary drift", () => {
    const evidence: EvidenceItem[] =
      STATUS_WITH_DENORMALIZED_CHECKPOINTS.checkpoints!.map((cp) => ({
        id: cp.id,
        timestamp: cp.at,
        summary: cp.summary,
        tags: ["checkpoint"],
      }));

    const drift = CalibrationEngine.analyzeDrift(MANIFEST_GOOD, evidence);
    // cp-002 (build websites) and cp-003 (run databases) match does_not
    expect(drift.boundary_drift).toBeGreaterThan(0);
    expect(drift.boundary_drift).toBe(2 / 4); // 2 of 4 hit does_not
  });

  test("evidence window filters out-of-range timestamps", () => {
    const oldCheckpoint: EvidenceItem = {
      id: "cp-old",
      timestamp: new Date(0).toISOString(),
      summary: "Ancient work",
    };
    const recentCheckpoint: EvidenceItem = {
      id: "cp-recent",
      timestamp: new Date().toISOString(),
      summary: "Write protocols",
    };

    const status = {
      ...STATUS_WITH_ALIGNED_CHECKPOINTS,
      checkpoints: [
        { id: "cp-old", at: oldCheckpoint.timestamp, summary: oldCheckpoint.summary },
        {
          id: "cp-recent",
          at: recentCheckpoint.timestamp,
          summary: recentCheckpoint.summary,
        },
      ],
    };

    const evidence = CalibrationEngine.extractEvidence(status, [], {});
    expect(evidence.length).toBe(1);
    expect(evidence[0].id).toBe("cp-recent");
  });
});

describe("CalibrationEngine.full pipeline", () => {
  beforeEach(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  test("run() produces schema-compatible document for aligned evidence", () => {
    const manifestPath = writeTmpYaml("manifest.yaml", MANIFEST_GOOD);
    const statusPath = writeTmpYaml("statuz.yaml", STATUS_WITH_ALIGNED_CHECKPOINTS);

    const result = CalibrationEngine.run(manifestPath, statusPath, [], {});

    expect(result.document.calibration_version).toBe("1.0");
    expect(result.has_drift).toBe(false);
    expect(result.document.proposed_change.type).toBe("maintain_position");
    expect(result.max_drift).toBeLessThan(0.3);
    expect(result.document.evidence.length).toBeGreaterThan(0);
  });

  test("run() detects drift with does_not work items", () => {
    const manifestPath = writeTmpYaml("manifest.yaml", MANIFEST_GOOD);
    // 3 of 4 checkpoints match "does" keywords (low task drift),
    // but 3 of 4 also match does_not keywords (high boundary drift).
    const statusWithDoesNot = {
      statuz_version: "0.1" as const,
      updated_at: new Date().toISOString(),
      identity: {
        agent_name: "test-agent",
        project_name: "statuz",
      },
      current_state: {
        stage: "implementation",
        status: "in_progress",
      },
      checkpoints: [
        {
          id: "cp-001",
          at: new Date().toISOString(),
          summary: "Write protocols and build websites for demo",
        },
        {
          id: "cp-002",
          at: new Date().toISOString(),
          summary: "Validate yaml schema and run databases on servers",
        },
        {
          id: "cp-003",
          at: new Date().toISOString(),
          summary: "Test code and build websites using databases",
        },
        {
          id: "cp-004",
          at: new Date().toISOString(),
          summary: "Write protocols for agent runtime",
        },
      ],
    };
    const statusPath = writeTmpYaml("statuz.yaml", statusWithDoesNot);

    const result = CalibrationEngine.run(manifestPath, statusPath, [], {});

    // All 4 checkpoints match at least one "does" keyword → task_drift = 0
    // 3 of 4 match does_not keywords ("build websites", "run databases")
    // → boundary_drift = 0.75, which is the max dimension.
    expect(result.has_drift).toBe(true);
    expect(result.document.proposed_change.type).toBe("update_declared_position");
    expect(result.max_drift).toBeGreaterThan(0.15);
    expect(result.max_drift_dimension).toBe("boundary_drift");
  });

  test("write + read calibration round-trip preserves key fields", () => {
    const manifestPath = writeTmpYaml("manifest.yaml", MANIFEST_GOOD);
    const statusPath = writeTmpYaml("statuz.yaml", STATUS_WITH_ALIGNED_CHECKPOINTS);

    const result = CalibrationEngine.run(manifestPath, statusPath, [], {});
    const path = resolve(TMP, "calibration-output.yaml");

    CalibrationEngine.writeCalibration(path, result.document);
    const readBack = CalibrationEngine.readCalibration(path);

    expect(readBack.calibration_version).toBe(result.document.calibration_version);
    expect(readBack.proposed_change.type).toBe(result.document.proposed_change.type);
    expect(readBack.has_drift ?? readBack.drift_analysis).toBeTruthy();
  });
});

describe("CalibrationEngine.validation", () => {
  beforeEach(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  test("rejects file that does not exist", () => {
    const result = CalibrationEngine.validateCalibrationFile(
      resolve(TMP, "nonexistent.yaml")
    );
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
