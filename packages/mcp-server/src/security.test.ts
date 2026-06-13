import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { assertSafePath, setAllowedRoots } from "./tools.js";

const TEST_DIR = resolve(process.cwd(), ".test-temp");

function setupTestDir() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(resolve(TEST_DIR, "sub/dir/nested"), { recursive: true });
  mkdirSync(resolve(TEST_DIR, ".git"), { recursive: true });
  mkdirSync(resolve(TEST_DIR, "node_modules"), { recursive: true });
  mkdirSync(resolve(TEST_DIR, ".env"), { recursive: true });
  mkdirSync(resolve(TEST_DIR, ".statuz/private"), { recursive: true });
  mkdirSync(resolve(TEST_DIR, "custom"), { recursive: true });
}

function cleanupTestDir() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("MCP Security Boundary Tests", () => {
  beforeEach(() => {
    setupTestDir();
    setAllowedRoots([TEST_DIR]);
  });

  afterAll(() => {
    cleanupTestDir();
  });

  describe("Path Traversal Protection", () => {
    it("should reject absolute path outside allowed roots", () => {
      expect(() => assertSafePath("/etc/passwd")).toThrow("outside allowed roots");
    });

    it("should reject path traversal with ../", () => {
      expect(() => assertSafePath("../etc/passwd")).toThrow("outside allowed roots");
    });

    it("should reject path traversal with parent directory reference", () => {
      expect(() => assertSafePath("../../../secret.yaml")).toThrow("outside allowed roots");
    });

    it("should allow nested paths within allowed root", () => {
      const nestedPath = resolve(TEST_DIR, "sub/dir/nested/file.yaml");
      writeFileSync(nestedPath, "test: data\n");
      expect(() => assertSafePath(nestedPath)).not.toThrow();
    });
  });

  describe("Sensitive Path Protection", () => {
    it("should reject access to .git directory", () => {
      const gitPath = resolve(TEST_DIR, ".git", "config");
      expect(() => assertSafePath(gitPath)).toThrow("sensitive path");
    });

    it("should reject access to node_modules directory", () => {
      const nodeModulesPath = resolve(TEST_DIR, "node_modules", "malicious.js");
      expect(() => assertSafePath(nodeModulesPath)).toThrow("sensitive path");
    });

    it("should reject access to .env files", () => {
      const envPath = resolve(TEST_DIR, ".env");
      expect(() => assertSafePath(envPath)).toThrow("sensitive path");
    });

    it("should reject access to .env.local files", () => {
      const envPath = resolve(TEST_DIR, ".env.local");
      expect(() => assertSafePath(envPath)).toThrow("sensitive path");
    });

    it("should reject access to .statuz/private directory", () => {
      const privatePath = resolve(TEST_DIR, ".statuz/private", "secret.yaml");
      expect(() => assertSafePath(privatePath)).toThrow("sensitive path");
    });
  });

  describe("Allowed Roots Configuration", () => {
    it("should respect custom allowed roots", () => {
      const customRoot = resolve(TEST_DIR, "custom");
      setAllowedRoots([customRoot]);
      const validPath = resolve(customRoot, "valid.yaml");
      writeFileSync(validPath, "test: data\n");
      expect(() => assertSafePath(validPath)).not.toThrow();
    });

    it("should reject path outside new allowed roots", () => {
      const customRoot = resolve(TEST_DIR, "custom");
      setAllowedRoots([customRoot]);
      const outsidePath = resolve(TEST_DIR, "outside.yaml");
      writeFileSync(outsidePath, "test: data\n");
      expect(() => assertSafePath(outsidePath)).toThrow("outside allowed roots");
    });
  });

  describe("Error Message Sanitization", () => {
    it("should reject path traversal attempts with safe error messages", () => {
      try {
        assertSafePath("/var/www/../../../etc/shadow");
        expect(true).toBe(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toBe("Path is outside allowed roots");
      }
    });
  });
});
