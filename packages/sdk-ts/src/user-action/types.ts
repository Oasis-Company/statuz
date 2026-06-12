/**
 * @statuz/sdk-ts - user action types
 *
 * TypeScript interfaces for User Action Tracking.
 * @see {@link spec/user-action/user-action.schema.json}
 */

export type { ValidationResult } from "../types.js";

export type UserActionVersion = "0.1";

export type UserActionType = 
  | "click"
  | "input"
  | "submit"
  | "confirm"
  | "reject"
  | "pause"
  | "resume"
  | "select"
  | "navigate"
  | "search"
  | "export"
  | "import"
  | "delete"
  | "create"
  | "update";

export interface UserActionContext {
  task_id?: string;
  screen?: string;
  element?: string;
  view?: string;
  workflow?: string;
  [key: string]: unknown;
}

export interface UserAction {
  user_action_version: UserActionVersion;
  action_id: string;
  timestamp: string;
  action_type: UserActionType;
  user_id: string;
  agent_id: string;
  context?: UserActionContext;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UserActionQuery {
  since?: string;
  until?: string;
  action_type?: UserActionType;
  user_id?: string;
  agent_id?: string;
  limit?: number;
  offset?: number;
}

export interface UserActionStats {
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_user: Record<string, number>;
  actions_by_agent: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
  average_actions_per_day: number;
}

export interface UserActionExportOptions {
  format: "json" | "csv" | "yaml";
  query?: UserActionQuery;
}