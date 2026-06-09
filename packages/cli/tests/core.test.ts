import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, 'temp-core');

describe('Core CLI Commands', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('statuz init', () => {
    it('should create a statuz.yaml file', () => {
      const outputPath = resolve(TEST_DIR, 'statuz.yaml');
      const result = execSync(
        `node "${CLI_PATH}" init --agent test-agent --project test-project --out "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Created');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should create valid YAML content', () => {
      const outputPath = resolve(TEST_DIR, 'statuz.yaml');
      execSync(
        `node "${CLI_PATH}" init --agent test-agent --project test-project --out "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('statuz_version: "0.1"');
      expect(content).toContain('agent_name: test-agent');
      expect(content).toContain('project_name: test-project');
    });
  });

  describe('statuz validate', () => {
    it('should validate a valid statuz file', () => {
      const outputPath = resolve(TEST_DIR, 'statuz.yaml');
      execSync(
        `node "${CLI_PATH}" init --agent test-agent --project test-project --out "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" validate "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Valid Statuz file');
    });

    it('should fail on invalid statuz file', () => {
      const outputPath = resolve(TEST_DIR, 'invalid.yaml');
      const invalidContent = 'statuz_version: "999"\nidentity: {}';
      require('fs').writeFileSync(outputPath, invalidContent);

      try {
        execSync(
          `node "${CLI_PATH}" validate "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr || error.stdout).toContain('Error');
      }
    });
  });

  describe('statuz resume', () => {
    it('should output human-readable summary', () => {
      const outputPath = resolve(TEST_DIR, 'statuz.yaml');
      execSync(
        `node "${CLI_PATH}" init --agent test-agent --project test-project --out "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" resume "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('=== Statuz Resume ===');
      expect(result).toContain('Agent:');
      expect(result).toContain('test-agent');
      expect(result).toContain('Project:');
      expect(result).toContain('test-project');
    });
  });
});