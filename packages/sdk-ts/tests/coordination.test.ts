import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignalBusServer } from '@statuz/signal-bus';
import { CoordinationClient, Statuz } from '../src/index.js';

describe('CoordinationClient Integration', () => {
  let server: SignalBusServer;
  let client: CoordinationClient;
  const PORT = 7386;

  beforeAll(async () => {
    server = new SignalBusServer({ port: PORT });
    await server.start();
    client = new CoordinationClient({ baseUrl: `http://localhost:${PORT}` });
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Agent Registration', () => {
    it('should register an agent successfully', async () => {
      const agent = await client.register({
        agent_id: 'integration-test-agent',
        name: 'Integration Test Agent',
        project: 'test-project',
        capabilities: ['coding', 'testing'],
        arrow_maps: ['niche:test-v1'],
      });

      expect(agent.id).toBe('integration-test-agent');
      expect(agent.name).toBe('Integration Test Agent');
      expect(agent.status).toBe('online');
    });

    it('should check server health', async () => {
      const health = await client.health();
      expect(health.status).toBe('ok');
      expect(typeof health.agents_online).toBe('number');
    });
  });

  describe('Signal Communication', () => {
    it('should send and track signals', async () => {
      await client.register({
        agent_id: 'signal-agent',
        name: 'Signal Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      const signal = await client.sendSignal({
        type: 'test_signal',
        source: 'signal-agent',
        payload: { message: 'Hello from CoordinationClient!' },
        channel: 'default',
      });

      expect(signal.id).toBeDefined();
      expect(signal.type).toBe('test_signal');
      expect(signal.timestamp).toBeDefined();
    });

    it('should retrieve signals from channel', async () => {
      await client.register({
        agent_id: 'retrieve-agent',
        name: 'Retrieve Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      await client.sendSignal({
        type: 'signal_1',
        source: 'retrieve-agent',
        payload: { msg: 'first' },
        channel: 'default',
      });

      await client.sendSignal({
        type: 'signal_2',
        source: 'retrieve-agent',
        payload: { msg: 'second' },
        channel: 'default',
      });

      const signals = await client.getSignals({ channel: 'default' });
      expect(signals.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Agent Discovery', () => {
    it('should discover agents by project', async () => {
      await client.register({
        agent_id: 'discovery-agent-1',
        name: 'Discovery Agent 1',
        project: 'integration-project',
        capabilities: ['api'],
        arrow_maps: [],
      });

      await client.register({
        agent_id: 'discovery-agent-2',
        name: 'Discovery Agent 2',
        project: 'integration-project',
        capabilities: ['database'],
        arrow_maps: [],
      });

      const agents = await client.discoverAgents({
        project: 'integration-project',
      });

      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should discover agents by arrow map', async () => {
      await client.register({
        agent_id: 'arrow-agent-1',
        name: 'Arrow Agent 1',
        project: 'test',
        capabilities: [],
        arrow_maps: ['niche:integration-v1'],
      });

      await client.register({
        agent_id: 'arrow-agent-2',
        name: 'Arrow Agent 2',
        project: 'test',
        capabilities: [],
        arrow_maps: ['niche:integration-v1'],
      });

      const agents = await client.discoverAgents({
        arrow_map: 'niche:integration-v1',
      });

      expect(agents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Backflow (User -> Agent signals)', () => {
    it('should create and poll SYN requests', async () => {
      await client.register({
        agent_id: 'syn-agent',
        name: 'SYN Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      const request = await client.createSynRequest({
        requester: 'test-requester',
        type: 'test_syn',
        description: 'Test SYN request from integration test',
        priority: 'medium',
      });

      expect(request.id).toBeDefined();
      expect(request.type).toBe('test_syn');
      expect(request.status).toBe('pending');

      const requests = await client.getSynRequests();
      expect(requests.length).toBeGreaterThanOrEqual(1);
    });

    it('should poll user signals (backflow)', async () => {
      await client.register({
        agent_id: 'backflow-agent',
        name: 'Backflow Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      // Send a directive to this agent
      const directive = await client.sendDirective(
        'backflow-agent',
        'Please check system status'
      );

      expect(directive.id).toBeDefined();
      expect(directive.agent_id).toBe('backflow-agent');

      const signals = await client.pollUserSignals();
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Statuz Integration', () => {
    it('should work together with Statuz runtime state', async () => {
      await client.register({
        agent_id: 'statuz-agent',
        name: 'Statuz Agent',
        project: 'statuz-project',
        capabilities: [],
        arrow_maps: [],
      });

      const statuz = Statuz.create('statuz-agent', 'statuz-project');
      expect(statuz.identity.agent_name).toBe('statuz-agent');

      // Send statuz state as signal
      const signal = await client.sendSignal({
        type: 'state_updated',
        source: statuz.identity.agent_name,
        payload: {
          stage: statuz.currentState.stage,
          status: statuz.currentState.status,
          last_checkpoint: statuz.currentState.last_checkpoint,
        },
        channel: 'default',
      });

      expect(signal.id).toBeDefined();
      expect(signal.payload.stage).toBeDefined();
    });

    it('should append checkpoint and signal', async () => {
      await client.register({
        agent_id: 'checkpoint-agent',
        name: 'Checkpoint Agent',
        project: 'statuz-project',
        capabilities: [],
        arrow_maps: [],
      });

      const statuz = Statuz.create('checkpoint-agent', 'statuz-project');
      const checkpoint = statuz.appendCheckpoint(
        'Completed integration testing',
        'Continue with more features'
      );

      const signal = await client.sendSignal({
        type: 'checkpoint_added',
        source: statuz.identity.agent_name,
        payload: {
          checkpoint_id: checkpoint.id,
          summary: checkpoint.summary,
        },
        channel: 'default',
      });

      expect(signal.id).toBeDefined();
      expect(signal.payload.checkpoint_id).toBe(checkpoint.id);
    });
  });
});
