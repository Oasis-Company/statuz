import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, 'temp-cluster');

describe('Cluster CLI Commands', () => {
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

  describe('cluster init', () => {
    it('should create a cluster YAML file', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      const result = execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Created cluster');
      expect(result).toContain('test:atlas');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should include required fields in cluster file', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --map "proj-b:2.0.0:infrastructure" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('cluster_version');
      expect(content).toContain('test:atlas');
      expect(content).toContain('Test Atlas');
      expect(content).toContain('cross_map_arrows');
      expect(content).toContain('proj-a');
      expect(content).toContain('proj-b');
    });

    it('should reject invalid cluster ID format', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      try {
        execSync(
          `node "${CLI_PATH}" cluster init --id "invalid-id" --name "Test" --map "proj-a:1.0.0:product" --output "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('should reject invalid scope in map reference', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      try {
        execSync(
          `node "${CLI_PATH}" cluster init --id test:atlas --name "Test" --map "proj-a:1.0.0:invalidscope" --output "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('should reject invalid version format in map reference', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      try {
        execSync(
          `node "${CLI_PATH}" cluster init --id test:atlas --name "Test" --map "proj-a:not-a-version:product" --output "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('cluster validate', () => {
    it('should validate a valid cluster file', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" cluster validate "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Valid cluster');
      expect(result).toContain('test:atlas');
    });

    it('should fail on non-existent file', () => {
      const nonExistent = resolve(TEST_DIR, 'does-not-exist.yaml');
      try {
        execSync(
          `node "${CLI_PATH}" cluster validate "${nonExistent}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('should reject cluster with arrow missing description', () => {
      const outputPath = resolve(TEST_DIR, 'cluster-bad.yaml');
      const invalidContent = `cluster_version: "1.0.0"
id: "test:bad"
name: "Bad Cluster"
maps:
  - map_id: "proj-a"
    version: "1.0.0"
    scope: "product"
cross_map_arrows:
  - id: "arrow-1"
    from_map: "proj-a"
    from_node: "node-a"
    to_map: "proj-a"
    to_node: "node-b"
    type: "dependency"
    description: "short"
`;
      require('fs').writeFileSync(outputPath, invalidContent);

      try {
        execSync(
          `node "${CLI_PATH}" cluster validate "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('cluster show', () => {
    it('should show cluster summary', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --map "proj-b:2.0.0:infrastructure" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" cluster show "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Cluster:');
      expect(result).toContain('Test Atlas');
      expect(result).toContain('Maps: 2');
      expect(result).toContain('proj-a@1.0.0');
      expect(result).toContain('proj-b@2.0.0');
    });
  });

  describe('cluster arrow-add', () => {
    it('should add a cross-map arrow to a cluster', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --map "proj-b:2.0.0:infrastructure" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const result = execSync(
        `node "${CLI_PATH}" cluster arrow-add "${outputPath}" --from-map proj-a --from-node backend --to-map proj-b --to-node logging --type dependency --criticality high --description "Backend API sends structured logs to centralized logging service"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Added cross-map arrow');
      expect(result).toContain('proj-a/backend');
      expect(result).toContain('proj-b/logging');

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('Backend API sends structured logs to centralized logging service');
    });

    it('should reject arrow with short description', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --map "proj-b:2.0.0:infrastructure" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      try {
        execSync(
          `node "${CLI_PATH}" cluster arrow-add "${outputPath}" --from-map proj-a --from-node backend --to-map proj-b --to-node logging --type dependency --description "short"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('should reject arrow with invalid type', () => {
      const outputPath = resolve(TEST_DIR, 'cluster.yaml');
      execSync(
        `node "${CLI_PATH}" cluster init --id test:atlas --name "Test Atlas" --map "proj-a:1.0.0:product" --map "proj-b:2.0.0:infrastructure" --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      try {
        execSync(
          `node "${CLI_PATH}" cluster arrow-add "${outputPath}" --from-map proj-a --from-node backend --to-map proj-b --to-node logging --type invalid-type --description "some meaningful description here"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });
});
