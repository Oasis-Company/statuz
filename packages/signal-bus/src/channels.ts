/**
 * Channel Manager
 * 
 * Broadcast/unicast/multicast with retention policies.
 */

import type { BusSignal, Channel, ChannelMessage, SignalQuery } from './types.js';

const DEFAULT_MAX_SIGNALS = 1000;
const SHORT_RETENTION_MS = 5 * 60 * 1000; // 5 minutes

export class ChannelManager {
  private channels: Map<string, Channel> = new Map();
  private messages: Map<string, BusSignal[]> = new Map();
  private subscribers: Map<string, Set<string>> = new Map(); // channel -> agent IDs

  constructor() {
    // Create default channels
    this.createChannel({
      name: 'default',
      description: 'Default signal channel',
      retention: 'short',
      retention_ms: SHORT_RETENTION_MS,
      publish_roles: ['agent', 'system'],
      subscribe_roles: ['agent', 'system'],
    });

    this.createChannel({
      name: 'user-backflow',
      description: 'User to agent signals',
      retention: 'persistent',
      publish_roles: ['user', 'system'],
      subscribe_roles: ['agent'],
    });

    this.createChannel({
      name: 'agent-broadcast',
      description: 'Cross-agent broadcasts',
      retention: 'short',
      retention_ms: SHORT_RETENTION_MS,
      publish_roles: ['agent'],
      subscribe_roles: ['agent'],
    });
  }

  /**
   * Create a new channel
   */
  createChannel(channel: Channel): Channel {
    if (!channel.max_signals) {
      channel.max_signals = DEFAULT_MAX_SIGNALS;
    }
    this.channels.set(channel.name, channel);
    if (!this.messages.has(channel.name)) {
      this.messages.set(channel.name, []);
    }
    if (!this.subscribers.has(channel.name)) {
      this.subscribers.set(channel.name, new Set());
    }
    return channel;
  }

  /**
   * Get channel by name
   */
  getChannel(name: string): Channel | null {
    return this.channels.get(name) ?? null;
  }

  /**
   * Get all channels
   */
  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Subscribe agent to channel
   */
  subscribe(channelName: string, agentId: string): boolean {
    const channel = this.channels.get(channelName);
    if (!channel) return false;

    if (!this.subscribers.has(channelName)) {
      this.subscribers.set(channelName, new Set());
    }
    this.subscribers.get(channelName)!.add(agentId);
    return true;
  }

  /**
   * Unsubscribe agent from channel
   */
  unsubscribe(channelName: string, agentId: string): boolean {
    const subs = this.subscribers.get(channelName);
    if (!subs) return false;
    return subs.delete(agentId);
  }

  /**
   * Get subscribers of a channel
   */
  getSubscribers(channelName: string): string[] {
    const subs = this.subscribers.get(channelName);
    return subs ? Array.from(subs) : [];
  }

  /**
   * Publish signal to channel
   */
  publish(channelName: string, signal: BusSignal): boolean {
    const channel = this.channels.get(channelName);
    if (!channel) return false;

    // Check retention policy
    this.cleanup(channelName, channel);

    // Store signal
    const messages = this.messages.get(channelName) ?? [];
    messages.push(signal);

    // Enforce max signals limit
    if (messages.length > (channel.max_signals ?? DEFAULT_MAX_SIGNALS)) {
      messages.shift(); // Remove oldest
    }

    this.messages.set(channelName, messages);
    return true;
  }

  /**
   * Broadcast to all subscribers
   */
  broadcast(channelName: string, signal: BusSignal): number {
    if (!this.publish(channelName, signal)) return 0;
    return this.getSubscribers(channelName).length;
  }

  /**
   * Get messages from channel
   */
  getMessages(channelName: string, query: SignalQuery = {}): BusSignal[] {
    const messages = this.messages.get(channelName) ?? [];
    let filtered = messages;

    if (query.source) {
      filtered = filtered.filter(m => m.source === query.source);
    }
    if (query.target) {
      filtered = filtered.filter(m => m.target === query.target);
    }
    if (query.type) {
      filtered = filtered.filter(m => m.type === query.type);
    }
    if (query.after) {
      const afterTime = new Date(query.after).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() > afterTime);
    }
    if (query.before) {
      const beforeTime = new Date(query.before).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() < beforeTime);
    }

    // Pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get messages for specific agent
   */
  getMessagesForAgent(agentId: string, query: SignalQuery = {}): BusSignal[] {
    const allMessages: BusSignal[] = [];

    for (const [channelName, messages] of this.messages) {
      const channelMessages = messages.filter(m => 
        !m.target || m.target === agentId || 
        this.getSubscribers(channelName).includes(agentId)
      );
      allMessages.push(...channelMessages);
    }

    // Apply query filters
    let filtered = allMessages;
    if (query.type) {
      filtered = filtered.filter(m => m.type === query.type);
    }
    if (query.after) {
      const afterTime = new Date(query.after).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() > afterTime);
    }
    if (query.before) {
      const beforeTime = new Date(query.before).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() < beforeTime);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get total signal count
   */
  getSignalCount(channelName?: string): number {
    if (channelName) {
      return this.messages.get(channelName)?.length ?? 0;
    }
    let total = 0;
    for (const messages of this.messages.values()) {
      total += messages.length;
    }
    return total;
  }

  /**
   * Delete channel
   */
  deleteChannel(channelName: string): boolean {
    this.channels.delete(channelName);
    this.messages.delete(channelName);
    this.subscribers.delete(channelName);
    return true;
  }

  /**
   * Cleanup expired messages based on retention policy
   */
  private cleanup(channelName: string, channel: Channel): void {
    if (channel.retention === 'persistent') return;

    const messages = this.messages.get(channelName);
    if (!messages || messages.length === 0) return;

    const now = Date.now();
    const cutoff = channel.retention === 'ephemeral' 
      ? now - 60000 // 1 minute for ephemeral
      : now - (channel.retention_ms ?? SHORT_RETENTION_MS);

    const validMessages = messages.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    this.messages.set(channelName, validMessages);
  }

  /**
   * Clear all messages from a channel
   */
  clearChannel(channelName: string): void {
    this.messages.set(channelName, []);
  }

  /**
   * Clear all messages from all channels
   */
  clearAll(): void {
    for (const channelName of this.messages.keys()) {
      this.messages.set(channelName, []);
    }
  }

  /**
   * Export channel state
   */
  export(): { channels: Channel[]; messageCount: number } {
    return {
      channels: this.getAllChannels(),
      messageCount: this.getSignalCount(),
    };
  }
}
