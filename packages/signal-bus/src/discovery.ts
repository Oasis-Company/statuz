/**
 * Agent Discovery
 * 
 * 4-rule discovery engine:
 * 1. Arrow Map based (primary)
 * 2. Project based
 * 3. Capability based
 * 4. Static/ID based
 */

import type { AgentRecord, DiscoveryQuery, DiscoveryResult } from './types.js';
import type { AgentRegistry } from './registry.js';

export class AgentDiscovery {
  constructor(private registry: AgentRegistry) {}

  /**
   * Discover agents using 4-rule priority system
   */
  discover(query: DiscoveryQuery): DiscoveryResult {
    // Rule 4: Static/ID based (highest priority)
    if (query.agent_id) {
      const agent = this.registry.get(query.agent_id);
      if (agent) {
        return {
          agents: [agent],
          method: 'static',
          query,
        };
      }
      return { agents: [], method: 'static', query };
    }

    // Rule 1: Arrow Map based (primary discovery method)
    if (query.arrow_map) {
      const agents = this.registry.findByArrowMap(query.arrow_map);
      const filtered = this.applyFilters(agents, query);
      return {
        agents: filtered,
        method: 'arrow_map',
        query,
      };
    }

    // Rule 2: Project based
    if (query.project) {
      let agents = this.registry.findByProject(query.project);
      
      // Enhance with Arrow Map discovery if available
      const arrowMapAgents = this.discoverByRelatedArrowMaps(query.project);
      agents = this.mergeAgentLists(agents, arrowMapAgents);
      
      const filtered = this.applyFilters(agents, query);
      return {
        agents: filtered,
        method: 'project',
        query,
      };
    }

    // Rule 3: Capability based
    if (query.capability) {
      const agents = this.registry.findByCapability(query.capability);
      const filtered = this.applyFilters(agents, query);
      return {
        agents: filtered,
        method: 'capability',
        query,
      };
    }

    // Organization filter (works with other rules)
    if (query.organization) {
      let agents = this.registry.findByOrganization(query.organization);
      const filtered = this.applyFilters(agents, query);
      return {
        agents: filtered,
        method: 'static',
        query,
      };
    }

    // Status filter only
    if (query.status) {
      const allAgents = this.registry.getAll();
      const filtered = allAgents.filter(a => a.status === query.status);
      const limited = this.applyLimit(filtered, query);
      return {
        agents: limited,
        method: 'static',
        query,
      };
    }

    // No specific query, return all online agents
    const allAgents = this.registry.getAll().filter(a => a.status === 'online');
    const limited = this.applyLimit(allAgents, query);
    return {
      agents: limited,
      method: 'static',
      query,
    };
  }

  /**
   * Find related agents through Arrow Map topology
   */
  findRelatedAgents(agentId: string): AgentRecord[] {
    const agent = this.registry.get(agentId);
    if (!agent) return [];

    const related: AgentRecord[] = [];

    // Find agents sharing Arrow Maps
    for (const arrowMapId of agent.arrow_maps) {
      const sharedAgents = this.registry.findByArrowMap(arrowMapId);
      related.push(...sharedAgents.filter(a => a.id !== agentId));
    }

    // Find agents in same project
    const projectAgents = this.registry.findByProject(agent.project);
    related.push(...projectAgents.filter(a => 
      a.id !== agentId && !related.some(r => r.id === a.id)
    ));

    // Find agents with overlapping capabilities
    for (const cap of agent.capabilities) {
      const capableAgents = this.registry.findByCapability(cap);
      related.push(...capableAgents.filter(a => 
        a.id !== agentId && !related.some(r => r.id === a.id)
      ));
    }

    return related.filter(a => a.status === 'online');
  }

  /**
   * Query agents with specific requirements
   */
  queryAgents(
    requirements: {
      capabilities?: string[];
      arrow_maps?: string[];
      project?: string;
      status?: AgentRecord['status'];
    }
  ): AgentRecord[] {
    let agents = this.registry.getAll();

    if (requirements.status) {
      agents = agents.filter(a => a.status === requirements.status);
    }

    if (requirements.project) {
      agents = agents.filter(a => a.project === requirements.project);
    }

    if (requirements.arrow_maps && requirements.arrow_maps.length > 0) {
      agents = agents.filter(a => 
        requirements.arrow_maps!.some(am => a.arrow_maps.includes(am))
      );
    }

    if (requirements.capabilities && requirements.capabilities.length > 0) {
      agents = agents.filter(a => 
        requirements.capabilities!.some(cap => 
          a.capabilities.some(ac => ac.toLowerCase().includes(cap.toLowerCase()))
        )
      );
    }

    return agents;
  }

  /**
   * Get agents by status
   */
  getByStatus(status: AgentRecord['status']): AgentRecord[] {
    return this.registry.getAll().filter(a => a.status === status);
  }

  /**
   * Discover agents sharing Arrow Maps with a project
   */
  private discoverByRelatedArrowMaps(project: string): AgentRecord[] {
    const projectAgents = this.registry.findByProject(project);
    const allArrowMaps = new Set<string>();
    
    for (const agent of projectAgents) {
      for (const arrowMap of agent.arrow_maps) {
        allArrowMaps.add(arrowMap);
      }
    }

    const related: AgentRecord[] = [];
    for (const arrowMap of allArrowMaps) {
      const agents = this.registry.findByArrowMap(arrowMap);
      related.push(...agents.filter(a => a.project !== project));
    }

    return related;
  }

  /**
   * Merge and dedupe agent lists
   */
  private mergeAgentLists(...lists: AgentRecord[][]): AgentRecord[] {
    const seen = new Set<string>();
    const merged: AgentRecord[] = [];

    for (const list of lists) {
      for (const agent of list) {
        if (!seen.has(agent.id)) {
          seen.add(agent.id);
          merged.push(agent);
        }
      }
    }

    return merged;
  }

  /**
   * Apply additional filters to agent list
   */
  private applyFilters(agents: AgentRecord[], query: DiscoveryQuery): AgentRecord[] {
    let filtered = agents;

    if (query.status) {
      filtered = filtered.filter(a => a.status === query.status);
    }

    if (query.capability) {
      filtered = filtered.filter(a => 
        a.capabilities.some(c => 
          c.toLowerCase().includes(query.capability!.toLowerCase())
        )
      );
    }

    return this.applyLimit(filtered, query);
  }

  /**
   * Apply result limit
   */
  private applyLimit(agents: AgentRecord[], query: DiscoveryQuery): AgentRecord[] {
    if (query.limit && query.limit > 0) {
      return agents.slice(0, query.limit);
    }
    return agents;
  }
}
