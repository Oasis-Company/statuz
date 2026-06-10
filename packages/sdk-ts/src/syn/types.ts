/**
 * @statuz/sdk-ts - syn types
 *
 * TypeScript interfaces for SYN (human synchronization) requests and resolutions.
 * @see {@link spec/niche/niche-syn.schema.json}
 */

export type SynVersion = "1.0";

/**
 * SYN request — a human decision request triggered by calibration or policy.
 */
export interface SynRequest {
  syn_version: SynVersion;
  id: string;
  type: "human_decision_required";
  source: string;
  calibration_id?: string;
  timestamp: string;
  priority: "low" | "medium" | "high" | "critical";
  summary: string;
  context?: SynContext;
  options: SynOption[];
  recommendation: string;
  requested_decision_by?: string;
  [key: string]: unknown;
}

export interface SynContext {
  evidence_summary?: string;
  evidence_window?: string;
  [key: string]: unknown;
}

export interface SynOption {
  id: string;
  title: string;
  description: string;
  pros?: string[];
  cons?: string[];
  [key: string]: unknown;
}

/**
 * SYN resolution — a human principal's decision on a SYN request.
 */
export interface SynResolution {
  syn_resolution_version: SynVersion;
  id: string;
  syn_request_id: string;
  principal: string;
  timestamp: string;
  decision: string;
  decision_summary: string;
  rationale: string;
  effective_date?: string;
  next_steps?: string[];
  audit_trail?: string[];
  [key: string]: unknown;
}

/**
 * A SynDocument is either a request or a resolution.
 * Matches the oneOf discriminator in niche-syn.schema.json.
 */
export type SynDocument = SynRequest | SynResolution;

/** Type guard for SynRequest. */
export function isSynRequest(doc: SynDocument): doc is SynRequest {
  return "type" in doc && (doc as SynRequest).type === "human_decision_required";
}

/** Type guard for SynResolution. */
export function isSynResolution(doc: SynDocument): doc is SynResolution {
  return "syn_request_id" in doc;
}
