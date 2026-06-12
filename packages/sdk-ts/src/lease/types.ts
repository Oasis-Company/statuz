/**
 * @statuz/sdk-ts - lease types
 *
 * TypeScript interfaces for Statuz Lease documents.
 * A Lease is a time-boxed, revocable assignment of responsibility
 * from Statuz Runtime to an Agent.
 */

export type { ValidationResult } from "../types.js";

export interface LeaseScope {
  task: string;
  files?: string[];
  arrow_map_id?: string;
  [key: string]: unknown;
}

export interface LeaseCheckpoint {
  id: string;
  at: string;
  summary: string;
  [key: string]: unknown;
}

export interface Lease {
  lease_version: "0.1";
  id: string;
  assigner: string;
  assignee: string;
  responsibility: string;
  scope: LeaseScope;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "accepted" | "active" | "completed" | "revoked" | "expired";
  deadline: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  checkpoints?: LeaseCheckpoint[];
  renewals?: number;
  next_action?: string;
  [key: string]: unknown;
}

export interface LeaseAcceptance {
  acceptance_version: "0.1";
  lease_id: string;
  accepted_by: string;
  accepted_at: string;
  notes?: string;
  estimated_completion?: string;
  [key: string]: unknown;
}

export interface LeaseReport {
  report_version: "0.1";
  lease_id: string;
  reported_by: string;
  reported_at: string;
  status: string;
  progress_summary: string;
  next_steps?: string[];
  blocked_by?: string[];
  evidence?: string[];
  health_score?: number;
  [key: string]: unknown;
}

export interface LeaseFilters {
  status?: Lease["status"];
  assignee?: string;
  priority?: Lease["priority"];
}
