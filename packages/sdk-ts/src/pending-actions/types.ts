/**
 * @statuz/sdk-ts - pending actions types
 *
 * TypeScript interfaces for Pending Actions — bidirectional task tracking
 * between agents and humans.
 */

export type PendingActionsVersion = "1.0";

/**
 * Lifecycle status of a pending action.
 */
export type PendingActionStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "blocked"
  | "cancelled";

/**
 * Priority levels for pending actions.
 */
export type PendingActionPriority = "critical" | "high" | "medium" | "low";

/**
 * Who initiated or is assigned to a pending action.
 */
export type PendingActionPrincipal = "agent" | "human";

/**
 * Resolution details for a completed or cancelled pending action.
 */
export interface PendingActionResolution {
  resolved_at: string;
  resolved_by: string;
  outcome: string;
  notes?: string;
}

/**
 * A single pending action — one task that needs doing.
 */
export interface PendingAction {
  id: string;                                    // "pa-001"
  title: string;                                 // required, 1-200 chars
  description?: string;                             // optional, max 2000 chars
  requested_by: PendingActionPrincipal;           // who initiated
  assigned_to: PendingActionPrincipal;           // who must complete
  status: PendingActionStatus;                  // lifecycle state
  priority?: PendingActionPriority;             // default "medium"
  created_at: string;                            // ISO timestamp
  deadline?: string;                            // ISO timestamp (optional)
  human_notes?: string;                       // free-form human notes
  agent_blocked_on?: string[];                // tasks blocked on this
  resolution?: PendingActionResolution;          // filled on done/cancelled
}

/**
 * Top-level pending actions document — the full YAML file content.
 */
export interface PendingActionsDocument {
  pending_actions_version: PendingActionsVersion;
  updated_at: string;
  pending_actions: PendingAction[];
}

/**
 * Summarised view of a pending actions document.
 */
export interface PendingActionsSummary {
  total: number;
  pending: number;
  in_progress: number;
  done: number;
  blocked: number;
  cancelled: number;
  critical_count: number;
  old_pending: PendingAction[];
}
