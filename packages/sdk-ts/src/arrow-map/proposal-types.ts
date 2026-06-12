/**
 * @statuz/sdk-ts - arrow proposal types
 *
 * TypeScript interfaces for Arrow Proposal — topological change proposals.
 * @see {@link 66-implementation/spec/arrow-proposal.schema.json}
 */

export type { ValidationResult } from "../types.js";

export type ProposalVersion = "0.1";

export type ProposalType = 
  | "add_node"
  | "remove_node"
  | "update_node"
  | "add_arrow"
  | "remove_arrow"
  | "update_arrow"
  | "merge";

export type ProposalStatus = 
  | "pending"
  | "reviewed"
  | "approved"
  | "rejected"
  | "applied";

export type ProposalAction = "add" | "remove" | "update";

export type ProposalTarget = "node" | "arrow";

export interface NodeChange {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  properties?: Record<string, unknown>;
  labels?: string[];
  tags?: string[];
  status?: "active" | "inactive" | "deprecated" | "planned";
}

export interface ArrowChange {
  id?: string;
  type?: "dependency" | "information_flow" | "responsibility" | "validation" | "resource_transfer" | "influence" | "constraint";
  from?: string;
  to?: string;
  description?: string;
  properties?: Record<string, unknown>;
  criticality?: "critical" | "high" | "medium" | "low";
}

export interface ProposalChange {
  action: ProposalAction;
  target: ProposalTarget;
  node?: NodeChange;
  arrow?: ArrowChange;
}

export interface ReviewComment {
  by: string;
  comment: string;
  timestamp: string;
}

export interface ArrowProposal {
  proposal_version: ProposalVersion;
  proposal_id: string;
  source_map_id: string;
  target_map_id?: string;
  type: ProposalType;
  changes: ProposalChange[];
  status: ProposalStatus;
  author: string;
  rationale: string;
  timestamp: string;
  review_comments?: ReviewComment[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}