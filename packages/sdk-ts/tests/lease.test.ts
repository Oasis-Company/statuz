import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LeaseManager } from "../src/lease/manager.js";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const TEST_DIR = resolve(process.cwd(), ".test-lease-temp");

describe("LeaseManager", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("create", () => {
    it("should create a new lease with all required fields", () => {
      const lease = LeaseManager.create({
        id: "ls-001",
        assigner: "project-manager",
        assignee: "dev-agent-1",
        responsibility: "Implement the payment module",
        scope: { task: "Implement payment module" },
        priority: "high",
      });

      expect(lease.lease_version).toBe("0.1");
      expect(lease.id).toBe("ls-001");
      expect(lease.assigner).toBe("project-manager");
      expect(lease.assignee).toBe("dev-agent-1");
      expect(lease.responsibility).toBe("Implement the payment module");
      expect(lease.scope.task).toBe("Implement payment module");
      expect(lease.priority).toBe("high");
      expect(lease.status).toBe("pending");
      expect(lease.created_at).toBeDefined();
      expect(lease.deadline).toBeDefined();
    });

    it("should allow custom deadline and status", () => {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const lease = LeaseManager.create({
        id: "ls-002",
        assigner: "system",
        assignee: "test-agent",
        responsibility: "Test",
        scope: { task: "Test task" },
        priority: "low",
        deadline,
        status: "active",
      });

      expect(lease.status).toBe("active");
      expect(lease.deadline).toBe(deadline);
    });

    it("should include arrow_map_id in scope when provided", () => {
      const lease = LeaseManager.create({
        id: "ls-003",
        assigner: "system",
        assignee: "test-agent",
        responsibility: "Map implementation",
        scope: { task: "Implement node", arrow_map_id: "niche:backend-v1" },
        priority: "medium",
      });

      expect(lease.scope.arrow_map_id).toBe("niche:backend-v1");
    });
  });

  describe("read / write", () => {
    it("should write and read back a lease YAML file", () => {
      const lease = LeaseManager.create({
        id: "ls-100",
        assigner: "test-system",
        assignee: "agent-1",
        responsibility: "Handle test task",
        scope: { task: "Test task", files: ["file1.ts", "file2.ts"] },
        priority: "critical",
      });

      const filePath = join(TEST_DIR, "lease.yaml");
      LeaseManager.write(filePath, lease);
      expect(existsSync(filePath)).toBe(true);

      const readBack = LeaseManager.read(filePath);
      expect(readBack.id).toBe("ls-100");
      expect(readBack.assignee).toBe("agent-1");
      expect(readBack.scope.files).toEqual(["file1.ts", "file2.ts"]);
      expect(readBack.priority).toBe("critical");
    });

    it("should throw on missing file", () => {
      expect(() => LeaseManager.read(join(TEST_DIR, "nonexistent.yaml")))
        .toThrow("File not found");
    });

    it("should throw on invalid YAML", () => {
      const filePath = join(TEST_DIR, "bad.yaml");
      writeFileSync(filePath, ": invalid: yaml:\n", "utf8");
      expect(() => LeaseManager.read(filePath)).toThrow("Invalid YAML");
    });
  });

  describe("validate", () => {
    it("should validate a valid lease object", () => {
      const lease = LeaseManager.create({
        id: "ls-001",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test responsibility",
        scope: { task: "Task" },
        priority: "medium",
      });

      const result = LeaseManager.validate(lease);
      expect(result.valid).toBe(true);
    });

    it("should reject a lease missing required fields", () => {
      const result = LeaseManager.validate({
        id: "ls-001",
        assignee: "agent-1",
      });
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should reject lease with invalid ID pattern", () => {
      const result = LeaseManager.validate({
        lease_version: "0.1",
        id: "invalid-id",
        assigner: "system",
        assignee: "agent",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "high",
        status: "pending",
        deadline: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      expect(result.valid).toBe(false);
    });

    it("should validate a file via validateFile", () => {
      const lease = LeaseManager.create({
        id: "ls-200",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });
      const filePath = join(TEST_DIR, "valid-lease.yaml");
      LeaseManager.write(filePath, lease);

      const result = LeaseManager.validateFile(filePath);
      expect(result.valid).toBe(true);
    });

    it("should return error for missing file via validateFile", () => {
      const result = LeaseManager.validateFile(join(TEST_DIR, "missing.yaml"));
      expect(result.valid).toBe(false);
      expect(result.errors!.length).toBe(1);
    });
  });

  describe("accept", () => {
    it("should mark a lease as accepted and record timestamp", () => {
      const lease = LeaseManager.create({
        id: "ls-300",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      const accepted = LeaseManager.accept(lease, "agent-1", "I accept this lease");
      expect(accepted.status).toBe("accepted");
      expect(accepted.accepted_at).toBeDefined();
      expect(accepted.next_action).toBe("I accept this lease");
    });
  });

  describe("report", () => {
    it("should append a progress checkpoint to a lease", () => {
      const lease = LeaseManager.create({
        id: "ls-400",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      const reported = LeaseManager.report(lease, {
        summary: "Completed 50% of the implementation",
        next_action: "Continue with remaining 50%",
        status: "active",
      });

      expect(reported.status).toBe("active");
      expect(reported.checkpoints).toHaveLength(1);
      expect(reported.checkpoints![0].id).toBe("ls-400-cp-01");
      expect(reported.checkpoints![0].summary).toBe("Completed 50% of the implementation");
      expect(reported.next_action).toBe("Continue with remaining 50%");
    });

    it("should increment checkpoint IDs for multiple reports", () => {
      let lease = LeaseManager.create({
        id: "ls-401",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      lease = LeaseManager.report(lease, { summary: "Report 1" });
      lease = LeaseManager.report(lease, { summary: "Report 2" });
      lease = LeaseManager.report(lease, { summary: "Report 3" });

      expect(lease.checkpoints).toHaveLength(3);
      expect(lease.checkpoints![0].id).toBe("ls-401-cp-01");
      expect(lease.checkpoints![1].id).toBe("ls-401-cp-02");
      expect(lease.checkpoints![2].id).toBe("ls-401-cp-03");
    });
  });

  describe("lifecycle transitions", () => {
    it("should revoke a lease", () => {
      const lease = LeaseManager.create({
        id: "ls-500",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      const revoked = LeaseManager.revoke(lease);
      expect(revoked.status).toBe("revoked");
    });

    it("should complete a lease with notes", () => {
      const lease = LeaseManager.create({
        id: "ls-501",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      const completed = LeaseManager.complete(lease, "All deliverables done");
      expect(completed.status).toBe("completed");
      expect(completed.completed_at).toBeDefined();
      expect(completed.checkpoints).toHaveLength(1);
      expect(completed.checkpoints![0].summary).toBe("All deliverables done");
    });

    it("should expire a lease manually", () => {
      const lease = LeaseManager.create({
        id: "ls-502",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
      });

      const expired = LeaseManager.expire(lease);
      expect(expired.status).toBe("expired");
    });
  });

  describe("checkExpiry", () => {
    it("should mark a lease as expired when past deadline", () => {
      const pastDeadline = new Date(Date.now() - 1000).toISOString();
      const lease = LeaseManager.create({
        id: "ls-600",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
        deadline: pastDeadline,
        status: "active",
      });

      const checked = LeaseManager.checkExpiry(lease);
      expect(checked.status).toBe("expired");
    });

    it("should not mark a lease as expired before deadline", () => {
      const futureDeadline = new Date(Date.now() + 100000).toISOString();
      const lease = LeaseManager.create({
        id: "ls-601",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
        deadline: futureDeadline,
        status: "active",
      });

      const checked = LeaseManager.checkExpiry(lease);
      expect(checked.status).toBe("active");
    });

    it("should not change status of completed/revoked leases", () => {
      const pastDeadline = new Date(Date.now() - 1000).toISOString();
      const lease = LeaseManager.create({
        id: "ls-602",
        assigner: "system",
        assignee: "agent-1",
        responsibility: "Test",
        scope: { task: "Task" },
        priority: "medium",
        deadline: pastDeadline,
        status: "completed",
      });

      const checked = LeaseManager.checkExpiry(lease);
      expect(checked.status).toBe("completed");
    });
  });

  describe("list", () => {
    it("should list all leases in a directory", () => {
      for (let i = 1; i <= 3; i++) {
        const lease = LeaseManager.create({
          id: `ls-${String(i).padStart(3, "0")}`,
          assigner: "system",
          assignee: i % 2 === 0 ? "agent-a" : "agent-b",
          responsibility: `Task ${i}`,
          scope: { task: `Task ${i}` },
          priority: i === 1 ? "high" : "medium",
          status: i === 3 ? "completed" : "active",
        });
        LeaseManager.write(join(TEST_DIR, `lease-${i}.yaml`), lease);
      }

      const all = LeaseManager.list(TEST_DIR);
      expect(all.length).toBe(3);

      const active = LeaseManager.list(TEST_DIR, { status: "active" });
      expect(active.length).toBe(2);

      const agentA = LeaseManager.list(TEST_DIR, { assignee: "agent-a" });
      expect(agentA.length).toBe(1);
      expect(agentA[0].assignee).toBe("agent-a");

      const highPriority = LeaseManager.list(TEST_DIR, { priority: "high" });
      expect(highPriority.length).toBe(1);
    });

    it("should return empty array for non-existent directory", () => {
      const leases = LeaseManager.list(join(TEST_DIR, "does-not-exist"));
      expect(leases).toEqual([]);
    });
  });

  describe("full lifecycle round-trip", () => {
    it("should support create -> accept -> report -> complete -> file", () => {
      const filePath = join(TEST_DIR, "lifecycle.yaml");
      let lease = LeaseManager.create({
        id: "ls-700",
        assigner: "pm-agent",
        assignee: "dev-agent",
        responsibility: "Build feature X",
        scope: { task: "Build feature X", files: ["src/x.ts"] },
        priority: "high",
      });

      lease = LeaseManager.accept(lease, "dev-agent", "Accepting assignment");
      expect(lease.status).toBe("accepted");

      lease = LeaseManager.report(lease, {
        summary: "Started implementation",
        next_action: "Implement core logic",
        status: "active",
      });
      lease = LeaseManager.report(lease, {
        summary: "Core logic implemented, writing tests",
        next_action: "Run test suite",
        status: "active",
      });
      expect(lease.checkpoints).toHaveLength(2);

      lease = LeaseManager.complete(lease, "Feature X delivered and tested");
      expect(lease.status).toBe("completed");

      LeaseManager.write(filePath, lease);
      const readBack = LeaseManager.read(filePath);
      expect(readBack.status).toBe("completed");
      expect(readBack.checkpoints).toHaveLength(3);

      const validation = LeaseManager.validateFile(filePath);
      expect(validation.valid).toBe(true);
    });
  });
});
