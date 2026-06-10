/**
 * @statuz/sdk-ts - arrow-map types
 *
 * TypeScript interfaces for the 66 topological layer.
 * @see {@link 66-implementation/spec/arrow-map.schema.json}
 * @see {@link 66-implementation/spec/arrow.schema.json}
 * @see {@link 66-implementation/spec/statu-node.schema.json}
 */

export type ArrowMapVersion = "0.1.0";
export type ArrowMapStatus = "draft" | "experimental" | "stable" | "deprecated" | "archived";
export type ArrowType =
  | "dependency"
  | "information_flow"
  | "responsibility"
  | "validation"
  | "resource_transfer"
  | "influence"
  | "constraint";
export type Criticality = "critical" | "high" | "medium" | "low";
export type NodeStatus = "active" | "inactive" | "deprecated" | "planned";
export type DiscoveryMethod = "manual" | "inferred" | "detected" | "imported";

/**
 * Arrow Map — a portable, executable description of a topology.
 * An Arrow Map bundles StatuNodes (entities) and Arrows (directed relationships).
 */
export interface ArrowMap {
  arrow_map_version: ArrowMapVersion;
  id: string;
  name?: string;
  description?: string;
  niche_category?: string;
  version?: string;
  status?: ArrowMapStatus;
  nodes: StatuNode[];
  arrows: Arrow[];
  namespaces?: Record<string, string>;
  invariants?: Invariant[];
  templates?: TemplateParam[];
  extends?: MapExtend[];
  storage?: MapStorage;
  metadata?: MapMetadata;
  [key: string]: unknown;
}

/**
 * StatuNode — a node in the 66 topological layer.
 * Everything is a StatuNode: projects, components, files, agents, people, knowledge, resources.
 */
export interface StatuNode {
  id: string;
  type: string;
  name?: string;
  description?: string;
  properties?: NodeProperties;
  labels?: string[];
  tags?: string[];
  status?: NodeStatus;
  metadata?: NodeMetadata;
  [key: string]: unknown;
}

export interface NodeProperties {
  _node_type_hint?: string;
  [key: string]: unknown;
}

export interface NodeMetadata {
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  source?: string;
  [key: string]: unknown;
}

/**
 * Arrow — a directed relationship between two StatuNodes.
 */
export interface Arrow {
  id: string;
  source: string;
  target: string;
  type: ArrowType;
  description?: string;
  properties?: ArrowProperties;
  type_properties?: TypeProperties;
  temporal?: ArrowTemporal;
  tags?: string[];
  metadata?: ArrowMetadata;
  [key: string]: unknown;
}

export interface ArrowProperties {
  reason?: string;
  criticality?: Criticality;
  weight?: number;
  [key: string]: unknown;
}

export interface DependencyProperties {
  dependency_type?: "hard" | "soft" | "optional";
  failure_mode?: string;
  [key: string]: unknown;
}

export interface InformationFlowProperties {
  direction?: "unidirectional" | "bidirectional";
  information_type?: string;
  protocol?: string;
  [key: string]: unknown;
}

export interface ResponsibilityProperties {
  responsibility_scope?: string;
  escalation_path?: string;
  [key: string]: unknown;
}

export interface ValidationProperties {
  validation_type?: "approval" | "review" | "test" | "audit";
  required?: boolean;
  [key: string]: unknown;
}

export interface ResourceTransferProperties {
  resource_type?: string;
  allocation?: string;
  [key: string]: unknown;
}

export interface InfluenceProperties {
  influence_mechanism?: string;
  [key: string]: unknown;
}

export interface ConstraintProperties {
  constraint_type?: "temporal" | "spatial" | "logical" | "policy";
  constraint_expression?: string;
  [key: string]: unknown;
}

export type TypeProperties =
  | DependencyProperties
  | InformationFlowProperties
  | ResponsibilityProperties
  | ValidationProperties
  | ResourceTransferProperties
  | InfluenceProperties
  | ConstraintProperties;

export interface ArrowTemporal {
  effective_from?: string;
  effective_until?: string;
  [key: string]: unknown;
}

export interface ArrowMetadata {
  discovered_at?: string;
  confidence?: number;
  detector_id?: string;
  discovery_method?: DiscoveryMethod;
  [key: string]: unknown;
}

/**
 * Topological invariant — a rule that must always hold in the map.
 */
export interface Invariant {
  description: string;
  expression?: string;
  severity?: "error" | "warning" | "info";
  [key: string]: unknown;
}

/**
 * Template parameter — makes a map reusable across projects.
 */
export interface TemplateParam {
  name: string;
  description: string;
  default?: unknown;
  required?: boolean;
  [key: string]: unknown;
}

/**
 * Map extension — parent Arrow Maps this map composes.
 */
export interface MapExtend {
  map_id: string;
  version?: string;
  override?: boolean;
  [key: string]: unknown;
}

/**
 * Storage configuration — where this map lives and how it's cached.
 */
export interface MapStorage {
  canonical_path?: string;
  registry?: string;
  local_cache?: string;
  [key: string]: unknown;
}

export interface MapMetadata {
  created_at?: string;
  updated_at?: string;
  author?: string;
  organization?: string;
  license?: string;
  source_url?: string;
  [key: string]: unknown;
}
