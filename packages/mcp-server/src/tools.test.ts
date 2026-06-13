import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getTools, setAllowedRoots } from "./tools.js";

const TEST_DIR = resolve(process.cwd(), ".mcp-test-temp");

function setupTestDir() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  setAllowedRoots([TEST_DIR]);
}

function cleanupTestDir() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("MCP Tools End-to-End Tests", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterAll(() => {
    cleanupTestDir();
  });

  describe("statuz_init", () => {
    it("should create a new statuz file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");
      const result = await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });

      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should fail if file already exists", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");
      writeFileSync(filePath, "test: data\n");

      const result = await tools.statuz_init({ filePath });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("statuz_read", () => {
    it("should read a statuz file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_read({ filePath });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const doc = result.data as any;
      expect(doc.identity).toBeDefined();
      expect(doc.identity.agent_name).toBe("test-agent");
    });

    it("should fail for non-existent file", async () => {
      const tools = getTools();
      const result = await tools.statuz_read({ filePath: resolve(TEST_DIR, "does-not-exist.yaml") });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("statuz_validate", () => {
    it("should validate a valid statuz file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_validate({ path: filePath });

      expect(result.success).toBe(true);
      expect((result.data as any).valid).toBe(true);
    });
  });

  describe("statuz_checkpoint", () => {
    it("should append a checkpoint to a statuz file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_checkpoint({
        filePath,
        summary: "First checkpoint - setup complete",
        nextAction: "Start working",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.message).toContain("Checkpoint");
      expect(data.checkpoint).toBeDefined();
      expect(data.checkpoint.summary).toBe("First checkpoint - setup complete");
    });

    it("should work with only summary", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_checkpoint({
        filePath,
        summary: "Just a summary",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("statuz_update_status", () => {
    it("should update status fields", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_update_status({
        filePath,
        status: "in_progress",
        stage: "implementation",
        task: "Building feature X",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.updatedFields.status).toBe("in_progress");
      expect(data.updatedFields.stage).toBe("implementation");
    });

    it("should update only specified fields", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_update_status({
        filePath,
        status: "blocked",
      });

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.updatedFields.status).toBe("blocked");
      expect(data.updatedFields.stage).toBeUndefined();
    });
  });

  describe("statuz_resume", () => {
    it("should generate a human-readable summary", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      await tools.statuz_update_status({ filePath, status: "in_progress", stage: "implementation" });

      const result = await tools.statuz_resume({ path: filePath });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.brief).toBeDefined();
      expect(data.brief).toContain("test-agent");
      expect(data.summary.status).toBe("in_progress");
    });

    it("should fail for invalid path", async () => {
      const tools = getTools();
      const result = await tools.statuz_resume({ path: resolve(TEST_DIR, "nope.yaml") });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("statuz_update", () => {
    it("should update a field using dot notation", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_update({
        path: filePath,
        field: "current_state.status",
        value: "completed",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.field).toBe("current_state.status");
      expect(data.value).toBe("completed");
    });
  });

  describe("statuz_get_resume_brief", () => {
    it("should return a brief summary", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "statuz.yaml");

      await tools.statuz_init({ filePath, agentName: "test-agent", projectName: "test-project" });
      const result = await tools.statuz_get_resume_brief({ filePath });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.brief).toBeDefined();
      expect(data.summary).toBeDefined();
    });
  });

  describe("workflow integration", () => {
    it("should support full workflow: init -> update -> checkpoint -> resume", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "workflow.yaml");

      const initResult = await tools.statuz_init({
        filePath,
        agentName: "workflow-agent",
        projectName: "workflow-project",
      });
      expect(initResult.success).toBe(true);

      const updateResult = await tools.statuz_update_status({
        filePath,
        status: "in_progress",
        stage: "testing",
        task: "Running integration tests",
      });
      expect(updateResult.success).toBe(true);

      const checkpointResult = await tools.statuz_checkpoint({
        filePath,
        summary: "Tests passed, moving to review",
        nextAction: "Submit for review",
      });
      expect(checkpointResult.success).toBe(true);

      const resumeResult = await tools.statuz_resume({ path: filePath });
      expect(resumeResult.success).toBe(true);

      const brief = (resumeResult.data as any).brief;
      expect(brief).toContain("workflow-agent");
      expect(brief).toContain("in_progress");
    });
  });

  describe("niche manifest", () => {
    describe("statuz_niche_manifest_init", () => {
      it("should create a valid niche manifest", async () => {
        const tools = getTools();
        const filePath = resolve(TEST_DIR, "niche-manifest.yaml");

        const result = await tools.statuz_niche_manifest_init({
          filePath,
          projectName: "my-project",
          purpose: "Test niche manifest",
        });

        expect(result.success).toBe(true);
        expect(existsSync(filePath)).toBe(true);

        const doc = (result.data as any).document;
        expect(doc.niche_version).toBe("1.0");
        expect(doc.declared_position.project_name).toBe("my-project");
        expect(doc.declared_position.purpose).toBe("Test niche manifest");
      });

      it("should fail if file already exists", async () => {
        const tools = getTools();
        const filePath = resolve(TEST_DIR, "niche-manifest-exists.yaml");
        writeFileSync(filePath, "existing: true\n", "utf-8");

        const result = await tools.statuz_niche_manifest_init({
          filePath,
          projectName: "project",
          purpose: "purpose",
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe("statuz_niche_manifest_read", () => {
      it("should read a niche manifest created by init", async () => {
        const tools = getTools();
        const filePath = resolve(TEST_DIR, "niche-manifest-read.yaml");

        await tools.statuz_niche_manifest_init({
          filePath,
          projectName: "read-test",
          purpose: "read purpose",
        });

        const result = await tools.statuz_niche_manifest_read({ filePath });
        expect(result.success).toBe(true);

        const data = result.data as any;
        expect(data.niche_version).toBe("1.0");
        expect(data.declared_position.project_name).toBe("read-test");
      });

      it("should fail for non-existent file", async () => {
        const tools = getTools();
        const result = await tools.statuz_niche_manifest_read({
          filePath: resolve(TEST_DIR, "does-not-exist.yaml"),
        });
        expect(result.success).toBe(false);
      });
    });

    describe("statuz_niche_manifest_validate", () => {
      it("should validate a valid manifest", async () => {
        const tools = getTools();
        const filePath = resolve(TEST_DIR, "niche-manifest-valid.yaml");

        await tools.statuz_niche_manifest_init({
          filePath,
          projectName: "p",
          purpose: "p2",
        });

        const result = await tools.statuz_niche_manifest_validate({ filePath });
        expect(result.success).toBe(true);
        expect((result.data as any).valid).toBe(true);
      });
    });

    describe("statuz_niche_manifest_summary", () => {
      it("should produce a readable summary", async () => {
        const tools = getTools();
        const filePath = resolve(TEST_DIR, "niche-manifest-summary.yaml");

        await tools.statuz_niche_manifest_init({
          filePath,
          projectName: "summary-project",
          purpose: "summary purpose",
        });

        const result = await tools.statuz_niche_manifest_summary({ filePath });
        expect(result.success).toBe(true);
        const brief = (result.data as any).brief as string;
        expect(brief).toContain("summary-project");
        expect(brief).toContain("=== Niche Manifest Summary ===");
      });
    });
  });

  describe("niche context", () => {
    it("statuz_niche_context_write should create file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-context.yaml");

      const result = await tools.statuz_niche_context_write({
        filePath,
        id: "ctx-001",
        fromAgent: "agent-a",
        toAgent: "agent-b",
        summary: "Need help with X",
        requestedAction: "Review and respond",
      });

      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);

      const doc = (result.data as any).document;
      expect(doc.id).toBe("ctx-001");
      expect(doc.from_agent).toBe("agent-a");
      expect(doc.to_agent).toBe("agent-b");
      expect(doc.summary).toBe("Need help with X");
      expect(doc.requested_action).toBe("Review and respond");
      expect(doc.timestamp).toBeDefined();
    });

    it("statuz_niche_context_read should return context", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-context-read.yaml");

      await tools.statuz_niche_context_write({
        filePath,
        id: "ctx-002",
        fromAgent: "src",
        toAgent: "dst",
        summary: "help",
        requestedAction: "act",
      });

      const result = await tools.statuz_niche_context_read({ filePath });
      expect(result.success).toBe(true);
      expect((result.data as any).id).toBe("ctx-002");
    });

    it("statuz_niche_context_validate should return valid=true for a valid context", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-context-val.yaml");

      await tools.statuz_niche_context_write({
        filePath,
        id: "ctx-003",
        fromAgent: "a",
        toAgent: "b",
        summary: "s",
        requestedAction: "r",
      });

      const result = await tools.statuz_niche_context_validate({ filePath });
      expect(result.success).toBe(true);
    });
  });

  describe("niche signal", () => {
    it("statuz_niche_signal_write should create file", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-signal.yaml");

      const result = await tools.statuz_niche_signal_write({
        filePath,
        id: "sig-001",
        type: "dependency_update",
        source: "npm",
        summary: "Package X was updated to v2",
      });

      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);

      const doc = (result.data as any).document;
      expect(doc.id).toBe("sig-001");
      expect(doc.type).toBe("dependency_update");
      expect(doc.source).toBe("npm");
      expect(doc.summary).toBe("Package X was updated to v2");
    });

    it("statuz_niche_signal_read should return signal", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-signal-read.yaml");

      await tools.statuz_niche_signal_write({
        filePath,
        id: "sig-002",
        type: "t",
        source: "s",
        summary: "sm",
      });

      const result = await tools.statuz_niche_signal_read({ filePath });
      expect(result.success).toBe(true);
      expect((result.data as any).id).toBe("sig-002");
    });

    it("statuz_niche_signal_validate should return valid=true for a valid signal", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "niche-signal-val.yaml");

      await tools.statuz_niche_signal_write({
        filePath,
        id: "sig-003",
        type: "t",
        source: "s",
        summary: "sm",
      });

      const result = await tools.statuz_niche_signal_validate({ filePath });
      expect(result.success).toBe(true);
    });
  });

  describe("niche end-to-end workflow", () => {
    it("should support: manifest init -> context write -> signal write -> read all", async () => {
      const tools = getTools();
      const base = resolve(TEST_DIR, "niche-workflow");

      const initResult = await tools.statuz_niche_manifest_init({
        filePath: resolve(base, "manifest.yaml"),
        projectName: "workflow-niche",
        purpose: "Test niche e2e workflow",
      });
      expect(initResult.success).toBe(true);

      const contextResult = await tools.statuz_niche_context_write({
        filePath: resolve(base, "context.yaml"),
        id: "ctx-workflow-001",
        fromAgent: "agent-x",
        toAgent: "agent-y",
        summary: "Workflow context summary",
        requestedAction: "Respond to context",
      });
      expect(contextResult.success).toBe(true);

      const signalResult = await tools.statuz_niche_signal_write({
        filePath: resolve(base, "signal.yaml"),
        id: "sig-workflow-001",
        type: "status_change",
        source: "agent-x",
        summary: "Agent x moved to review",
      });
      expect(signalResult.success).toBe(true);

      const manifestRead = await tools.statuz_niche_manifest_read({
        filePath: resolve(base, "manifest.yaml"),
      });
      expect(manifestRead.success).toBe(true);
      expect((manifestRead.data as any).declared_position.project_name).toBe("workflow-niche");

      const summaryResult = await tools.statuz_niche_manifest_summary({
        filePath: resolve(base, "manifest.yaml"),
      });
      expect(summaryResult.success).toBe(true);
      expect((summaryResult.data as any).brief).toContain("workflow-niche");
    });
  });

  describe("niche syn (human sync)", () => {
    it("statuz_niche_syn_request_create should create a request", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "syn-request.yaml");

      const result = await tools.statuz_niche_syn_request_create({
        filePath,
        summary: "Run CREATE TABLE orders in Supabase dashboard",
        priority: "high",
        source: "agent-dev",
        options: [
          { id: "opt-done", title: "Done", description: "SQL was executed" },
          { id: "opt-blocked", title: "Blocked", description: "Could not execute" },
        ],
        recommendation: "opt-done",
        context: {
          sql_script: "CREATE TABLE orders (id uuid PRIMARY KEY);",
          dashboard_url: "https://app.supabase.com/project/xxx/sql",
        },
      });

      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);
      const doc = (result.data as any).document;
      expect(doc.syn_version).toBe("1.0");
      expect(doc.id).toMatch(/^syn-\d{3}$/);
      expect(doc.type).toBe("human_decision_required");
      expect(doc.priority).toBe("high");
      expect((result.data as any).id).toMatch(/^syn-\d{3}$/);
    });

    it("statuz_niche_syn_request_read should return request contents", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "syn-read-request.yaml");

      await tools.statuz_niche_syn_request_create({
        filePath,
        summary: "Request for read test",
        priority: "medium",
        source: "agent-tester",
        options: [{ id: "x", title: "X", description: "test" }],
        recommendation: "x",
      });

      const result = await tools.statuz_niche_syn_request_read({ filePath });
      expect(result.success).toBe(true);
      expect((result.data as any).summary).toContain("read test");
      expect((result.data as any).recommendation).toBe("x");
    });

    it("statuz_niche_syn_request_validate should pass for generated files", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "syn-validate.yaml");

      await tools.statuz_niche_syn_request_create({
        filePath,
        summary: "Validation test",
        priority: "low",
        source: "agent-tester",
        options: [{ id: "a", title: "A", description: "opt" }],
        recommendation: "a",
      });

      const result = await tools.statuz_niche_syn_request_validate({ filePath });
      expect(result.success).toBe(true);
    });

    it("statuz_niche_syn_resolution_create should mark a request as resolved", async () => {
      const tools = getTools();
      const reqPath = resolve(TEST_DIR, "syn-resolution-test.yaml");
      const createResult = await tools.statuz_niche_syn_request_create({
        filePath: reqPath,
        summary: "Resolution test request",
        priority: "medium",
        source: "agent-tester",
        options: [
          { id: "opt-done", title: "Done", description: "action done" },
          { id: "opt-skip", title: "Skip", description: "not needed" },
        ],
        recommendation: "opt-done",
      });
      const requestId = (createResult.data as any).id as string;

      const resPath = resolve(TEST_DIR, `${requestId}-resolution.yaml`);
      const result = await tools.statuz_niche_syn_resolution_create({
        filePath: resPath,
        synRequestId: requestId,
        decision: "opt-done",
        decisionSummary: "SQL executed in Supabase dashboard successfully",
        rationale: "Manual click-run in dashboard, no errors reported",
        principal: "human@example.com",
        nextSteps: ["Write API layer", "Add tests"],
      });

      expect(result.success).toBe(true);
      expect(existsSync(resPath)).toBe(true);
      const doc = (result.data as any).document;
      expect(doc.syn_resolution_version).toBe("1.0");
      expect(doc.decision).toBe("opt-done");
      expect(doc.principal).toBe("human@example.com");
      expect((doc.next_steps as string[]).length).toBeGreaterThan(0);
    });

    it("statuz_niche_syn_resolution_read should return resolution contents", async () => {
      const tools = getTools();
      const filePath = resolve(TEST_DIR, "syn-res-read.yaml");
      const requestId = "syn-tester-res";

      await tools.statuz_niche_syn_resolution_create({
        filePath,
        synRequestId: requestId,
        decision: "opt-done",
        decisionSummary: "done",
        rationale: "because",
        principal: "tester",
      });

      const result = await tools.statuz_niche_syn_resolution_read({ filePath });
      expect(result.success).toBe(true);
      expect((result.data as any).syn_request_id).toBe(requestId);
    });

    it("statuz_niche_syn_request_list_pending should list only unresolved requests", async () => {
      const tools = getTools();
      const base = resolve(TEST_DIR, "syn-pending");

      // request A — leave pending
      await tools.statuz_niche_syn_request_create({
        filePath: resolve(base, "syn-pending-a.yaml"),
        summary: "Request A (pending)",
        priority: "high",
        source: "agent-tester",
        options: [{ id: "x", title: "X", description: "test" }],
        recommendation: "x",
      });

      // request B — resolve it
      const bResult = await tools.statuz_niche_syn_request_create({
        filePath: resolve(base, "syn-pending-b.yaml"),
        summary: "Request B (resolved)",
        priority: "low",
        source: "agent-tester",
        options: [{ id: "y", title: "Y", description: "test" }],
        recommendation: "y",
      });
      const bId = (bResult.data as any).id as string;
      await tools.statuz_niche_syn_resolution_create({
        filePath: resolve(base, `${bId}-resolution.yaml`),
        synRequestId: bId,
        decision: "y",
        decisionSummary: "done",
        rationale: "done",
        principal: "tester",
      });

      // request C — leave pending, critical
      await tools.statuz_niche_syn_request_create({
        filePath: resolve(base, "syn-pending-c.yaml"),
        summary: "Request C (pending, critical)",
        priority: "critical",
        source: "agent-tester",
        options: [{ id: "z", title: "Z", description: "test" }],
        recommendation: "z",
      });

      const result = await tools.statuz_niche_syn_request_list_pending({ directory: base });
      expect(result.success).toBe(true);

      const data = result.data as any;
      expect(data.count).toBe(2);
      expect(data.pending.length).toBe(2);
      // critical should come before high
      expect(data.pending[0].priority).toBe("critical");
      expect(data.pending[0].summary).toContain("Request C");
      expect(data.pending[1].priority).toBe("high");
      expect(data.pending[1].summary).toContain("Request A");
    });

    it("statuz_niche_syn_request_list_pending should handle empty/non-existent directory", async () => {
      const tools = getTools();
      const empty = resolve(TEST_DIR, "syn-pending-empty");

      // Non-existent directory — should succeed with 0 pending
      const result1 = await tools.statuz_niche_syn_request_list_pending({ directory: empty });
      expect(result1.success).toBe(true);
      expect((result1.data as any).count).toBe(0);

      // Empty directory — should also succeed with 0
      const dir1 = resolve(TEST_DIR, "syn-pending-empty2");
      mkdirSync(dir1, { recursive: true });
      const result2 = await tools.statuz_niche_syn_request_list_pending({ directory: dir1 });
      expect(result2.success).toBe(true);
      expect((result2.data as any).count).toBe(0);
    });
  });
});
