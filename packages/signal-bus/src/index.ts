/**
 * @statuz/signal-bus
 * 
 * Signal Bus companion infrastructure for Statuz.
 * HTTP-based signal transport, agent registry, and discovery.
 */

// Types
export type {
  BusSignal,
  BackflowSignal,
  AgentRecord,
  DiscoveryQuery,
  DiscoveryResult,
  Channel,
  ChannelMessage,
  ServerConfig,
  HealthStatus,
  ApiResponse,
  PaginatedResponse,
  RegisterRequest,
  RegisterResponse,
  SignalQuery,
  BackflowQuery,
} from './types.js';

// Core Classes
export { AgentRegistry } from './registry.js';
export { ChannelManager } from './channels.js';
export { AgentDiscovery } from './discovery.js';
export { BackflowEngine } from './backflow.js';
export { SignalBusServer } from './server.js';
export { SignalBusClient, type ClientConfig } from './client.js';

// Convenience re-exports from types
export { AgentRegistry as Registry } from './registry.js';
export { ChannelManager as Channels } from './channels.js';
export { AgentDiscovery as Discovery } from './discovery.js';
export { BackflowEngine as Backflow } from './backflow.js';
