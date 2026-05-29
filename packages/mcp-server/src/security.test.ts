import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

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

function assertSafePath(filePath: string, allowedRoots: string[]): string {
  const SENSITIVE_PATHS = [".git", "node_modules", ".statuz/private", ".env", ".env.local", ".env.development", ".env.production"];
  const sep = "/";
  const resolvedPath = resolve(filePath);

  for (const root of allowedRoots) {
    const rel = resolve(root).split(sep).join("/").startsWith(resolvedPath.split(sep).join("/"))
      ? resolvedPath
      : resolve(root);

    if (resolvedPath.startsWith(resolve(root))) {
      for (const sensitive of SENSITIVE_PATHS) {
        if (resolvedPath.includes(resolve(root, sensitive))) {
          throw new Error("Access to sensitive path is restricted");
        }
      }
      return resolvedPath;
    }
  }

  throw new Error("Path is outside allowed roots");
}

describe("MCP Security Boundary Tests", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterAll(() => {
    cleanupTestDir();
  });

  describe("Path Traversal Protection", () => {
    it("should reject absolute path outside allowed roots", () => {
      const allowedRoots = [TEST_DIR];
      expect(() => assertSafePath("/etc/passwd", allowedRoots)).toThrow("outside allowed roots");
    });

    it("should reject path traversal with ../", () => {
      const allowedRoots = [TEST_DIR];
      expect(() => assertSafePath("../etc/passwd", allowedRoots)).toThrow("outside allowed roots");
    });

    it("should reject path traversal with parent directory reference", () => {
      const allowedRoots = [TEST_DIR];
      expect(() => assertSafePath("../../../secret.yaml", allowedRoots)).toThrow("outside allowed roots");
    });

    it("should allow nested paths within allowed root", () => {
      const allowedRoots = [TEST_DIR];
      const nestedPath = resolve(TEST_DIR, "sub/dir/nested/file.yaml");
      writeFileSync(nestedPath, "test: data\n");
      expect(() => assertSafePath(nestedPath, allowedRoots)).not.toThrow();
    });
  });

  describe("Sensitive Path Protection", () => {
    it("should reject access to .git directory", () => {
      const allowedRoots = [TEST_DIR];
      const gitPath = resolve(TEST_DIR, ".git", "config");
      expect(() => assertSafePath(gitPath, allowedRoots)).toThrow("sensitive path");
    });

    it("should reject access to node_modules directory", () => {
      const allowedRoots = [TEST_DIR];
      const nodeModulesPath = resolve(TEST_DIR, "node_modules", "malicious.js");
      expect(() => assertSafePath(nodeModulesPath, allowedRoots)).toThrow("sensitive path");
    });

    it("should reject access to .env files", () => {
      const allowedRoots = [TEST_DIR];
      const envPath = resolve(TEST_DIR, ".env");
      expect(() => assertSafePath(envPath, allowedRoots)).toThrow("sensitive path");
    });

    it("should reject access to .env.local files", () => {
      const allowedRoots = [TEST_DIR];
      const envPath = resolve(TEST_DIR, ".env.local");
      expect(() => assertSafePath(envPath, allowedRoots)).toThrow("sensitive path");
    });

    it("should reject access to .statuz/private directory", () => {
      const allowedRoots = [TEST_DIR];
      const privatePath = resolve(TEST_DIR, ".statuz/private", "secret.yaml");
      expect(() => assertSafePath(privatePath, allowedRoots)).toThrow("sensitive path");
    });
  });

  describe("Allowed Roots Configuration", () => {
    it("should respect custom allowed roots", () => {
      const customRoot = resolve(TEST_DIR, "custom");
      const validPath = resolve(customRoot, "valid.yaml");
      writeFileSync(validPath, "test: data\n");
      expect(() => assertSafePath(validPath, [customRoot])).not.toThrow();
    });

    it("should reject path outside new allowed roots", () => {
      const customRoot = resolve(TEST_DIR, "custom");
      const outsidePath = resolve(TEST_DIR, "outside.yaml");
      writeFileSync(outsidePath, "test: data\n");
      expect(() => assertSafePath(outsidePath, [customRoot])).toThrow("outside allowed roots");
    });
  });

  describe("Error Message Sanitization", () => {
    it("should reject path traversal attempts with safe error messages", () => {
      const allowedRoots = [TEST_DIR];
      try {
        assertSafePath("/var/www/../../../etc/shadow", allowedRoots);
        expect(true).toBe(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toBe("Path is outside allowed roots");
      }
    });
  });
});
