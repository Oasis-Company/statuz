/**
 * CLI commands for Lease management — `statuz lease` subcommand group.
 *
 * Subcommands: create, accept, report, complete, revoke, list, show
 */

import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import YAML from "yaml";
import { LeaseManager } from "@statuz/sdk-ts";

export function leaseCommand(): Command {
  const cmd = new Command();
  cmd
    .name("lease")
    .description("Manage Statuz Leases — time-boxed assignments of responsibility");

  // === statuz lease create ===
  cmd
    .command("create")
    .description("Create a new lease")
    .requiredOption("--id <id>", "Lease ID (e.g., ls-001)")
    .requiredOption("--assignee <name>", "Agent ID assigned to this lease")
    .requiredOption("--task <description>", "Description of the task")
    .option("--assigner <name>", "Who is creating the lease", "statuz")
    .option("--priority <level>", "Priority: low/medium/high/critical", "medium")
    .option("--deadline <iso-date>", "Deadline ISO timestamp", () => {
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    })
    .option("--arrow-map <id>", "Optional Arrow Map node ID")
    .option("--out <path>", "Output YAML file path", ".statuz/leases/ls-001.yaml")
    .action((options) => {
      const id = options.id.startsWith("ls-") ? options.id : `ls-${options.id}`;
      const out = options.out.replace("ls-001", id);
      const fullPath = resolve(process.cwd(), out);

      const lease = LeaseManager.create({
        id,
        assigner: options.assigner,
        assignee: options.assignee,
        responsibility: options.task,
        scope: {
          task: options.task,
          arrow_map_id: options.arrowMap,
        },
        priority: options.priority,
        deadline: options.deadline,
      });

      try {
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, YAML.stringify(lease), "utf8");
      } catch {
        console.error(`Error: Could not write file: ${fullPath}`);
        process.exit(1);
      }

      console.log(`=== Lease Created ===`);
      console.log(`ID: ${lease.id}`);
      console.log(`Assignee: ${lease.assignee}`);
      console.log(`Task: ${lease.responsibility}`);
      console.log(`Priority: ${lease.priority}`);
      console.log(`Status: ${lease.status}`);
      console.log(`Deadline: ${lease.deadline}`);
      console.log(`\nSaved to: ${fullPath}`);
    });

  // === statuz lease show ===
  cmd
    .command("show")
    .description("Display lease details")
    .argument("<file>", "Path to lease YAML file")
    .action((file) => {
      const fullPath = resolve(process.cwd(), file);
      if (!existsSync(fullPath)) {
        console.error(`Error: File not found: ${fullPath}`);
        process.exit(1);
      }

      try {
        const lease = LeaseManager.read(fullPath);
        console.log(`=== Lease ${lease.id} ===`);
        console.log(`Assigner: ${lease.assigner}`);
        console.log(`Assignee: ${lease.assignee}`);
        console.log(`Responsibility: ${lease.responsibility}`);
        console.log(`Priority: ${lease.priority}`);
        console.log(`Status: ${lease.status}`);
        console.log(`Created: ${lease.created_at}`);
        if (lease.accepted_at) console.log(`Accepted: ${lease.accepted_at}`);
        if (lease.completed_at) console.log(`Completed: ${lease.completed_at}`);
        console.log(`Deadline: ${lease.deadline}`);
        if (lease.scope.arrow_map_id) console.log(`Arrow Map: ${lease.scope.arrow_map_id}`);
        if (lease.checkpoints && lease.checkpoints.length > 0) {
          console.log(`\nCheckpoints (${lease.checkpoints.length}):`);
          for (const cp of lease.checkpoints) {
            console.log(`  [${cp.id}] ${cp.at} — ${cp.summary}`);
          }
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // === statuz lease accept ===
  cmd
    .command("accept")
    .description("Accept a pending lease")
    .argument("<file>", "Path to lease YAML file")
    .option("--notes <text>", "Optional acceptance notes")
    .action((file, options) => {
      const fullPath = resolve(process.cwd(), file);
      try {
        const lease = LeaseManager.read(fullPath);
        if (lease.status !== "pending") {
          console.error(`Error: Lease is not in 'pending' state (current: ${lease.status})`);
          process.exit(1);
        }
        const accepted = LeaseManager.accept(lease, lease.assignee, options.notes);
        writeFileSync(fullPath, YAML.stringify(accepted), "utf8");
        console.log(`Lease ${accepted.id} accepted by ${accepted.assignee}`);
        console.log(`Status: ${accepted.status}`);
        console.log(`Accepted at: ${accepted.accepted_at}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // === statuz lease report ===
  cmd
    .command("report")
    .description("Submit a progress report on a lease")
    .argument("<file>", "Path to lease YAML file")
    .requiredOption("--summary <text>", "Progress summary")
    .option("--next <text>", "Next action / next steps")
    .option("--status <state>", "Status to set", "active")
    .action((file, options) => {
      const fullPath = resolve(process.cwd(), file);
      try {
        const lease = LeaseManager.read(fullPath);
        const reported = LeaseManager.report(lease, {
          summary: options.summary,
          next_action: options.next,
          status: options.status,
        });
        writeFileSync(fullPath, YAML.stringify(reported), "utf8");
        console.log(`Report added to lease ${lease.id}`);
        console.log(`Summary: ${options.summary}`);
        console.log(`New status: ${reported.status}`);
        console.log(`Total checkpoints: ${reported.checkpoints?.length || 0}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // === statuz lease complete ===
  cmd
    .command("complete")
    .description("Mark a lease as completed")
    .argument("<file>", "Path to lease YAML file")
    .option("--notes <text>", "Completion notes")
    .action((file, options) => {
      const fullPath = resolve(process.cwd(), file);
      try {
        const lease = LeaseManager.read(fullPath);
        const completed = LeaseManager.complete(lease, options.notes);
        writeFileSync(fullPath, YAML.stringify(completed), "utf8");
        console.log(`Lease ${completed.id} marked as completed`);
        console.log(`Completed at: ${completed.completed_at}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // === statuz lease revoke ===
  cmd
    .command("revoke")
    .description("Revoke a lease")
    .argument("<file>", "Path to lease YAML file")
    .action((file) => {
      const fullPath = resolve(process.cwd(), file);
      try {
        const lease = LeaseManager.read(fullPath);
        const revoked = LeaseManager.revoke(lease);
        writeFileSync(fullPath, YAML.stringify(revoked), "utf8");
        console.log(`Lease ${revoked.id} has been revoked`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // === statuz lease list ===
  cmd
    .command("list")
    .description("List leases in a directory")
    .option("--dir <path>", "Directory containing lease YAML files", ".statuz/leases")
    .option("--status <state>", "Filter by status (pending, active, completed, etc.)")
    .option("--assignee <name>", "Filter by assignee")
    .option("--priority <level>", "Filter by priority")
    .action((options) => {
      const dirPath = resolve(process.cwd(), options.dir);

      if (!existsSync(dirPath)) {
        console.log(`No leases directory found at: ${dirPath}`);
        console.log(`Create one with: statuz lease create --id 001 --assignee agent --task "Example task"`);
        return;
      }

      const filters: {
        status?: "pending" | "accepted" | "active" | "completed" | "revoked" | "expired";
        assignee?: string;
        priority?: "low" | "medium" | "high" | "critical";
      } = {};

      if (options.status) filters.status = options.status;
      if (options.assignee) filters.assignee = options.assignee;
      if (options.priority) filters.priority = options.priority;

      const leases = LeaseManager.list(dirPath, filters);

      if (leases.length === 0) {
        console.log("No leases found.");
        return;
      }

      console.log(`=== Leases (${leases.length}) ===\n`);

      const statusSymbol: Record<string, string> = {
        pending: "[ ]",
        accepted: "[+]",
        active: "[~]",
        completed: "[✓]",
        revoked: "[×]",
        expired: "[!]",
      };

      for (const lease of leases) {
        const sym = statusSymbol[lease.status] || "[?]";
        console.log(`${sym} ${lease.id}  (${lease.priority})  ${lease.assignee}`);
        console.log(`     ${lease.responsibility}`);
        console.log(`     Status: ${lease.status}  |  Deadline: ${lease.deadline}`);
        console.log();
      }
    });

  // === statuz lease validate ===
  cmd
    .command("validate")
    .description("Validate a lease YAML file against the schema")
    .argument("<file>", "Path to lease YAML file")
    .action((file) => {
      const fullPath = resolve(process.cwd(), file);
      const result = LeaseManager.validateFile(fullPath);
      if (result.valid) {
        console.log(`Valid lease file: ${fullPath}`);
      } else {
        console.error(`Error: Invalid lease file: ${fullPath}`);
        if (result.errors) {
          for (const err of result.errors) {
            console.error(`  ${err.path}: ${err.message}`);
          }
        }
        process.exit(1);
      }
    });

  return cmd;
}
