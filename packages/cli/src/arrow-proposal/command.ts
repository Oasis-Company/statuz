/**
 * Arrow Proposal Command
 *
 * CLI commands for managing Arrow Map change proposals.
 */

import { Command } from 'commander';
import { ArrowProposalIO, ArrowMapIO } from '@statuz/sdk-ts';
import type { ArrowProposal, ProposalChange, ProposalType } from '@statuz/sdk-ts';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import YAML from 'yaml';

export function arrowProposalCommand(): Command {
  const proposal = new Command();
  proposal
    .name('arrow-proposal')
    .description('Manage Arrow Map change proposals');

  // create command
  proposal
    .command('create')
    .description('Create a new Arrow Map change proposal')
    .requiredOption('--source <map-file>', 'Source Arrow Map file')
    .option('--target <map-file>', 'Target Arrow Map file (for merge proposals)')
    .requiredOption('--type <change-type>', 'Type of proposal', /^(add_node|remove_node|update_node|add_arrow|remove_arrow|update_arrow|merge)$/)
    .option('--node <id|type|name>', 'Node specification (format: id|type|name)', collect, [])
    .option('--arrow <id|from|to|type>', 'Arrow specification (format: id|from|to|type)', collect, [])
    .option('--rationale <text>', 'Reason for the change')
    .option('--author <name>', 'Author of the proposal', 'anonymous')
    .option('--output <path>', 'Output file path', './proposal.yaml')
    .action((options) => {
      try {
        const sourceMap = ArrowMapIO.read(options.source);
        const changes: ProposalChange[] = [];

        // Parse node options
        if (options.node.length > 0) {
          for (const nodeSpec of options.node) {
            const [id, type, name, description] = nodeSpec.split('|');
            changes.push({
              action: options.type.includes('add') ? 'add' : options.type.includes('remove') ? 'remove' : 'update',
              target: 'node',
              node: {
                id,
                type,
                name,
                description: description || undefined,
              },
            });
          }
        }

        // Parse arrow options
        if (options.arrow.length > 0) {
          for (const arrowSpec of options.arrow) {
            const [id, from, to, type] = arrowSpec.split('|');
            changes.push({
              action: options.type.includes('add') ? 'add' : options.type.includes('remove') ? 'remove' : 'update',
              target: 'arrow',
              arrow: {
                id,
                from,
                to,
                type: type as any,
              },
            });
          }
        }

        // Ensure at least one change
        if (changes.length === 0) {
          console.error('Error: No changes specified. Use --node or --arrow options.');
          process.exit(1);
        }

        const proposalDoc: ArrowProposal = {
          proposal_version: '0.1',
          proposal_id: `prop-${Date.now().toString().slice(-4).padStart(4, '0')}`,
          source_map_id: sourceMap.id,
          target_map_id: options.target ? ArrowMapIO.read(options.target).id : undefined,
          type: options.type as ProposalType,
          changes,
          status: 'pending',
          author: options.author,
          rationale: options.rationale || 'No rationale provided',
          timestamp: new Date().toISOString(),
        };

        // Validate before writing
        const validation = ArrowProposalIO.validate(proposalDoc);
        if (!validation.valid) {
          console.error('✗ Invalid proposal:');
          for (const err of validation.errors || []) {
            console.error(`  ${err.path}: ${err.message}`);
          }
          process.exit(1);
        }

        ArrowProposalIO.write(options.output, proposalDoc);
        console.log(`✓ Created Arrow Proposal: ${options.output}`);
        console.log('');
        console.log('Proposal Details:');
        console.log(`  ID: ${proposalDoc.proposal_id}`);
        console.log(`  Type: ${proposalDoc.type}`);
        console.log(`  Source Map: ${proposalDoc.source_map_id}`);
        console.log(`  Changes: ${proposalDoc.changes.length}`);
        console.log(`  Status: ${proposalDoc.status}`);
      } catch (error) {
        console.error('Error: Could not create proposal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // review command
  proposal
    .command('review')
    .description('Review pending proposals')
    .option('--dir <path>', 'Directory to scan for proposals', './proposals')
    .action((options) => {
      try {
        const dir = resolve(process.cwd(), options.dir);
        if (!existsSync(dir)) {
          console.log(`No proposals directory found at: ${dir}`);
          console.log('Use "statuz arrow-proposal create" to create a proposal.');
          return;
        }

        const files = readdirSync(dir)
          .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
          .map((f) => resolve(dir, f));

        if (files.length === 0) {
          console.log('No proposals found in directory.');
          return;
        }

        console.log(`=== Arrow Proposals (${files.length}) ===\n`);

        for (const file of files) {
          const content = readFileSync(file, 'utf8');
          const doc = YAML.parse(content) as ArrowProposal;
          console.log(`[${doc.status.toUpperCase()}] ${basename(file)}`);
          console.log(`  ID: ${doc.proposal_id}`);
          console.log(`  Type: ${doc.type}`);
          console.log(`  Source: ${doc.source_map_id}`);
          console.log(`  Changes: ${doc.changes.length}`);
          console.log(`  Author: ${doc.author}`);
          console.log(`  Created: ${doc.timestamp}`);
          console.log('');
        }
      } catch (error) {
        console.error('Error: Could not review proposals');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // approve command
  proposal
    .command('approve')
    .description('Approve a proposal')
    .argument('<proposal-file>', 'Path to proposal file')
    .option('--by <reviewer>', 'Reviewer name', 'anonymous')
    .option('--comment <text>', 'Review comment')
    .action((file, options) => {
      try {
        const proposalDoc = ArrowProposalIO.read(file);

        if (proposalDoc.status === 'approved') {
          console.log('Proposal is already approved');
          return;
        }

        if (proposalDoc.status === 'applied') {
          console.log('Proposal has already been applied');
          return;
        }

        proposalDoc.status = 'approved';
        if (options.comment) {
          proposalDoc.review_comments = proposalDoc.review_comments || [];
          proposalDoc.review_comments.push({
            by: options.by,
            comment: options.comment,
            timestamp: new Date().toISOString(),
          });
        }

        ArrowProposalIO.write(file, proposalDoc);
        console.log(`✓ Approved proposal: ${file}`);
        console.log(`  Status: ${proposalDoc.status}`);
        if (options.comment) {
          console.log(`  Comment by ${options.by}: ${options.comment}`);
        }
      } catch (error) {
        console.error('Error: Could not approve proposal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // reject command
  proposal
    .command('reject')
    .description('Reject a proposal')
    .argument('<proposal-file>', 'Path to proposal file')
    .option('--by <reviewer>', 'Reviewer name', 'anonymous')
    .option('--comment <text>', 'Rejection reason')
    .action((file, options) => {
      try {
        const proposalDoc = ArrowProposalIO.read(file);

        if (proposalDoc.status === 'rejected') {
          console.log('Proposal is already rejected');
          return;
        }

        if (proposalDoc.status === 'applied') {
          console.log('Proposal has already been applied');
          return;
        }

        proposalDoc.status = 'rejected';
        if (options.comment) {
          proposalDoc.review_comments = proposalDoc.review_comments || [];
          proposalDoc.review_comments.push({
            by: options.by,
            comment: options.comment,
            timestamp: new Date().toISOString(),
          });
        }

        ArrowProposalIO.write(file, proposalDoc);
        console.log(`✓ Rejected proposal: ${file}`);
        console.log(`  Status: ${proposalDoc.status}`);
        if (options.comment) {
          console.log(`  Reason by ${options.by}: ${options.comment}`);
        }
      } catch (error) {
        console.error('Error: Could not reject proposal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // apply command
  proposal
    .command('apply')
    .description('Apply an approved proposal to an Arrow Map')
    .argument('<proposal-file>', 'Path to proposal file')
    .option('--target <map-file>', 'Target Arrow Map file')
    .option('--output <path>', 'Output file path for updated map')
    .action((proposalFile, options) => {
      try {
        const proposalDoc = ArrowProposalIO.read(proposalFile);

        if (proposalDoc.status !== 'approved') {
          console.error('Error: Proposal must be approved before applying');
          process.exit(1);
        }

        const targetFile = options.target || proposalDoc.source_map_id + '.yaml';
        const targetMap = ArrowMapIO.read(targetFile);

        // Verify source map matches
        if (targetMap.id !== proposalDoc.source_map_id) {
          console.warn(`Warning: Target map ID (${targetMap.id}) does not match proposal source (${proposalDoc.source_map_id})`);
        }

        const updatedMap = ArrowProposalIO.apply(proposalDoc, targetMap);
        proposalDoc.status = 'applied';

        const outputPath = options.output || `updated-${targetMap.id}.yaml`;
        ArrowMapIO.write(outputPath, updatedMap);
        ArrowProposalIO.write(proposalFile, proposalDoc);

        console.log(`✓ Applied proposal to Arrow Map`);
        console.log(`  Updated Map: ${outputPath}`);
        console.log(`  Proposal Status: applied`);
        console.log(`  Nodes: ${updatedMap.nodes.length}`);
        console.log(`  Arrows: ${updatedMap.arrows.length}`);
      } catch (error) {
        console.error('Error: Could not apply proposal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // validate command
  proposal
    .command('validate')
    .description('Validate a proposal file')
    .argument('<file>', 'Path to proposal YAML file')
    .action((file) => {
      try {
        const result = ArrowProposalIO.validateFile(file);
        if (result.valid) {
          console.log(`✓ Valid Arrow Proposal: ${file}`);
        } else {
          console.log(`✗ Invalid Arrow Proposal: ${file}`);
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
  proposal
    .command('show')
    .description('Show detailed proposal information')
    .argument('<file>', 'Path to proposal YAML file')
    .action((file) => {
      try {
        const proposalDoc = ArrowProposalIO.read(file);

        console.log('=== Arrow Proposal ===');
        console.log(`ID: ${proposalDoc.proposal_id}`);
        console.log(`Version: ${proposalDoc.proposal_version}`);
        console.log(`Type: ${proposalDoc.type}`);
        console.log(`Status: ${proposalDoc.status}`);
        console.log(`Source Map: ${proposalDoc.source_map_id}`);
        if (proposalDoc.target_map_id) console.log(`Target Map: ${proposalDoc.target_map_id}`);
        console.log(`Author: ${proposalDoc.author}`);
        console.log(`Created: ${proposalDoc.timestamp}`);
        console.log('');
        console.log(`Rationale: ${proposalDoc.rationale}`);
        console.log('');
        console.log('Changes:');
        for (const change of proposalDoc.changes) {
          console.log(`  [${change.action}] ${change.target}`);
          if (change.node) {
            console.log(`    ID: ${change.node.id}`);
            console.log(`    Type: ${change.node.type}`);
            if (change.node.name) console.log(`    Name: ${change.node.name}`);
          }
          if (change.arrow) {
            console.log(`    ID: ${change.arrow.id}`);
            console.log(`    Type: ${change.arrow.type}`);
            console.log(`    From: ${change.arrow.from}`);
            console.log(`    To: ${change.arrow.to}`);
          }
        }
        if (proposalDoc.review_comments && proposalDoc.review_comments.length > 0) {
          console.log('');
          console.log('Review Comments:');
          for (const comment of proposalDoc.review_comments) {
            console.log(`  • ${comment.by} (${comment.timestamp}): ${comment.comment}`);
          }
        }
      } catch (error) {
        console.error('Error: Could not read proposal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return proposal;
}

function collect(value: string, previous: string[]) {
  previous.push(value);
  return previous;
}