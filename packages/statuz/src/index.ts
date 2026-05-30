#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import ora from "ora";
import cliSpinners from "cli-spinners";

const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;

const program = new Command();

interface StatuzDocument {
  statuz_version: string;
  updated_at: string;
  identity: {
    agent_name: string;
    project_name: string;
    environment?: string;
    organization?: string;
  };
  role: {
    name: string;
    responsibilities: string[];
    boundaries: string[];
  };
  current_state: {
    stage: string;
    task: string;
    status: string;
    last_checkpoint: string;
    next_action: string;
  };
  progress: {
    completed: string[];
    blocked_by: string[];
    open_questions: string[];
  };
  relations: {
    related_agents: string[];
    related_projects: string[];
    related_files: string[];
    related_tools: string[];
  };
  rules: {
    should: string[];
    should_not: string[];
  };
  checkpoints: Array<{
    id: string;
    at: string;
    summary: string;
    next_action: string;
  }>;
}

function showBanner() {
  const text = figlet.textSync("STATUZ", {
    font: "Big",
    horizontalLayout: "default",
    verticalLayout: "default"
  });
  console.log(gradient.pastel.multiline(text));
  console.log(chalk.dim("  AI Agent Runtime Status Protocol  \n"));
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadYaml(path: string): unknown {
  try {
    const raw = readFileSync(path, "utf8");
    return YAML.parse(raw);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as any).code === "ENOENT") {
      console.error(chalk.red(`✗ Error: File not found: ${path}`));
    } else if (err instanceof YAML.YAMLError) {
      console.error(chalk.red(`✗ Error: Invalid YAML in file: ${path}`));
      console.error(chalk.dim(`  ${err.message}`));
    } else {
      console.error(chalk.red(`✗ Error: Could not read file: ${path}`));
    }
    process.exit(1);
  }
}

function loadSchema(): Record<string, unknown> {
  const candidates = [
    resolve(process.cwd(), "spec/statuz.schema.json"),
    resolve(dirname(import.meta.dirname), "../../spec/statuz.schema.json"),
    resolve(dirname(import.meta.dirname), "../../../spec/statuz.schema.json")
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
  console.error(chalk.red("✗ Error: Could not find statuz.schema.json. Try running from the project root."));
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
  .description("AI Agent Runtime Status Protocol - Super Package")
  .version("0.5.0")
  .hook("preAction", () => {
    showBanner();
  });

program
  .command("init")
  .description("Create a Statuz YAML file")
  .option("--agent <name>", "agent name", "dev-agent")
  .option("--project <name>", "project name", "example-project")
  .option("--out <path>", "output path", ".statuz/statuz.yaml")
  .option("--gitignore", "generate a .gitignore file for .statuz directory", false)
  .action(async (options) => {
    const out = resolve(process.cwd(), options.out);
    const outDir = dirname(out);
    
    if (existsSync(out)) {
      console.error(chalk.red(`✗ Error: File already exists: ${out}`));
      process.exit(1);
    }

    const spinner = ora({
      text: chalk.blue("Creating Statuz file..."),
      spinner: cliSpinners.dots
    }).start();
    
    await sleep(800);
    
    spinner.text = chalk.blue("Generating initial configuration...");
    await sleep(600);

    try {
      mkdirSync(outDir, { recursive: true });
    } catch {
      spinner.fail(chalk.red("Could not create directory"));
      console.error(chalk.red(`✗ Error: Could not create directory: ${outDir}`));
      process.exit(1);
    }
    
    const doc = createInitialStatus(options.agent, options.project);
    
    spinner.text = chalk.blue("Writing file to disk...");
    await sleep(500);
    
    try {
      writeFileSync(out, YAML.stringify(doc), "utf8");
    } catch {
      spinner.fail(chalk.red("Could not write file"));
      console.error(chalk.red(`✗ Error: Could not write file: ${out}`));
      process.exit(1);
    }
    
    spinner.succeed(chalk.green("Statuz file created successfully!"));
    console.log("\n" + chalk.cyan(`📄 Created: ${chalk.bold(out)}`));

    if (options.gitignore) {
      const gitignoreSpinner = ora({
        text: chalk.blue("Creating .gitignore file..."),
        spinner: cliSpinners.line
      }).start();
      
      await sleep(400);
      
      const gitignorePath = resolve(outDir, ".gitignore");
      if (!existsSync(gitignorePath)) {
        try {
          writeFileSync(gitignorePath, "# Statuz\n# Uncomment to ignore local status files\n# *.local.yaml\n", "utf8");
          gitignoreSpinner.succeed(chalk.green(".gitignore created"));
          console.log(chalk.cyan(`📄 Created: ${chalk.bold(gitignorePath)}`));
        } catch {
          gitignoreSpinner.warn(chalk.yellow("Could not create .gitignore file"));
        }
      } else {
        gitignoreSpinner.info(chalk.blue(".gitignore already exists"));
      }
    }
    
    console.log("\n" + chalk.green("✨ All done!"));
  });

program
  .command("validate")
  .description("Validate a Statuz YAML file against the schema")
  .argument("<file>", "path to statuz YAML file")
  .action(async (file) => {
    const filePath = resolve(process.cwd(), file);
    
    const spinner = ora({
      text: chalk.blue("Loading Statuz file..."),
      spinner: cliSpinners.dots12
    }).start();
    
    await sleep(500);
    
    const doc = loadYaml(filePath);
    
    spinner.text = chalk.blue("Loading schema...");
    await sleep(400);
    
    const schema = loadSchema();
    
    spinner.text = chalk.blue("Validating against schema...");
    await sleep(600);
    
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(doc);
    
    if (!ok) {
      spinner.fail(chalk.red("Validation failed"));
      console.log("\n" + chalk.red(`✗ Invalid Statuz file: ${filePath}`));
      if (validate.errors) {
        for (const err of validate.errors) {
          const path = err.instancePath || "(root)";
          console.log(chalk.dim(`  ${path}: ${err.message}`));
        }
      }
      process.exit(1);
    }
    
    spinner.succeed(chalk.green("Validation passed!"));
    console.log("\n" + chalk.green(`✓ Valid Statuz file: ${chalk.bold(filePath)}`));
  });

program
  .command("resume")
  .description("Print a human-readable resume brief from a Statuz file")
  .argument("<file>", "path to statuz YAML file")
  .action(async (file) => {
    const filePath = resolve(process.cwd(), file);
    
    const spinner = ora({
      text: chalk.blue("Loading and parsing Statuz file..."),
      spinner: cliSpinners.bouncingBall
    }).start();
    
    await sleep(600);
    
    const doc = loadYaml(filePath) as StatuzDocument;
    const state = doc.current_state;
    const identity = doc.identity;
    
    spinner.succeed(chalk.green("Resume ready!"));
    
    console.log("\n" + chalk.bold("╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║") + chalk.cyan("           STATUZ RESUME               ") + chalk.bold("║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log("");
    
    console.log(chalk.yellow.bold("📋 Identity"));
    console.log(chalk.dim("  ─────────────────────────────────────"));
    console.log(chalk.white(`  Agent:    ${chalk.bold(identity.agent_name)}`));
    console.log(chalk.white(`  Project:  ${chalk.bold(identity.project_name)}`));
    if (identity.organization) console.log(chalk.white(`  Org:      ${identity.organization}`));
    if (identity.environment) console.log(chalk.white(`  Env:      ${identity.environment}`));
    
    console.log("");
    console.log(chalk.blue.bold("🔄 Current State"));
    console.log(chalk.dim("  ─────────────────────────────────────"));
    console.log(chalk.white(`  Status:   ${chalk.green(state.status)}`));
    if (state.stage) console.log(chalk.white(`  Stage:    ${state.stage}`));
    if (state.task) console.log(chalk.white(`  Task:     ${state.task}`));
    if (state.last_checkpoint) console.log(chalk.white(`  Last CP:  ${chalk.dim(state.last_checkpoint)}`));
    if (state.next_action) console.log(chalk.white(`  Next:     ${chalk.cyan(state.next_action)}`));
    
    console.log("");
    console.log(chalk.magenta.bold("✅ Progress"));
    console.log(chalk.dim("  ─────────────────────────────────────"));
    if (doc.progress.completed.length > 0) {
      doc.progress.completed.forEach(item => {
        console.log(chalk.green(`  ✓ ${item}`));
      });
    }
  });

program
  .command("info")
  .description("Show information about the Statuz super package")
  .action(async () => {
    const spinner = ora({
      text: chalk.blue("Gathering package information..."),
      spinner: cliSpinners.shark
    }).start();
    
    await sleep(800);
    
    spinner.succeed(chalk.green("Info ready!"));
    
    console.log("\n" + chalk.bold("╔════════════════════════════════════════════════════════════╗"));
    console.log(chalk.bold("║") + chalk.cyan("                  STATUZ SUPER PACKAGE                     ") + chalk.bold("║"));
    console.log(chalk.bold("╚════════════════════════════════════════════════════════════╝"));
    console.log("");
    
    console.log(chalk.yellow.bold("📦 Included Packages"));
    console.log(chalk.dim("  ───────────────────────────────────────────────────────────"));
    console.log(chalk.white(`  • ${chalk.bold("@statuz/sdk-ts")}      ${chalk.dim("v0.5.0")} - TypeScript SDK`));
    console.log(chalk.white(`  • ${chalk.bold("@statuz/cli")}         ${chalk.dim("v0.5.0")} - Command Line Interface`));
    console.log(chalk.white(`  • ${chalk.bold("@statuz/mcp-server")}  ${chalk.dim("v0.5.0")} - MCP Server`));
    console.log("");
    
    console.log(chalk.blue.bold("🎯 Available Commands"));
    console.log(chalk.dim("  ───────────────────────────────────────────────────────────"));
    console.log(chalk.white(`  ${chalk.cyan("statuz init")}     - Create a Statuz YAML file`));
    console.log(chalk.white(`  ${chalk.cyan("statuz validate")} - Validate a Statuz file`));
    console.log(chalk.white(`  ${chalk.cyan("statuz resume")}   - Show human-readable resume`));
    console.log(chalk.white(`  ${chalk.cyan("statuz info")}     - Show this information`));
    console.log("");
    
    console.log(chalk.green.bold("📚 Documentation"));
    console.log(chalk.dim("  ───────────────────────────────────────────────────────────"));
    console.log(chalk.white("  https://github.com/statuz-protocol/statuz"));
    console.log("");
  });

program.parse(process.argv);
