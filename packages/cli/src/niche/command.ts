/**
 * Niche Command
 *
 * CLI commands for managing niche manifests — ecological position declarations.
 */

import { Command } from 'commander';
import { NicheManifestIO } from '@statuz/sdk-ts';
import type { NicheManifest, DeclaredPosition } from '@statuz/sdk-ts';

export function nicheCommand(): Command {
  const niche = new Command();
  niche
    .name('niche')
    .description('Manage niche manifests — ecological position declarations');

  // init command
  niche
    .command('init')
    .description('Create a new niche manifest')
    .requiredOption('--project <name>', 'Project or agent name')
    .requiredOption('--purpose <text>', 'High-level purpose statement')
    .option('--does <items...>', 'List of responsibilities/capabilities')
    .option('--does-not <items...>', 'List of out-of-scope areas')
    .option('--output <path>', 'Output file path', './niche-manifest.yaml')
    .option('--strategic-bets <items...>', 'Strategic bets/technology choices')
    .option('--success-signals <items...>', 'Success metrics/signals')
    .action((options) => {
      try {
        const manifest: NicheManifest = {
          niche_version: '1.0',
          id: `niche-${Date.now().toString().slice(-7)}`,
          declared_position: {
            project_name: options.project,
            purpose: options.purpose,
            does: options.does || ['define responsibilities'],
            does_not: options.doesNot || ['undefined scope'],
          },
          strategic_bets: options.strategicBets,
          success_signals: options.successSignals,
          evidence_window_days: 30,
          drift_thresholds: {
            task_drift: 0.25,
            collaboration_drift: 0.2,
            boundary_drift: 0.1,
          },
          syn_policy: {
            auto_trigger: true,
          },
        };

        NicheManifestIO.write(options.output, manifest);
        console.log(`✓ Created niche manifest: ${options.output}`);
        console.log('');
        console.log('Declared Position:');
        console.log(`  Project: ${manifest.declared_position.project_name}`);
        console.log(`  Purpose: ${manifest.declared_position.purpose}`);
        console.log(`  Does: ${manifest.declared_position.does.join(', ')}`);
        console.log(`  Does Not: ${manifest.declared_position.does_not.join(', ')}`);
      } catch (error) {
        console.error('Error: Could not create niche manifest');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // validate command
  niche
    .command('validate')
    .description('Validate a niche manifest file')
    .argument('<file>', 'Path to niche manifest YAML file')
    .action((file) => {
      try {
        const result = NicheManifestIO.validateFile(file);
        if (result.valid) {
          console.log(`✓ Valid niche manifest: ${file}`);
        } else {
          console.log(`✗ Invalid niche manifest: ${file}`);
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

  // show command
  niche
    .command('show')
    .description('Show a niche manifest summary')
    .argument('<file>', 'Path to niche manifest YAML file')
    .action((file) => {
      try {
        const manifest = NicheManifestIO.read(file);
        const pos = manifest.declared_position;

        console.log('=== Niche Manifest ===');
        console.log(`ID: ${manifest.id || '(not set)'}`);
        console.log(`Version: ${manifest.niche_version}`);
        console.log('');
        console.log('--- Declared Position ---');
        console.log(`Project: ${pos.project_name}`);
        console.log(`Purpose: ${pos.purpose}`);
        console.log('');
        console.log('Does:');
        for (const item of pos.does) {
          console.log(`  ✓ ${item}`);
        }
        console.log('');
        console.log('Does Not:');
        for (const item of pos.does_not) {
          console.log(`  ✗ ${item}`);
        }

        if (manifest.strategic_bets && manifest.strategic_bets.length > 0) {
          console.log('');
          console.log('--- Strategic Bets ---');
          for (const bet of manifest.strategic_bets) {
            console.log(`  • ${bet}`);
          }
        }

        if (manifest.success_signals && manifest.success_signals.length > 0) {
          console.log('');
          console.log('--- Success Signals ---');
          for (const signal of manifest.success_signals) {
            console.log(`  • ${signal}`);
          }
        }

        if (manifest.drift_thresholds) {
          console.log('');
          console.log('--- Drift Thresholds ---');
          const dt = manifest.drift_thresholds;
          if (dt.task_drift !== undefined) console.log(`  Task: ${dt.task_drift}`);
          if (dt.collaboration_drift !== undefined) console.log(`  Collaboration: ${dt.collaboration_drift}`);
          if (dt.boundary_drift !== undefined) console.log(`  Boundary: ${dt.boundary_drift}`);
        }

        if (manifest.syn_policy) {
          console.log('');
          console.log('--- SYN Policy ---');
          console.log(`  Auto Trigger: ${manifest.syn_policy.auto_trigger ?? '(not set)'}`);
          if (manifest.syn_policy.required_approvers) {
            console.log(`  Required Approvers: ${manifest.syn_policy.required_approvers.join(', ')}`);
          }
        }
      } catch (error) {
        console.error('Error: Could not read niche manifest');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // update command
  niche
    .command('update')
    .description('Update fields in a niche manifest')
    .argument('<file>', 'Path to niche manifest YAML file')
    .option('--set-purpose <text>', 'Set new purpose')
    .option('--add-does <item>', 'Add an item to "does" list')
    .option('--remove-does <item>', 'Remove an item from "does" list')
    .option('--add-does-not <item>', 'Add an item to "does_not" list')
    .option('--remove-does-not <item>', 'Remove an item from "does_not" list')
    .option('--add-strategic-bet <item>', 'Add a strategic bet')
    .option('--add-success-signal <item>', 'Add a success signal')
    .option('--set-task-drift <value>', 'Set task drift threshold (0-1)')
    .option('--set-collaboration-drift <value>', 'Set collaboration drift threshold (0-1)')
    .option('--set-boundary-drift <value>', 'Set boundary drift threshold (0-1)')
    .action((file, options) => {
      try {
        const manifest = NicheManifestIO.read(file);
        let modified = false;

        // Update purpose
        if (options.setPurpose) {
          manifest.declared_position.purpose = options.setPurpose;
          console.log(`✓ Updated purpose`);
          modified = true;
        }

        // Update does list
        if (options.addDoes) {
          if (!manifest.declared_position.does.includes(options.addDoes)) {
            manifest.declared_position.does.push(options.addDoes);
            console.log(`✓ Added to does: ${options.addDoes}`);
            modified = true;
          }
        }
        if (options.removeDoes) {
          const idx = manifest.declared_position.does.indexOf(options.removeDoes);
          if (idx !== -1) {
            manifest.declared_position.does.splice(idx, 1);
            console.log(`✓ Removed from does: ${options.removeDoes}`);
            modified = true;
          }
        }

        // Update does_not list
        if (options.addDoesNot) {
          if (!manifest.declared_position.does_not.includes(options.addDoesNot)) {
            manifest.declared_position.does_not.push(options.addDoesNot);
            console.log(`✓ Added to does_not: ${options.addDoesNot}`);
            modified = true;
          }
        }
        if (options.removeDoesNot) {
          const idx = manifest.declared_position.does_not.indexOf(options.removeDoesNot);
          if (idx !== -1) {
            manifest.declared_position.does_not.splice(idx, 1);
            console.log(`✓ Removed from does_not: ${options.removeDoesNot}`);
            modified = true;
          }
        }

        // Update strategic bets
        if (options.addStrategicBet) {
          manifest.strategic_bets = manifest.strategic_bets || [];
          if (!manifest.strategic_bets.includes(options.addStrategicBet)) {
            manifest.strategic_bets.push(options.addStrategicBet);
            console.log(`✓ Added strategic bet: ${options.addStrategicBet}`);
            modified = true;
          }
        }

        // Update success signals
        if (options.addSuccessSignal) {
          manifest.success_signals = manifest.success_signals || [];
          if (!manifest.success_signals.includes(options.addSuccessSignal)) {
            manifest.success_signals.push(options.addSuccessSignal);
            console.log(`✓ Added success signal: ${options.addSuccessSignal}`);
            modified = true;
          }
        }

        // Update drift thresholds
        if (options.setTaskDrift !== undefined) {
          manifest.drift_thresholds = manifest.drift_thresholds || {};
          manifest.drift_thresholds.task_drift = parseFloat(options.setTaskDrift);
          console.log(`✓ Set task_drift: ${manifest.drift_thresholds.task_drift}`);
          modified = true;
        }
        if (options.setCollaborationDrift !== undefined) {
          manifest.drift_thresholds = manifest.drift_thresholds || {};
          manifest.drift_thresholds.collaboration_drift = parseFloat(options.setCollaborationDrift);
          console.log(`✓ Set collaboration_drift: ${manifest.drift_thresholds.collaboration_drift}`);
          modified = true;
        }
        if (options.setBoundaryDrift !== undefined) {
          manifest.drift_thresholds = manifest.drift_thresholds || {};
          manifest.drift_thresholds.boundary_drift = parseFloat(options.setBoundaryDrift);
          console.log(`✓ Set boundary_drift: ${manifest.drift_thresholds.boundary_drift}`);
          modified = true;
        }

        if (!modified) {
          console.log('No changes specified. Use options to update fields.');
          return;
        }

        // Write back and validate
        NicheManifestIO.write(file, manifest);
        const validation = NicheManifestIO.validate(manifest);
        if (!validation.valid) {
          console.log('');
          console.log('⚠ Warning: Updated manifest has validation errors:');
          for (const err of validation.errors || []) {
            console.log(`  ${err.path}: ${err.message}`);
          }
        } else {
          console.log(`✓ Saved and validated: ${file}`);
        }
      } catch (error) {
        console.error('Error: Could not update niche manifest');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return niche;
}
