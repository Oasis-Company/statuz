import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NicheManifestIO } from "../src/niche/manifest.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const TEST_DIR = resolve(process.cwd(), ".test-niche-temp");

describe("NicheManifestIO", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("read", () => {
    it("should read a valid niche manifest YAML", () => {
      const yaml = `
niche_version: "1.0"
id: "niche-001"
declared_position:
  project_name: "payment-api"
  purpose: "Handle payment processing"
  does:
    - "Process transactions"
    - "Manage state machines"
  does_not:
    - "Handle authentication"
strategic_bets:
  - "Stripe over PayPal"
success_signals:
  - "payment:success < 500ms p99"
`;
      const filePath = join(TEST_DIR, "niche.yaml");
      writeFileSync(filePath, yaml, "utf8");

      const manifest = NicheManifestIO.read(filePath);

      expect(manifest.niche_version).toBe("1.0");
      expect(manifest.id).toBe("niche-001");
      expect(manifest.declared_position.project_name).toBe("payment-api");
      expect(manifest.declared_position.does).toHaveLength(2);
      expect(manifest.declared_position.does_not).toHaveLength(1);
      expect(manifest.strategic_bets).toHaveLength(1);
      expect(manifest.success_signals).toHaveLength(1);
    });

    it("should throw on missing file", () => {
      expect(() => NicheManifestIO.read(join(TEST_DIR, "missing.yaml")))
        .toThrow("File not found");
    });

    it("should throw on invalid YAML", () => {
      const filePath = join(TEST_DIR, "bad.yaml");
      writeFileSync(filePath, ": invalid: yaml: :\n", "utf8");

      expect(() => NicheManifestIO.read(filePath))
        .toThrow("Invalid YAML");
    });
  });

  describe("write", () => {
    it("should write a niche manifest to YAML", () => {
      const manifest = {
        niche_version: "1.0" as const,
        id: "niche-002",
        declared_position: {
          project_name: "auth-service",
          purpose: "Handle user authentication",
          does: ["Authenticate users", "Manage sessions"],
          does_not: ["Process payments"],
        },
      };

      const filePath = join(TEST_DIR, "output.yaml");
      NicheManifestIO.write(filePath, manifest);

      const readBack = NicheManifestIO.read(filePath);
      expect(readBack.niche_version).toBe("1.0");
      expect(readBack.declared_position.project_name).toBe("auth-service");
      expect(readBack.declared_position.does).toEqual(["Authenticate users", "Manage sessions"]);
    });
  });

  describe("round-trip", () => {
    it("should preserve all fields through read → write → read", () => {
      const original = `
niche_version: "1.0"
id: "niche-003"
declared_position:
  project_name: "test-project"
  purpose: "Test purpose"
  does:
    - "Do A"
    - "Do B"
  does_not:
    - "Don't C"
strategic_bets:
  - "Bet 1"
  - "Bet 2"
success_signals:
  - "signal-1"
  - "signal-2"
relevant_signals:
  - "vcs:commit:*"
evidence_window_days: 60
drift_thresholds:
  task_drift: 0.3
  collaboration_drift: 0.25
  boundary_drift: 0.15
syn_policy:
  auto_trigger: true
  required_approvers:
    - "admin@example.com"
`;
      const filePath = join(TEST_DIR, "roundtrip.yaml");
      writeFileSync(filePath, original, "utf8");

      const manifest = NicheManifestIO.read(filePath);
      const outputPath = join(TEST_DIR, "roundtrip-out.yaml");
      NicheManifestIO.write(outputPath, manifest);

      const readBack = NicheManifestIO.read(outputPath);
      expect(readBack).toEqual(manifest);
    });
  });

  describe("validate", () => {
    it("should validate a valid manifest", () => {
      const manifest = {
        niche_version: "1.0" as const,
        declared_position: {
          project_name: "test",
          purpose: "test",
          does: ["a"],
          does_not: ["b"],
        },
      };

      const result = NicheManifestIO.validate(manifest);
      expect(result.valid).toBe(true);
    });

    it("should reject a manifest missing required fields", () => {
      const manifest = {
        niche_version: "1.0" as const,
      };

      const result = NicheManifestIO.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
