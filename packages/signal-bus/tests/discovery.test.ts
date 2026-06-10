import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../src/registry.js';
import { AgentDiscovery } from '../src/discovery.js';
import type { AgentRecord, RegisterRequest } from '../src/types.js';

describe('Agent Discovery', () => {
  let registry: AgentRegistry;
  let discovery: AgentDiscovery;

  beforeEach(() => {
    registry = new AgentRegistry();
    discovery = new AgentDiscovery(registry);
  });

  describe('Static/ID Discovery', () => {
    it('should find agent by ID', () => {
      registry.register({
        agent_id: 'static-agent',
        name: 'Static Agent',
        project: 'test-project',
        capabilities: [],
        arrow_maps: [],
      });

      const result = discovery.discover({ agent_id: 'static-agent' });

      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('static-agent');
      expect(result.method).toBe('static');
    });

    it('should return empty for unknown agent ID', () => {
      const result = discovery.discover({ agent_id: 'unknown-agent' });

      expect(result.agents.length).toBe(0);
      expect(result.method).toBe('static');
    });
  });

  describe('Arrow Map Discovery', () => {
    it('should find agents sharing Arrow Map', () => {
      registry.register({
        agent_id: 'arrow-agent-1',
        name: 'Arrow Agent 1',
        project: 'project-a',
        capabilities: [],
        arrow_maps: ['niche:backend-v1'],
      });

      registry.register({
        agent_id: 'arrow-agent-2',
        name: 'Arrow Agent 2',
        project: 'project-b',
        capabilities: [],
        arrow_maps: ['niche:backend-v1'],
      });

      registry.register({
        agent_id: 'arrow-agent-3',
        name: 'Arrow Agent 3',
        project: 'project-c',
        capabilities: [],
        arrow_maps: ['niche:frontend-v1'],
      });

      const result = discovery.discover({ arrow_map: 'niche:backend-v1' });

      expect(result.agents.length).toBe(2);
      expect(result.method).toBe('arrow_map');
      expect(result.agents.every(a => a.arrow_maps.includes('niche:backend-v1'))).toBe(true);
    });
  });

  describe('Project Discovery', () => {
    it('should find agents by project', () => {
      registry.register({
        agent_id: 'proj-agent-1',
        name: 'Project Agent 1',
        project: 'backend',
        capabilities: ['api'],
        arrow_maps: [],
      });

      registry.register({
        agent_id: 'proj-agent-2',
        name: 'Project Agent 2',
        project: 'backend',
        capabilities: ['database'],
        arrow_maps: [],
      });

      registry.register({
        agent_id: 'proj-agent-3',
        name: 'Project Agent 3',
        project: 'frontend',
        capabilities: ['ui'],
        arrow_maps: [],
      });

      const result = discovery.discover({ project: 'backend' });

      expect(result.agents.length).toBe(2);
      expect(result.method).toBe('project');
    });
  });

  describe('Capability Discovery', () => {
    it('should find agents by capability', () => {
      registry.register({
        agent_id: 'cap-agent-1',
        name: 'Capability Agent 1',
        project: 'test',
        capabilities: ['code-review', 'testing'],
        arrow_maps: [],
      });

      registry.register({
        agent_id: 'cap-agent-2',
        name: 'Capability Agent 2',
        project: 'test',
        capabilities: ['documentation'],
        arrow_maps: [],
      });

      const result = discovery.discover({ capability: 'code-review' });

      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('cap-agent-1');
      expect(result.method).toBe('capability');
    });

    it('should be case-insensitive', () => {
      registry.register({
        agent_id: 'case-agent',
        name: 'Case Agent',
        project: 'test',
        capabilities: ['Code-Review'],
        arrow_maps: [],
      });

      const result = discovery.discover({ capability: 'CODE-REVIEW' });

      expect(result.agents.length).toBe(1);
    });
  });

  describe('Status Filtering', () => {
    it('should filter by online status', () => {
      // Register agents (both start as online)
      registry.register({
        agent_id: 'agent-1',
        name: 'Agent 1',
        project: 'test',
        capabilities: [],
        arrow_maps: [],
      });

      registry.register({
        agent_id: 'agent-2',
        name: 'Agent 2',
        project: 'test',
        capabilities: [],
        arrow_maps: [],
      });

      // Manually set one as offline for testing
      registry.updateStatus('agent-2', 'offline');

      const result = discovery.discover({ status: 'online' });

      expect(result.agents.length).toBe(1);
      expect(result.agents[0].id).toBe('agent-1');
    });

    it('should filter by offline status', () => {
      registry.register({
        agent_id: 'offline-agent',
        name: 'Offline Agent',
        project: 'test',
        capabilities: [],
        arrow_maps: [],
      });

      registry.updateStatus('offline-agent', 'offline');

      const result = discovery.discover({ status: 'offline' });

      expect(result.agents.some(a => a.id === 'offline-agent')).toBe(true);
    });
  });

  describe('Result Limiting', () => {
    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        registry.register({
          agent_id: `limit-agent-${i}`,
          name: `Limit Agent ${i}`,
          project: 'test',
          capabilities: [],
          arrow_maps: [],
        });
      }

      const result = discovery.discover({ limit: 5 });

      expect(result.agents.length).toBe(5);
    });
  });

  describe('Related Agents', () => {
    it('should find related agents through Arrow Maps', () => {
      registry.register({
        agent_id: 'related-main',
        name: 'Main Agent',
        project: 'main-project',
        capabilities: ['api'],
        arrow_maps: ['niche:shared-v1'],
      });

      registry.register({
        agent_id: 'related-1',
        name: 'Related 1',
        project: 'other-project',
        capabilities: ['frontend'],
        arrow_maps: ['niche:shared-v1'],
      });

      const related = discovery.findRelatedAgents('related-main');

      expect(related.length).toBe(1);
      expect(related[0].id).toBe('related-1');
    });
  });

  describe('Query Agents', () => {
    it('should query with multiple requirements', () => {
      registry.register({
        agent_id: 'query-agent-1',
        name: 'Query Agent 1',
        project: 'backend',
        capabilities: ['api', 'testing'],
        arrow_maps: ['niche:v1'],
      });

      registry.register({
        agent_id: 'query-agent-2',
        name: 'Query Agent 2',
        project: 'backend',
        capabilities: ['api'],
        arrow_maps: ['niche:v2'],
      });

      const result = discovery.queryAgents({
        project: 'backend',
        capabilities: ['api'],
      });

      expect(result.length).toBe(2);
    });
  });
});
