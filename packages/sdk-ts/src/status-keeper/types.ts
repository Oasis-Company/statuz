/**
 * Status Keeper Types
 *
 * Types for Status Keeper - the component that performs regular
 * health checks on Statuz files.
 */

/**
 * Check type enum
 */
export type CheckType = 
  | "file_exists" 
  | "checkpoint_freshness" 
  | "arrow_map_valid" 
  | "niche_manifest_valid" 
  | "cluster_valid";

/**
 * Severity level enum
 */
export type SeverityLevel = "critical" | "warning" | "info";

/**
 * Schedule frequency enum
 */
export type ScheduleFrequency = "daily" | "hourly" | "session_start" | "manual";

/**
 * Output format enum
 */
export type OutputFormat = "yaml" | "json" | "markdown";

/**
 * Single health check configuration
 */
export interface HealthCheck {
  type: CheckType;
  target: string;
  severity: SeverityLevel;
  message?: string;
  max_age_hours?: number;
  enabled?: boolean;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  health_check?: ScheduleFrequency;
  checkpoint_check?: ScheduleFrequency;
  time?: string;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  format?: OutputFormat;
  path?: string;
  notify_on_critical?: boolean;
  notify_on_warning?: boolean;
}

/**
 * Status Keeper configuration
 */
export interface StatusKeeperConfig {
  keeper_version: string;
  schedule?: ScheduleConfig;
  checks: HealthCheck[];
  output?: OutputConfig;
}

/**
 * Single check result
 */
export interface CheckResult {
  check_type: CheckType;
  target: string;
  passed: boolean;
  severity: SeverityLevel;
  message: string;
  details?: Record<string, unknown>;
  checked_at: string;
}

/**
 * Overall health status
 */
export type HealthStatus = "healthy" | "degraded" | "critical";

/**
 * Health report
 */
export interface HealthReport {
  report_version: string;
  generated_at: string;
  overall_status: HealthStatus;
  checks_passed: number;
  checks_failed: number;
  critical_issues: number;
  warning_issues: number;
  info_issues: number;
  results: CheckResult[];
  recommendations: string[];
}