/**
 * UserActionTracker — Track, query, and analyze user interactions with AI agents.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { UserAction, UserActionQuery, UserActionStats, ValidationResult } from "./types.js";

export class UserActionTracker {
  private static getDefaultDirectory(): string {
    return resolve(process.cwd(), ".statuz", "user-actions");
  }

  static track(
    action: { action_type: UserAction["action_type"]; user_id: string; agent_id: string; context?: UserAction["context"]; payload?: UserAction["payload"]; metadata?: UserAction["metadata"] },
    directory?: string
  ): UserAction {
    const dir = directory || UserActionTracker.getDefaultDirectory();
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const actionId = `ua-${Date.now().toString().slice(-4).padStart(4, "0")}`;

    const userAction: UserAction = {
      user_action_version: "0.1",
      action_id: actionId,
      timestamp: now.toISOString(),
      ...action,
    };

    // Validate before writing
    const validation = UserActionTracker.validate(userAction);
    if (!validation.valid) {
      throw new Error(`Invalid user action: ${validation.errors?.map(e => e.message).join(", ")}`);
    }

    const filePath = resolve(dir, `${dateStr}.yaml`);
    UserActionTracker.ensureDirectory(dir);

    let actions: UserAction[] = [];
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf8");
        const data = YAML.parse(content);
        actions = Array.isArray(data) ? data : [data];
      } catch {
        actions = [];
      }
    }

    actions.push(userAction);
    writeFileSync(filePath, YAML.stringify(actions), "utf8");

    return userAction;
  }

  static read(actionId: string, directory?: string): UserAction | undefined {
    const dir = directory || UserActionTracker.getDefaultDirectory();
    if (!existsSync(dir)) return undefined;

    const files = readdirSync(dir).filter(f => f.endsWith(".yaml"));
    for (const file of files) {
      const filePath = resolve(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const data = YAML.parse(content);
        const actions = Array.isArray(data) ? data : [data];
        const action = actions.find((a: UserAction) => a.action_id === actionId);
        if (action) return action;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  static query(query: UserActionQuery = {}, directory?: string): UserAction[] {
    const dir = directory || UserActionTracker.getDefaultDirectory();
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith(".yaml"));
    let allActions: UserAction[] = [];

    for (const file of files) {
      const filePath = resolve(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const data = YAML.parse(content);
        const actions = Array.isArray(data) ? data : [data];
        allActions = allActions.concat(actions);
      } catch {
        continue;
      }
    }

    let filtered = allActions;

    if (query.since !== undefined) {
      filtered = filtered.filter(a => a.timestamp >= query.since!);
    }
    if (query.until !== undefined) {
      filtered = filtered.filter(a => a.timestamp <= query.until!);
    }
    if (query.action_type) {
      filtered = filtered.filter(a => a.action_type === query.action_type);
    }
    if (query.user_id) {
      filtered = filtered.filter(a => a.user_id === query.user_id);
    }
    if (query.agent_id) {
      filtered = filtered.filter(a => a.agent_id === query.agent_id);
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (query.limit !== undefined) {
      filtered = filtered.slice(0, query.limit);
    }
    if (query.offset !== undefined) {
      filtered = filtered.slice(query.offset);
    }

    return filtered;
  }

  static stats(query: UserActionQuery = {}, directory?: string): UserActionStats {
    const actions = UserActionTracker.query(query, directory);
    
    const actionsByType: Record<string, number> = {};
    const actionsByUser: Record<string, number> = {};
    const actionsByAgent: Record<string, number> = {};
    
    let minDate = new Date().toISOString();
    let maxDate = "0";

    for (const action of actions) {
      actionsByType[action.action_type] = (actionsByType[action.action_type] || 0) + 1;
      actionsByUser[action.user_id] = (actionsByUser[action.user_id] || 0) + 1;
      actionsByAgent[action.agent_id] = (actionsByAgent[action.agent_id] || 0) + 1;
      
      if (action.timestamp < minDate) minDate = action.timestamp;
      if (action.timestamp > maxDate) maxDate = action.timestamp;
    }

    const daysDiff = maxDate !== "0" 
      ? Math.ceil((new Date(maxDate).getTime() - new Date(minDate).getTime()) / (1000 * 60 * 60 * 24)) 
      : 1;

    return {
      total_actions: actions.length,
      actions_by_type: actionsByType,
      actions_by_user: actionsByUser,
      actions_by_agent: actionsByAgent,
      date_range: {
        start: minDate,
        end: maxDate === "0" ? new Date().toISOString() : maxDate,
      },
      average_actions_per_day: Math.round(actions.length / daysDiff),
    };
  }

  static export(
    options: { format: "json" | "csv" | "yaml"; query?: UserActionQuery },
    directory?: string
  ): string {
    const actions = UserActionTracker.query(options.query, directory);

    switch (options.format) {
      case "json":
        return JSON.stringify(actions, null, 2);
      case "csv":
        if (actions.length === 0) return "";
        const headers = ["action_id", "timestamp", "action_type", "user_id", "agent_id"];
        const rows = actions.map(a => [
          a.action_id,
          a.timestamp,
          a.action_type,
          a.user_id,
          a.agent_id,
        ]);
        return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      case "yaml":
      default:
        return YAML.stringify(actions);
    }
  }

  static cleanup(olderThanDays: number = 90, directory?: string): number {
    const dir = directory || UserActionTracker.getDefaultDirectory();
    if (!existsSync(dir)) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    let deletedCount = 0;
    const files = readdirSync(dir).filter(f => f.endsWith(".yaml"));
    
    for (const file of files) {
      const dateStr = basename(file, ".yaml");
      if (dateStr < cutoffStr) {
        unlinkSync(resolve(dir, file));
        deletedCount++;
      }
    }

    return deletedCount;
  }

  static validate(data: unknown): ValidationResult {
    const schema = UserActionTracker.loadSchema();
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
      const data = YAML.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          const result = UserActionTracker.validate(item);
          if (!result.valid) return result;
        }
        return { valid: true };
      }
      return UserActionTracker.validate(data);
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

  private static ensureDirectory(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  private static loadSchema(): Record<string, unknown> {
    const candidates = [
      resolve(process.cwd(), "spec/user-action/user-action.schema.json"),
      resolve(dirname(import.meta.dirname), "../../spec/user-action/user-action.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../spec/user-action/user-action.schema.json"),
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
    throw new Error("Could not find user-action.schema.json.");
  }
}