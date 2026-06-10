/**
 * Signal Bus Types
 * 
 * Bus-level types for signal transport, agent registry, and discovery.
 * These are NOT part of the Statuz protocol — they are companion infrastructure
 * for transport and discovery.
 * 
 * HARD RULE (ADR 0003): Signal Bus is companion infrastructure, NOT part of Statuz protocol.
 * HARD RULE (ADR 0003): A2A fields below are RESERVED placeholders — do NOT use in logic.
 * A2A integration is FROZEN until: (1) ALL subsystems >80% usable, (2) A2A 1.0 published.
 */

// =============================================================================
// Core Signal Types
// =============================================================================

export interface BusSignal {
  /** Unique signal identifier */
  id: string;
  /** Signal type for routing and filtering */
  type: string;
  /** Source agent ID */
  source: string;
  /** Target agent ID (optional for broadcast) */
  target?: string;
  /** Signal payload */
  payload: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Channel this signal belongs to */
  channel: string;
  /** Optional priority (higher = more urgent) */
  priority?: number;
  // HARD RULE (ADR 0003): A2A fields are RESERVED placeholders — do NOT use in logic.
  // A2A integration is FROZEN until: (1) ALL subsystems >80% usable, (2) A2A 1.0 published.
  /** RESERVED: A2A compatibility flag (dormant until A2A 1.0) */
  a2a_compatible?: boolean;
  /** RESERVED: A2A agent card URL (dormant until A2A 1.0) */
  agent_card_url?: string;
}

export interface BackflowSignal {
  /** Unique backflow ID */
  id: string;
  /** Target agent ID */
  agent_id: string;
  /** Backflow type */
  type: 'directive' | 'query' | 'notification' | 'escalation';
  /** Content/message */
  content: string;
  /** Sender (user identifier) */
  from: string;
  /** ISO timestamp */
  timestamp: string;
  /** Priority (higher = more urgent) */
  priority: number;
  /** Whether this has been acknowledged */
  acknowledged: boolean;
}

// =============================================================================
// Agent Registry Types
// =============================================================================

export interface AgentRecord {
  /** Unique agent ID */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Project this agent belongs to */
  project: string;
  /** Organization (optional) */
  organization?: string;
  /** Current status */
  status: 'online' | 'offline' | 'busy' | 'idle';
  /** Capabilities this agent can provide */
  capabilities: string[];
  /** Arrow Map IDs this agent participates in */
  arrow_maps: string[];
  /** HTTP endpoint for signal delivery */
  endpoint?: string;
  // HARD RULE (ADR 0003): A2A fields are RESERVED placeholders — do NOT use in logic.
  // A2A integration is FROZEN until: (1) ALL subsystems >80% usable, (2) A2A 1.0 published.
  /** RESERVED: A2A agent card URL (dormant until A2A 1.0) */
  agent_card_url?: string;
  /** RESERVED: A2A compatibility flag (dormant until A2A 1.0) */
  a2a_compatible?: boolean;
  /** Last heartbeat timestamp */
  last_heartbeat: string;
  /** Registration timestamp */
  registered_at: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Discovery Types
// =============================================================================

export interface DiscoveryQuery {
  /** Find agents by ID */
  agent_id?: string;
  /** Find agents by project */
  project?: string;
  /** Find agents by organization */
  organization?: string;
  /** Find agents by capability */
  capability?: string;
  /** Find agents by Arrow Map ID */
  arrow_map?: string;
  /** Find agents by status */
  status?: AgentRecord['status'];
  /** Limit results */
  limit?: number;
}

export interface DiscoveryResult {
  /** Matching agent records */
  agents: AgentRecord[];
  /** Discovery method used */
  method: 'arrow_map' | 'project' | 'capability' | 'static';
  /** Query that produced these results */
  query: DiscoveryQuery;
}

// =============================================================================
// Channel Types
// =============================================================================

export interface Channel {
  /** Channel name/ID */
  name: string;
  /** Channel description */
  description?: string;
  /** Retention policy */
  retention: 'ephemeral' | 'short' | 'persistent';
  /** Retention duration in ms (for short) */
  retention_ms?: number;
  /** Who can publish to this channel */
  publish_roles: ('agent' | 'user' | 'system')[];
  /** Who can subscribe to this channel */
  subscribe_roles: ('agent' | 'user' | 'system')[];
  /** Max signals to retain */
  max_signals?: number;
}

export interface ChannelMessage {
  /** Channel name */
  channel: string;
  /** Message/signal */
  message: BusSignal;
  /** Delivery timestamp */
  delivered_at: string;
}

// =============================================================================
// Server Types
// =============================================================================

export interface ServerConfig {
  /** HTTP port */
  port: number;
  /** Host to bind to */
  host?: string;
  /** Registry persistence file path */
  persistence_path?: string;
  /** Heartbeat timeout in ms */
  heartbeat_timeout_ms?: number;
  /** CORS allowed origins */
  cors_origins?: string[];
}

export interface HealthStatus {
  /** Server status */
  status: 'ok' | 'degraded' | 'error';
  /** Uptime in ms */
  uptime_ms: number;
  /** Registered agents count */
  agents_online: number;
  /** Total signals processed */
  signals_processed: number;
  /** Server timestamp */
  timestamp: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  /** Success flag */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Request ID for tracing */
  request_id?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Total matching records */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  page_size: number;
  /** Has more pages */
  has_more: boolean;
}

// =============================================================================
// Registration Types
// =============================================================================

export interface RegisterRequest {
  /** Agent ID */
  agent_id: string;
  /** Agent name */
  name: string;
  /** Project name */
  project: string;
  /** Organization (optional) */
  organization?: string;
  /** Capabilities */
  capabilities: string[];
  /** Arrow Map IDs */
  arrow_maps: string[];
  /** HTTP endpoint (optional) */
  endpoint?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface RegisterResponse {
  /** Registration confirmation */
  registered: boolean;
  /** Agent record */
  agent: AgentRecord;
  /** Assigned channel */
  channel: string;
}

// =============================================================================
// Query/Filter Types
// =============================================================================

export interface SignalQuery {
  /** Filter by channel */
  channel?: string;
  /** Filter by source agent */
  source?: string;
  /** Filter by target agent */
  target?: string;
  /** Filter by type */
  type?: string;
  /** Filter by time range (start) */
  after?: string;
  /** Filter by time range (end) */
  before?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface BackflowQuery {
  /** Filter by agent (optional if passed separately) */
  agent_id?: string;
  /** Filter by type */
  type?: BackflowSignal['type'];
  /** Include acknowledged */
  include_acknowledged?: boolean;
  /** Limit results */
  limit?: number;
}
