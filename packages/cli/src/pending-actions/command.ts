/**
 * CLI commands for pending-actions — agent ↔ human task tracking.
 */

import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as yaml from "yaml";
import {
  PendingActionsIO,
} from "@statuz/sdk-ts";
import type {
  PendingActionStatus,
  PendingActionPriority,
  PendingActionPrincipal,
  PendingActionsDocument,
} from "@statuz/sdk-ts";

const DEFAULT_PATH = ".statuz/pending-actions.yaml";

const VALID_STATUSES: PendingActionStatus[] = [
  "pending",
  "in_progress",
  "done",
  "blocked",
  "cancelled",
];

const VALID_PRIORITIES: PendingActionPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const VALID_PRINCIPALS: PendingActionPrincipal[] = ["agent", "human"];

function ensureDocument(path: string): PendingActionsDocument {
  if (!existsSync(path)) {
    return PendingActionsIO.createEmpty();
  }
  try {
    return PendingActionsIO.read(path);
  } catch (err) {
    console.error(`Error: Failed to read ${path}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function writeDocument(path: string, doc: PendingActionsDocument): void {
  const outDir = dirname(path);
  if (outDir && outDir !== "." && !existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  PendingActionsIO.write(path, doc);
}

function formatStatusLine(status: PendingActionStatus): string {
  switch (status) {
    case "pending":
      return "PENDING";
    case "in_progress":
      return "IN_PROG";
    case "done":
      return "DONE";
    case "blocked":
      return "BLOCKED";
    case "cancelled":
      return "CANCELLED";
  }
}

function formatPriorityLine(priority: PendingActionPriority | undefined): string {
  if (!priority) return "MED";
  switch (priority) {
    case "critical":
      return "CRIT";
    case "high":
      return "HIGH";
    case "medium":
      return "MED";
    case "low":
      return "LOW";
  }
}

export const pendingActionsCommand = new Command("pending-actions")
  .description("Track pending actions between agent and human")
  .alias("pa")

  // ── add ────────────────────────────────────────────────────
  .addCommand(
    new Command("add")
      .description("Create a new pending action")
      .requiredOption("--title <text>", "Short action title (1-200 chars)")
      .option("--description <text>", "Optional detailed description")
      .requiredOption(
        "--assigned-to <principal>",
        "Who should complete this action: agent or human",
      )
      .option(
        "--requested-by <principal>",
        "Who initiated the action: agent or human (default: agent)",
        "agent",
      )
      .option("--priority <level>", "Priority level: critical, high, medium, low (default: medium)", "medium")
      .option("--deadline <iso>", "Optional ISO timestamp deadline")
      .option(
        "--blocked-on <items...>",
        "Tasks the agent cannot proceed with until this action is resolved",
      )
      .option("--output <path>", "Output file path", DEFAULT_PATH)
      .action((options) => {
        const outputPath = resolve(process.cwd(), options.output);

        if (!VALID_PRINCIPALS.includes(options.assignedTo as PendingActionPrincipal)) {
          console.error(`Error: Invalid --assigned-to '${options.assignedTo}'. Must be 'agent' or 'human'`);
          process.exit(1);
        }
        if (!VALID_PRINCIPALS.includes(options.requestedBy as PendingActionPrincipal)) {
          console.error(`Error: Invalid --requested-by '${options.requestedBy}'. Must be 'agent' or 'human'`);
          process.exit(1);
        }
        if (!VALID_PRIORITIES.includes(options.priority as PendingActionPriority)) {
          console.error(`Error: Invalid --priority '${options.priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
          process.exit(1);
        }

        const doc = ensureDocument(outputPath);
        const updated = PendingActionsIO.addAction(doc, {
          title: options.title,
          description: options.description,
          requested_by: options.requestedBy as PendingActionPrincipal,
          assigned_to: options.assignedTo as PendingActionPrincipal,
          priority: options.priority as PendingActionPriority,
          deadline: options.deadline,
          agent_blocked_on: options.blockedOn ? options.blockedOn : [],
        });

        const addedId = updated.pending_actions[updated.pending_actions.length - 1].id;
        writeDocument(outputPath, updated);
        console.log(`✅ Created ${addedId}: ${options.title}`);
        console.log(`   Assigned to: ${options.assignedTo} | Priority: ${options.priority}`);
      }),
  )

  // ── list ────────────────────────────────────────────────────
  .addCommand(
    new Command("list")
      .description("List all pending actions (filtered by status)")
      .option("--status <status>", "Filter by status: pending, in_progress, done, blocked, cancelled")
      .option("--priority <level>", "Filter by priority: critical, high, medium, low")
      .option("--assigned-to <principal>", "Filter by assigned-to: agent or human")
      .option("--path <file>", "Path to pending-actions file", DEFAULT_PATH)
      .action((options) => {
        const filePath = resolve(process.cwd(), options.path);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const doc = PendingActionsIO.read(filePath);
        let actions = doc.pending_actions;

        if (options.status) {
          if (!VALID_STATUSES.includes(options.status as PendingActionStatus)) {
            console.error(`Error: Invalid status '${options.status}'. Must be one of: ${VALID_STATUSES.join(", ")}`);
            process.exit(1);
          }
          actions = actions.filter((a) => a.status === options.status);
        }

        if (options.priority) {
          if (!VALID_PRIORITIES.includes(options.priority as PendingActionPriority)) {
            console.error(`Error: Invalid priority '${options.priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
            process.exit(1);
          }
          actions = actions.filter((a) => a.priority === options.priority);
        }

        if (options.assignedTo) {
          if (!VALID_PRINCIPALS.includes(options.assignedTo as PendingActionPrincipal)) {
            console.error(`Error: Invalid --assigned-to '${options.assignedTo}'`);
            process.exit(1);
          }
          actions = actions.filter((a) => a.assigned_to === options.assignedTo);
        }

        if (actions.length === 0) {
          console.log("No pending actions found.");
          return;
        }

        const colWidths = {
          id: 8,
          status: 10,
          priority: 6,
        };

        console.log(
          `${"ID".padEnd(colWidths.id)}${"STATUS".padEnd(colWidths.status)}${"PRI".padEnd(colWidths.priority)}TITLE`,
        );
        console.log("─".repeat(80));

        for (const action of actions) {
          const id = action.id.padEnd(colWidths.id);
          const status = formatStatusLine(action.status).padEnd(colWidths.status);
          const pri = formatPriorityLine(action.priority).padEnd(colWidths.priority);
          console.log(`${id}${status}${pri}${action.title}`);
        }

        const summary = PendingActionsIO.getSummary(doc);
        console.log("");
        console.log(
          `Total: ${summary.total} | Pending: ${summary.pending} | In_progress: ${summary.in_progress} | Done: ${summary.done} | Blocked: ${summary.blocked} | Cancelled: ${summary.cancelled} | Critical: ${summary.critical_count}`,
        );

        if (summary.old_pending.length > 0) {
          console.log("");
          console.log(`⚠ Stale actions (older than 24h): ${summary.old_pending.length}`);
          for (const stale of summary.old_pending) {
            console.log(`   ${stale.id} — ${stale.title}`);
          }
        }
      }),
  )

  // ── show ────────────────────────────────────────────────────
  .addCommand(
    new Command("show")
      .description("Show full details of a pending action")
      .argument("<id>", "Pending action ID (e.g., pa-001)")
      .option("--path <file>", "Path to pending-actions file", DEFAULT_PATH)
      .action((actionId: string, options: any) => {
        const filePath = resolve(process.cwd(), options.path);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const doc = PendingActionsIO.read(filePath);
        const action = PendingActionsIO.findById(doc, actionId);

        if (!action) {
          console.error(`Error: Pending action '${actionId}' not found.`);
          process.exit(1);
        }

        console.log(`=== ${action.id} ===`);
        console.log(`Title:         ${action.title}`);
        if (action.description) console.log(`Description:   ${action.description}`);
        console.log(`Status:        ${action.status.toUpperCase()}`);
        console.log(`Priority:      ${action.priority || "medium"}`);
        console.log(`Requested by:  ${action.requested_by}`);
        console.log(`Assigned to:   ${action.assigned_to}`);
        console.log(`Created at:    ${action.created_at}`);
        if (action.deadline) console.log(`Deadline:      ${action.deadline}`);
        if (action.human_notes) console.log(`Human notes:   ${action.human_notes}`);
        if (action.agent_blocked_on && action.agent_blocked_on.length > 0) {
          console.log("Blocked on:");
          for (const blocked of action.agent_blocked_on) {
            console.log(`   - ${blocked}`);
          }
        }
        if (action.resolution) {
          console.log("");
          console.log(`Resolution:`);
          console.log(`   Resolved at: ${action.resolution.resolved_at}`);
          console.log(`   Resolved by: ${action.resolution.resolved_by}`);
          console.log(`   Outcome:     ${action.resolution.outcome}`);
          if (action.resolution.notes) console.log(`   Notes:       ${action.resolution.notes}`);
        }
      }),
  )

  // ── update-status ────────────────────────────────────────────
  .addCommand(
    new Command("update-status")
      .description("Update the status of a pending action (optionally with notes)")
      .argument("<id>", "Pending action ID (e.g., pa-001)")
      .requiredOption(
        "--status <status>",
        "New status: pending, in_progress, done, blocked, cancelled",
      )
      .option("--notes <text>", "Optional free-form notes from the human")
      .option("--path <file>", "Path to pending-actions file", DEFAULT_PATH)
      .action((actionId: string, options: any) => {
        const filePath = resolve(process.cwd(), options.path);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        if (!VALID_STATUSES.includes(options.status as PendingActionStatus)) {
          console.error(`Error: Invalid status '${options.status}'. Must be one of: ${VALID_STATUSES.join(", ")}`);
          process.exit(1);
        }

        const doc = PendingActionsIO.read(filePath);
        if (!PendingActionsIO.findById(doc, actionId)) {
          console.error(`Error: Pending action '${actionId}' not found.`);
          process.exit(1);
        }

        const updated = PendingActionsIO.updateStatus(
          doc,
          actionId,
          options.status as PendingActionStatus,
          options.notes ? { human_notes: options.notes } : undefined,
        );
        writeDocument(filePath, updated);
        console.log(`✅ ${actionId} status updated to: ${options.status.toUpperCase()}`);
      }),
  )

  // ── resolve ─────────────────────────────────────────────────
  .addCommand(
    new Command("resolve")
      .description("Mark a pending action as done or cancelled with outcome")
      .argument("<id>", "Pending action ID (e.g., pa-001)")
      .requiredOption(
        "--status <status>",
        "Resolution status: done or cancelled",
      )
      .requiredOption("--outcome <text>", "Description of the outcome (what happened)")
      .requiredOption("--resolved-by <name>", "Who resolved this action (e.g., your name or agent id)")
      .option("--notes <text>", "Optional additional notes")
      .option("--path <file>", "Path to pending-actions file", DEFAULT_PATH)
      .action((actionId: string, options: any) => {
        const filePath = resolve(process.cwd(), options.path);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const status = options.status;
        if (status !== "done" && status !== "cancelled") {
          console.error(`Error: Invalid resolution status '${status}'. Must be 'done' or 'cancelled'.`);
          process.exit(1);
        }

        const doc = PendingActionsIO.read(filePath);
        if (!PendingActionsIO.findById(doc, actionId)) {
          console.error(`Error: Pending action '${actionId}' not found.`);
          process.exit(1);
        }

        const updated = PendingActionsIO.resolve(
          doc,
          actionId,
          status,
          options.outcome,
          options.resolvedBy,
          options.notes,
        );
        writeDocument(filePath, updated);
        console.log(`✅ ${actionId} resolved as: ${status.toUpperCase()}`);
        console.log(`   Outcome: ${options.outcome}`);
      }),
  )

  // ── remove ─────────────────────────────────────────────────
  .addCommand(
    new Command("remove")
      .description("Hard-delete a pending action (prefer: resolve --status cancelled)")
      .argument("<id>", "Pending action ID (e.g., pa-001)")
      .option("--path <file>", "Path to pending-actions file", DEFAULT_PATH)
      .action((actionId: string, options: any) => {
        const filePath = resolve(process.cwd(), options.path);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const doc = PendingActionsIO.read(filePath);
        if (!PendingActionsIO.findById(doc, actionId)) {
          console.error(`Error: Pending action '${actionId}' not found.`);
          process.exit(1);
        }

        const updated = PendingActionsIO.remove(doc, actionId);
        writeDocument(filePath, updated);
        console.log(`✅ Removed ${actionId}`);
      }),
  )

  // ── validate ───────────────────────────────────────────────
  .addCommand(
    new Command("validate")
      .description("Validate the pending-actions file against the schema")
      .argument("[file]", "Path to pending-actions file (default: .statuz/pending-actions.yaml)")
      .action((file: string | undefined) => {
        const filePath = resolve(process.cwd(), file || DEFAULT_PATH);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const result = PendingActionsIO.validateFile(filePath);
        if (result.valid) {
          console.log(`✅ Valid pending-actions file: ${filePath}`);
        } else {
          console.error(`❌ Validation failed:`);
          result.errors.forEach((err) => console.error(`   - ${err}`));
          process.exit(1);
        }
      }),
  );
