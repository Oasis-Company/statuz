/**
 * @statuz/sdk-ts - niche types
 *
 * TypeScript interfaces matching niche JSON schemas:
 * - niche-manifest.schema.json
 * - niche-context.schema.json
 * - niche-signal.schema.json
 * - niche-assessment.schema.json
 * - niche-calibration.schema.json
 * - niche-outcome.schema.json
 * - niche-syn.schema.json
 */

export type NicheVersion = "1.0";

/**
 * niche manifest — declares ecological position of a project or agent.
 * @see {@link spec/niche/niche-manifest.schema.json}
 */
export interface NicheManifest {
  niche_version: NicheVersion;
  id?: string;
  declared_position: DeclaredPosition;
  strategic_bets?: string[];
  success_signals?: string[];
  relevant_signals?: string[];
  evidence_window_days?: number;
  drift_thresholds?: DriftThresholds;
  syn_policy?: SynPolicy;
  [key: string]: unknown;
}

export interface DeclaredPosition {
  project_name: string;
  purpose: string;
  does: string[];
  does_not: string[];
  [key: string]: unknown;
}

export interface DriftThresholds {
  task_drift?: number;
  collaboration_drift?: number;
  boundary_drift?: number;
  [key: string]: unknown;
}

export interface SynPolicy {
  auto_trigger?: boolean;
  required_approvers?: string[];
  [key: string]: unknown;
}

/**
 * niche context — collaboration payload describing what is needed.
 * @see {@link spec/niche/niche-context.schema.json}
 */
export interface NicheContext {
  context_version: NicheVersion;
  id: string;
  from_agent: string;
  to_agent: string;
  timestamp: string;
  summary: string;
  requested_action: string;
  references?: NicheContextReferences;
  expected_by?: string;
  priority?: "low" | "medium" | "high" | "critical";
  attachments?: NicheContextAttachment[];
  [key: string]: unknown;
}

export interface NicheContextReferences {
  signal_ids?: string[];
  assessment_ids?: string[];
  context_ids?: string[];
  [key: string]: unknown;
}

export interface NicheContextAttachment {
  type?: "file" | "url" | "data";
  path?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * niche signal — ecosystem events that may affect a project or agent.
 * @see {@link spec/niche/niche-signal.schema.json}
 */
export interface NicheSignal {
  signal_version: NicheVersion;
  id: string;
  type: string;
  source: string;
  timestamp: string;
  summary: string;
  details?: SignalDetails;
  related_signals?: string[];
  [key: string]: unknown;
}

export interface SignalDetails {
  endpoint?: string;
  change?: string;
  impact_level?: "low" | "medium" | "high" | "critical";
  commit_ref?: string;
  file_paths?: string[];
  [key: string]: unknown;
}

/**
 * niche assessment — relevance judgment for a given signal.
 * @see {@link spec/niche/niche-assessment.schema.json}
 */
export interface NicheAssessment {
  assessment_version: NicheVersion;
  id: string;
  signal_id: string;
  assessor: string;
  timestamp: string;
  relevance_score: number;
  relevance_rational: string;
  confidence: number;
  impact_analysis?: ImpactAnalysis;
  recommended_action?: string;
  will_act?: boolean;
  [key: string]: unknown;
}

export interface ImpactAnalysis {
  affected_components?: string[];
  estimated_effort?: string;
  priority?: "low" | "medium" | "high" | "critical";
  [key: string]: unknown;
}

/**
 * niche calibration — drift proposal generated for a position.
 * @see {@link spec/niche/niche-calibration.schema.json}
 */
export interface NicheCalibration {
  calibration_version: NicheVersion;
  id: string;
  timestamp: string;
  evidence_window: EvidenceWindow;
  drift_analysis: DriftAnalysis;
  proposed_change: ProposedChange;
  evidence: string[];
  auto_triggers_syn: boolean;
  recommendations?: string[];
  syn_request_id?: string;
  [key: string]: unknown;
}

export interface EvidenceWindow {
  start: string;
  end: string;
}

export interface DriftAnalysis {
  task_drift: DriftMetric;
  collaboration_drift: DriftMetric;
  boundary_drift: DriftMetric;
}

export interface DriftMetric {
  metric: string;
  observed: number;
  threshold: number;
  description: string;
}

export interface ProposedChange {
  type:
    | "update_declared_position"
    | "maintain_position"
    | "reassign_responsibility";
  description: string;
  rationale?: string;
  [key: string]: unknown;
}

/**
 * niche outcome — result record produced by an agent in response to context.
 * @see {@link spec/niche/niche-outcome.schema.json}
 */
export interface NicheOutcome {
  outcome_version: NicheVersion;
  id: string;
  context_id: string;
  agent: string;
  timestamp: string;
  result: "success" | "failure" | "partial";
  summary: string;
  details?: OutcomeDetails;
  next_steps?: string[];
  related_outcomes?: string[];
  [key: string]: unknown;
}

export interface OutcomeDetails {
  tests_passed?: number;
  tests_failed?: number;
  coverage_improved?: boolean;
  new_tests_added?: number;
  test_report_url?: string;
  files_changed?: string[];
  [key: string]: unknown;
}
