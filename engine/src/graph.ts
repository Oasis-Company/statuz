/**
 * Statuz Graph Engine — Core
 * 
 * In-memory directed graph with adjacency list.
 * This is the runtime heart of Statuz. Everything else reads from this.
 */

import {
  Node, NodeId,
  Edge, EdgeId,
  Relation,
  GraphSnapshot,
  ImpactResult,
  PathResult,
  HealthReport,
} from './types';

// ─── Adjacency List ────────────────────────────────────────

interface AdjacencyCell {
  nodeId: NodeId;
  outgoing: Map<Relation, Edge[]>;   // relation → edges going out
  incoming: Map<Relation, Edge[]>;   // relation → edges coming in
}

export class GraphEngine {
  private nodes: Map<NodeId, Node> = new Map();
  private edges: Map<EdgeId, Edge> = new Map();
  private adj: Map<NodeId, AdjacencyCell> = new Map();

  // ─── Mutations ───────────────────────────────────────

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
    if (!this.adj.has(node.id)) {
      this.adj.set(node.id, { nodeId: node.id, outgoing: new Map(), incoming: new Map() });
    }
  }

  addEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
    this.ensureCell(edge.source);
    this.ensureCell(edge.target);

    // Outgoing from source
    const srcOut = this.adj.get(edge.source)!.outgoing;
    if (!srcOut.has(edge.relation)) srcOut.set(edge.relation, []);
    srcOut.get(edge.relation)!.push(edge);

    // Incoming to target
    const tgtIn = this.adj.get(edge.target)!.incoming;
    if (!tgtIn.has(edge.relation)) tgtIn.set(edge.relation, []);
    tgtIn.get(edge.relation)!.push(edge);
  }

  removeNode(id: NodeId): void {
    // Remove all edges connected to this node
    const cell = this.adj.get(id);
    if (cell) {
      for (const [, edges] of cell.outgoing) {
        for (const e of edges) this.edges.delete(e.id);
      }
      for (const [, edges] of cell.incoming) {
        for (const e of edges) this.edges.delete(e.id);
      }
    }
    this.nodes.delete(id);
    this.adj.delete(id);
  }

  // ─── Core Queries (the three that matter) ────────────

  /**
   * Q1: "What does this node connect to?"
   * Traverse from a node following a relation (or all relations).
   */
  traverse(from: NodeId, relation?: Relation): { nodes: Node[]; edges: Edge[] } {
    const cell = this.adj.get(from);
    if (!cell) return { nodes: [], edges: [] };

    const edges: Edge[] = [];
    const seen = new Set<NodeId>();

    if (relation) {
      const relEdges = cell.outgoing.get(relation) || [];
      edges.push(...relEdges);
    } else {
      for (const [, relEdges] of cell.outgoing) {
        edges.push(...relEdges);
      }
    }

    for (const e of edges) {
      if (!seen.has(e.target)) {
        seen.add(e.target);
      }
    }

    const nodes = [...seen].map(id => this.nodes.get(id)!).filter(Boolean);
    return { nodes, edges };
  }

  /**
   * Q2: "If this node changes, who is affected?"
   * Reverse BFS — find all nodes that depend on the changed node (transitively).
   */
  impact(changed: NodeId): ImpactResult {
    const affected: NodeId[] = [];
    const visited = new Set<NodeId>();
    const queue: NodeId[] = [];

    // Start from all nodes that directly point to `changed`
    const cell = this.adj.get(changed);
    if (!cell) return { changed, affected: [], blast_radius: [], critical_path: false };

    for (const [, edges] of cell.incoming) {
      for (const e of edges) {
        if (!visited.has(e.source)) {
          visited.add(e.source);
          queue.push(e.source);
        }
      }
    }
    affected.push(...queue);

    // BFS: who depends on those who depend on `changed`?
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentCell = this.adj.get(current);
      if (!currentCell) continue;

      for (const [, edges] of currentCell.incoming) {
        for (const e of edges) {
          if (!visited.has(e.source)) {
            visited.add(e.source);
            queue.push(e.source);
            affected.push(e.source);
          }
        }
      }
    }

    // Critical path check: node on a path with high betweenness?
    const centrality = this.centrality();
    const top = centrality.slice(0, Math.max(3, centrality.length * 0.2));

    return {
      changed,
      affected: [...new Set(affected.filter(id => id !== changed))],
      blast_radius: [],
      critical_path: top.some(n => n.id === changed),
    };
  }

  /**
   * Q3: "How do I get from A to B?"
   * BFS shortest path through the graph.
   */
  path(from: NodeId, to: NodeId): PathResult {
    if (from === to) return { from, to, path: [], length: 0, exists: true };
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      return { from, to, path: [], length: -1, exists: false };
    }

    const visited = new Set<NodeId>([from]);
    const parent = new Map<NodeId, { node: NodeId; edge: Edge }>();
    const queue: NodeId[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) break;

      const cell = this.adj.get(current);
      if (!cell) continue;

      for (const [, edges] of cell.outgoing) {
        for (const e of edges) {
          if (!visited.has(e.target)) {
            visited.add(e.target);
            parent.set(e.target, { node: current, edge: e });
            queue.push(e.target);
          }
        }
      }
    }

    if (!parent.has(to)) {
      return { from, to, path: [], length: -1, exists: false };
    }

    // Reconstruct path
    const path: Edge[] = [];
    let current = to;
    while (parent.has(current)) {
      const { edge } = parent.get(current)!;
      path.unshift(edge);
      current = parent.get(current)!.node;
    }

    return { from, to, path, length: path.length, exists: true };
  }

  // ─── Graph Algorithms ────────────────────────────────

  /**
   * Degree centrality — simplest measure of importance.
   * Returns nodes sorted by total degree (in + out), descending.
   */
  centrality(limit = 10): (Node & { score: number })[] {
    const scores = new Map<NodeId, number>();

    for (const [id, cell] of this.adj) {
      let degree = 0;
      for (const [, edges] of cell.outgoing) degree += edges.length;
      for (const [, edges] of cell.incoming) degree += edges.length;
      scores.set(id, degree);
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => ({ ...this.nodes.get(id)!, score }))
      .filter(n => n.id);
  }

  /** Transitive closure: get ALL nodes reachable from `id` (BFS) */
  reachable(id: NodeId): NodeId[] {
    const visited = new Set<NodeId>([id]);
    const queue: NodeId[] = [id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cell = this.adj.get(current);
      if (!cell) continue;

      for (const [, edges] of cell.outgoing) {
        for (const e of edges) {
          if (!visited.has(e.target)) {
            visited.add(e.target);
            queue.push(e.target);
          }
        }
      }
    }

    visited.delete(id);
    return [...visited];
  }

  // ─── Health ───────────────────────────────────────────

  health(): HealthReport {
    const orphans: NodeId[] = [];
    const sinks: NodeId[] = [];
    const sources: NodeId[] = [];

    for (const [id, cell] of this.adj) {
      let outCount = 0;
      let inCount = 0;
      for (const [, e] of cell.outgoing) outCount += e.length;
      for (const [, e] of cell.incoming) inCount += e.length;

      if (outCount === 0 && inCount === 0) orphans.push(id);
      else if (outCount > 0 && inCount === 0) sources.push(id);
      else if (outCount === 0 && inCount > 0) sinks.push(id);
    }

    const top = this.centrality(5);

    // Count disconnected components via BFS
    const allNodes = [...this.nodes.keys()];
    const componentVisited = new Set<NodeId>();
    let components = 0;
    for (const id of allNodes) {
      if (!componentVisited.has(id)) {
        components++;
        const q = [id];
        componentVisited.add(id);
        while (q.length > 0) {
          const cur = q.shift()!;
          const cell = this.adj.get(cur);
          if (!cell) continue;
          for (const [, edges] of cell.outgoing) {
            for (const e of edges) {
              if (!componentVisited.has(e.target)) {
                componentVisited.add(e.target);
                q.push(e.target);
              }
            }
          }
          for (const [, edges] of cell.incoming) {
            for (const e of edges) {
              if (!componentVisited.has(e.source)) {
                componentVisited.add(e.source);
                q.push(e.source);
              }
            }
          }
        }
      }
    }

    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.size,
      orphans,
      sinks,
      sources,
      high_centrality: top.map(n => n.id),
      disconnected_components: components,
    };
  }

  // ─── Snapshot / Diff ─────────────────────────────────

  snapshot(): GraphSnapshot {
    return {
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
      timestamp: Date.now(),
    };
  }

  /**
   * diff: what changed between two snapshots?
   * Returns nodes/edges added, removed, or modified.
   */
  diff(prev: GraphSnapshot): {
    nodes_added: NodeId[];
    nodes_removed: NodeId[];
    edges_added: EdgeId[];
    edges_removed: EdgeId[];
  } {
    const currNodeIds = new Set(this.nodes.keys());
    const prevNodeIds = new Set(prev.nodes.keys());

    const nodes_added = [...currNodeIds].filter(id => !prevNodeIds.has(id));
    const nodes_removed = [...prevNodeIds].filter(id => !currNodeIds.has(id));

    const currEdgeIds = new Set(this.edges.keys());
    const prevEdgeIds = new Set(prev.edges.keys());

    const edges_added = [...currEdgeIds].filter(id => !prevEdgeIds.has(id));
    const edges_removed = [...prevEdgeIds].filter(id => !currEdgeIds.has(id));

    return { nodes_added, nodes_removed, edges_added, edges_removed };
  }

  // ─── Accessors ────────────────────────────────────────

  getNode(id: NodeId): Node | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: EdgeId): Edge | undefined {
    return this.edges.get(id);
  }

  get allNodes(): Node[] {
    return [...this.nodes.values()];
  }

  get allEdges(): Edge[] {
    return [...this.edges.values()];
  }

  get size(): { nodes: number; edges: number } {
    return { nodes: this.nodes.size, edges: this.edges.size };
  }

  // ─── Serialization ───────────────────────────────────

  toJSON(): { nodes: Node[]; edges: Edge[] } {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
    };
  }

  static fromJSON(data: { nodes: Node[]; edges: Edge[] }): GraphEngine {
    const g = new GraphEngine();
    for (const n of data.nodes) g.addNode(n);
    for (const e of data.edges) g.addEdge(e);
    return g;
  }

  // ─── Private ──────────────────────────────────────────

  private ensureCell(id: NodeId): void {
    if (!this.adj.has(id)) {
      this.adj.set(id, { nodeId: id, outgoing: new Map(), incoming: new Map() });
    }
  }
}
