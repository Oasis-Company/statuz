/**
 * Arrow Map types for CLI
 * 
 * These types mirror the SDK types and must remain in sync with:
 * - packages/sdk-ts/src/arrow-map/types.ts
 * - 66-implementation/spec/arrow-map.schema.json
 */

// === Type aliases for enums ===

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

// === Arrow properties ===

export interface DependencyProperties {
  reason?: string;
  criticality?: Criticality;
  weight?: number;
}

export interface InformationFlowProperties {
  direction?: "unidirectional" | "bidirectional";
  latency?: string;
  bandwidth?: string;
}

export interface ResponsibilityProperties {
  role?: string;
  accountable?: string;
  accountable_team?: string;
}

export interface ValidationProperties {
  rule?: string;
  validator?: string;
  validator_node?: string;
  severity?: "error" | "warning" | "info";
}

export interface ResourceTransferProperties {
  resource_type?: string;
  amount?: string;
  frequency?: string;
}

export interface InfluenceProperties {
  influence_type?: "direct" | "indirect" | "unknown";
  strength?: number;
}

export interface ConstraintProperties {
  constraint_type?: "hard" | "soft";
  enforcement?: "automatic" | "manual" | "none";
}

export type TypeProperties = 
  | DependencyProperties 
  | InformationFlowProperties 
  | ResponsibilityProperties 
  | ValidationProperties 
  | ResourceTransferProperties 
  | InfluenceProperties 
  | ConstraintProperties;

export interface ArrowProperties {
  reason?: string;
  criticality?: Criticality;
  weight?: number;
  type_properties?: TypeProperties;
}

export interface ArrowTemporal {
  effective_from?: string;
  effective_until?: string;
}

export interface ArrowMetadata {
  discovered_at?: string;
  confidence?: number;
  detector_id?: string;
  discovery_method?: DiscoveryMethod;
}

// === Arrow ===

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
}

// === Node types ===

export interface NodeProperties {
  [key: string]: unknown;
}

export interface NodeMetadata {
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  source?: string;
}

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
}

// === Invariant, Template, Extend, Storage, Metadata ===

export interface Invariant {
  description: string;
  expression?: string;
  severity?: "error" | "warning" | "info";
}

export interface TemplateParam {
  name: string;
  description: string;
  default?: unknown;
  required?: boolean;
}

export interface MapExtend {
  map_id: string;
  version?: string;
  override?: boolean;
}

export interface MapStorage {
  canonical_path?: string;
  registry?: string;
  local_cache?: string;
}

export interface MapMetadata {
  created_at?: string;
  updated_at?: string;
  author?: string;
  organization?: string;
  license?: string;
  source_url?: string;
}

// === ArrowMap ===

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
}
