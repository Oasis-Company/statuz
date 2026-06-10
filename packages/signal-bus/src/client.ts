/**
 * Signal Bus Client
 * 
 * Fetch-based client for all Signal Bus endpoints.
 */

import type {
  AgentRecord,
  BusSignal,
  RegisterRequest,
  RegisterResponse,
  DiscoveryQuery,
  DiscoveryResult,
  BackflowSignal,
  SignalQuery,
  HealthStatus,
  ApiResponse,
} from './types.js';

export interface ClientConfig {
  /** Signal Bus server URL */
  baseUrl: string;
  /** Default request timeout in ms */
  timeout?: number;
}

export class SignalBusClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Check server health
   */
  async health(): Promise<HealthStatus> {
    const response = await this.request<HealthStatus>('/health');
    return response;
  }

  // ===========================================================================
  // Agent Registration
  // ===========================================================================

  /**
   * Register a new agent
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>('/register', {
      method: 'POST',
      body: request,
    });
    return response;
  }

  /**
   * Send heartbeat to keep agent online
   */
  async heartbeat(agentId: string): Promise<AgentRecord | null> {
    const response = await this.request<{ success: boolean; agent?: AgentRecord }>(
      `/heartbeat/${encodeURIComponent(agentId)}`,
      { method: 'POST' }
    );
    return response.agent ?? null;
  }

  /**
   * List all agents
   */
  async listAgents(options?: { status?: AgentRecord['status']; limit?: number }): Promise<AgentRecord[]> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<ApiResponse<AgentRecord[]>>(`/agents${query}`);
    return response.data ?? [];
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentRecord | null> {
    const response = await this.request<ApiResponse<AgentRecord>>(
      `/agents/${encodeURIComponent(agentId)}`
    );
    return response.data ?? null;
  }

  /**
   * Unregister agent
   */
  async unregister(agentId: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(
      `/agents/${encodeURIComponent(agentId)}`,
      { method: 'DELETE' }
    );
    return response.success;
  }

  // ===========================================================================
  // Signal Communication
  // ===========================================================================

  /**
   * Send a signal
   */
  async sendSignal(signal: Omit<BusSignal, 'id' | 'timestamp'>): Promise<BusSignal> {
    const response = await this.request<ApiResponse<BusSignal>>('/signals', {
      method: 'POST',
      body: signal,
    });
    return response.data!;
  }

  /**
   * Get signals from a channel
   */
  async getSignals(query: SignalQuery = {}): Promise<BusSignal[]> {
    const params = new URLSearchParams();
    if (query.channel) params.set('channel', query.channel);
    if (query.source) params.set('source', query.source);
    if (query.target) params.set('target', query.target);
    if (query.type) params.set('type', query.type);
    if (query.after) params.set('after', query.after);
    if (query.before) params.set('before', query.before);
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.offset) params.set('offset', query.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<ApiResponse<BusSignal[]>>(`/signals${queryString}`);
    return response.data ?? [];
  }

  // ===========================================================================
  // Agent Discovery
  // ===========================================================================

  /**
   * Discover agents using query
   */
  async discover(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const params = new URLSearchParams();
    if (query.agent_id) params.set('agent_id', query.agent_id);
    if (query.project) params.set('project', query.project);
    if (query.organization) params.set('organization', query.organization);
    if (query.capability) params.set('capability', query.capability);
    if (query.arrow_map) params.set('arrow_map', query.arrow_map);
    if (query.status) params.set('status', query.status);
    if (query.limit) params.set('limit', query.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<ApiResponse<DiscoveryResult>>(`/discover${queryString}`);
    return response.data!;
  }

  // ===========================================================================
  // Backflow (User -> Agent)
  // ===========================================================================

  /**
   * Submit a user signal to an agent
   */
  async submitBackflow(
    agentId: string,
    type: BackflowSignal['type'],
    content: string,
    from: string,
    priority?: number
  ): Promise<BackflowSignal> {
    const response = await this.request<ApiResponse<BackflowSignal>>('/backflow', {
      method: 'POST',
      body: { agent_id: agentId, type, content, from, priority },
    });
    return response.data!;
  }

  /**
   * Poll backflow signals for an agent
   */
  async pollBackflow(
    agentId: string,
    options?: { type?: BackflowSignal['type']; include_acknowledged?: boolean; limit?: number }
  ): Promise<BackflowSignal[]> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.include_acknowledged) params.set('include_acknowledged', 'true');
    if (options?.limit) params.set('limit', options.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<ApiResponse<BackflowSignal[]>>(
      `/backflow/${encodeURIComponent(agentId)}${queryString}`
    );
    return response.data ?? [];
  }

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  /**
   * Create and register an agent with heartbeat loop
   */
  async registerWithHeartbeat(
    request: RegisterRequest,
    intervalMs: number = 60000
  ): Promise<{ stop: () => void }> {
    const response = await this.register(request);
    
    const intervalId = setInterval(async () => {
      try {
        await this.heartbeat(response.agent.id);
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, intervalMs);

    return {
      stop: () => clearInterval(intervalId),
    };
  }

  /**
   * Convenience: send a directive (high priority command)
   */
  async sendDirective(agentId: string, content: string, from: string): Promise<BackflowSignal> {
    return this.submitBackflow(agentId, 'directive', content, from, 100);
  }

  /**
   * Convenience: send a notification (low priority info)
   */
  async sendNotification(agentId: string, content: string, from: string): Promise<BackflowSignal> {
    return this.submitBackflow(agentId, 'notification', content, from, 25);
  }

  // ===========================================================================
  // Request Utilities
  // ===========================================================================

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method ?? 'GET';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    
    // Handle empty responses
    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * Create client from environment or default
   */
  static fromEnv(): SignalBusClient {
    const baseUrl = process.env.SIGNAL_BUS_URL ?? 'http://localhost:7373';
    return new SignalBusClient({ baseUrl });
  }
}
