/**
 * @statuz/sdk-ts - calibration types
 *
 * TypeScript interfaces for the Calibration Engine:
 * drift detection between declared position (niche manifest)
 * and observed behavior (statuz checkpoints + niche signals).
 */

export type { ValidationResult } from "../types.js";

/**
 * Evidence item used for drift analysis.
 * Each evidence item represents one observed action or signal.
 */
export interface EvidenceItem {
  id: string;
  /** ISO timestamp of the evidence */
  timestamp: string;
  /** Short summary of the observed action */
  summary: string;
  /** Optional: tags that categorize this evidence */
  tags?: string[];
  /** Optional: agent/actor who produced this evidence */
  source?: string;
  /** Optional: signal/assessment relevance score (0-1) */
  relevance?: number;
  [key: string]: unknown;
}

/**
 * Result from a drift analysis across the three dimensions.
 */
export interface DriftResult {
  /** Task drift: is actual work aligned with declared "does"? (0-1) */
  task_drift: number;
  /** Collaboration drift: who did we interact with vs declared scope? (0-1) */
  collaboration_drift: number;
  /** Boundary drift: how much work falls into declared "does_not"? (0-1) */
  boundary_drift: number;
}

/**
 * Result object produced by the Calibration Engine.
 * Contains the full analysis + NicheCalibration document.
 */
export interface CalibrationResult {
  /**
   * The NicheCalibration document (compliant with existing schema).
   * Safe to serialize to YAML/JSON.
   */
  document: {
    calibration_version: "1.0";
    id: string;
    timestamp: string;
    evidence_window: {
      start: string;
      end: string;
    };
    drift_analysis: {
      task_drift: {
        metric: string;
        observed: number;
        threshold: number;
        description: string;
      };
      collaboration_drift: {
        metric: string;
        observed: number;
        threshold: number;
        description: string;
      };
      boundary_drift: {
        metric: string;
        observed: number;
        threshold: number;
        description: string;
      };
    };
    proposed_change: {
      type: "update_declared_position" | "maintain_position" | "reassign_responsibility";
      description: string;
      rationale?: string;
    };
    evidence: string[];
    auto_triggers_syn: boolean;
    recommendations?: string[];
    syn_request_id?: string;
    [key: string]: unknown;
  };

  /**
   * Maximum observed drift across the three dimensions (0-1).
   */
  max_drift: number;

  /**
   * Whether any drift dimension exceeded its threshold.
   */
  has_drift: boolean;

  /**
   * Dimension that had the highest drift.
   */
  max_drift_dimension: string;
}

/**
 * Options passed to the calibration pipeline.
 */
export interface CalibrationOptions {
  /**
   * Evidence window start (ISO timestamp).
   * Default: 24 hours ago.
   */
  window_start?: string;
  /**
   * Evidence window end (ISO timestamp).
   * Default: now.
   */
  window_end?: string;
  /**
   * Whether to automatically trigger SYN on drift detection.
   * Default: false.
   */
  auto_syn?: boolean;
  /**
   * Override manifest drift thresholds.
   * Defaults: task_drift 0.3, collaboration_drift 0.25, boundary_drift 0.15.
   */
  thresholds?: {
    task_drift?: number;
    collaboration_drift?: number;
    boundary_drift?: number;
  };
}
