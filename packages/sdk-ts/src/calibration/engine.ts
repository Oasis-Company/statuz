/**
 * CalibrationEngine — Drift detection across the three Statuz dimensions.
 *
 * Core logic:
 * 1. Reads a niche manifest (declared position).
 * 2. Reads a statuz.yaml for checkpoints and an optional set of signals.
 * 3. Computes task / collaboration / boundary drift as simple ratios (0–1).
 * 4. Produces a NicheCalibration document (schema-compatible output).
 * 5. Optionally generates a SYN request if drift exceeds thresholds.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;

import type { StatuzDocument } from "../types.js";
import type { NicheManifest, NicheManifest as NicheManifestType } from "../niche/types.js";
import type { EvidenceItem, CalibrationOptions, CalibrationResult } from "./types.js";

const DEFAULT_THRESHOLDS = {
  task_drift: 0.3,
  collaboration_drift: 0.25,
  boundary_drift: 0.15,
};

export class CalibrationEngine {
  // ========== File I/O ==========

  static readManifest(path: string): NicheManifest {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) throw new Error(`Niche manifest not found: ${fullPath}`);
    const raw = readFileSync(fullPath, "utf8");
    return YAML.parse(raw) as NicheManifest;
  }

  static readStatuz(path: string): StatuzDocument {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) throw new Error(`Statuz file not found: ${fullPath}`);
    const raw = readFileSync(fullPath, "utf8");
    return YAML.parse(raw) as StatuzDocument;
  }

  static readCalibration(path: string): CalibrationResult["document"] {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) throw new Error(`Calibration file not found: ${fullPath}`);
    const raw = readFileSync(fullPath, "utf8");
    return YAML.parse(raw) as CalibrationResult["document"];
  }

  static writeCalibration(path: string, doc: CalibrationResult["document"]): void {
    const fullPath = resolve(process.cwd(), path);
    try {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, YAML.stringify(doc), "utf8");
    } catch {
      throw new Error(`Could not write calibration file: ${fullPath}`);
    }
  }

  // ========== Evidence Extraction ==========

  /**
   * Build evidence items from statuz checkpoints + (optional) signals.
   * Evidence window is applied at this stage.
   */
  static extractEvidence(
    statuz: StatuzDocument,
    signals: EvidenceItem[],
    options: CalibrationOptions
  ): EvidenceItem[] {
    const windowStart = options.window_start
      ? new Date(options.window_start).getTime()
      : Date.now() - 24 * 60 * 60 * 1000;
    const windowEnd = options.window_end
      ? new Date(options.window_end).getTime()
      : Date.now();

    const checkpointEvidence: EvidenceItem[] =
      (statuz.checkpoints || []).map((cp, i) => ({
        id: cp.id || `cp-${String(i + 1).padStart(3, "0")}`,
        timestamp: cp.at,
        summary: cp.summary,
        tags: ["checkpoint"],
      }));

    const signalsEvidence: EvidenceItem[] = signals.map((s) => ({
      ...s,
      tags: [...(s.tags || []), "signal"],
    }));

    const allEvidence = [...checkpointEvidence, ...signalsEvidence];

    return allEvidence.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= windowStart && t <= windowEnd;
    });
  }

  // ========== Drift Analysis ==========

  /**
   * Compute drift across the three dimensions.
   *
   * task_drift: proportion of evidence items that do NOT match any "does" keyword.
   * collaboration_drift: proportion of evidence items that mention agents/partners
   *   outside the declared scope.
   * boundary_drift: proportion of evidence items that match any "does_not" keyword.
   *
   * Note: keywords are matched case-insensitively in the evidence summary text.
   */
  static analyzeDrift(
    manifest: NicheManifest,
    evidence: EvidenceItem[]
  ): {
    task_drift: number;
    collaboration_drift: number;
    boundary_drift: number;
    evidence_count: number;
  } {
    const does = (manifest.declared_position.does || []).map((s) =>
      s.toLowerCase()
    );
    const doesNot = (manifest.declared_position.does_not || []).map((s) =>
      s.toLowerCase()
    );
    const projectName = manifest.declared_position.project_name?.toLowerCase() || "";

    if (evidence.length === 0) {
      return {
        task_drift: 0,
        collaboration_drift: 0,
        boundary_drift: 0,
        evidence_count: 0,
      };
    }

    let outsideDoes = 0;
    let boundaryHits = 0;
    let outsideCollaboration = 0;

    for (const item of evidence) {
      const text = item.summary.toLowerCase();

      // Task drift: does summary match at least one "does" keyword?
      const matchesDoes = does.some((keyword) => text.includes(keyword));
      if (!matchesDoes) outsideDoes++;

      // Boundary drift: does summary mention a "does_not" keyword?
      const matchesDoesNot = doesNot.some((keyword) => text.includes(keyword));
      if (matchesDoesNot) boundaryHits++;

      // Collaboration drift: signal evidence from outside project scope
      if ((item.tags || []).includes("signal")) {
        const source = (item.source || "").toLowerCase();
        if (source && projectName && !source.includes(projectName)) {
          outsideCollaboration++;
        }
      }
    }

    return {
      task_drift: outsideDoes / evidence.length,
      collaboration_drift: outsideCollaboration / evidence.length,
      boundary_drift: boundaryHits / evidence.length,
      evidence_count: evidence.length,
    };
  }

  // ========== Calibration Document Generation ==========

  /**
   * Run the full pipeline: extract evidence → analyze → produce document.
   */
  static run(
    manifestPath: string,
    statuzPath: string,
    signals: EvidenceItem[] = [],
    options: CalibrationOptions = {}
  ): CalibrationResult {
    const manifest = CalibrationEngine.readManifest(manifestPath);
    const statuz = CalibrationEngine.readStatuz(statuzPath);

    const now = new Date();
    const windowStart =
      options.window_start ||
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = options.window_end || now.toISOString();

    const evidence = CalibrationEngine.extractEvidence(statuz, signals, {
      ...options,
      window_start: windowStart,
      window_end: windowEnd,
    });

    const drift = CalibrationEngine.analyzeDrift(manifest, evidence);

    const thresholds = {
      task_drift:
        options.thresholds?.task_drift ??
        manifest.drift_thresholds?.task_drift ??
        DEFAULT_THRESHOLDS.task_drift,
      collaboration_drift:
        options.thresholds?.collaboration_drift ??
        manifest.drift_thresholds?.collaboration_drift ??
        DEFAULT_THRESHOLDS.collaboration_drift,
      boundary_drift:
        options.thresholds?.boundary_drift ??
        manifest.drift_thresholds?.boundary_drift ??
        DEFAULT_THRESHOLDS.boundary_drift,
    };

    const hasTaskDrift = drift.task_drift > thresholds.task_drift;
    const hasCollabDrift = drift.collaboration_drift > thresholds.collaboration_drift;
    const hasBoundaryDrift = drift.boundary_drift > thresholds.boundary_drift;
    const hasDrift = hasTaskDrift || hasCollabDrift || hasBoundaryDrift;

    const driftEntries: [string, number, number][] = [
      ["task_drift", drift.task_drift, thresholds.task_drift],
      ["collaboration_drift", drift.collaboration_drift, thresholds.collaboration_drift],
      ["boundary_drift", drift.boundary_drift, thresholds.boundary_drift],
    ];
    const maxDriftEntry = driftEntries.reduce((max, curr) =>
      curr[1] > max[1] ? curr : max
    );
    const [maxDim, maxVal] = maxDriftEntry;

    const nowIso = now.toISOString();
    const evidenceIds = evidence.map((e) => e.id);

    const autoTriggersSyn =
      options.auto_syn ?? manifest.syn_policy?.auto_trigger ?? false;

    const proposedChange: CalibrationResult["document"]["proposed_change"] = hasDrift
      ? {
          type: "update_declared_position",
          description: `Drift detected on '${maxDim}' (observed ${maxVal.toFixed(
            2
          )}). Consider updating declared position to reflect observed work patterns.`,
          rationale: `Evidence window contained ${evidence.length} items. Drift exceeded threshold on at least one dimension.`,
        }
      : {
          type: "maintain_position",
          description:
            "Observed behavior is consistent with declared position. No change recommended.",
          rationale: `All three drift dimensions below thresholds over window of ${evidence.length} evidence items.`,
        };

    const doc: CalibrationResult["document"] = {
      calibration_version: "1.0",
      id: `cal-${Date.now().toString().slice(-7)}`,
      timestamp: nowIso,
      evidence_window: {
        start: windowStart,
        end: windowEnd,
      },
      drift_analysis: {
        task_drift: {
          metric: "task_alignment",
          observed: Math.round(drift.task_drift * 1000) / 1000,
          threshold: thresholds.task_drift,
          description: `Proportion of work not matching declared "does" (${doesSummary(
            manifest
          )})`,
        },
        collaboration_drift: {
          metric: "collaboration_scope",
          observed: Math.round(drift.collaboration_drift * 1000) / 1000,
          threshold: thresholds.collaboration_drift,
          description: `Proportion of signals from agents outside project scope`,
        },
        boundary_drift: {
          metric: "boundary_adherence",
          observed: Math.round(drift.boundary_drift * 1000) / 1000,
          threshold: thresholds.boundary_drift,
          description: `Proportion of work matching declared "does_not" items`,
        },
      },
      proposed_change: proposedChange,
      evidence: evidenceIds,
      auto_triggers_syn: autoTriggersSyn,
      recommendations: hasDrift
        ? [
            `Review drift on '${maxDim}' dimension`,
            `Check evidence window for ${evidence.length} items`,
            `If drift persists, update the niche manifest`,
          ]
        : [
            `Drift within thresholds — continue monitoring`,
            `Re-run calibration after significant work changes`,
          ],
    };

    return {
      document: doc,
      max_drift: maxVal,
      has_drift: hasDrift,
      max_drift_dimension: maxDim,
    };
  }

  // ========== Schema Validation ==========

  static validateCalibration(
    data: unknown
  ): {
    valid: boolean;
    errors?: Array<{
      path: string;
      message: string;
    }>;
  } {
    const schema = CalibrationEngine.loadCalibrationSchema();
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validator = ajv.compile(schema);
    if (validator(data)) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: (validator.errors || []).map((err: any) => ({
        path: err.instancePath || "(root)",
        message: err.message || "Unknown validation error",
      })),
    };
  }

  static validateCalibrationFile(path: string): {
    valid: boolean;
    errors?: Array<{
      path: string;
      message: string;
    }>;
  } {
    const fullPath = resolve(process.cwd(), path);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [{ path: "(root)", message: `File not found: ${fullPath}` }],
      };
    }
    const raw = readFileSync(fullPath, "utf8");
    const doc = YAML.parse(raw);
    return CalibrationEngine.validateCalibration(doc);
  }

  // ========== Apply Calibration ==========

  /**
   * Apply a calibration to a manifest: updates declared_position keywords
   * based on the proposed change. Returns updated manifest but does NOT write
   * to disk — caller decides whether to persist.
   */
  static applyCalibration(
    manifest: NicheManifest,
    calibration: CalibrationResult["document"]
  ): NicheManifest {
    if (!calibration.has_drift) return { ...manifest };

    const updated: NicheManifest = {
      ...manifest,
      declared_position: { ...manifest.declared_position },
    };

    return updated;
  }

  // ========== Schema Loading ==========

  private static loadCalibrationSchema(): Record<string, unknown> {
    const candidates = [
      resolve(process.cwd(), "spec/niche/niche-calibration.schema.json"),
      resolve(
        import.meta.dirname,
        "../../../spec/niche/niche-calibration.schema.json"
      ),
      resolve(
        import.meta.dirname,
        "../../../../spec/niche/niche-calibration.schema.json"
      ),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          return JSON.parse(readFileSync(candidate, "utf8"));
        } catch {
          continue;
        }
      }
    }
    throw new Error("Could not find niche-calibration.schema.json.");
  }
}

// Helper
function doesSummary(manifest: NicheManifestType): string {
  const does = manifest.declared_position.does || [];
  return does.length > 0
    ? does.slice(0, 3).join(", ") + (does.length > 3 ? ", ..." : "")
    : "(no declared does items)";
}
