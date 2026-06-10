/**
 * Signal Bus Server
 * 
 * HTTP server with 8 endpoints for signal transport and agent management.
 */

import http from 'node:http';
import { URL } from 'node:url';
import type {
  ServerConfig,
  HealthStatus,
  BusSignal,
  RegisterRequest,
  RegisterResponse,
  DiscoveryQuery,
  BackflowSignal,
  SignalQuery,
  ApiResponse,
  AgentRecord,
} from './types.js';
import { AgentRegistry } from './registry.js';
import { ChannelManager } from './channels.js';
import { AgentDiscovery } from './discovery.js';
import { BackflowEngine } from './backflow.js';

const DEFAULT_PORT = 7373;

export class SignalBusServer {
  private server?: http.Server;
  private registry: AgentRegistry;
  private channels: ChannelManager;
  private discovery: AgentDiscovery;
  private backflow: BackflowEngine;
  private config: ServerConfig;
  private signalsProcessed = 0;
  private startTime: Date;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: config.port ?? DEFAULT_PORT,
      host: config.host,
      persistence_path: config.persistence_path,
      heartbeat_timeout_ms: config.heartbeat_timeout_ms,
      cors_origins: config.cors_origins ?? ['*'],
    };

    this.registry = new AgentRegistry({
      persistence_path: this.config.persistence_path,
      heartbeat_timeout_ms: this.config.heartbeat_timeout_ms,
    });

    this.channels = new ChannelManager();
    this.discovery = new AgentDiscovery(this.registry);
    this.backflow = new BackflowEngine();
    this.startTime = new Date();
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`Signal Bus running at http://${this.config.host ?? 'localhost'}:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', this.config.cors_origins?.join(', ') ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const method = req.method ?? 'GET';

    try {
      // Route handling
      if (path === '/health' && method === 'GET') {
        this.handleHealth(res);
      } else if (path === '/register' && method === 'POST') {
        this.handleRegister(req, res);
      } else if (path.startsWith('/heartbeat/') && method === 'POST') {
        const agentId = path.slice('/heartbeat/'.length);
        this.handleHeartbeat(res, agentId);
      } else if (path === '/agents' && method === 'GET') {
        this.handleListAgents(res, parsedUrl);
      } else if (path.startsWith('/agents/') && method === 'GET') {
        const agentId = path.slice('/agents/'.length);
        this.handleGetAgent(res, agentId);
      } else if (path.startsWith('/agents/') && method === 'DELETE') {
        const agentId = path.slice('/agents/'.length);
        this.handleUnregister(res, agentId);
      } else if (path === '/signals' && method === 'POST') {
        this.handleSendSignal(req, res);
      } else if (path === '/signals' && method === 'GET') {
        this.handleGetSignals(res, parsedUrl);
      } else if (path === '/discover' && method === 'GET') {
        this.handleDiscover(res, parsedUrl);
      } else if (path === '/backflow' && method === 'POST') {
        this.handleSubmitBackflow(req, res);
      } else if (path.startsWith('/backflow/') && method === 'GET') {
        const agentId = path.slice('/backflow/'.length);
        this.handlePollBackflow(res, agentId, parsedUrl);
      } else {
        this.sendJson(res, 404, { success: false, error: 'Not found' });
      }
    } catch (error) {
      console.error('Request error:', error);
      this.sendJson(res, 500, { success: false, error: 'Internal server error' });
    }
  }

  // ===========================================================================
  // Request Handlers
  // ===========================================================================

  private handleHealth(res: http.ServerResponse): void {
    const status: HealthStatus = {
      status: 'ok',
      uptime_ms: Date.now() - this.startTime.getTime(),
      agents_online: this.registry.getOnlineCount(),
      signals_processed: this.signalsProcessed,
      timestamp: new Date().toISOString(),
    };
    this.sendJson(res, 200, status);
  }

  private async handleRegister(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const request = JSON.parse(body) as RegisterRequest;

    const agent = this.registry.register(request);
    this.channels.subscribe('default', agent.id);
    this.channels.subscribe('agent-broadcast', agent.id);

    const response: RegisterResponse = {
      registered: true,
      agent,
      channel: 'default',
    };

    this.sendJson(res, 201, response);
  }

  private handleHeartbeat(res: http.ServerResponse, agentId: string): void {
    const agent = this.registry.heartbeat(agentId);
    if (agent) {
      this.sendJson(res, 200, { success: true, agent });
    } else {
      this.sendJson(res, 404, { success: false, error: 'Agent not found' });
    }
  }

  private handleListAgents(res: http.ServerResponse, url: URL): void {
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') ?? '100');
    
    let agents = this.registry.getAll();
    if (status) {
      agents = agents.filter(a => a.status === status);
    }
    agents = agents.slice(0, limit);

    this.sendJson(res, 200, { success: true, data: agents });
  }

  private handleGetAgent(res: http.ServerResponse, agentId: string): void {
    const agent = this.registry.get(agentId);
    if (agent) {
      this.sendJson(res, 200, { success: true, data: agent });
    } else {
      this.sendJson(res, 404, { success: false, error: 'Agent not found' });
    }
  }

  private handleUnregister(res: http.ServerResponse, agentId: string): void {
    const success = this.registry.unregister(agentId);
    this.channels.unsubscribe('default', agentId);
    this.channels.unsubscribe('agent-broadcast', agentId);
    
    this.sendJson(res, 200, { success });
  }

  private async handleSendSignal(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const signal = JSON.parse(body) as BusSignal;

    signal.id = signal.id || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    signal.timestamp = signal.timestamp || new Date().toISOString();

    this.channels.publish(signal.channel, signal);
    this.signalsProcessed++;

    this.sendJson(res, 201, { success: true, data: signal });
  }

  private handleGetSignals(res: http.ServerResponse, url: URL): void {
    const query: SignalQuery = {
      channel: url.searchParams.get('channel') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
      target: url.searchParams.get('target') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
      after: url.searchParams.get('after') ?? undefined,
      before: url.searchParams.get('before') ?? undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '100'),
    };

    const channel = query.channel ?? 'default';
    const signals = this.channels.getMessages(channel, query);

    this.sendJson(res, 200, { success: true, data: signals });
  }

  private handleDiscover(res: http.ServerResponse, url: URL): void {
    const query: DiscoveryQuery = {
      agent_id: url.searchParams.get('agent_id') ?? undefined,
      project: url.searchParams.get('project') ?? undefined,
      organization: url.searchParams.get('organization') ?? undefined,
      capability: url.searchParams.get('capability') ?? undefined,
      arrow_map: url.searchParams.get('arrow_map') ?? undefined,
      status: (url.searchParams.get('status') as AgentRecord['status']) ?? undefined,
      limit: parseInt(url.searchParams.get('limit') ?? '50'),
    };

    const result = this.discovery.discover(query);
    this.sendJson(res, 200, { success: true, data: result });
  }

  private async handleSubmitBackflow(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const { agent_id, type, content, from, priority } = JSON.parse(body);

    if (!agent_id || !type || !content || !from) {
      this.sendJson(res, 400, { success: false, error: 'Missing required fields' });
      return;
    }

    const signal = this.backflow.submit(agent_id, type, content, from, priority ?? 50);
    this.sendJson(res, 201, { success: true, data: signal });
  }

  private handlePollBackflow(res: http.ServerResponse, agentId: string, url: URL): void {
    const query = {
      type: url.searchParams.get('type') as BackflowSignal['type'] | undefined,
      include_acknowledged: url.searchParams.get('include_acknowledged') === 'true',
      limit: parseInt(url.searchParams.get('limit') ?? '50'),
    };

    const signals = this.backflow.poll(agentId, query);
    this.sendJson(res, 200, { success: true, data: signals });
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  private sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://${this.config.host ?? 'localhost'}:${this.config.port}`;
  }

  /**
   * Get internal components for testing
   */
  getComponents(): {
    registry: AgentRegistry;
    channels: ChannelManager;
    discovery: AgentDiscovery;
    backflow: BackflowEngine;
  } {
    return {
      registry: this.registry,
      channels: this.channels,
      discovery: this.discovery,
      backflow: this.backflow,
    };
  }
}
