import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, 'temp-arrow-map');

describe('Arrow Map CLI Commands', () => {
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

  describe('arrow-map init', () => {
    it('should create an Arrow Map file', () => {
      const outputPath = resolve(TEST_DIR, 'arrow-map.yaml');
      const result = execSync(
        `node "${CLI_PATH}" arrow-map init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Arrow Map created');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should create valid Arrow Map YAML content', () => {
      const outputPath = resolve(TEST_DIR, 'arrow-map.yaml');
      execSync(
        `node "${CLI_PATH}" arrow-map init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('arrow_map_version');
      expect(content).toContain('nodes:');
      expect(content).toContain('arrows:');
    });

    it('should have at least one node', () => {
      const outputPath = resolve(TEST_DIR, 'arrow-map.yaml');
      execSync(
        `node "${CLI_PATH}" arrow-map init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('project-root');
    });
  });

  describe('arrow-map validate', () => {
    it('should validate a valid Arrow Map', () => {
      const outputPath = resolve(TEST_DIR, 'arrow-map.yaml');
      execSync(
        `node "${CLI_PATH}" arrow-map init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" arrow-map validate "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Valid Arrow Map');
    });

    it('should validate the example Arrow Map', () => {
      const examplePath = resolve(__dirname, '../../../66-implementation/examples/arrow-map-example.yaml');
      const result = execSync(
        `node "${CLI_PATH}" arrow-map validate "${examplePath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Valid Arrow Map');
      expect(result).toContain('Nodes: 9');
      expect(result).toContain('Arrows: 10');
    });

    it('should fail on invalid Arrow Map', () => {
      const outputPath = resolve(TEST_DIR, 'invalid.yaml');
      const invalidContent = 'arrow_map_version: "999"\nnodes: []\narrows: []';
      require('fs').writeFileSync(outputPath, invalidContent);

      try {
        execSync(
          `node "${CLI_PATH}" arrow-map validate "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('arrow-map detect --auto', () => {
    it('should run auto detection', () => {
      const result = execSync(
        `node "${CLI_PATH}" arrow-map detect --auto`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Scanning project files');
      expect(result).toContain('Auto-detection complete');
    });

    it('should respect confidence threshold', () => {
      const result = execSync(
        `node "${CLI_PATH}" arrow-map detect --auto --confidence-threshold 0.9`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Above threshold');
    });
  });
});