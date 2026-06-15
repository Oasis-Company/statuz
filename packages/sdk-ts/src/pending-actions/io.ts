/**
 * PendingActionsIO — Read, write, validate, and manipulate pending-actions documents.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as yaml from "yaml";
import Ajv from "ajv";
import addFormatsImport from "ajv-formats";
const addFormats = addFormatsImport as any;
import type {
  PendingActionsDocument,
  PendingAction,
  PendingActionStatus,
  PendingActionsSummary,
} from "./types.js";

export class PendingActionsIO {
  static readonly DEFAULT_PATH = ".statuz/pending-actions.yaml";

  private static ajv = (() => {
    const instance = new Ajv({ allErrors: true, strict: false });
    addFormats(instance);
    return instance;
  })();

  private static schemaCache: Record<string, unknown> | null = null;

  static loadSchema(): Record<string, unknown> {
    if (this.schemaCache) return this.schemaCache;
    const candidates = [
      resolve(process.cwd(), "spec/pending-actions.schema.json"),
      resolve(dirname(import.meta.dirname), "../../spec/pending-actions.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../spec/pending-actions.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../../spec/pending-actions.schema.json"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const parsed = JSON.parse(readFileSync(candidate, "utf8")) as Record<string, unknown>;
        this.schemaCache = parsed;
        return parsed;
      }
    }
    throw new Error("Could not find pending-actions.schema.json. Search paths checked:\n" + candidates.join("\n"));
  }

  static read(path: string): PendingActionsDocument {
    if (!existsSync(path)) {
      throw new Error(`Pending actions file not found: ${path}`);
    }
    const content = readFileSync(path, "utf8");
    const doc = yaml.parse(content) as PendingActionsDocument;
    return doc;
  }

  static write(path: string, doc: PendingActionsDocument): void {
    const outDir = dirname(path);
    if (outDir && outDir !== "." && !existsSync(outDir)) {
      const { mkdirSync } = require("node:fs") as typeof import("node:fs");
      mkdirSync(outDir, { recursive: true });
    }
    doc.updated_at = new Date().toISOString();
    const content = yaml.stringify(doc, { defaultKeyType: "PLAIN", defaultStringType: "QUOTE_DOUBLE", lineWidth: 0 });
    writeFileSync(path, content, "utf8");
  }

  static createEmpty(): PendingActionsDocument {
    return {
      pending_actions_version: "1.0",
      updated_at: new Date().toISOString(),
      pending_actions: [],
    };
  }

  static validate(doc: PendingActionsDocument): { valid: boolean; errors: string[] } {
    const schema = this.loadSchema();
    const validateFn = this.ajv.compile(schema);
    const valid = validateFn(doc);
    if (valid) return { valid: true, errors: [] };
    const errs = validateFn.errors || [];
    return {
      valid: false,
      errors: errs.map((e: any) => `${e.instancePath || "(root)"}: ${e.message}`),
    };
  }

  static validateFile(path: string): { valid: boolean; errors: string[] } {
    if (!existsSync(path)) {
      return { valid: false, errors: [`File not found: ${path}`] };
    }
    try {
      const doc = this.read(path);
      return this.validate(doc);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  }

  static addAction(
    doc: PendingActionsDocument,
    action: Omit<PendingAction, "id" | "created_at" | "status"> & { status?: PendingAction["status"] }
  ): PendingActionsDocument {
    const id = this.nextId(doc);
    const newAction: PendingAction = {
      id,
      created_at: new Date().toISOString(),
      status: action.status || "pending",
      ...action,
    } as PendingAction;

    const updated: PendingActionsDocument = {
      ...doc,
      updated_at: new Date().toISOString(),
      pending_actions: [...doc.pending_actions, newAction],
    };
    return updated;
  }

  static updateStatus(
    doc: PendingActionsDocument,
    actionId: string,
    status: PendingActionStatus,
    updates?: Partial<PendingAction>
  ): PendingActionsDocument {
    const action = this.findById(doc, actionId);
    if (!action) {
      throw new Error(`Pending action not found: ${actionId}`);
    }

    const updatedActions = doc.pending_actions.map((a) => {
      if (a.id !== actionId) return a;
      return { ...a, status, ...updates };
    });

    return {
      ...doc,
      updated_at: new Date().toISOString(),
      pending_actions: updatedActions,
    };
  }

  static resolve(
    doc: PendingActionsDocument,
    actionId: string,
    status: "done" | "cancelled",
    outcome: string,
    resolvedBy: string,
    notes?: string
  ): PendingActionsDocument {
    const action = this.findById(doc, actionId);
    if (!action) {
      throw new Error(`Pending action not found: ${actionId}`);
    }

    const updatedActions = doc.pending_actions.map((a) => {
      if (a.id !== actionId) return a;
      return {
        ...a,
        status,
        resolution: {
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          outcome,
          notes: notes || undefined,
        },
      };
    });

    return {
      ...doc,
      updated_at: new Date().toISOString(),
      pending_actions: updatedActions,
    };
  }

  static remove(
    doc: PendingActionsDocument,
    actionId: string
  ): PendingActionsDocument {
    const action = this.findById(doc, actionId);
    if (!action) {
      throw new Error(`Pending action not found: ${actionId}`);
    }

    return {
      ...doc,
      updated_at: new Date().toISOString(),
      pending_actions: doc.pending_actions.filter((a) => a.id !== actionId),
    };
  }

  static findById(
    doc: PendingActionsDocument,
    actionId: string
  ): PendingAction | undefined {
    return doc.pending_actions.find((a) => a.id === actionId);
  }

  static filterByStatus(
    doc: PendingActionsDocument,
    status: PendingActionStatus
  ): PendingAction[] {
    return doc.pending_actions.filter((a) => a.status === status);
  }

  static getSummary(doc: PendingActionsDocument): PendingActionsSummary {
    const actions = doc.pending_actions;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: actions.length,
      pending: actions.filter((a) => a.status === "pending").length,
      in_progress: actions.filter((a) => a.status === "in_progress").length,
      done: actions.filter((a) => a.status === "done").length,
      blocked: actions.filter((a) => a.status === "blocked").length,
      cancelled: actions.filter((a) => a.status === "cancelled").length,
      critical_count: actions.filter((a) => a.priority === "critical").length,
      old_pending: actions.filter((a) => {
        if (a.status !== "pending" && a.status !== "in_progress" && a.status !== "blocked") return false;
        const created = new Date(a.created_at);
        return created < oneDayAgo;
      }),
    };
  }

  private static nextId(doc: PendingActionsDocument): string {
    let maxNum = 0;
    for (const action of doc.pending_actions) {
      const match = action.id.match(/^pa-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `pa-${String(nextNum).padStart(3, "0")}`;
  }
}
