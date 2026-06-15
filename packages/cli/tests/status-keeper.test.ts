import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, 'temp-status-keeper');

describe('Status Keeper CLI Commands', () => {
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

  describe('status-keeper init', () => {
    it('should create a default config file', () => {
      const outputPath = resolve(TEST_DIR, 'keeper.yaml');
      const result = execSync(
        `node "${CLI_PATH}" status-keeper init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Status Keeper config');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('should include keeper_version and checks in config', () => {
      const outputPath = resolve(TEST_DIR, 'keeper.yaml');
      execSync(
        `node "${CLI_PATH}" status-keeper init --output "${outputPath}"`,
        { encoding: 'utf8' }
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('keeper_version');
      expect(content).toContain('checks:');
      expect(content).toContain('file_exists');
    });

    it('should not overwrite existing file', () => {
      const outputPath = resolve(TEST_DIR, 'keeper.yaml');
      writeFileSync(outputPath, 'existing content');

      try {
        execSync(
          `node "${CLI_PATH}" status-keeper init --output "${outputPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('status-keeper run', () => {
    it('should run checks and report healthy for valid files', () => {
      const keeperPath = resolve(TEST_DIR, 'keeper.yaml');
      const statuzPath = resolve(TEST_DIR, 'statuz.yaml');

      writeFileSync(statuzPath, `statuz_version: "0.1"
updated_at: "2026-06-15T00:00:00.000Z"
identity:
  agent_name: test-agent
  project_name: test-project
current_state:
  stage: initialization
  task: test
  status: idle
progress:
  completed: []
relations:
  related_agents: []
  related_projects: []
  related_files: []
rules:
  should: []
checkpoints:
  - id: cp-1
    at: "2026-06-15T00:00:00.000Z"
    summary: test
`);

      writeFileSync(keeperPath, `keeper_version: "1.0.0"
checks:
  - type: file_exists
    target: statuz.yaml
    severity: critical
  - type: checkpoint_freshness
    target: statuz.yaml
    severity: warning
    max_age_hours: 168
`);

      const result = execSync(
        `node "${CLI_PATH}" status-keeper run --config "${keeperPath}" --no-save`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('HEALTHY');
      expect(result).toContain('Checks passed');
    });

    it('should save report to file', () => {
      const keeperPath = resolve(TEST_DIR, 'keeper.yaml');
      const reportPath = resolve(TEST_DIR, 'report.yaml');
      const statuzPath = resolve(TEST_DIR, 'statuz.yaml');

      writeFileSync(statuzPath, `statuz_version: "0.1"
updated_at: "2026-06-15T00:00:00.000Z"
identity:
  agent_name: test
  project_name: test
current_state:
  stage: initialization
  task: test
  status: idle
progress:
  completed: []
relations:
  related_agents: []
  related_projects: []
  related_files: []
rules:
  should: []
checkpoints:
  - id: cp-1
    at: "2026-06-15T00:00:00.000Z"
    summary: test
`);

      writeFileSync(keeperPath, `keeper_version: "1.0.0"
checks:
  - type: file_exists
    target: statuz.yaml
    severity: critical
`);

      execSync(
        `node "${CLI_PATH}" status-keeper run --config "${keeperPath}" --output "${reportPath}"`,
        { encoding: 'utf8' }
      );

      expect(existsSync(reportPath)).toBe(true);
      const content = readFileSync(reportPath, 'utf8');
      expect(content).toContain('overall_status');
    });

    it('should fail for missing config file', () => {
      const keeperPath = resolve(TEST_DIR, 'does-not-exist.yaml');

      try {
        execSync(
          `node "${CLI_PATH}" status-keeper run --config "${keeperPath}" --no-save`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('status-keeper show-report', () => {
    it('should display a report file', () => {
      const reportPath = resolve(TEST_DIR, 'report.yaml');

      writeFileSync(reportPath, `report_version: "1.0.0"
generated_at: "2026-06-15T00:00:00.000Z"
overall_status: healthy
checks_passed: 1
checks_failed: 0
critical_issues: 0
warning_issues: 0
results:
  - check_type: file_exists
    target: statuz.yaml
    passed: true
    severity: critical
    message: statuz.yaml exists
    details:
      exists: true
    checked_at: "2026-06-15T00:00:00.000Z"
recommendations:
  - "All checks passed. Continue monitoring."
`);

      const result = execSync(
        `node "${CLI_PATH}" status-keeper show-report "${reportPath}"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('Health Report');
      expect(result).toContain('HEALTHY');
      expect(result).toContain('Passed:    1');
    });

    it('should fail for missing report file', () => {
      const reportPath = resolve(TEST_DIR, 'does-not-exist.yaml');

      try {
        execSync(
          `node "${CLI_PATH}" status-keeper show-report "${reportPath}"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });
});
