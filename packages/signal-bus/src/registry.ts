/**
 * Agent Registry
 * 
 * In-memory Map + optional JSON file persistence for agent directory.
 * Follows Statuz "file-first" philosophy.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AgentRecord, RegisterRequest } from './types.js';

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface RegistryConfig {
  /** File path for persistence */
  persistence_path?: string;
  /** Heartbeat timeout in ms */
  heartbeat_timeout_ms?: number;
}

export class AgentRegistry {
  private agents: Map<string, AgentRecord> = new Map();
  private persistencePath?: string;
  private heartbeatTimeoutMs: number;
  private startTime: Date;

  constructor(config: RegistryConfig = {}) {
    this.persistencePath = config.persistence_path;
    this.heartbeatTimeoutMs = config.heartbeat_timeout_ms ?? DEFAULT_HEARTBEAT_TIMEOUT_MS;
    this.startTime = new Date();

    if (this.persistencePath) {
      this.load();
    }
  }

  /**
   * Register a new agent
   */
  register(request: RegisterRequest): AgentRecord {
    const now = new Date().toISOString();

    const agent: AgentRecord = {
      id: request.agent_id,
      name: request.name,
      project: request.project,
      organization: request.organization,
      status: 'online',
      capabilities: request.capabilities,
      arrow_maps: request.arrow_maps,
      endpoint: request.endpoint,
      metadata: request.metadata,
      last_heartbeat: now,
      registered_at: now,
    };

    this.agents.set(agent.id, agent);
    this.persist();

    return agent;
  }

  /**
   * Update agent heartbeat
   */
  heartbeat(agentId: string): AgentRecord | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.last_heartbeat = new Date().toISOString();
    agent.status = 'online';
    this.agents.set(agentId, agent);
    this.persist();

    return agent;
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): AgentRecord | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Check if agent has timed out
    if (this.isTimedOut(agent)) {
      agent.status = 'offline';
      this.agents.set(agentId, agent);
      this.persist();
      return null;
    }

    return agent;
  }

  /**
   * Get all agents (with timeout check)
   */
  getAll(): AgentRecord[] {
    const now = Date.now();
    const result: AgentRecord[] = [];

    for (const [id, agent] of this.agents) {
      if (this.isTimedOut(agent)) {
        agent.status = 'offline';
        this.agents.set(id, agent);
        continue;
      }
      result.push(agent);
    }

    return result;
  }

  /**
   * Find agents by criteria
   */
  findByProject(project: string): AgentRecord[] {
    return this.getAll().filter(a => a.project === project);
  }

  findByCapability(capability: string): AgentRecord[] {
    return this.getAll().filter(a => 
      a.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))
    );
  }

  findByArrowMap(arrowMapId: string): AgentRecord[] {
    return this.getAll().filter(a => 
      a.arrow_maps.includes(arrowMapId)
    );
  }

  findByOrganization(organization: string): AgentRecord[] {
    return this.getAll().filter(a => a.organization === organization);
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentRecord['status']): AgentRecord | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.status = status;
    this.agents.set(agentId, agent);
    this.persist();

    return agent;
  }

  /**
   * Unregister agent
   */
  unregister(agentId: string): boolean {
    const deleted = this.agents.delete(agentId);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  /**
   * Get online agents count
   */
  getOnlineCount(): number {
    return this.getAll().filter(a => a.status === 'online').length;
  }

  /**
   * Get uptime in ms
   */
  getUptimeMs(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Check if agent has timed out
   */
  private isTimedOut(agent: AgentRecord): boolean {
    const lastHeartbeat = new Date(agent.last_heartbeat).getTime();
    return Date.now() - lastHeartbeat > this.heartbeatTimeoutMs;
  }

  /**
   * Persist to file
   */
  private persist(): void {
    if (!this.persistencePath) return;

    try {
      const dir = dirname(this.persistencePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: '1.0',
        saved_at: new Date().toISOString(),
        agents: Array.from(this.agents.values()),
      };

      writeFileSync(this.persistencePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to persist registry:', error);
    }
  }

  /**
   * Load from file
   */
  private load(): void {
    if (!this.persistencePath || !existsSync(this.persistencePath)) return;

    try {
      const content = readFileSync(this.persistencePath, 'utf8');
      const data = JSON.parse(content);

      if (data.agents && Array.isArray(data.agents)) {
        for (const agent of data.agents) {
          this.agents.set(agent.id, agent as AgentRecord);
        }
      }
    } catch (error) {
      console.error('Failed to load registry:', error);
    }
  }

  /**
   * Export all agents as array
   */
  export(): AgentRecord[] {
    return Array.from(this.agents.values());
  }

  /**
   * Import agents (replace all)
   */
  import(agents: AgentRecord[]): void {
    this.agents.clear();
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
    }
    this.persist();
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
    this.persist();
  }
}
