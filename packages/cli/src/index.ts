#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { StatuzDocument } from "./types.js";
import { arrowMapCommand } from "./arrow-map/command.js";
import { arrowProposalCommand } from "./arrow-proposal/command.js";
import { busCommand } from "./bus/command.js";
import { calibrationCommand } from "./calibration/command.js";
import { clusterCommand } from "./cluster/command.js";
import { dashboardCommand } from "./dashboard/command.js";
import { agentCommand } from "./agent/command.js";
import { leaseCommand } from "./lease/command.js";
import { nicheCommand } from "./niche/command.js";
import { pendingActionsCommand } from "./pending-actions/command.js";
import { statusKeeperCommand } from "./status-keeper/command.js";
import { synCommand } from "./syn/command.js";
import { userActionCommand } from "./user-action/command.js";
import { validate, formatErrors, getSchemaTypes } from "@statuz/sdk-ts";
import type { SchemaType } from "@statuz/sdk-ts";

const program = new Command();

function loadYaml(path: string): unknown {
  try {
    const raw = readFileSync(path, "utf8");
    return YAML.parse(raw);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as any).code === "ENOENT") {
      console.error(`Error: File not found: ${path}`);
    } else if (err instanceof YAML.YAMLError) {
      console.error(`Error: Invalid YAML in file: ${path}`);
      console.error(`  ${err.message}`);
    } else {
      console.error(`Error: Could not read file: ${path}`);
    }
    process.exit(1);
  }
}

function loadStatuzSchema(): Record<string, unknown> {
  const candidates = [
    resolve(process.cwd(), "spec/statuz.schema.json"),
    resolve(dirname(import.meta.dirname), "../../spec/statuz.schema.json"),
    resolve(dirname(import.meta.dirname), "../../../spec/statuz.schema.json"),
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
  throw new Error("Could not find statuz.schema.json. Try running from the project root or ensure spec/statuz.schema.json exists.");
}

function createInitialStatus(agent: string, project: string): StatuzDocument {
  return {
    statuz_version: "0.1",
    updated_at: new Date().toISOString(),
    identity: {
      agent_name: agent,
      project_name: project,
      environment: "local-dev"
    },
    role: {
      name: "assistant-agent",
      responsibilities: ["help the user make progress"],
      boundaries: ["do not store secrets in Statuz"]
    },
    current_state: {
      stage: "initialization",
      task: "initialize Statuz",
      status: "idle",
      last_checkpoint: "Statuz file created",
      next_action: "define the agent's current goal"
    },
    progress: {
      completed: ["created initial Statuz file"],
      blocked_by: [],
      open_questions: []
    },
    relations: {
      related_agents: [],
      related_projects: [],
      related_files: [],
      related_tools: []
    },
    rules: {
      should: ["read Statuz at session start", "write checkpoint after meaningful progress"],
      should_not: ["store API keys, tokens, passwords, or secrets"]
    },
    checkpoints: [
      {
        id: "cp-001",
        at: new Date().toISOString(),
        summary: "Initialized Statuz.",
        next_action: "Define current task and next action."
      }
    ]
  };
}

program
  .name("statuz")
  .description("CLI for the Statuz AI Agent Runtime Status Protocol")
  .version("0.2.0");

program
  .command("init")
  .description("Create a Statuz YAML file")
  .option("--agent <name>", "agent name", "dev-agent")
  .option("--project <name>", "project name", "example-project")
  .option("--out <path>", "output path", ".statuz/statuz.yaml")
  .option("--gitignore", "generate a .gitignore file for .statuz directory", false)
  .action((options) => {
    const out = resolve(process.cwd(), options.out);
    const outDir = dirname(out);
    if (existsSync(out)) {
      console.error(`Error: File already exists: ${out}`);
      process.exit(1);
    }
    try {
      mkdirSync(outDir, { recursive: true });
    } catch {
      console.error(`Error: Could not create directory: ${outDir}`);
      process.exit(1);
    }
    const doc = createInitialStatus(options.agent, options.project);
    try {
      writeFileSync(out, YAML.stringify(doc), "utf8");
    } catch {
      console.error(`Error: Could not write file: ${out}`);
      process.exit(1);
    }
    console.log(`Created ${out}`);

    if (options.gitignore) {
      const gitignorePath = resolve(outDir, ".gitignore");
      if (!existsSync(gitignorePath)) {
        try {
          writeFileSync(gitignorePath, "# Statuz\n# Uncomment to ignore local status files\n# *.local.yaml\n", "utf8");
          console.log(`Created ${gitignorePath}`);
        } catch {
          console.error(`Warning: Could not create .gitignore file: ${gitignorePath}`);
        }
      }
    }
  });

function detectSchemaType(filePath: string): SchemaType | null {
  const fileName = filePath.toLowerCase();
  const doc = loadYaml(filePath);
  
  if (doc && typeof doc === "object") {
    if ("statuz_version" in doc) return "statuz";
    if ("cluster_version" in doc) return "cluster";
    if ("arrow_map_version" in doc) return "arrow-map";
    if ("proposal_version" in doc) return "syn-proposal";
    if ("niche_version" in doc) return "niche";
  }
  
  if (fileName.includes("statuz")) return "statuz";
  if (fileName.includes("cluster")) return "cluster";
  if (fileName.includes("arrow-map") || fileName.includes("arrow_map")) return "arrow-map";
  if (fileName.includes("proposal")) return "syn-proposal";
  if (fileName.includes("niche")) return "niche";
  
  return null;
}

program
  .command("validate")
  .description("Validate a Statuz-related YAML file against its schema")
  .argument("<file>", "path to YAML file")
  .option("-t, --type <type>", `schema type: ${getSchemaTypes().join(", ")}`, "")
  .action((file, options) => {
    const filePath = resolve(process.cwd(), file);
    const doc = loadYaml(filePath);
    
    let schemaType: SchemaType;
    if (options.type) {
      if (getSchemaTypes().includes(options.type as SchemaType)) {
        schemaType = options.type as SchemaType;
      } else {
        console.error(`Error: Unknown schema type: ${options.type}. Valid types: ${getSchemaTypes().join(", ")}`);
        process.exit(1);
      }
    } else {
      const detected = detectSchemaType(filePath);
      if (!detected) {
        console.error(`Error: Could not detect schema type. Use --type to specify. Valid types: ${getSchemaTypes().join(", ")}`);
        process.exit(1);
      }
      schemaType = detected;
    }
    
    const result = validate(schemaType, doc);
    
    if (!result.valid) {
      console.error(`Error: Invalid ${schemaType} file: ${filePath}`);
      if (result.errors) {
        console.error(formatErrors(result.errors));
      }
      process.exit(1);
    }
    
    console.log(`Valid ${schemaType} file: ${filePath}`);
  });

program
  .command("resume")
  .description("Print a human-readable resume brief from a Statuz file")
  .argument("<file>", "path to statuz YAML file")
  .action((file) => {
    const filePath = resolve(process.cwd(), file);
    const doc = loadYaml(filePath) as StatuzDocument;
    const state = doc.current_state;
    const identity = doc.identity;
    
    console.log("=== Statuz Resume ===");
    console.log(`Agent:    ${identity.agent_name}`);
    console.log(`Project:  ${identity.project_name}`);
    if (identity.organization) console.log(`Org:      ${identity.organization}`);
    if (identity.environment) console.log(`Env:      ${identity.environment}`);
    console.log("");
    console.log(`Status:   ${state.status}`);
    if (state.stage) console.log(`Stage:    ${state.stage}`);
    if (state.task) console.log(`Task:     ${state.task}`);
    if (state.last_checkpoint) console.log(`Last CP:  ${state.last_checkpoint}`);
    if (state.next_action) console.log(`Next:     ${state.next_action}`);
  });

program
  .command("checkpoint")
  .description("Add a checkpoint to a Statuz file")
  .argument("<file>", "path to statuz YAML file")
  .requiredOption("--summary <text>", "Brief summary of progress")
  .option("--next <action>", "Next action to take")
  .option("--decision <text>", "Key decision made at this checkpoint")
  .option("--evidence <items...>", "Evidence items supporting this checkpoint")
  .action((file, options) => {
    const filePath = resolve(process.cwd(), file);
    const doc = loadYaml(filePath) as StatuzDocument;
    
    const checkpoints = doc.checkpoints || [];
    const nextId = `cp-${String(checkpoints.length + 1).padStart(3, "0")}`;
    const now = new Date().toISOString();
    
    const checkpoint = {
      id: nextId,
      at: now,
      summary: options.summary,
      decision: options.decision,
      evidence: options.evidence,
      next_action: options.next,
    };
    
    if (!doc.checkpoints) {
      doc.checkpoints = [];
    }
    doc.checkpoints.push(checkpoint);
    
    doc.updated_at = now;
    
    if (options.next) {
      if (!doc.current_state) {
        doc.current_state = { status: "in_progress" };
      }
      doc.current_state.next_action = options.next;
    }
    
    doc.current_state.last_checkpoint = options.summary;
    
    try {
      writeFileSync(filePath, YAML.stringify(doc), "utf8");
    } catch {
      console.error(`Error: Could not write file: ${filePath}`);
      process.exit(1);
    }
    
    console.log(`=== Checkpoint Created ===`);
    console.log(`ID:      ${nextId}`);
    console.log(`At:      ${now}`);
    console.log(`Summary: ${options.summary}`);
    if (options.next) console.log(`Next:    ${options.next}`);
    if (options.decision) console.log(`Decision: ${options.decision}`);
  });

program.addCommand(arrowMapCommand);
program.addCommand(clusterCommand);
program.addCommand(dashboardCommand);
program.addCommand(agentCommand);
program.addCommand(busCommand());
program.addCommand(calibrationCommand());
program.addCommand(leaseCommand());
program.addCommand(nicheCommand());
program.addCommand(arrowProposalCommand());
program.addCommand(pendingActionsCommand);
program.addCommand(statusKeeperCommand());
program.addCommand(userActionCommand());
program.addCommand(synCommand());

program.parse(process.argv);
