export interface Arrow {
  id: string;
  source: string;
  target: string;
  type: 'dependency' | 'information_flow' | 'responsibility' | 'validation' | 'resource_transfer' | 'influence' | 'constraint';
  description?: string;
  properties?: {
    reason?: string;
    criticality?: 'critical' | 'high' | 'medium' | 'low';
    weight?: number;
  };
  type_properties?: Record<string, unknown>;
  temporal?: {
    effective_from?: string;
    effective_until?: string;
  };
  tags?: string[];
  metadata?: {
    discovered_at?: string;
    confidence?: number;
    detector_id?: string;
    discovery_method?: 'manual' | 'inferred' | 'detected' | 'imported';
  };
}

export interface StatuNode {
  id: string;
  type: string;
  name?: string;
  description?: string;
  properties?: Record<string, unknown>;
  labels?: string[];
  tags?: string[];
  status?: 'active' | 'inactive' | 'deprecated' | 'planned';
  metadata?: {
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    source?: string;
  };
}

export interface ArrowMap {
  arrow_map_version: '0.1.0';
  id: string;
  name?: string;
  description?: string;
  niche_category?: string;
  version?: string;
  status?: 'draft' | 'experimental' | 'stable' | 'deprecated' | 'archived';
  nodes: StatuNode[];
  arrows: Arrow[];
  namespaces?: Record<string, string>;
  invariants?: Array<{
    description: string;
    expression?: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  templates?: Array<{
    name: string;
    description: string;
    default?: unknown;
    required?: boolean;
  }>;
  extends?: Array<{
    map_id: string;
    version?: string;
    override?: boolean;
  }>;
  storage?: {
    canonical_path?: string;
    registry?: string;
    local_cache?: string;
  };
  metadata?: {
    created_at?: string;
    updated_at?: string;
    author?: string;
    organization?: string;
    license?: string;
    source_url?: string;
  };
}
