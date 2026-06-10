import { describe, it, expect, beforeEach } from 'vitest';
import { SignalBusServer } from '../src/server.js';
import { SignalBusClient } from '../src/client.js';
import type { RegisterRequest } from '../src/types.js';

describe('Signal Bus Server Integration', () => {
  let server: SignalBusServer;
  let client: SignalBusClient;
  const PORT = 7374; // Use non-standard port for testing

  beforeEach(async () => {
    server = new SignalBusServer({ port: PORT });
    await server.start();
    client = new SignalBusClient({ baseUrl: `http://localhost:${PORT}` });
  });

  afterEach(async () => {
    await server.stop();
    // Wait for port to be released to avoid ECONNRESET on next beforeEach
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await client.health();
      
      expect(health.status).toBe('ok');
      expect(health.uptime_ms).toBeGreaterThan(0);
      expect(health.agents_online).toBe(0);
    });
  });

  describe('Agent Registration', () => {
    it('should register a new agent', async () => {
      const request: RegisterRequest = {
        agent_id: 'test-agent-1',
        name: 'Test Agent',
        project: 'test-project',
        capabilities: ['coding', 'testing'],
        arrow_maps: ['niche:test-v1'],
      };

      const response = await client.register(request);
      
      expect(response.registered).toBe(true);
      expect(response.agent.id).toBe('test-agent-1');
      expect(response.agent.status).toBe('online');
      expect(response.channel).toBe('default');
    });

    it('should send heartbeat', async () => {
      const request: RegisterRequest = {
        agent_id: 'test-agent-heartbeat',
        name: 'Heartbeat Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      };

      await client.register(request);
      const agent = await client.heartbeat('test-agent-heartbeat');
      
      expect(agent).not.toBeNull();
      expect(agent?.id).toBe('test-agent-heartbeat');
    });

    it('should list registered agents', async () => {
      const request: RegisterRequest = {
        agent_id: 'test-agent-list',
        name: 'List Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      };

      await client.register(request);
      const agents = await client.listAgents();
      
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some(a => a.id === 'test-agent-list')).toBe(true);
    });

    it('should unregister agent', async () => {
      const request: RegisterRequest = {
        agent_id: 'test-agent-unregister',
        name: 'Unregister Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      };

      await client.register(request);
      const success = await client.unregister('test-agent-unregister');
      
      expect(success).toBe(true);
    });
  });

  describe('Signal Communication', () => {
    it('should send and receive signals', async () => {
      const signal = await client.sendSignal({
        type: 'test_signal',
        source: 'sender-agent',
        payload: { message: 'Hello!' },
        channel: 'default',
      });

      expect(signal.id).toBeDefined();
      expect(signal.type).toBe('test_signal');
      expect(signal.timestamp).toBeDefined();
    });

    it('should get signals from channel', async () => {
      await client.sendSignal({
        type: 'message',
        source: 'agent-a',
        payload: { text: 'Test message' },
        channel: 'default',
      });

      const signals = await client.getSignals({ channel: 'default' });
      expect(signals.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Discovery', () => {
    it('should discover agents by arrow map', async () => {
      await client.register({
        agent_id: 'agent-1',
        name: 'Agent 1',
        project: 'project-a',
        capabilities: [],
        arrow_maps: ['niche:shared-v1'],
      });

      await client.register({
        agent_id: 'agent-2',
        name: 'Agent 2',
        project: 'project-b',
        capabilities: [],
        arrow_maps: ['niche:shared-v1'],
      });

      const result = await client.discover({ arrow_map: 'niche:shared-v1' });
      
      expect(result.agents.length).toBe(2);
      expect(result.method).toBe('arrow_map');
    });

    it('should discover agents by project', async () => {
      await client.register({
        agent_id: 'proj-agent-1',
        name: 'Project Agent',
        project: 'unique-project',
        capabilities: [],
        arrow_maps: [],
      });

      const result = await client.discover({ project: 'unique-project' });
      
      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('proj-agent-1');
    });

    it('should discover agents by capability', async () => {
      await client.register({
        agent_id: 'capability-agent',
        name: 'Capability Agent',
        project: 'test-project',
        capabilities: ['code-review', 'testing'],
        arrow_maps: [],
      });

      const result = await client.discover({ capability: 'code-review' });
      
      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('capability-agent');
    });
  });

  describe('Backflow (User -> Agent)', () => {
    it('should submit backflow signal', async () => {
      await client.register({
        agent_id: 'backflow-agent',
        name: 'Backflow Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      const signal = await client.submitBackflow(
        'backflow-agent',
        'directive',
        'Switch to testing mode',
        'user@example.com',
        100
      );

      expect(signal.id).toBeDefined();
      expect(signal.agent_id).toBe('backflow-agent');
      expect(signal.type).toBe('directive');
      expect(signal.content).toBe('Switch to testing mode');
      expect(signal.from).toBe('user@example.com');
      expect(signal.priority).toBe(100);
    });

    it('should poll backflow signals', async () => {
      await client.register({
        agent_id: 'poll-agent',
        name: 'Poll Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      await client.submitBackflow('poll-agent', 'notification', 'New task available', 'system');
      await client.submitBackflow('poll-agent', 'query', 'What is the status?', 'user');

      const signals = await client.pollBackflow('poll-agent');
      
      expect(signals.length).toBe(2);
      expect(signals[0].type).toBe('query'); // Higher priority
      expect(signals[1].type).toBe('notification');
    });
  });
});
