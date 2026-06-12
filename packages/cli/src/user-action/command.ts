/**
 * User Action Command
 *
 * CLI commands for tracking and analyzing user interactions with AI agents.
 */

import { Command } from 'commander';
import { UserActionTracker } from '@statuz/sdk-ts';
import type { UserActionType } from '@statuz/sdk-ts';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function userActionCommand(): Command {
  const userAction = new Command();
  userAction
    .name('user-action')
    .description('Track and analyze user interactions with AI agents');

  // track command
  userAction
    .command('track')
    .description('Record a user action')
    .requiredOption('--type <action-type>', 'Type of action', /^(click|input|submit|confirm|reject|pause|resume|select|navigate|search|export|import|delete|create|update)$/)
    .requiredOption('--user <user-id>', 'User identifier')
    .requiredOption('--agent <agent-id>', 'Agent identifier')
    .option('--context <key=value>', 'Context key-value pairs', collectContext, {})
    .option('--payload <key=value>', 'Payload key-value pairs', collectContext, {})
    .option('--dir <path>', 'Storage directory')
    .action((options) => {
      try {
        const action = UserActionTracker.track({
          action_type: options.type as UserActionType,
          user_id: options.user,
          agent_id: options.agent,
          context: Object.keys(options.context).length > 0 ? options.context : undefined,
          payload: Object.keys(options.payload).length > 0 ? options.payload : undefined,
        }, options.dir);

        console.log(`✓ Tracked user action: ${action.action_id}`);
        console.log('');
        console.log('Action Details:');
        console.log(`  ID: ${action.action_id}`);
        console.log(`  Type: ${action.action_type}`);
        console.log(`  User: ${action.user_id}`);
        console.log(`  Agent: ${action.agent_id}`);
        console.log(`  Timestamp: ${action.timestamp}`);
        if (action.context) {
          console.log(`  Context: ${JSON.stringify(action.context)}`);
        }
      } catch (error) {
        console.error('Error: Could not track user action');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // query command
  userAction
    .command('query')
    .description('Query user actions')
    .option('--since <date>', 'Start date (ISO format)')
    .option('--until <date>', 'End date (ISO format)')
    .option('--type <action-type>', 'Filter by action type')
    .option('--user <user-id>', 'Filter by user ID')
    .option('--agent <agent-id>', 'Filter by agent ID')
    .option('--limit <n>', 'Limit results', parseInt, 20)
    .option('--format <format>', 'Output format', /^(table|json|yaml)$/, 'table')
    .option('--dir <path>', 'Storage directory')
    .action((options) => {
      try {
        const actions = UserActionTracker.query({
          since: options.since,
          until: options.until,
          action_type: options.type as UserActionType,
          user_id: options.user,
          agent_id: options.agent,
          limit: options.limit,
        }, options.dir);

        if (actions.length === 0) {
          console.log('No matching actions found.');
          return;
        }

        switch (options.format) {
          case 'json':
            console.log(JSON.stringify(actions, null, 2));
            break;
          case 'yaml':
            console.log(require('yaml').stringify(actions));
            break;
          case 'table':
          default:
            console.log(`Found ${actions.length} action(s):`);
            console.log('');
            console.log('ID       | Type      | User     | Agent    | Timestamp');
            console.log('---------|-----------|----------|----------|---------------------------');
            for (const action of actions) {
              console.log(`${action.action_id.padEnd(8)} | ${action.action_type.padEnd(10)} | ${action.user_id.padEnd(9)} | ${action.agent_id.padEnd(9)} | ${action.timestamp}`);
            }
            break;
        }
      } catch (error) {
        console.error('Error: Could not query user actions');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // stats command
  userAction
    .command('stats')
    .description('Show user action statistics')
    .option('--since <date>', 'Start date (ISO format)')
    .option('--until <date>', 'End date (ISO format)')
    .option('--user <user-id>', 'Filter by user ID')
    .option('--agent <agent-id>', 'Filter by agent ID')
    .option('--dir <path>', 'Storage directory')
    .action((options) => {
      try {
        const stats = UserActionTracker.stats({
          since: options.since,
          until: options.until,
          user_id: options.user,
          agent_id: options.agent,
        }, options.dir);

        console.log('=== User Action Statistics ===');
        console.log(`Total Actions: ${stats.total_actions}`);
        console.log(`Date Range: ${stats.date_range.start} to ${stats.date_range.end}`);
        console.log(`Average per Day: ${stats.average_actions_per_day}`);
        console.log('');

        if (Object.keys(stats.actions_by_type).length > 0) {
          console.log('By Action Type:');
          for (const [type, count] of Object.entries(stats.actions_by_type)) {
            console.log(`  ${type.padEnd(12)}: ${count}`);
          }
        }

        if (Object.keys(stats.actions_by_user).length > 0) {
          console.log('');
          console.log('By User:');
          for (const [user, count] of Object.entries(stats.actions_by_user)) {
            console.log(`  ${user.padEnd(12)}: ${count}`);
          }
        }

        if (Object.keys(stats.actions_by_agent).length > 0) {
          console.log('');
          console.log('By Agent:');
          for (const [agent, count] of Object.entries(stats.actions_by_agent)) {
            console.log(`  ${agent.padEnd(12)}: ${count}`);
          }
        }
      } catch (error) {
        console.error('Error: Could not get user action statistics');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // export command
  userAction
    .command('export')
    .description('Export user actions')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Output format', /^(json|csv|yaml)$/, 'json')
    .option('--since <date>', 'Start date (ISO format)')
    .option('--until <date>', 'End date (ISO format)')
    .option('--user <user-id>', 'Filter by user ID')
    .option('--agent <agent-id>', 'Filter by agent ID')
    .option('--dir <path>', 'Storage directory')
    .action((options) => {
      try {
        const data = UserActionTracker.export({
          format: options.format as 'json' | 'csv' | 'yaml',
          query: {
            since: options.since,
            until: options.until,
            user_id: options.user,
            agent_id: options.agent,
          },
        }, options.dir);

        if (options.output) {
          writeFileSync(resolve(process.cwd(), options.output), data, 'utf8');
          console.log(`✓ Exported to: ${options.output}`);
        } else {
          console.log(data);
        }
      } catch (error) {
        console.error('Error: Could not export user actions');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // validate command
  userAction
    .command('validate')
    .description('Validate a user action file')
    .argument('<file>', 'Path to user action YAML file')
    .action((file) => {
      try {
        const result = UserActionTracker.validateFile(file);
        if (result.valid) {
          console.log(`✓ Valid User Action file: ${file}`);
        } else {
          console.log(`✗ Invalid User Action file: ${file}`);
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

  // cleanup command
  userAction
    .command('cleanup')
    .description('Clean up old user action records')
    .option('--older-than <days>', 'Delete records older than N days', parseInt, 90)
    .option('--dry-run', 'Show what would be deleted')
    .option('--dir <path>', 'Storage directory')
    .action((options) => {
      try {
        if (options.dryRun) {
          console.log(`Would delete records older than ${options.olderThan} days`);
          console.log('(Dry run - no actual deletion)');
          return;
        }

        const deleted = UserActionTracker.cleanup(options.olderThan, options.dir);
        console.log(`✓ Cleaned up ${deleted} old user action file(s)`);
      } catch (error) {
        console.error('Error: Could not clean up user actions');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return userAction;
}

function collectContext(value: string, previous: Record<string, string>) {
  const [key, ...rest] = value.split('=');
  previous[key] = rest.join('=');
  return previous;
}