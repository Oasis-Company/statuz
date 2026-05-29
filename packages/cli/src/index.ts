#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import YAML from "yaml";
const Ajv = require("ajv").default;
const addFormats = require("ajv-formats");
import type { StatuzDocument } from "./types.js";

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

function loadSchema(): Record<string, unknown> {
  const candidates = [
    resolve(process.cwd(), "spec/statuz.schema.json"),
    resolve(dirname(process.argv[1]), "../../spec/statuz.schema.json"),
    resolve(dirname(process.argv[1]), "../../../spec/statuz.schema.json")
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
  console.error("Error: Could not find statuz.schema.json. Try running from the project root.");
  process.exit(1);
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

program
  .command("validate")
  .description("Validate a Statuz YAML file against the schema")
  .argument("<file>", "path to statuz YAML file")
  .action((file) => {
    const filePath = resolve(process.cwd(), file);
    const doc = loadYaml(filePath);
    const schema = loadSchema();
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(doc);
    if (!ok) {
      console.error(`Error: Invalid Statuz file: ${filePath}`);
      if (validate.errors) {
        for (const err of validate.errors) {
          const path = err.instancePath || "(root)";
          console.error(`  ${path}: ${err.message}`);
        }
      }
      process.exit(1);
    }
    console.log(`Valid Statuz file: ${filePath}`);
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

program.parse(process.argv);
