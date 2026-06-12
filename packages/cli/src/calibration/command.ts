/**
 * Calibration Command
 *
 * CLI commands for detecting drift between declared position
 * (niche manifest) and observed behavior (statuz + signals).
 */

import { Command } from 'commander';
import { CalibrationEngine } from '@statuz/sdk-ts';

export function calibrationCommand(): Command {
  const calibration = new Command();
  calibration
    .name('calibration')
    .description('Drift detection across task, collaboration, and boundary dimensions');

  // Run calibration
  calibration
    .command('run')
    .description('Run drift detection between manifest and statuz')
    .requiredOption('--manifest <path>', 'Path to niche manifest YAML')
    .requiredOption('--statuz <path>', 'Path to statuz YAML file')
    .option('--window-start <iso>', 'Evidence window start (ISO timestamp)')
    .option('--window-end <iso>', 'Evidence window end (ISO timestamp)')
    .option(
      '--threshold-task <value>',
      'Task drift threshold override (0-1)',
    )
    .option(
      '--threshold-collab <value>',
      'Collaboration drift threshold override (0-1)',
    )
    .option(
      '--threshold-boundary <value>',
      'Boundary drift threshold override (0-1)',
    )
    .option('--output <path>', 'Write calibration document to a file')
    .option('--json', 'Print raw JSON instead of human-readable output')
    .action((options) => {
      try {
        const thresholds: Record<string, number> = {};
        if (options.thresholdTask) thresholds.task_drift = parseFloat(options.thresholdTask);
        if (options.thresholdCollab) thresholds.collaboration_drift = parseFloat(options.thresholdCollab);
        if (options.thresholdBoundary) thresholds.boundary_drift = parseFloat(options.thresholdBoundary);

        const result = CalibrationEngine.run(
          options.manifest,
          options.statuz,
          [],
          {
            window_start: options.windowStart,
            window_end: options.windowEnd,
            thresholds,
          },
        );

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('=== Calibration Report ===');
          console.log(`ID: ${result.document.id}`);
          console.log(`Timestamp: ${result.document.timestamp}`);
          console.log(
            `Evidence window: ${result.document.evidence_window.start} → ${result.document.evidence_window.end}`,
          );
          console.log(`Evidence items: ${result.document.evidence.length}`);
          console.log('');
          console.log('--- Drift Analysis ---');

          const da = result.document.drift_analysis;
          for (const [dim, metric] of Object.entries(da)) {
            const exceeded = (metric as any).observed > (metric as any).threshold;
            const marker = exceeded ? '⚠' : '✓';
            console.log(
              `${marker} ${dim}: observed=${(metric as any).observed.toFixed(3)} (threshold ${(metric as any).threshold})`,
            );
            console.log(`  ${(metric as any).description}`);
          }

          console.log('');
          console.log('--- Proposed Change ---');
          console.log(`Type: ${result.document.proposed_change.type}`);
          console.log(result.document.proposed_change.description);
          if (result.document.proposed_change.rationale) {
            console.log(`  Rationale: ${result.document.proposed_change.rationale}`);
          }

          if (result.document.recommendations && result.document.recommendations.length > 0) {
            console.log('');
            console.log('--- Recommendations ---');
            for (const rec of result.document.recommendations) {
              console.log(`  • ${rec}`);
            }
          }

          if (result.has_drift) {
            console.log('');
            console.log('⚠ DRIFT DETECTED — consider updating niche manifest.');
          } else {
            console.log('');
            console.log('✓ All drift dimensions within thresholds.');
          }
        }

        if (options.output) {
          CalibrationEngine.writeCalibration(options.output, result.document);
          console.log(`\nCalibration document written to: ${options.output}`);
        }
      } catch (error) {
        console.error('Error: Calibration failed');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Validate calibration file
  calibration
    .command('validate')
    .description('Validate a calibration document against the schema')
    .argument('<file>', 'Path to calibration YAML file')
    .action((file) => {
      try {
        const result = CalibrationEngine.validateCalibrationFile(file);
        if (result.valid) {
          console.log(`✓ Valid calibration document`);
        } else {
          console.log('✗ Invalid calibration document');
          for (const err of result.errors || []) {
            console.log(`  ${err.path}: ${err.message}`);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error('Error: Validation failed');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Show calibration summary
  calibration
    .command('show')
    .description('Show a calibration document summary')
    .argument('<file>', 'Path to calibration YAML file')
    .action((file) => {
      try {
        const doc = CalibrationEngine.readCalibration(file);
        console.log('=== Calibration Document ===');
        console.log(`ID: ${doc.id}`);
        console.log(`Version: ${doc.calibration_version}`);
        console.log(`Timestamp: ${doc.timestamp}`);
        console.log(
          `Window: ${doc.evidence_window.start} → ${doc.evidence_window.end}`,
        );
        console.log(`Evidence: ${doc.evidence.length} items`);
        console.log('');
        console.log('Drift:');
        for (const [dim, metric] of Object.entries(doc.drift_analysis)) {
          console.log(
            `  ${dim}: ${(metric as any).observed} / threshold ${(metric as any).threshold}`,
          );
        }
        console.log('');
        console.log(`Change: ${doc.proposed_change.type}`);
        console.log(doc.proposed_change.description);
      } catch (error) {
        console.error('Error: Could not read calibration file');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return calibration;
}
