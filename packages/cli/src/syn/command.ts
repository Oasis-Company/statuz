/**
 * SYN Command
 *
 * CLI commands for SYN (human synchronization) - human decision requests and resolutions.
 */

import { Command } from 'commander';
import { SynRequestIO, SynResolutionIO, isSynRequest, isSynResolution } from '@statuz/sdk-ts';
import type { SynRequest, SynResolution, SynOption } from '@statuz/sdk-ts';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import YAML from 'yaml';

export function synCommand(): Command {
  const syn = new Command();
  syn
    .name('syn')
    .description('SYN (human synchronization) - manage decision requests and resolutions');

  // request command
  syn
    .command('request')
    .description('Create a new SYN request for human decision')
    .requiredOption('--source <agent>', 'Source agent/process triggering the request')
    .option('--calibration-id <id>', 'Related calibration ID')
    .option('--priority <level>', 'Priority level', 'medium')
    .requiredOption('--summary <text>', 'Brief summary of the request')
    .option('--evidence-summary <text>', 'Summary of evidence')
    .option('--evidence-window <text>', 'Evidence window description')
    .option('--option <title|description>', 'Add a decision option (format: title|description)', collect, [])
    .option('--option-pro <option-id|pro>', 'Add a pro for an option', collect, [])
    .option('--option-con <option-id|con>', 'Add a con for an option', collect, [])
    .requiredOption('--recommendation <text>', 'Recommended option/action')
    .option('--output <path>', 'Output file path', './syn-request.yaml')
    .action((options) => {
      try {
        // Parse options
        const optionsList: SynOption[] = options.option.map((opt: string, index: number) => {
          const [title, description] = opt.split('|');
          const optionId = `option-${index + 1}`;
          const pros = options.optionPro
            .filter((p: string) => p.startsWith(`${optionId}|`))
            .map((p: string) => p.split('|')[1]);
          const cons = options.optionCon
            .filter((c: string) => c.startsWith(`${optionId}|`))
            .map((c: string) => c.split('|')[1]);
          return {
            id: optionId,
            title: title.trim(),
            description: description?.trim() || '',
            pros: pros.length > 0 ? pros : undefined,
            cons: cons.length > 0 ? cons : undefined,
          };
        });

        // Ensure at least one option
        if (optionsList.length === 0) {
          optionsList.push({
            id: 'option-1',
            title: 'Approve',
            description: 'Approve the proposed change',
          });
          optionsList.push({
            id: 'option-2',
            title: 'Reject',
            description: 'Reject the proposed change',
          });
        }

        const request: SynRequest = {
          syn_version: '1.0',
          id: `syn-${Date.now().toString().slice(-3).padStart(3, '0')}`,
          type: 'human_decision_required',
          source: options.source,
          calibration_id: options.calibrationId,
          timestamp: new Date().toISOString(),
          priority: options.priority as 'low' | 'medium' | 'high' | 'critical',
          summary: options.summary,
          context: options.evidenceSummary || options.evidenceWindow
            ? {
                evidence_summary: options.evidenceSummary,
                evidence_window: options.evidenceWindow,
              }
            : undefined,
          options: optionsList,
          recommendation: options.recommendation,
        };

        // Validate before writing
        const validation = SynRequestIO.validate(request);
        if (!validation.valid) {
          console.error('✗ Invalid SYN request:');
          for (const err of validation.errors || []) {
            console.error(`  ${err.path}: ${err.message}`);
          }
          process.exit(1);
        }

        SynRequestIO.write(options.output, request);
        console.log(`✓ Created SYN request: ${options.output}`);
        console.log('');
        console.log('Request Details:');
        console.log(`  ID: ${request.id}`);
        console.log(`  Source: ${request.source}`);
        console.log(`  Priority: ${request.priority}`);
        console.log(`  Summary: ${request.summary}`);
        console.log(`  Options: ${request.options.length}`);
        console.log(`  Recommendation: ${request.recommendation}`);
      } catch (error) {
        console.error('Error: Could not create SYN request');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // review command
  syn
    .command('review')
    .description('Review pending SYN requests')
    .option('--dir <path>', 'Directory to scan for SYN files', './syn')
    .action((options) => {
      try {
        const dir = resolve(process.cwd(), options.dir);
        if (!existsSync(dir)) {
          console.log(`No SYN directory found at: ${dir}`);
          console.log('Use "statuz syn request" to create a request.');
          return;
        }

        const files = readdirSync(dir)
          .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
          .map((f) => resolve(dir, f));

        if (files.length === 0) {
          console.log('No SYN files found in directory.');
          return;
        }

        console.log(`=== SYN Requests (${files.length}) ===\n`);

        for (const file of files) {
          const content = readFileSync(file, 'utf8');
          try {
            const doc = YAML.parse(content);
            if (isSynRequest(doc)) {
              console.log(`[REQUEST] ${basename(file)}`);
              console.log(`  ID: ${doc.id}`);
              console.log(`  Priority: ${doc.priority}`);
              console.log(`  Summary: ${doc.summary}`);
              console.log(`  Options: ${doc.options.length}`);
              console.log(`  Timestamp: ${doc.timestamp}`);
            } else if (isSynResolution(doc)) {
              console.log(`[RESOLVED] ${basename(file)}`);
              console.log(`  ID: ${doc.id}`);
              console.log(`  Request ID: ${doc.syn_request_id}`);
              console.log(`  Principal: ${doc.principal}`);
              console.log(`  Decision: ${doc.decision}`);
              console.log(`  Timestamp: ${doc.timestamp}`);
            }
            console.log('');
          } catch {
            console.log(`[UNKNOWN] ${basename(file)} - Invalid format`);
          }
        }
      } catch (error) {
        console.error('Error: Could not review SYN requests');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // resolve command
  syn
    .command('resolve')
    .description('Resolve a SYN request with a human decision')
    .argument('<request-file>', 'Path to the SYN request file')
    .requiredOption('--principal <name>', 'Principal making the decision')
    .requiredOption('--decision <option-id>', 'Selected option ID')
    .requiredOption('--rationale <text>', 'Rationale for the decision')
    .option('--next-steps <items...>', 'Next steps to take')
    .option('--effective-date <iso>', 'Effective date (ISO format)')
    .option('--output <path>', 'Output file path for resolution')
    .action((requestFile, options) => {
      try {
        const request = SynRequestIO.read(requestFile);

        // Verify the decision option exists
        const option = request.options.find((o) => o.id === options.decision);
        if (!option) {
          console.error(`Error: Option "${options.decision}" not found in request`);
          console.log('Available options:');
          for (const opt of request.options) {
            console.log(`  ${opt.id}: ${opt.title}`);
          }
          process.exit(1);
        }

        const resolution: SynResolution = {
          syn_resolution_version: '1.0',
          id: `${request.id}-resolution`,
          syn_request_id: request.id,
          principal: options.principal,
          timestamp: new Date().toISOString(),
          decision: options.decision,
          decision_summary: option.title,
          rationale: options.rationale,
          effective_date: options.effectiveDate,
          next_steps: options.nextSteps,
          audit_trail: [
            `Resolution created by ${options.principal}`,
            `Based on request ${request.id}`,
            `Decision: ${option.title}`,
          ],
        };

        // Validate before writing
        const validation = SynResolutionIO.validate(resolution);
        if (!validation.valid) {
          console.error('✗ Invalid SYN resolution:');
          for (const err of validation.errors || []) {
            console.error(`  ${err.path}: ${err.message}`);
          }
          process.exit(1);
        }

        const outputPath = options.output || `./syn-resolution-${resolution.id.replace('syn-', '').replace('-resolution', '')}.yaml`;
        SynResolutionIO.write(outputPath, resolution);

        console.log(`✓ Created SYN resolution: ${outputPath}`);
        console.log('');
        console.log('Resolution Details:');
        console.log(`  ID: ${resolution.id}`);
        console.log(`  Request ID: ${resolution.syn_request_id}`);
        console.log(`  Principal: ${resolution.principal}`);
        console.log(`  Decision: ${resolution.decision} (${option.title})`);
        console.log(`  Rationale: ${resolution.rationale}`);
        if (resolution.next_steps) {
          console.log(`  Next Steps: ${resolution.next_steps.join(', ')}`);
        }
      } catch (error) {
        console.error('Error: Could not resolve SYN request');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // validate command
  syn
    .command('validate')
    .description('Validate a SYN document (request or resolution)')
    .argument('<file>', 'Path to SYN YAML file')
    .action((file) => {
      try {
        const content = readFileSync(resolve(process.cwd(), file), 'utf8');
        const doc = YAML.parse(content);

        if (isSynRequest(doc)) {
          const result = SynRequestIO.validate(doc);
          if (result.valid) {
            console.log(`✓ Valid SYN Request: ${file}`);
          } else {
            console.log(`✗ Invalid SYN Request: ${file}`);
            for (const err of result.errors || []) {
              console.log(`  ${err.path}: ${err.message}`);
            }
            process.exit(1);
          }
        } else if (isSynResolution(doc)) {
          const result = SynResolutionIO.validate(doc);
          if (result.valid) {
            console.log(`✓ Valid SYN Resolution: ${file}`);
          } else {
            console.log(`✗ Invalid SYN Resolution: ${file}`);
            for (const err of result.errors || []) {
              console.log(`  ${err.path}: ${err.message}`);
            }
            process.exit(1);
          }
        } else {
          console.log(`✗ Unknown SYN document type: ${file}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error: Validation failed');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // show command
  syn
    .command('show')
    .description('Show detailed information about a SYN document')
    .argument('<file>', 'Path to SYN YAML file')
    .action((file) => {
      try {
        const content = readFileSync(resolve(process.cwd(), file), 'utf8');
        const doc = YAML.parse(content);

        if (isSynRequest(doc)) {
          console.log('=== SYN Request ===');
          console.log(`ID: ${doc.id}`);
          console.log(`Version: ${doc.syn_version}`);
          console.log(`Type: ${doc.type}`);
          console.log(`Source: ${doc.source}`);
          if (doc.calibration_id) console.log(`Calibration ID: ${doc.calibration_id}`);
          console.log(`Priority: ${doc.priority}`);
          console.log(`Timestamp: ${doc.timestamp}`);
          console.log('');
          console.log(`Summary: ${doc.summary}`);
          if (doc.context) {
            console.log('');
            console.log('Context:');
            if (doc.context.evidence_summary) console.log(`  Evidence: ${doc.context.evidence_summary}`);
            if (doc.context.evidence_window) console.log(`  Window: ${doc.context.evidence_window}`);
          }
          console.log('');
          console.log('Options:');
          for (const option of doc.options) {
            console.log(`  [${option.id}] ${option.title}`);
            if (option.description) console.log(`    ${option.description}`);
            if (option.pros && option.pros.length > 0) {
              console.log(`    Pros:`);
              for (const pro of option.pros) console.log(`      • ${pro}`);
            }
            if (option.cons && option.cons.length > 0) {
              console.log(`    Cons:`);
              for (const con of option.cons) console.log(`      • ${con}`);
            }
          }
          console.log('');
          console.log(`Recommendation: ${doc.recommendation}`);
        } else if (isSynResolution(doc)) {
          console.log('=== SYN Resolution ===');
          console.log(`ID: ${doc.id}`);
          console.log(`Version: ${doc.syn_resolution_version}`);
          console.log(`Request ID: ${doc.syn_request_id}`);
          console.log(`Principal: ${doc.principal}`);
          console.log(`Timestamp: ${doc.timestamp}`);
          console.log('');
          console.log(`Decision: ${doc.decision}`);
          console.log(`Summary: ${doc.decision_summary}`);
          console.log(`Rationale: ${doc.rationale}`);
          if (doc.effective_date) console.log(`Effective Date: ${doc.effective_date}`);
          if (doc.next_steps && doc.next_steps.length > 0) {
            console.log('');
            console.log('Next Steps:');
            for (const step of doc.next_steps) console.log(`  • ${step}`);
          }
          if (doc.audit_trail && doc.audit_trail.length > 0) {
            console.log('');
            console.log('Audit Trail:');
            for (const trail of doc.audit_trail) console.log(`  • ${trail}`);
          }
        } else {
          console.log('Unknown SYN document type');
          process.exit(1);
        }
      } catch (error) {
        console.error('Error: Could not read SYN document');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return syn;
}

function collect(value: string, previous: string[]) {
  previous.push(value);
  return previous;
}
