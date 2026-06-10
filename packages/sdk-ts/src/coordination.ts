/**
 * Coordination Client
 * 
 * Upgraded from stub to real SignalBusClient wrapper.
 * Provides agent registration, signal communication, and discovery.
 */

import { SignalBusClient, SignalBusClient as SignalBusClientClass } from '@statuz/signal-bus';
import type { BusSignal, AgentRecord, BackflowSignal, DiscoveryResult } from '@statuz/signal-bus';

// Re-export types for convenience
export type { BusSignal, AgentRecord, BackflowSignal, DiscoveryResult };

// SDK-specific signal interface (distinct from BusSignal)
export interface Signal {
  id?: string;
  type: string;
  source: string;
  target?: string;
  payload: Record<string, unknown>;
  receivedAt?: string;
  timestamp?: string;
  channel?: string;
}

export interface SynRequest {
  id?: string;
  requester: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export interface SignalResponse {
  success: boolean;
  signal?: Signal;
  signals?: Signal[];
}

export interface SynResponse {
  success: boolean;
  request?: SynRequest;
  requests?: SynRequest[];
}

export interface AgentInfo {
  agent_id: string;
  name: string;
  project: string;
  organization?: string;
  capabilities: string[];
  arrow_maps: string[];
}

export interface CoordinationConfig {
  /** Signal Bus server URL */
  baseUrl?: string;
  /** Agent info for registration */
  agentInfo?: AgentInfo;
  /** Heartbeat interval in ms */
  heartbeatIntervalMs?: number;
}

export class CoordinationClient {
  private client: SignalBusClientClass;
  private agentInfo?: AgentInfo;
  private heartbeatIntervalMs: number;
  private heartbeatStop?: () => void;
  private registeredAgentId?: string;

  constructor(config: CoordinationConfig = {}) {
    const baseUrl = config.baseUrl ?? 'http://localhost:7373';
    this.client = new SignalBusClientClass({ baseUrl });
    this.agentInfo = config.agentInfo;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? 60000;
  }

  /**
   * Register this agent with the Signal Bus
   */
  async register(info: AgentInfo): Promise<AgentRecord> {
    this.agentInfo = info;
    
    const response = await this.client.register({
      agent_id: info.agent_id,
      name: info.name,
      project: info.project,
      organization: info.organization,
      capabilities: info.capabilities,
      arrow_maps: info.arrow_maps,
    });

    this.registeredAgentId = response.agent.id;

    // Start heartbeat
    if (this.heartbeatIntervalMs > 0) {
      const heartbeat = await this.client.registerWithHeartbeat(
        {
          agent_id: info.agent_id,
          name: info.name,
          project: info.project,
          organization: info.organization,
          capabilities: info.capabilities,
          arrow_maps: info.arrow_maps,
        },
        this.heartbeatIntervalMs
      );
      this.heartbeatStop = heartbeat.stop;
    }

    return response.agent;
  }

  /**
   * Unregister this agent
   */
  async unregister(): Promise<void> {
    if (this.registeredAgentId) {
      await this.client.unregister(this.registeredAgentId);
      if (this.heartbeatStop) {
        this.heartbeatStop();
      }
      this.registeredAgentId = undefined;
    }
  }

  /**
   * Send a signal
   */
  async sendSignal(signal: Omit<Signal, 'receivedAt'>): Promise<Signal> {
    const busSignal: BusSignal = {
      id: signal.id ?? `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: signal.type,
      source: signal.source,
      target: signal.target,
      payload: signal.payload,
      timestamp: signal.timestamp ?? new Date().toISOString(),
      channel: signal.channel ?? 'default',
    };

    const result = await this.client.sendSignal(busSignal);
    
    return {
      id: result.id,
      type: result.type,
      source: result.source,
      target: result.target,
      payload: result.payload,
      timestamp: result.timestamp,
      channel: result.channel,
      receivedAt: result.timestamp,
    };
  }

  /**
   * Get signals from channels
   */
  async getSignals(options?: { channel?: string; limit?: number }): Promise<Signal[]> {
    const signals = await this.client.getSignals({
      channel: options?.channel,
      limit: options?.limit,
    });

    return signals.map(s => ({
      id: s.id,
      type: s.type,
      source: s.source,
      target: s.target,
      payload: s.payload,
      timestamp: s.timestamp,
      channel: s.channel,
      receivedAt: s.timestamp,
    }));
  }

  /**
   * Create a SYN request (stored as backflow)
   */
  async createSynRequest(request: Omit<SynRequest, 'id' | 'status' | 'createdAt'>): Promise<SynRequest> {
    if (!this.agentInfo) {
      throw new Error('Agent not registered. Call register() first.');
    }

    const priorityMap: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100,
    };

    const backflow = await this.client.submitBackflow(
      this.agentInfo.agent_id,
      'query', // Using query type for SYN requests
      `[SYN REQUEST] ${request.type}: ${request.description}`,
      request.requester,
      priorityMap[request.priority] ?? 50
    );

    return {
      id: backflow.id,
      requester: backflow.from,
      type: request.type,
      description: request.description,
      priority: request.priority,
      status: 'pending',
      createdAt: backflow.timestamp,
    };
  }

  /**
   * Get SYN requests (polling backflow)
   */
  async getSynRequests(): Promise<SynRequest[]> {
    if (!this.agentInfo) {
      return [];
    }

    const backflows = await this.client.pollBackflow(this.agentInfo.agent_id, {
      type: 'query',
      limit: 50,
    });

    return backflows
      .filter(b => b.content.startsWith('[SYN REQUEST]'))
      .map(b => ({
        id: b.id,
        requester: b.from,
        type: b.content.split(':')[1]?.trim() ?? 'unknown',
        description: b.content.split(':').slice(2).join(':').trim(),
        priority: 'medium' as const,
        status: 'pending' as const,
        createdAt: b.timestamp,
      }));
  }

  /**
   * Discover related agents
   */
  async discoverAgents(query: {
    arrow_map?: string;
    project?: string;
    capability?: string;
  }): Promise<AgentRecord[]> {
    const result = await this.client.discover({
      arrow_map: query.arrow_map,
      project: query.project,
      capability: query.capability,
    });
    return result.agents;
  }

  /**
   * Query agents
   */
  async queryAgents(requirements: {
    capabilities?: string[];
    arrow_maps?: string[];
    project?: string;
  }): Promise<AgentRecord[]> {
    const result = await this.client.discover({
      capability: requirements.capabilities?.[0],
      project: requirements.project,
      arrow_map: requirements.arrow_maps?.[0],
    });
    return result.agents;
  }

  /**
   * Poll user signals (backflow)
   */
  async pollUserSignals(limit?: number): Promise<BackflowSignal[]> {
    if (!this.agentInfo) {
      return [];
    }
    return this.client.pollBackflow(this.agentInfo.agent_id, { limit });
  }

  /**
   * Send a directive to another agent
   */
  async sendDirective(targetAgentId: string, content: string): Promise<BackflowSignal> {
    return this.client.sendDirective(targetAgentId, content, this.agentInfo?.name ?? 'unknown');
  }

  /**
   * Send a notification to another agent
   */
  async sendNotification(targetAgentId: string, content: string): Promise<BackflowSignal> {
    return this.client.sendNotification(targetAgentId, content, this.agentInfo?.name ?? 'unknown');
  }

  /**
   * Check Signal Bus health
   */
  async health(): Promise<{ status: string; agents_online: number }> {
    const health = await this.client.health();
    return {
      status: health.status,
      agents_online: health.agents_online,
    };
  }
}
