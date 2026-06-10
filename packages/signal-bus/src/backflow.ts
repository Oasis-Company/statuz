/**
 * Backflow Engine
 * 
 * User to agent signal submission and polling.
 * This is the "missing half" of the sync loop — users sending signals TO agents.
 */

import type { BackflowSignal, BackflowQuery } from './types.js';

export class BackflowEngine {
  private backflowSignals: Map<string, BackflowSignal[]> = new Map(); // agentId -> signals

  constructor() {
    // Nothing to initialize
  }

  /**
   * Submit a user signal to an agent
   */
  submit(
    agentId: string,
    type: BackflowSignal['type'],
    content: string,
    from: string,
    priority: number = 50
  ): BackflowSignal {
    const signal: BackflowSignal = {
      id: `backflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      agent_id: agentId,
      type,
      content,
      from,
      timestamp: new Date().toISOString(),
      priority,
      acknowledged: false,
    };

    // Get or create agent's queue
    const queue = this.backflowSignals.get(agentId) ?? [];
    queue.push(signal);

    // Keep queue sorted by priority and timestamp
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Newer first
    });

    this.backflowSignals.set(agentId, queue);
    return signal;
  }

  /**
   * Submit a directive (high priority command)
   */
  submitDirective(agentId: string, content: string, from: string): BackflowSignal {
    return this.submit(agentId, 'directive', content, from, 100);
  }

  /**
   * Submit a query (medium priority question)
   */
  submitQuery(agentId: string, content: string, from: string): BackflowSignal {
    return this.submit(agentId, 'query', content, from, 50);
  }

  /**
   * Submit a notification (low priority info)
   */
  submitNotification(agentId: string, content: string, from: string): BackflowSignal {
    return this.submit(agentId, 'notification', content, from, 25);
  }

  /**
   * Submit an escalation (high priority)
   */
  submitEscalation(agentId: string, content: string, from: string): BackflowSignal {
    return this.submit(agentId, 'escalation', content, from, 100);
  }

  /**
   * Poll backflow signals for an agent
   */
  poll(agentId: string, query: BackflowQuery = {}): BackflowSignal[] {
    const queue = this.backflowSignals.get(agentId) ?? [];
    let filtered = queue;

    // Filter by type
    if (query.type) {
      filtered = filtered.filter(s => s.type === query.type);
    }

    // Filter acknowledged
    if (!query.include_acknowledged) {
      filtered = filtered.filter(s => !s.acknowledged);
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  /**
   * Poll and acknowledge signals (removes from queue)
   */
  pollAndAcknowledge(agentId: string, signalIds?: string[]): BackflowSignal[] {
    const queue = this.backflowSignals.get(agentId) ?? [];
    const acknowledged: BackflowSignal[] = [];

    if (signalIds && signalIds.length > 0) {
      // Acknowledge specific signals
      for (const id of signalIds) {
        const signal = queue.find(s => s.id === id);
        if (signal) {
          signal.acknowledged = true;
          acknowledged.push(signal);
        }
      }
    } else {
      // Acknowledge all unacknowledged
      for (const signal of queue) {
        if (!signal.acknowledged) {
          signal.acknowledged = true;
          acknowledged.push(signal);
        }
      }
    }

    // Remove acknowledged signals from queue
    const remaining = queue.filter(s => !s.acknowledged);
    this.backflowSignals.set(agentId, remaining);

    return acknowledged;
  }

  /**
   * Acknowledge specific signals
   */
  acknowledge(agentId: string, signalIds: string[]): number {
    const queue = this.backflowSignals.get(agentId) ?? [];
    let count = 0;

    for (const signal of queue) {
      if (signalIds.includes(signal.id)) {
        signal.acknowledged = true;
        count++;
      }
    }

    // Remove acknowledged signals
    const remaining = queue.filter(s => !s.acknowledged);
    this.backflowSignals.set(agentId, remaining);

    return count;
  }

  /**
   * Get unacknowledged count for agent
   */
  getUnacknowledgedCount(agentId: string): number {
    const queue = this.backflowSignals.get(agentId) ?? [];
    return queue.filter(s => !s.acknowledged).length;
  }

  /**
   * Get highest priority unacknowledged signal
   */
  getNextSignal(agentId: string): BackflowSignal | null {
    const queue = this.backflowSignals.get(agentId) ?? [];
    return queue.find(s => !s.acknowledged) ?? null;
  }

  /**
   * Clear all backflow for an agent
   */
  clear(agentId: string): void {
    this.backflowSignals.delete(agentId);
  }

  /**
   * Get queue status for all agents
   */
  getStatus(): { agent_id: string; unacknowledged: number; oldest?: string }[] {
    const status: { agent_id: string; unacknowledged: number; oldest?: string }[] = [];

    for (const [agentId, queue] of this.backflowSignals) {
      const unack = queue.filter(s => !s.acknowledged);
      if (unack.length > 0) {
        status.push({
          agent_id: agentId,
          unacknowledged: unack.length,
          oldest: unack[unack.length - 1].timestamp,
        });
      }
    }

    return status;
  }

  /**
   * Get total signals across all agents
   */
  getTotalCount(): number {
    let total = 0;
    for (const queue of this.backflowSignals.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Export backflow state for debugging
   */
  export(): Map<string, BackflowSignal[]> {
    return new Map(this.backflowSignals);
  }
}
