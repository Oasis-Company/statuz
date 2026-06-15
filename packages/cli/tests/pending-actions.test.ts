import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, 'temp-pending-actions');

function runCmd(cmd: string): string {
  return execSync(`node "${CLI_PATH}" ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

describe('Pending Actions CLI Commands', () => {
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

  describe('add', () => {
    it('creates a new pending-actions file and adds the first action', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      const result = runCmd(
        `pending-actions add --title "Test action" --assigned-to human --priority high --output "${outputPath}"`
      );

      expect(result).toContain('Created');
      expect(result).toContain('pa-001');
      expect(result).toContain('Test action');
      expect(existsSync(outputPath)).toBe(true);
    });

    it('auto-increments IDs when adding to existing file', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "First action" --assigned-to human --priority high --output "${outputPath}"`
      );
      runCmd(
        `pending-actions add --title "Second action" --assigned-to agent --priority medium --output "${outputPath}"`
      );
      const result = runCmd(
        `pending-actions add --title "Third action" --assigned-to human --priority low --output "${outputPath}"`
      );

      expect(result).toContain('pa-003');
      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('pa-001');
      expect(content).toContain('pa-002');
      expect(content).toContain('pa-003');
    });

    it('includes description when provided', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Run npm install" --description "Install all deps in packages/cli" --assigned-to human --priority high --output "${outputPath}"`
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('Install all deps in packages/cli');
    });

    it('rejects invalid priority', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      try {
        runCmd(
          `pending-actions add --title "Test" --assigned-to human --priority invalid --output "${outputPath}"`
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('rejects invalid assigned-to', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      try {
        runCmd(
          `pending-actions add --title "Test" --assigned-to invalid --priority high --output "${outputPath}"`
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('list', () => {
    it('lists all pending actions in a table format', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );
      runCmd(
        `pending-actions add --title "Task two" --assigned-to agent --priority critical --output "${outputPath}"`
      );

      const result = runCmd(`pending-actions list --path "${outputPath}"`);
      expect(result).toContain('Task one');
      expect(result).toContain('Task two');
      expect(result).toContain('pa-001');
      expect(result).toContain('pa-002');
      expect(result).toContain('Total: 2');
      expect(result).toContain('Pending: 2');
      expect(result).toContain('Critical: 1');
    });

    it('filters by status', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );
      runCmd(
        `pending-actions add --title "Task two" --assigned-to agent --priority medium --output "${outputPath}"`
      );
      runCmd(
        `pending-actions resolve pa-001 --status done --outcome "Done OK" --resolved-by tester --path "${outputPath}"`
      );

      const result = runCmd(`pending-actions list --status pending --path "${outputPath}"`);
      expect(result).toContain('Task two');
      expect(result).toContain('pa-002');
    });

    it('filters by priority', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "High priority" --assigned-to human --priority high --output "${outputPath}"`
      );
      runCmd(
        `pending-actions add --title "Medium priority" --assigned-to human --priority medium --output "${outputPath}"`
      );

      const result = runCmd(`pending-actions list --priority high --path "${outputPath}"`);
      expect(result).toContain('High priority');
      expect(result).not.toContain('Medium priority');
    });
  });

  describe('show', () => {
    it('displays full details of a pending action', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Complex task" --description "Multi-step task needing human intervention" --assigned-to human --priority critical --output "${outputPath}"`
      );

      const result = runCmd(`pending-actions show pa-001 --path "${outputPath}"`);
      expect(result).toContain('Complex task');
      expect(result).toContain('Multi-step task needing human intervention');
      expect(result.toLowerCase()).toContain('critical');
      expect(result).toContain('human');
      expect(result).toContain('agent');
    });

    it('errors on non-existent action', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      try {
        runCmd(`pending-actions show pa-999 --path "${outputPath}"`);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('update-status', () => {
    it('updates the status of a pending action', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      const result = runCmd(
        `pending-actions update-status pa-001 --status in_progress --path "${outputPath}"`
      );

      expect(result).toContain('IN_PROGRESS');
      const list = runCmd(`pending-actions list --path "${outputPath}"`);
      expect(list).toContain('In_progress: 1');
    });

    it('attaches human notes', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      runCmd(
        `pending-actions update-status pa-001 --status blocked --notes "Waiting for IT to unblock VPN access" --path "${outputPath}"`
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('Waiting for IT to unblock VPN access');
    });

    it('rejects invalid status', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      try {
        runCmd(`pending-actions update-status pa-001 --status invalid --path "${outputPath}"`);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('resolve', () => {
    it('resolves a pending action as done', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      const result = runCmd(
        `pending-actions resolve pa-001 --status done --outcome "Successfully installed all packages" --resolved-by ceaserzhao --path "${outputPath}"`
      );

      expect(result).toContain('DONE');
      expect(result).toContain('Successfully installed');

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('ceaserzhao');
      expect(content).toContain('done');
    });

    it('resolves a pending action as cancelled', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      runCmd(
        `pending-actions resolve pa-001 --status cancelled --outcome "No longer needed" --resolved-by tester --path "${outputPath}"`
      );

      const content = readFileSync(outputPath, 'utf8');
      expect(content).toContain('cancelled');
      expect(content).toContain('No longer needed');
    });

    it('rejects invalid resolution status', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      try {
        runCmd(
          `pending-actions resolve pa-001 --status pending --outcome "test" --resolved-by tester --path "${outputPath}"`
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('remove', () => {
    it('removes a pending action from the file', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );
      runCmd(
        `pending-actions add --title "Task two" --assigned-to agent --priority medium --output "${outputPath}"`
      );

      const result = runCmd(`pending-actions remove pa-001 --path "${outputPath}"`);
      expect(result).toContain('Removed pa-001');

      const content = readFileSync(outputPath, 'utf8');
      expect(content).not.toContain('Task one');
      expect(content).toContain('Task two');
    });

    it('errors when removing non-existent action', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      try {
        runCmd(`pending-actions remove pa-999 --path "${outputPath}"`);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('validate', () => {
    it('validates minimal fixture against schema', () => {
      const fixturePath = resolve(__dirname, '../../../spec/fixtures/valid/pending-actions-minimal.yaml');
      const result = runCmd(`pending-actions validate "${fixturePath}"`);
      expect(result).toContain('Valid');
    });

    it('validates full fixture against schema', () => {
      const fixturePath = resolve(__dirname, '../../../spec/fixtures/valid/pending-actions-full.yaml');
      const result = runCmd(`pending-actions validate "${fixturePath}"`);
      expect(result).toContain('Valid');
    });

    it('validates created file against schema', () => {
      const outputPath = resolve(TEST_DIR, 'actions.yaml');
      runCmd(
        `pending-actions add --title "Task one" --assigned-to human --priority high --output "${outputPath}"`
      );

      const result = runCmd(`pending-actions validate "${outputPath}"`);
      expect(result).toContain('Valid');
    });

    it('rejects invalid file', () => {
      const outputPath = resolve(TEST_DIR, 'invalid.yaml');
      writeFileSync(outputPath, 'not a valid structure: 123\n');

      try {
        runCmd(`pending-actions validate "${outputPath}"`);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('end-to-end workflow', () => {
    it('completes a full workflow: add, list, update, resolve, list', () => {
      const outputPath = resolve(TEST_DIR, 'workflow.yaml');

      // Agent assigns human a task
      runCmd(
        `pending-actions add --title "Run npm install" --description "Install deps for CLI package" --assigned-to human --priority high --blocked-on "Cannot test package without dependencies" --output "${outputPath}"`
      );

      // Agent assigns another task
      runCmd(
        `pending-actions add --title "Review PR #42" --description "Check the schema validation fix" --assigned-to human --priority medium --output "${outputPath}"`
      );

      // Agent checks pending tasks
      let list = runCmd(`pending-actions list --path "${outputPath}"`);
      expect(list).toContain('Total: 2');
      expect(list).toContain('Pending: 2');

      // Human updates status to in_progress
      runCmd(
        `pending-actions update-status pa-001 --status in_progress --notes "Installing now, takes about 2 min" --path "${outputPath}"`
      );

      // Human resolves the task
      runCmd(
        `pending-actions resolve pa-001 --status done --outcome "npm install completed successfully, 0 vulnerabilities" --resolved-by tester --notes "Ran in packages/cli directory" --path "${outputPath}"`
      );

      // Agent checks status again
      list = runCmd(`pending-actions list --path "${outputPath}"`);
      expect(list).toContain('Done: 1');
      expect(list).toContain('Pending: 1');
    });

    it('supports the short alias "pa"', () => {
      const outputPath = resolve(TEST_DIR, 'alias.yaml');
      const result = execSync(
        `node "${CLI_PATH}" pa add --title "Test via alias" --assigned-to human --priority medium --output "${outputPath}"`,
        { encoding: 'utf8' }
      );
      expect(result).toContain('Test via alias');
    });
  });
});
