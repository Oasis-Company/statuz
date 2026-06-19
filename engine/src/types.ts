/**
 * Statuz Graph Engine — Type Definitions
 * 
 * "Nodes tell us what exists. Edges tell us why it exists."
 */

export type NodeId = string;
export type EdgeId = string;

/** Relations define the meaning of a connection */
export type Relation =
  | 'depends_on'        // A needs B to function
  | 'produces'          // A generates/creates B
  | 'consumes'          // A reads/uses B
  | 'validates'         // A checks B's correctness
  | 'informs'           // A notifies/updates B
  | 'contains'          // A is a container for B (e.g. folder/file)
  | 'delegates_to'      // A hands off work to B
  | string;             // Extensible — custom relations allowed

/** A node in the graph — anything that exists in the project ecosystem */
export interface Node {
  id: NodeId;
  type: string;          // 'component', 'file', 'agent', 'human', 'service', 'dependency', etc.
  label: string;         // Human-readable name
  status: 'active' | 'dormant' | 'blocked' | 'done' | 'planned';
  meta?: Record<string, unknown>;
}

/** A directed edge — the reason two nodes are connected */
export interface Edge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  relation: Relation;
  weight: number;        // 0..1, how strong the connection is
  description: string;   // Why this edge exists
  meta?: Record<string, unknown>;
}

/** The graph snapshot for diffing */
export interface GraphSnapshot {
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
  timestamp: number;
}

/** Result of an impact analysis */
export interface ImpactResult {
  changed: NodeId;
  affected: NodeId[];         // Directly downstream
  blast_radius: NodeId[];     // Transitively affected
  critical_path: boolean;     // On a high-centrality path?
}

/** Result of a path query */
export interface PathResult {
  from: NodeId;
  to: NodeId;
  path: Edge[];
  length: number;
  exists: boolean;
}

/** Engine health report */
export interface HealthReport {
  total_nodes: number;
  total_edges: number;
  orphans: NodeId[];          // Nodes with no edges
  sinks: NodeId[];            // Nodes with outgoing but no incoming
  sources: NodeId[];          // Nodes with incoming but no outgoing
  high_centrality: NodeId[];  // Top 5 by degree centrality
  disconnected_components: number;
}
