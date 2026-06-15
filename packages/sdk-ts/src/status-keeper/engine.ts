/**
 * Status Keeper Engine
 *
 * Performs regular health checks on Statuz files:
 * - file_exists: Check if required files exist
 * - checkpoint_freshness: Check if checkpoints are recent
 * - arrow_map_valid: Validate Arrow Map schema
 * - niche_manifest_valid: Validate niche manifest schema
 * - cluster_valid: Validate Arrow Map Cluster schema
 */

import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import * as yaml from "yaml";
import type {
  StatusKeeperConfig,
  HealthCheck,
  CheckResult,
  HealthReport,
  HealthStatus,
  CheckType,
  SeverityLevel,
  OutputFormat
} from "./types.js";

export class StatusKeeperEngine {
  /**
   * Run all health checks from configuration
   */
  static runChecks(config: StatusKeeperConfig, basePath: string = process.cwd()): CheckResult[] {
    const results: CheckResult[] = [];
    const now = new Date().toISOString();

    for (const check of config.checks) {
      if (check.enabled === false) continue;

      const result = this.runSingleCheck(check, basePath, now);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single health check
   */
  private static runSingleCheck(check: HealthCheck, basePath: string, checkedAt: string): CheckResult {
    const targetPath = resolve(basePath, check.target);

    switch (check.type) {
      case "file_exists":
        return this.checkFileExists(check, targetPath, checkedAt);
      
      case "checkpoint_freshness":
        return this.checkCheckpointFreshness(check, targetPath, checkedAt);
      
      case "arrow_map_valid":
        return this.checkArrowMapValid(check, targetPath, checkedAt);
      
      case "niche_manifest_valid":
        return this.checkNicheManifestValid(check, targetPath, checkedAt);
      
      case "cluster_valid":
        return this.checkClusterValid(check, targetPath, checkedAt);
      
      default:
        return {
          check_type: check.type,
          target: check.target,
          passed: false,
          severity: check.severity,
          message: `Unknown check type: ${check.type}`,
          checked_at: checkedAt,
        };
    }
  }

  /**
   * Check if a file exists
   */
  private static checkFileExists(check: HealthCheck, targetPath: string, checkedAt: string): CheckResult {
    const exists = existsSync(targetPath);
    const defaultMessages = {
      critical: `${check.target} does not exist — agent cannot recover state`,
      warning: `${check.target} does not exist — some features may not work`,
      info: `${check.target} does not exist — optional file missing`,
    };

    return {
      check_type: "file_exists",
      target: check.target,
      passed: exists,
      severity: check.severity,
      message: exists 
        ? `${check.target} exists` 
        : (check.message || defaultMessages[check.severity]),
      details: { path: targetPath, exists },
      checked_at: checkedAt,
    };
  }

  /**
   * Check if checkpoints are fresh (within max_age_hours)
   */
  private static checkCheckpointFreshness(check: HealthCheck, targetPath: string, checkedAt: string): CheckResult {
    if (!existsSync(targetPath)) {
      return {
        check_type: "checkpoint_freshness",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: check.message || `${check.target} does not exist — cannot check checkpoint freshness`,
        checked_at: checkedAt,
      };
    }

    try {
      const content = readFileSync(targetPath, "utf8");
      const doc = yaml.parse(content) as { updated_at?: string; checkpoints?: Array<{ at?: string }> };
      
      // Get the most recent checkpoint timestamp
      let lastUpdate: Date | null = null;
      
      if (doc.updated_at) {
        lastUpdate = new Date(doc.updated_at);
      }
      
      if (doc.checkpoints && doc.checkpoints.length > 0) {
        const lastCheckpoint = doc.checkpoints[doc.checkpoints.length - 1];
        if (lastCheckpoint.at) {
          const checkpointDate = new Date(lastCheckpoint.at);
          if (!lastUpdate || checkpointDate > lastUpdate) {
            lastUpdate = checkpointDate;
          }
        }
      }

      if (!lastUpdate) {
        return {
          check_type: "checkpoint_freshness",
          target: check.target,
          passed: false,
          severity: check.severity,
          message: check.message || `${check.target} has no checkpoints or updated_at field`,
          checked_at: checkedAt,
        };
      }

      const maxAgeHours = check.max_age_hours || 48;
      const ageHours = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const isFresh = ageHours <= maxAgeHours;

      return {
        check_type: "checkpoint_freshness",
        target: check.target,
        passed: isFresh,
        severity: check.severity,
        message: isFresh 
          ? `Last checkpoint is ${Math.round(ageHours)}h old (within ${maxAgeHours}h threshold)`
          : (check.message || `Last checkpoint is ${Math.round(ageHours)}h old (exceeds ${maxAgeHours}h threshold) — work may have stalled`),
        details: { 
          last_update: lastUpdate.toISOString(),
          age_hours: Math.round(ageHours),
          max_age_hours: maxAgeHours,
        },
        checked_at: checkedAt,
      };
    } catch (error) {
      return {
        check_type: "checkpoint_freshness",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: `Failed to parse ${check.target}: ${error instanceof Error ? error.message : "unknown error"}`,
        checked_at: checkedAt,
      };
    }
  }

  /**
   * Check if Arrow Map is valid (basic structure check)
   */
  private static checkArrowMapValid(check: HealthCheck, targetPath: string, checkedAt: string): CheckResult {
    if (!existsSync(targetPath)) {
      return {
        check_type: "arrow_map_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: check.message || `${check.target} does not exist`,
        checked_at: checkedAt,
      };
    }

    try {
      const content = readFileSync(targetPath, "utf8");
      const doc = yaml.parse(content);

      // Basic structure validation
      const hasRequiredFields = doc && 
        typeof doc.arrow_map_version === "string" &&
        typeof doc.id === "string" &&
        Array.isArray(doc.nodes) &&
        Array.isArray(doc.arrows);

      // Check that all arrows have descriptions
      let missingDescriptions = 0;
      if (Array.isArray(doc.arrows)) {
        for (const arrow of doc.arrows) {
          if (!arrow.description || arrow.description.length < 10) {
            missingDescriptions++;
          }
        }
      }

      return {
        check_type: "arrow_map_valid",
        target: check.target,
        passed: hasRequiredFields && missingDescriptions === 0,
        severity: check.severity,
        message: hasRequiredFields 
          ? (missingDescriptions === 0 
            ? `${check.target} is valid`
            : `${check.target} has ${missingDescriptions} arrows missing descriptions`)
          : (check.message || `${check.target} has invalid structure`),
        details: { 
          has_required_fields: hasRequiredFields,
          nodes_count: Array.isArray(doc.nodes) ? doc.nodes.length : 0,
          arrows_count: Array.isArray(doc.arrows) ? doc.arrows.length : 0,
          missing_descriptions: missingDescriptions,
        },
        checked_at: checkedAt,
      };
    } catch (error) {
      return {
        check_type: "arrow_map_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: `Failed to parse ${check.target}: ${error instanceof Error ? error.message : "unknown error"}`,
        checked_at: checkedAt,
      };
    }
  }

  /**
   * Check if niche manifest is valid (basic structure check)
   */
  private static checkNicheManifestValid(check: HealthCheck, targetPath: string, checkedAt: string): CheckResult {
    if (!existsSync(targetPath)) {
      return {
        check_type: "niche_manifest_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: check.message || `${check.target} does not exist`,
        checked_at: checkedAt,
      };
    }

    try {
      const content = readFileSync(targetPath, "utf8");
      const doc = yaml.parse(content);

      const hasRequiredFields = doc &&
        typeof doc.niche_version === "string" &&
        doc.declared_position &&
        typeof doc.declared_position === "object";

      return {
        check_type: "niche_manifest_valid",
        target: check.target,
        passed: hasRequiredFields,
        severity: check.severity,
        message: hasRequiredFields 
          ? `${check.target} is valid`
          : (check.message || `${check.target} has invalid structure`),
        checked_at: checkedAt,
      };
    } catch (error) {
      return {
        check_type: "niche_manifest_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: `Failed to parse ${check.target}: ${error instanceof Error ? error.message : "unknown error"}`,
        checked_at: checkedAt,
      };
    }
  }

  /**
   * Check if Arrow Map Cluster is valid (basic structure check)
   */
  private static checkClusterValid(check: HealthCheck, targetPath: string, checkedAt: string): CheckResult {
    if (!existsSync(targetPath)) {
      return {
        check_type: "cluster_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: check.message || `${check.target} does not exist`,
        checked_at: checkedAt,
      };
    }

    try {
      const content = readFileSync(targetPath, "utf8");
      const doc = yaml.parse(content);

      const hasRequiredFields = doc &&
        typeof doc.cluster_version === "string" &&
        typeof doc.id === "string" &&
        Array.isArray(doc.maps) &&
        Array.isArray(doc.cross_map_arrows);

      // Check that all cross_map_arrows have descriptions
      let missingDescriptions = 0;
      if (Array.isArray(doc.cross_map_arrows)) {
        for (const arrow of doc.cross_map_arrows) {
          if (!arrow.description || arrow.description.length < 10) {
            missingDescriptions++;
          }
        }
      }

      return {
        check_type: "cluster_valid",
        target: check.target,
        passed: hasRequiredFields && missingDescriptions === 0,
        severity: check.severity,
        message: hasRequiredFields 
          ? (missingDescriptions === 0 
            ? `${check.target} is valid`
            : `${check.target} has ${missingDescriptions} cross-map arrows missing descriptions`)
          : (check.message || `${check.target} has invalid structure`),
        details: {
          has_required_fields: hasRequiredFields,
          maps_count: Array.isArray(doc.maps) ? doc.maps.length : 0,
          cross_map_arrows_count: Array.isArray(doc.cross_map_arrows) ? doc.cross_map_arrows.length : 0,
          missing_descriptions: missingDescriptions,
        },
        checked_at: checkedAt,
      };
    } catch (error) {
      return {
        check_type: "cluster_valid",
        target: check.target,
        passed: false,
        severity: check.severity,
        message: `Failed to parse ${check.target}: ${error instanceof Error ? error.message : "unknown error"}`,
        checked_at: checkedAt,
      };
    }
  }

  /**
   * Generate a health report from check results
   */
  static generateReport(results: CheckResult[]): HealthReport {
    const checksPassed = results.filter(r => r.passed).length;
    const checksFailed = results.filter(r => !r.passed).length;
    const criticalIssues = results.filter(r => !r.passed && r.severity === "critical").length;
    const warningIssues = results.filter(r => !r.passed && r.severity === "warning").length;
    const infoIssues = results.filter(r => !r.passed && r.severity === "info").length;

    let overallStatus: HealthStatus;
    if (criticalIssues > 0) {
      overallStatus = "critical";
    } else if (warningIssues > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    // Generate recommendations
    const recommendations: string[] = [];
    for (const result of results.filter(r => !r.passed)) {
      if (result.severity === "critical") {
        recommendations.push(`[CRITICAL] Fix ${result.target}: ${result.message}`);
      } else if (result.severity === "warning") {
        recommendations.push(`[WARNING] Review ${result.target}: ${result.message}`);
      }
    }

    if (overallStatus === "healthy") {
      recommendations.push("All checks passed. Continue monitoring.");
    }

    return {
      report_version: "1.0.0",
      generated_at: new Date().toISOString(),
      overall_status: overallStatus,
      checks_passed: checksPassed,
      checks_failed: checksFailed,
      critical_issues: criticalIssues,
      warning_issues: warningIssues,
      info_issues: infoIssues,
      results,
      recommendations,
    };
  }

  /**
   * Get default configuration for common checks
   */
  static getDefaultConfig(): StatusKeeperConfig {
    return {
      keeper_version: "1.0.0",
      schedule: {
        health_check: "session_start",
        checkpoint_check: "session_start",
      },
      checks: [
        {
          type: "file_exists",
          target: ".statuz/statuz.yaml",
          severity: "critical",
          message: "statuz.yaml does not exist — agent cannot recover state",
        },
        {
          type: "file_exists",
          target: ".statuz/niche/manifest.yaml",
          severity: "warning",
          message: "niche manifest does not exist — cannot perform drift analysis",
        },
        {
          type: "checkpoint_freshness",
          target: ".statuz/statuz.yaml",
          severity: "warning",
          max_age_hours: 48,
          message: "checkpoint exceeds 48h threshold — work may have stalled",
        },
        {
          type: "arrow_map_valid",
          target: ".statuz/arrow-map.yaml",
          severity: "info",
          message: "Arrow Map validation failed",
        },
      ],
      output: {
        format: "yaml",
        path: ".statuz/health-report.yaml",
        notify_on_critical: true,
        notify_on_warning: false,
      },
    };
  }

  /**
   * Read a Status Keeper configuration from a YAML file
   */
  static readConfig(path: string): StatusKeeperConfig {
    if (!existsSync(path)) {
      throw new Error(`Status Keeper config file not found: ${path}`);
    }

    const content = readFileSync(path, "utf8");
    const doc = yaml.parse(content) as StatusKeeperConfig;

    return doc;
  }

  /**
   * Validate a Status Keeper configuration structure
   */
  static validateConfig(config: StatusKeeperConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.keeper_version) {
      errors.push("keeper_version is required");
    }

    if (!config.checks || config.checks.length === 0) {
      errors.push("at least one check is required");
      return { valid: false, errors };
    }

    const validTypes: CheckType[] = ["file_exists", "checkpoint_freshness", "arrow_map_valid", "niche_manifest_valid", "cluster_valid"];
    const validSeverities: SeverityLevel[] = ["critical", "warning", "info"];

    for (let i = 0; i < config.checks.length; i++) {
      const check = config.checks[i];
      if (!validTypes.includes(check.type)) {
        errors.push(`check[${i}].type "${check.type}" is invalid. Must be one of: ${validTypes.join(", ")}`);
      }
      if (!check.target || typeof check.target !== "string") {
        errors.push(`check[${i}].target is required and must be a string`);
      }
      if (!validSeverities.includes(check.severity)) {
        errors.push(`check[${i}].severity "${check.severity}" is invalid. Must be one of: ${validSeverities.join(", ")}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Write a health report to a file
   */
  static writeReport(path: string, report: HealthReport, format: OutputFormat = "yaml"): void {
    const outDir = dirname(path);
    if (outDir && outDir !== "." && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    let content: string;

    switch (format) {
      case "json":
        content = JSON.stringify(report, null, 2);
        break;

      case "markdown":
        content = this.formatReportAsMarkdown(report);
        break;

      case "yaml":
      default:
        content = yaml.stringify(report, { defaultKeyType: "PLAIN", defaultStringType: "QUOTE_DOUBLE", lineWidth: 0 });
        break;
    }

    writeFileSync(path, content, "utf8");
  }

  /**
   * Format a health report as human-readable Markdown
   */
  private static formatReportAsMarkdown(report: HealthReport): string {
    const statusEmoji = report.overall_status === "healthy" ? "✅" : report.overall_status === "degraded" ? "⚠️" : "🔴";

    const lines: string[] = [
      `# Health Report`,
      ``,
      `- Generated: ${report.generated_at}`,
      `- Overall Status: ${statusEmoji} ${report.overall_status.toUpperCase()}`,
      `- Checks Passed: ${report.checks_passed}`,
      `- Checks Failed: ${report.checks_failed}`,
      `- Critical Issues: ${report.critical_issues}`,
      `- Warning Issues: ${report.warning_issues}`,
      ``,
      `## Detailed Results`,
      ``,
    ];

    for (const result of report.results) {
      const passEmoji = result.passed ? "✅" : "❌";
      lines.push(`### ${passEmoji} ${result.check_type} — ${result.target}`);
      lines.push(`- Severity: ${result.severity}`);
      lines.push(`- Message: ${result.message}`);
      lines.push(`- Checked at: ${result.checked_at}`);
      if (result.details) {
        lines.push(`- Details:`);
        lines.push("```");
        lines.push(JSON.stringify(result.details, null, 2));
        lines.push("```");
      }
      lines.push("");
    }

    if (report.recommendations.length > 0) {
      lines.push(`## Recommendations`, "");
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}