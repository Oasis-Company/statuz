/**
 * Bus Command
 * 
 * CLI commands for Signal Bus management.
 */

import { Command } from 'commander';
import { SignalBusClient } from '@statuz/signal-bus';

export function busCommand(): Command {
  const bus = new Command();
  bus
    .name('bus')
    .description('Signal Bus management commands')
    .option('--url <url>', 'Signal Bus server URL', 'http://localhost:7373');

  // Health check
  bus
    .command('health')
    .description('Check Signal Bus health')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        const health = await client.health();
        console.log('=== Signal Bus Health ===');
        console.log(`Status: ${health.status}`);
        console.log(`Agents Online: ${health.agents_online}`);
        console.log(`Signals Processed: ${health.signals_processed}`);
        console.log(`Uptime: ${(health.uptime_ms / 1000).toFixed(0)}s`);
        console.log(`Timestamp: ${health.timestamp}`);
      } catch (error) {
        console.error('Error: Could not connect to Signal Bus');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // List agents
  bus
    .command('agents')
    .description('List registered agents')
    .option('--status <status>', 'Filter by status (online, offline, busy, idle)')
    .option('--limit <number>', 'Limit results', '50')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        const agents = await client.listAgents({
          status: options.status as any,
          limit: parseInt(options.limit),
        });

        if (agents.length === 0) {
          console.log('No agents found');
          return;
        }

        console.log(`=== Registered Agents (${agents.length}) ===\n`);
        for (const agent of agents) {
          console.log(`[${agent.status.toUpperCase()}] ${agent.name} (${agent.id})`);
          console.log(`  Project: ${agent.project}`);
          if (agent.organization) console.log(`  Org: ${agent.organization}`);
          console.log(`  Capabilities: ${agent.capabilities.join(', ') || 'none'}`);
          console.log(`  Arrow Maps: ${agent.arrow_maps.join(', ') || 'none'}`);
          console.log(`  Last Heartbeat: ${agent.last_heartbeat}`);
          console.log('');
        }
      } catch (error) {
        console.error('Error: Could not list agents');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Register agent
  bus
    .command('register')
    .description('Register a new agent with Signal Bus')
    .requiredOption('--id <id>', 'Agent ID')
    .requiredOption('--name <name>', 'Agent name')
    .requiredOption('--project <project>', 'Project name')
    .option('--org <org>', 'Organization')
    .option('--capabilities <caps...>', 'Capabilities')
    .option('--arrow-maps <maps...>', 'Arrow Map IDs')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        const result = await client.register({
          agent_id: options.id,
          name: options.name,
          project: options.project,
          organization: options.org,
          capabilities: options.capabilities ?? [],
          arrow_maps: options.arrowMaps ?? [],
        });

        console.log('=== Agent Registered ===');
        console.log(`ID: ${result.agent.id}`);
        console.log(`Name: ${result.agent.name}`);
        console.log(`Project: ${result.agent.project}`);
        console.log(`Status: ${result.agent.status}`);
        console.log(`Channel: ${result.channel}`);
      } catch (error) {
        console.error('Error: Could not register agent');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Discover agents
  bus
    .command('discover')
    .description('Discover agents using query')
    .option('--arrow-map <id>', 'Find by Arrow Map ID')
    .option('--project <name>', 'Find by project')
    .option('--capability <cap>', 'Find by capability')
    .option('--status <status>', 'Filter by status')
    .option('--limit <number>', 'Limit results', '20')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        const result = await client.discover({
          arrow_map: options.arrowMap,
          project: options.project,
          capability: options.capability,
          status: options.status as any,
          limit: parseInt(options.limit),
        });

        console.log(`=== Discovery Results ===`);
        console.log(`Method: ${result.method}`);
        console.log(`Found: ${result.agents.length} agents\n`);

        for (const agent of result.agents) {
          console.log(`[${agent.status}] ${agent.name} (${agent.id})`);
          console.log(`  Project: ${agent.project}`);
          if (agent.capabilities.length > 0) {
            console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
          }
        }
      } catch (error) {
        console.error('Error: Discovery failed');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Send signal
  bus
    .command('signal')
    .description('Send a signal')
    .requiredOption('--type <type>', 'Signal type')
    .requiredOption('--source <source>', 'Source agent ID')
    .option('--target <target>', 'Target agent ID (optional for broadcast)')
    .requiredOption('--channel <channel>', 'Channel name', 'default')
    .option('--payload <json>', 'Payload as JSON string')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        let payload: Record<string, unknown> = {};
        if (options.payload) {
          payload = JSON.parse(options.payload);
        }

        const signal = await client.sendSignal({
          type: options.type,
          source: options.source,
          target: options.target,
          channel: options.channel,
          payload,
        });

        console.log('=== Signal Sent ===');
        console.log(`ID: ${signal.id}`);
        console.log(`Type: ${signal.type}`);
        console.log(`Source: ${signal.source}`);
        if (signal.target) console.log(`Target: ${signal.target}`);
        console.log(`Channel: ${signal.channel}`);
        console.log(`Timestamp: ${signal.timestamp}`);
      } catch (error) {
        console.error('Error: Could not send signal');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  // Backflow submit
  bus
    .command('backflow')
    .description('Submit user signal to agent')
    .requiredOption('--agent <id>', 'Target agent ID')
    .requiredOption('--type <type>', 'Backflow type (directive, query, notification, escalation)')
    .requiredOption('--content <content>', 'Content/message')
    .requiredOption('--from <from>', 'Sender identifier')
    .option('--priority <number>', 'Priority (0-100)', '50')
    .action(async (options) => {
      const client = new SignalBusClient({ baseUrl: options.parent?.url() ?? 'http://localhost:7373' });
      try {
        const signal = await client.submitBackflow(
          options.agent,
          options.type as any,
          options.content,
          options.from,
          parseInt(options.priority)
        );

        console.log('=== Backflow Submitted ===');
        console.log(`ID: ${signal.id}`);
        console.log(`Agent: ${signal.agent_id}`);
        console.log(`Type: ${signal.type}`);
        console.log(`From: ${signal.from}`);
        console.log(`Priority: ${signal.priority}`);
        console.log(`Timestamp: ${signal.timestamp}`);
      } catch (error) {
        console.error('Error: Could not submit backflow');
        console.error((error as Error).message);
        process.exit(1);
      }
    });

  return bus;
}
