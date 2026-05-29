import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Statuz } from "../src/index.js";
import { existsSync, unlinkSync, rmSync } from "node:fs";

describe("Statuz SDK", () => {
  const testFile = "test-statuz.yaml";
  
  afterEach(() => {
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
    if (existsSync(".statuz")) {
      rmSync(".statuz", { recursive: true, force: true });
    }
  });

  it("should create a new Statuz document", () => {
    const statuz = Statuz.create("test-agent", "test-project");
    expect(statuz.identity.agent_name).toBe("test-agent");
    expect(statuz.identity.project_name).toBe("test-project");
    expect(statuz.currentState.status).toBe("idle");
  });

  it("should write a Statuz document to file", () => {
    const statuz = Statuz.create("test-agent", "test-project");
    statuz.write(testFile);
    expect(existsSync(testFile)).toBe(true);
  });

  it("should read a Statuz document from file", () => {
    const statuz = Statuz.create("test-agent", "test-project");
    statuz.write(testFile);
    
    const readStatuz = Statuz.read(testFile);
    expect(readStatuz.identity.agent_name).toBe("test-agent");
    expect(readStatuz.identity.project_name).toBe("test-project");
  });

  it("should validate a valid Statuz document", () => {
    const statuz = Statuz.create("test-agent", "test-project");
    const result = statuz.validate();
    expect(result.valid).toBe(true);
  });

  it("should append checkpoints correctly", () => {
    const statuz = Statuz.create("test-agent", "test-project");
    
    const cp1 = statuz.appendCheckpoint("First checkpoint", "Do next thing");
    expect(cp1.id).toBe("cp-002");
    expect(cp1.summary).toBe("First checkpoint");
    expect(cp1.next_action).toBe("Do next thing");
    
    const cp2 = statuz.appendCheckpoint("Second checkpoint");
    expect(cp2.id).toBe("cp-003");
    
    expect(statuz.checkpoints.length).toBe(3);
  });

  it("should create or read agent-specific files", () => {
    const statuz = Statuz.forAgent("test-agent", "test-project");
    expect(statuz.identity.agent_name).toBe("test-agent");
    
    const statuz2 = Statuz.forAgent("test-agent", "test-project");
    expect(statuz2.identity.agent_name).toBe("test-agent");
  });

  it("should handle different agents separately", () => {
    const statuz1 = Statuz.forAgent("test-agent", "project-a");
    const statuz2 = Statuz.forAgent("another-agent", "project-b");
    
    expect(statuz1.identity.agent_name).toBe("test-agent");
    expect(statuz2.identity.agent_name).toBe("another-agent");
    expect(statuz1.identity.project_name).toBe("project-a");
    expect(statuz2.identity.project_name).toBe("project-b");
  });
});