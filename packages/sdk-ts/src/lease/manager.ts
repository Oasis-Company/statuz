/**
 * LeaseManager — Read, write, validate, and manage Statuz Lease YAML files.
 *
 * Follows the same pattern as NicheManifestIO:
 * - static create(options): Lease (in-memory creation)
 * - static read(filePath): Lease (read from YAML file)
 * - static write(filePath, data): void (serialize to YAML)
 * - static validate(data): ValidationResult (validate against JSON schema)
 * - static validateFile(filePath): ValidationResult (read + validate)
 * - static accept(lease, agentId): Lease (mark lease accepted)
 * - static report(lease, reportData): Lease (append progress report)
 * - static revoke(lease, reason): Lease (mark lease revoked)
 * - static complete(lease, completionNotes?): Lease (mark lease completed)
 * - static list(directory, filters?): Lease[] (scan directory for leases)
 * - static checkExpiry(lease, now?): Lease (check and mark expired if past deadline)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { Lease, LeaseCheckpoint, LeaseFilters, ValidationResult } from "./types.js";

export class LeaseManager {
  /**
   * Create a new Lease in memory (does not write to disk).
   */
  static create(options: {
    id: string;
    assigner: string;
    assignee: string;
    responsibility: string;
    scope: { task: string; files?: string[]; arrow_map_id?: string };
    priority: "low" | "medium" | "high" | "critical";
    deadline?: string;
    status?: "pending" | "accepted" | "active" | "completed" | "revoked" | "expired";
    created_at?: string;
    next_action?: string;
  }): Lease {
    const now = options.created_at || new Date().toISOString();
    return {
      lease_version: "0.1",
      id: options.id,
      assigner: options.assigner,
      assignee: options.assignee,
      responsibility: options.responsibility,
      scope: options.scope,
      priority: options.priority,
      status: options.status || "pending",
      deadline: options.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      checkpoints: [],
      renewals: 0,
      next_action: options.next_action,
    };
  }

  /**
   * Read a lease from a YAML file.
   */
  static read(filePath: string): Lease {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    try {
      const raw = readFileSync(fullPath, "utf8");
      const data = YAML.parse(raw) as Lease;
      return data;
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        throw new Error(`Invalid YAML in file: ${fullPath}\n  ${err.message}`);
      }
      throw new Error(`Could not read file: ${fullPath}`);
    }
  }

  /**
   * Write a lease to a YAML file. Creates directory if it does not exist.
   */
  static write(filePath: string, data: Lease): void {
    const fullPath = resolve(process.cwd(), filePath);
    const outDir = dirname(fullPath);

    try {
      mkdirSync(outDir, { recursive: true });
    } catch {
      throw new Error(`Could not create directory: ${outDir}`);
    }

    try {
      writeFileSync(fullPath, YAML.stringify(data), "utf8");
    } catch {
      throw new Error(`Could not write file: ${fullPath}`);
    }
  }

  /**
   * Validate a lease object against the JSON schema.
   */
  static validate(data: unknown): ValidationResult {
    const schema = LeaseManager.loadSchema("lease.schema.json");
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (validate(data)) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: (validate.errors || []).map((err: any) => ({
        path: err.instancePath || "(root)",
        message: err.message || "Unknown validation error",
      })),
    };
  }

  /**
   * Validate a lease YAML file.
   */
  static validateFile(filePath: string): ValidationResult {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [{ path: "(root)", message: `File not found: ${fullPath}` }],
      };
    }
    try {
      const raw = readFileSync(fullPath, "utf8");
      const doc = YAML.parse(raw);
      return LeaseManager.validate(doc);
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        return {
          valid: false,
          errors: [{ path: "(root)", message: `Invalid YAML: ${err.message}` }],
        };
      }
      return {
        valid: false,
        errors: [{ path: "(root)", message: `Could not read file: ${fullPath}` }],
      };
    }
  }

  /**
   * Accept a lease — mark it as accepted and record acceptance timestamp.
   * Returns the updated lease object. Caller is responsible for writing.
   */
  static accept(lease: Lease, agentId: string, notes?: string): Lease {
    const now = new Date().toISOString();
    const updated: Lease = {
      ...lease,
      status: "accepted",
      accepted_at: now,
    };
    if (notes) {
      updated.next_action = notes;
    }
    return updated;
  }

  /**
   * Submit a progress report on a lease — appends a checkpoint.
   */
  static report(
    lease: Lease,
    reportData: {
      summary: string;
      next_action?: string;
      status?: string;
    }
  ): Lease {
    const now = new Date().toISOString();
    const checkpointCount = (lease.checkpoints || []).length + 1;
    const checkpointId = `${lease.id}-cp-${String(checkpointCount).padStart(2, "0")}`;

    const checkpoint: LeaseCheckpoint = {
      id: checkpointId,
      at: now,
      summary: reportData.summary,
    };

    const updated: Lease = {
      ...lease,
      status: reportData.status ? (reportData.status as Lease["status"]) : "active",
      checkpoints: [...(lease.checkpoints || []), checkpoint],
    };

    if (reportData.next_action) {
      updated.next_action = reportData.next_action;
    }

    return updated;
  }

  /**
   * Revoke a lease.
   */
  static revoke(lease: Lease): Lease {
    return {
      ...lease,
      status: "revoked",
    };
  }

  /**
   * Complete a lease — mark as completed with timestamp.
   */
  static complete(lease: Lease, completionNotes?: string): Lease {
    const now = new Date().toISOString();
    const updated: Lease = {
      ...lease,
      status: "completed",
      completed_at: now,
    };
    if (completionNotes) {
      const checkpointCount = (lease.checkpoints || []).length + 1;
      const finalCheckpoint: LeaseCheckpoint = {
        id: `${lease.id}-cp-${String(checkpointCount).padStart(2, "0")}`,
        at: now,
        summary: completionNotes,
      };
      updated.checkpoints = [...(lease.checkpoints || []), finalCheckpoint];
    }
    return updated;
  }

  /**
   * Expire a lease — mark as expired. Called automatically by checkExpiry,
   * but also available for manual triggering.
   */
  static expire(lease: Lease): Lease {
    return {
      ...lease,
      status: "expired",
    };
  }

  /**
   * Check if a lease is past its deadline and mark as expired if so.
   * Returns the potentially updated lease.
   */
  static checkExpiry(lease: Lease, now: Date = new Date()): Lease {
    if (
      (lease.status === "pending" || lease.status === "accepted" || lease.status === "active") &&
      new Date(lease.deadline) <= now
    ) {
      return { ...lease, status: "expired" };
    }
    return lease;
  }

  /**
   * List all leases in a directory, optionally filtering by status/assignee/priority.
   */
  static list(directory: string, filters?: LeaseFilters): Lease[] {
    const dirPath = resolve(process.cwd(), directory);
    if (!existsSync(dirPath)) {
      return [];
    }

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    const leases: Lease[] = [];
    for (const file of files) {
      const fullPath = join(dirPath, file);
      const fileInfo = statSync(fullPath);
      if (!fileInfo.isFile()) continue;

      try {
        const raw = readFileSync(fullPath, "utf8");
        const parsed = YAML.parse(raw);
        if (parsed && typeof parsed === "object" && "lease_version" in parsed) {
          const lease = parsed as Lease;

          if (filters?.status && lease.status !== filters.status) continue;
          if (filters?.assignee && lease.assignee !== filters.assignee) continue;
          if (filters?.priority && lease.priority !== filters.priority) continue;

          leases.push(lease);
        }
      } catch {
        // Skip files that fail to parse gracefully
      }
    }
    return leases;
  }

  /**
   * Load a lease schema JSON file from the standard candidate paths.
   */
  private static loadSchema(schemaName: string): Record<string, unknown> {
    const candidates = [
      resolve(process.cwd(), `spec/lease/${schemaName}`),
      resolve(import.meta.dirname, `../../../spec/lease/${schemaName}`),
      resolve(import.meta.dirname, `../../../../spec/lease/${schemaName}`),
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
    throw new Error(`Could not find ${schemaName}.`);
  }
}
