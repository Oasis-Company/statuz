#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import Ajv from "ajv";
import type { StatuzDocument } from "./types.js";

const program = new Command();

function loadYaml(path: string): unknown {
  const raw = readFileSync(path, "utf8");
  return YAML.parse(raw);
}

function loadSchema(): unknown {
  const candidates = [
    resolve(process.cwd(), "spec/statuz.schema.json"),
    resolve(process.cwd(), "../../spec/statuz.schema.json"),
    resolve(process.cwd(), "../../../spec/statuz.schema.json")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, "utf8"));
  }
  throw new Error("Could not find spec/statuz.schema.json from current working directory.");
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
  .description("CLI scaffold for the Statuz AI Agent Runtime Status Protocol")
  .version("0.1.0-draft");

program
  .command("init")
  .description("Create a .statuz/statuz.yaml file")
  .option("--agent <name>", "agent name", "dev-agent")
  .option("--project <name>", "project name", "example-project")
  .option("--out <path>", "output path", ".statuz/statuz.yaml")
  .action((options) => {
    const out = resolve(process.cwd(), options.out);
    if (existsSync(out)) {
      console.error(`Refusing to overwrite existing file: ${out}`);
      process.exit(1);
    }
    mkdirSync(dirname(out), { recursive: true });
    const doc = createInitialStatus(options.agent, options.project);
    writeFileSync(out, YAML.stringify(doc), "utf8");
    console.log(`Created ${out}`);
  });

program
  .command("validate")
  .description("Validate a Statuz YAML file against the 0.1 schema")
  .argument("<file>", "path to statuz YAML file")
  .action((file) => {
    const doc = loadYaml(resolve(process.cwd(), file));
    const schema = loadSchema();
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const ok = validate(doc);
    if (!ok) {
      console.error("Invalid Statuz file:");
      console.error(validate.errors);
      process.exit(1);
    }
    console.log("Valid Statuz file.");
  });

program
  .command("resume")
  .description("Print a human-readable resume brief from a Statuz file")
  .argument("<file>", "path to statuz YAML file")
  .action((file) => {
    const doc = loadYaml(resolve(process.cwd(), file)) as StatuzDocument;
    const state = doc.current_state;
    const identity = doc.identity;
    console.log(`Agent: ${identity.agent_name}`);
    console.log(`Project: ${identity.project_name}`);
    console.log(`Status: ${state.status}`);
    if (state.stage) console.log(`Stage: ${state.stage}`);
    if (state.task) console.log(`Task: ${state.task}`);
    if (state.last_checkpoint) console.log(`Last checkpoint: ${state.last_checkpoint}`);
    if (state.next_action) console.log(`Next action: ${state.next_action}`);
  });

program.parse(process.argv);
