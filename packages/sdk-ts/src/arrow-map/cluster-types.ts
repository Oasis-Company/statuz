/**
 * Arrow Map Cluster Types
 *
 * Types for Arrow Map Clusters - organization-level ecosystem topology
 * containing multiple Arrow Maps and cross-map arrows.
 */

/**
 * Scope classification for Arrow Maps in a cluster
 */
export type MapScope = "internal" | "product" | "infrastructure" | "shared" | "external";

/**
 * Reference to an Arrow Map within a cluster
 */
export interface ClusterMapRef {
  map_id: string;
  version: string;
  scope: MapScope;
  alias?: string;
}

/**
 * Cross-map arrow connecting nodes across different Arrow Maps
 */
export interface CrossMapArrow {
  id: string;
  from_map: string; // Can be "*" for all maps
  from_node: string; // Can be "*" for all nodes
  to_map: string;
  to_node: string;
  type: "dependency" | "information_flow" | "responsibility" | "validation" | "resource_transfer" | "influence" | "constraint";
  description: string; // REQUIRED
  properties?: Record<string, unknown>;
  criticality?: "critical" | "high" | "medium" | "low";
  metadata?: {
    confidence?: number;
    discovery_method?: "declared" | "detected" | "inferred" | "proposal";
    discovered_at?: string;
    approved_by?: string;
    approved_at?: string;
  };
}

/**
 * Cluster-level metadata
 */
export interface ClusterMetadata {
  organization?: string;
  team?: string;
  created_at?: string;
  updated_at?: string;
  author?: string;
  contact?: string;
  documentation_url?: string;
}

/**
 * Arrow Map Cluster - organization-level ecosystem topology
 */
export interface ArrowMapCluster {
  cluster_version: string;
  id: string;
  name: string;
  description?: string;
  maps: ClusterMapRef[];
  cross_map_arrows: CrossMapArrow[];
  metadata?: ClusterMetadata;
}

/**
 * Options for cluster operations
 */
export interface ClusterOptions {
  path?: string;
  validate?: boolean;
}