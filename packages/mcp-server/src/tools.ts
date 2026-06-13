import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Statuz, NicheManifestIO } from "@statuz/sdk-ts";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, relative, sep, dirname, basename } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
const Ajv = AjvImport as any;

const DEFAULT_STATUZ_PATH = ".statuz/statuz.yaml";

const SENSITIVE_PATHS = [
  ".git",
  "node_modules",
  ".statuz/private",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production"
];

let allowedRoots: string[] = [process.cwd()];

export function setAllowedRoots(roots: string[]) {
  allowedRoots = roots.map(root => resolve(root));
}

export function assertSafePath(filePath: string): string {
  const resolvedPath = resolve(filePath);

  for (const root of allowedRoots) {
    const rel = relative(root, resolvedPath);
    if (!rel.startsWith("..") && !rel.startsWith("." + sep)) {
      for (const sensitive of SENSITIVE_PATHS) {
        if (resolvedPath.includes(resolve(root, sensitive))) {
          throw new Error("Access to sensitive path is restricted");
        }
      }
      return resolvedPath;
    }
  }

  throw new Error("Path is outside allowed roots");
}

export interface ToolContext {
  statuzPath?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// --- niche schema loading infrastructure ---
const nicheSchemaCache: Record<string, object> = {};

function tryLoadNicheSchemaFromDisk(schemaName: string): object | null {
  const candidates = [
    resolve(process.cwd(), `spec/niche/niche-${schemaName}.schema.json`),
    resolve(dirname(import.meta.dirname ?? ""), "../../../spec/niche/niche-" + schemaName + ".schema.json"),
    resolve(dirname(import.meta.dirname ?? ""), "../../spec/niche/niche-" + schemaName + ".schema.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, "utf-8"));
      } catch {
        continue;
      }
    }
  }
  return null;
}

function getNicheFallbackSchema(schemaName: string): object {
  // Minimal fallback schemas — used when external schema files are unavailable
  const fallback: Record<string, object> = {
    manifest: {
      type: "object",
      required: ["niche_version", "declared_position"],
      properties: {
        niche_version: { type: "string" },
        declared_position: {
          type: "object",
          required: ["project_name", "purpose", "does", "does_not"],
          properties: {
            project_name: { type: "string" },
            purpose: { type: "string" },
            does: { type: "array" },
            does_not: { type: "array" },
          },
        },
      },
    },
    context: {
      type: "object",
      required: ["context_version", "id", "from_agent", "to_agent", "timestamp", "summary", "requested_action"],
      properties: {
        context_version: { type: "string" },
        id: { type: "string" },
        from_agent: { type: "string" },
        to_agent: { type: "string" },
        timestamp: { type: "string" },
        summary: { type: "string" },
        requested_action: { type: "string" },
      },
    },
    signal: {
      type: "object",
      required: ["signal_version", "id", "type", "source", "timestamp", "summary"],
      properties: {
        signal_version: { type: "string" },
        id: { type: "string" },
        type: { type: "string" },
        source: { type: "string" },
        timestamp: { type: "string" },
        summary: { type: "string" },
      },
    },
    "syn": {
      type: "object",
      // lenient fallback — external niche-syn.schema.json has strict oneOf rules,
      // but when the external file is missing we accept any well-formed object
      // that carries either request or resolution fields.
      properties: {
        syn_version: { type: "string" },
        syn_resolution_version: { type: "string" },
        id: { type: "string" },
        type: { type: "string" },
        source: { type: "string" },
        timestamp: { type: "string" },
        priority: { type: "string" },
        summary: { type: "string" },
        context: { type: "object" },
        options: { type: "array" },
        recommendation: { type: "string" },
        requested_decision_by: { type: "string" },
        syn_request_id: { type: "string" },
        principal: { type: "string" },
        decision: { type: "string" },
        decision_summary: { type: "string" },
        rationale: { type: "string" },
        effective_date: { type: "string" },
        next_steps: { type: "array" },
        audit_trail: { type: "array" },
      },
      additionalProperties: true,
    },
  };
  return fallback[schemaName] ?? { type: "object" };
}

function loadNicheSchema(schemaName: string): object {
  if (nicheSchemaCache[schemaName]) {
    return nicheSchemaCache[schemaName];
  }
  const diskSchema = tryLoadNicheSchemaFromDisk(schemaName);
  const schema = diskSchema ?? getNicheFallbackSchema(schemaName);
  nicheSchemaCache[schemaName] = schema;
  return schema;
}

function validateAgainstNicheSchema(data: unknown, schemaName: string): { valid: boolean; errors?: string[] } {
  try {
    const schema = loadNicheSchema(schemaName);
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    if (validate(data)) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: (validate.errors || []).map((e: any) => `${e.instancePath || "(root)"}: ${e.message || "unknown error"}`),
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema validation failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function readYamlFile(filePath: string): any {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf-8");
  try {
    return YAML.parse(raw);
  } catch (err) {
    throw new Error(`Invalid YAML in file: ${filePath}`);
  }
}

function writeYamlFile(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    // directory already exists — ok
  }
  writeFileSync(filePath, YAML.stringify(data), "utf-8");
}

let contextWriteCounter = 1;
let signalWriteCounter = 1;
let synWriteCounter = 1;

export const statuzTools: Tool[] = [
  {
    name: "statuz_validate",
    description: "Validate a Statuz YAML file against the schema",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the Statuz YAML file",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "statuz_read",
    description: "Read and parse a Statuz YAML file",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the Statuz YAML file (defaults to .statuz/statuz.yaml)",
        },
      },
    },
  },
  {
    name: "statuz_resume",
    description: "Get a human-readable summary of a Statuz file",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the Statuz YAML file",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "statuz_update",
    description: "Update a field in a Statuz file",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the Statuz YAML file",
        },
        field: {
          type: "string",
          description: "Dot-notation path to the field to update (e.g., 'current_state.status')",
        },
        value: {
          type: "string",
          description: "New value for the field",
        },
      },
      required: ["path", "field", "value"],
    },
  },
  {
    name: "statuz_checkpoint",
    description: "Add a checkpoint to a Statuz file to record progress",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the Statuz YAML file (defaults to .statuz/statuz.yaml)",
        },
        summary: {
          type: "string",
          description: "Checkpoint summary describing recent progress",
        },
        nextAction: {
          type: "string",
          description: "Next action to take after this checkpoint",
        },
      },
      required: ["summary"],
    },
  },
  {
    name: "statuz_get_resume_brief",
    description: "Get a human-readable summary of current agent status (core resume use case)",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the Statuz YAML file (defaults to .statuz/statuz.yaml)",
        },
      },
    },
  },
  {
    name: "statuz_update_status",
    description: "Update one or more fields in the current_state section",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the Statuz YAML file",
        },
        status: {
          type: "string",
          description: "New status value (e.g., idle, in_progress, blocked, waiting_for_user, completed)",
        },
        stage: {
          type: "string",
          description: "New stage value (e.g., planning, implementation, testing, review)",
        },
        task: {
          type: "string",
          description: "Current task description",
        },
        nextAction: {
          type: "string",
          description: "Next action to take",
        },
        lastCheckpoint: {
          type: "string",
          description: "Description of the last checkpoint",
        },
      },
    },
  },
  {
    name: "statuz_init",
    description: "Initialize a new Statuz file",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the new Statuz file (defaults to .statuz/statuz.yaml)",
        },
        agentName: {
          type: "string",
          description: "Name of the agent",
        },
        projectName: {
          type: "string",
          description: "Name of the project",
        },
      },
    },
  },
  // --- niche tools ---
  {
    name: "statuz_niche_manifest_read",
    description: "Read and parse a niche manifest YAML file (ecological position declaration). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche manifest YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_manifest_validate",
    description: "Validate a niche manifest YAML file against its schema. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche manifest YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_manifest_init",
    description: "Create a minimal valid niche manifest YAML file with declared position. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the new niche manifest file",
        },
        projectName: {
          type: "string",
          description: "Name of the project",
        },
        purpose: {
          type: "string",
          description: "Project purpose / ecological positioning",
        },
      },
      required: ["filePath", "projectName", "purpose"],
    },
  },
  {
    name: "statuz_niche_manifest_summary",
    description: "Produce a human-readable summary of a niche manifest: declared position, strategic bets, success signals. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche manifest YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_context_read",
    description: "Read and parse a niche context YAML file (collaboration payload between agents). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche context YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_context_write",
    description: "Write a niche context YAML file (collaboration payload between agents). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the niche context YAML file",
        },
        id: {
          type: "string",
          description: "Unique identifier for this context",
        },
        fromAgent: {
          type: "string",
          description: "Source agent name",
        },
        toAgent: {
          type: "string",
          description: "Target agent name",
        },
        summary: {
          type: "string",
          description: "Summary of the collaboration request",
        },
        requestedAction: {
          type: "string",
          description: "Action requested from the target agent",
        },
      },
      required: ["filePath", "fromAgent", "toAgent", "summary", "requestedAction"],
    },
  },
  {
    name: "statuz_niche_context_validate",
    description: "Validate a niche context YAML file against its schema. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche context YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_signal_read",
    description: "Read and parse a niche signal YAML file (ecosystem event). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche signal YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_signal_write",
    description: "Write a niche signal YAML file (ecosystem event). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the niche signal YAML file",
        },
        id: {
          type: "string",
          description: "Unique identifier for this signal",
        },
        type: {
          type: "string",
          description: "Signal type (e.g., dependency_update, api_change, new_release)",
        },
        source: {
          type: "string",
          description: "Source of the signal (e.g., npm/github/manual)",
        },
        summary: {
          type: "string",
          description: "Summary of the ecosystem event",
        },
      },
      required: ["filePath", "type", "source", "summary"],
    },
  },
  {
    name: "statuz_niche_signal_validate",
    description: "Validate a niche signal YAML file against its schema. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche signal YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_syn_request_create",
    description: "Create a niche SYN request YAML — asking a human for a decision or an external action (e.g., run SQL in a dashboard). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the niche syn-request YAML file",
        },
        summary: {
          type: "string",
          description: "Brief description of the decision/action needed",
        },
        priority: {
          type: "string",
          description: "Urgency level (low, medium, high, critical)",
        },
        source: {
          type: "string",
          description: "Who/what triggered this request",
        },
        options: {
          type: "array",
          description: "Available options for the human",
        },
        recommendation: {
          type: "string",
          description: "Recommended option id",
        },
        context: {
          type: "object",
          description: "Optional context data (sql_script, url, instructions, etc.)",
        },
      },
      required: ["filePath", "summary", "priority", "source", "options", "recommendation"],
    },
  },
  {
    name: "statuz_niche_syn_request_read",
    description: "Read and parse a niche SYN request YAML file. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche syn-request YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_syn_request_validate",
    description: "Validate a niche SYN request YAML file against its schema. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche syn-request YAML file",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "statuz_niche_syn_request_list_pending",
    description: "List all pending (unresolved) niche SYN request files in a directory, so an agent can resume from where the previous session left off.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Directory path to scan for syn-request files",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "statuz_niche_syn_resolution_create",
    description: "Create a niche SYN resolution YAML — marking a human decision/action as done (e.g., confirming SQL was executed in Supabase dashboard). Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path for the niche syn-resolution YAML file",
        },
        synRequestId: {
          type: "string",
          description: "ID of the syn-request this resolves",
        },
        decision: {
          type: "string",
          description: "Option id that was chosen",
        },
        decisionSummary: {
          type: "string",
          description: "Brief summary of the decision outcome",
        },
        rationale: {
          type: "string",
          description: "Explanation of why this decision was made",
        },
        principal: {
          type: "string",
          description: "Human who made the decision",
        },
        nextSteps: {
          type: "array",
          description: "Optional next steps after the decision",
        },
      },
      required: ["filePath", "synRequestId", "decision", "decisionSummary", "rationale", "principal"],
    },
  },
  {
    name: "statuz_niche_syn_resolution_read",
    description: "Read and parse a niche SYN resolution YAML file. Operates on niche files, independent from statuz.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the niche syn-resolution YAML file",
        },
      },
      required: ["filePath"],
    },
  },
];

export function getTools() {
  return {
    statuz_validate: async (args: { path: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.path);
        const result = Statuz.validate(safePath);
        return {
          success: result.valid,
          data: {
            valid: result.valid,
            errors: result.errors,
            path: args.path,
          },
        };
      } catch (err) {
        if (err instanceof Error) {
          return {
            success: false,
            error: `Validation failed: ${err.message}`,
          };
        }
        return {
          success: false,
          error: "Validation failed with an unknown error",
        };
      }
    },
    statuz_read: async (args: { filePath?: string }): Promise<ToolResult> => {
      const filePath = args.filePath || DEFAULT_STATUZ_PATH;
      try {
        const safePath = assertSafePath(filePath);
        const statuz = Statuz.read(safePath);
        return {
          success: true,
          data: statuz.getDocument(),
        };
      } catch (err) {
        if (err instanceof Error) {
          return {
            success: false,
            error: `Failed to read Statuz file: ${err.message}`,
          };
        }
        return {
          success: false,
          error: `Failed to read Statuz file: ${filePath}`,
        };
      }
    },
    statuz_resume: async (args: { path: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.path);
        const statuz = Statuz.read(safePath);
        const doc = statuz.getDocument();
        const state = doc.current_state;
        const identity = doc.identity;

        const lines: string[] = [
          "=== Statuz Resume ===",
          `Agent:    ${identity.agent_name}`,
          `Project:  ${identity.project_name}`,
        ];

        if (identity.organization) {
          lines.push(`Org:      ${identity.organization}`);
        }
        if (identity.environment) {
          lines.push(`Env:      ${identity.environment}`);
        }

        lines.push("");
        lines.push(`Status:   ${state.status}`);

        if (state.stage) {
          lines.push(`Stage:    ${state.stage}`);
        }
        if (state.task) {
          lines.push(`Task:     ${state.task}`);
        }
        if (state.last_checkpoint) {
          lines.push(`Last CP:  ${state.last_checkpoint}`);
        }
        if (state.next_action) {
          lines.push(`Next:     ${state.next_action}`);
        }

        return {
          success: true,
          data: {
            brief: lines.join("\n"),
            summary: {
              agentName: identity.agent_name,
              projectName: identity.project_name,
              status: state.status,
              stage: state.stage,
              task: state.task,
              lastCheckpoint: state.last_checkpoint,
              nextAction: state.next_action,
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    statuz_update: async (args: { path: string; field: string; value: unknown }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.path);
        const statuz = Statuz.read(safePath);
        const doc = statuz.getDocument();
        
        const fieldParts = args.field.split(".");
        let current: any = doc;
        
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (!(fieldParts[i] in current)) {
            current[fieldParts[i]] = {};
          }
          current = current[fieldParts[i]];
        }
        
        current[fieldParts[fieldParts.length - 1]] = args.value;
        
        statuz.write(safePath);
        
        return {
          success: true,
          data: {
            message: `Updated ${args.field} in ${args.path}`,
            field: args.field,
            value: args.value,
            newDocument: statuz.getDocument(),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    statuz_checkpoint: async (args: { filePath?: string; summary: string; nextAction?: string }): Promise<ToolResult> => {
      const filePath = args.filePath || DEFAULT_STATUZ_PATH;
      try {
        const safePath = assertSafePath(filePath);
        const statuz = Statuz.read(safePath);
        const checkpoint = statuz.appendCheckpoint(args.summary, args.nextAction);
        statuz.write(safePath);
        return {
          success: true,
          data: {
            message: `Checkpoint ${checkpoint.id} added successfully`,
            checkpoint,
          },
        };
      } catch (err) {
        if (err instanceof Error) {
          return {
            success: false,
            error: `Failed to write checkpoint: ${err.message}`,
          };
        }
        return {
          success: false,
          error: `Failed to write checkpoint to: ${filePath}`,
        };
      }
    },
    statuz_get_resume_brief: async (args: { filePath?: string }): Promise<ToolResult> => {
      try {
        const path = args.filePath || DEFAULT_STATUZ_PATH;
        const safePath = assertSafePath(path);
        const statuz = Statuz.read(safePath);
        const doc = statuz.getDocument();
        const state = doc.current_state;
        const identity = doc.identity;

        const lines: string[] = [
          "=== Statuz Resume ===",
          `Agent:    ${identity.agent_name}`,
          `Project:  ${identity.project_name}`,
        ];

        if (identity.organization) {
          lines.push(`Org:      ${identity.organization}`);
        }
        if (identity.environment) {
          lines.push(`Env:      ${identity.environment}`);
        }

        lines.push("");
        lines.push(`Status:   ${state.status}`);

        if (state.stage) {
          lines.push(`Stage:    ${state.stage}`);
        }
        if (state.task) {
          lines.push(`Task:     ${state.task}`);
        }
        if (state.last_checkpoint) {
          lines.push(`Last CP:  ${state.last_checkpoint}`);
        }
        if (state.next_action) {
          lines.push(`Next:     ${state.next_action}`);
        }

        return {
          success: true,
          data: {
            brief: lines.join("\n"),
            summary: {
              agentName: identity.agent_name,
              projectName: identity.project_name,
              status: state.status,
              stage: state.stage,
              task: state.task,
              lastCheckpoint: state.last_checkpoint,
              nextAction: state.next_action,
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    statuz_update_status: async (args: { 
      filePath?: string; 
      status?: string; 
      stage?: string; 
      task?: string; 
      nextAction?: string; 
      lastCheckpoint?: string 
    }): Promise<ToolResult> => {
      try {
        const path = args.filePath || DEFAULT_STATUZ_PATH;
        const safePath = assertSafePath(path);
        const statuz = Statuz.read(safePath);
        const currentState = statuz.currentState;

        if (args.status !== undefined) {
          currentState.status = args.status;
        }
        if (args.stage !== undefined) {
          currentState.stage = args.stage;
        }
        if (args.task !== undefined) {
          currentState.task = args.task;
        }
        if (args.nextAction !== undefined) {
          currentState.next_action = args.nextAction;
        }
        if (args.lastCheckpoint !== undefined) {
          currentState.last_checkpoint = args.lastCheckpoint;
        }

        statuz.currentState = currentState;
        statuz.write(safePath);

        return {
          success: true,
          data: {
            message: `Updated ${path}`,
            updatedFields: {
              ...(args.status !== undefined && { status: args.status }),
              ...(args.stage !== undefined && { stage: args.stage }),
              ...(args.task !== undefined && { task: args.task }),
              ...(args.nextAction !== undefined && { nextAction: args.nextAction }),
              ...(args.lastCheckpoint !== undefined && { lastCheckpoint: args.lastCheckpoint }),
            },
            newState: statuz.currentState,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    statuz_init: async (args: { filePath?: string; agentName?: string; projectName?: string }): Promise<ToolResult> => {
      try {
        const path = args.filePath || DEFAULT_STATUZ_PATH;
        const safePath = assertSafePath(path);

        if (existsSync(safePath)) {
          return {
            success: false,
            error: `File already exists: ${path}`,
          };
        }

        const agentName = args.agentName || "dev-agent";
        const projectName = args.projectName || "example-project";
        const statuz = Statuz.create(agentName, projectName);
        statuz.write(safePath);

        return {
          success: true,
          data: {
            message: `Created ${path}`,
            agentName,
            projectName,
            document: statuz.getDocument(),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    // --- niche manifest tools ---
    statuz_niche_manifest_read: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const manifest = NicheManifestIO.read(safePath);
        return {
          success: true,
          data: manifest,
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to read niche manifest: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_manifest_validate: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const result = NicheManifestIO.validateFile(safePath);
        return {
          success: result.valid,
          data: {
            valid: result.valid,
            errors: result.errors,
            path: args.filePath,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Niche manifest validation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_manifest_init: async (args: { filePath: string; projectName: string; purpose: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);

        if (existsSync(safePath)) {
          return {
            success: false,
            error: `File already exists: ${args.filePath}`,
          };
        }

        const manifest: { niche_version: "1.0"; declared_position: { project_name: string; purpose: string; does: string[]; does_not: string[] } } = {
          niche_version: "1.0" as const,
          declared_position: {
            project_name: args.projectName,
            purpose: args.purpose,
            does: [],
            does_not: [],
          },
        };

        NicheManifestIO.write(safePath, manifest);

        return {
          success: true,
          data: {
            message: `Created niche manifest at ${args.filePath}`,
            projectName: args.projectName,
            purpose: args.purpose,
            document: manifest,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    statuz_niche_manifest_summary: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const manifest = NicheManifestIO.read(safePath);
        const dp: any = manifest.declared_position || {};
        const lines: string[] = [
          "=== Niche Manifest Summary ===",
          `Project:  ${dp.project_name ?? "(not set)"}`,
          `Purpose:  ${dp.purpose ?? "(not set)"}`,
          "",
          "Does:",
          ...((dp.does as any[] || []).map((item: any) => `  - ${item}`) || ["  (none)"]),
          "",
          "Does Not:",
          ...((dp.does_not as any[] || []).map((item: any) => `  - ${item}`) || ["  (none)"]),
        ];
        if (manifest.strategic_bets && Array.isArray(manifest.strategic_bets) && manifest.strategic_bets.length > 0) {
          lines.push("", "Strategic Bets:");
          for (const bet of manifest.strategic_bets) {
            lines.push(`  - ${bet}`);
          }
        }
        if (manifest.success_signals && Array.isArray(manifest.success_signals) && manifest.success_signals.length > 0) {
          lines.push("", "Success Signals:");
          for (const sig of manifest.success_signals) {
            lines.push(`  - ${sig}`);
          }
        }
        if (manifest.drift_thresholds && typeof manifest.drift_thresholds === "object") {
          lines.push("", "Drift Thresholds:");
          const dt: any = manifest.drift_thresholds;
          if (dt.task_drift !== undefined) lines.push(`  task_drift: ${dt.task_drift}`);
          if (dt.collaboration_drift !== undefined) lines.push(`  collaboration_drift: ${dt.collaboration_drift}`);
          if (dt.boundary_drift !== undefined) lines.push(`  boundary_drift: ${dt.boundary_drift}`);
        }
        return {
          success: true,
          data: {
            brief: lines.join("\n"),
            manifest: manifest,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: message,
        };
      }
    },
    // --- niche context tools ---
    statuz_niche_context_read: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        return {
          success: true,
          data: data,
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to read niche context: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_context_write: async (args: { filePath: string; id?: string; fromAgent: string; toAgent: string; summary: string; requestedAction: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        let contextId = args.id || `ctx-${String(contextWriteCounter++).padStart(3, "0")}`;
        const context = {
          context_version: "1.0" as const,
          id: contextId,
          from_agent: args.fromAgent,
          to_agent: args.toAgent,
          timestamp: new Date().toISOString(),
          summary: args.summary,
          requested_action: args.requestedAction,
        };
        writeYamlFile(safePath, context);
        return {
          success: true,
          data: {
            message: `Wrote niche context to ${args.filePath}`,
            document: context,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to write niche context: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_context_validate: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        const result = validateAgainstNicheSchema(data, "context");
        return {
          success: result.valid,
          data: {
            valid: result.valid,
            errors: result.errors,
            path: args.filePath,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Niche context validation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    // --- niche signal tools ---
    statuz_niche_signal_read: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        return {
          success: true,
          data: data,
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to read niche signal: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_signal_write: async (args: { filePath: string; id?: string; type: string; source: string; summary: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        let signalId = args.id || `sig-${String(signalWriteCounter++).padStart(3, "0")}`;
        const signal = {
          signal_version: "1.0" as const,
          id: signalId,
          type: args.type,
          source: args.source,
          timestamp: new Date().toISOString(),
          summary: args.summary,
        };
        writeYamlFile(safePath, signal);
        return {
          success: true,
          data: {
            message: `Wrote niche signal to ${args.filePath}`,
            document: signal,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to write niche signal: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_signal_validate: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        const result = validateAgainstNicheSchema(data, "signal");
        return {
          success: result.valid,
          data: {
            valid: result.valid,
            errors: result.errors,
            path: args.filePath,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Niche signal validation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_request_create: async (args: {
      filePath: string;
      summary: string;
      priority: string;
      source: string;
      options: unknown[];
      recommendation: string;
      context?: object;
    }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const synRequest: Record<string, unknown> = {
          syn_version: "1.0",
          id: `syn-${String(synWriteCounter++).padStart(3, "0")}`,
          type: "human_decision_required",
          source: args.source,
          timestamp: new Date().toISOString(),
          priority: args.priority,
          summary: args.summary,
          context: args.context ?? {},
          options: args.options,
          recommendation: args.recommendation,
        };
        writeYamlFile(safePath, synRequest);
        return {
          success: true,
          data: {
            message: `Created niche syn-request at ${args.filePath}`,
            id: synRequest.id,
            document: synRequest,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to create niche syn-request: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_request_read: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        return {
          success: true,
          data,
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to read niche syn-request: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_request_validate: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        const result = validateAgainstNicheSchema(data, "syn");
        return {
          success: result.valid,
          data: {
            valid: result.valid,
            errors: result.errors,
            path: args.filePath,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Niche syn-request validation failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_request_list_pending: async (args: { directory: string }): Promise<ToolResult> => {
      try {
        const safeDir = assertSafePath(args.directory);
        if (!existsSync(safeDir)) {
          return {
            success: true,
            data: {
              count: 0,
              pending: [],
              message: `Directory ${args.directory} does not exist — no pending syn requests.`,
            },
          };
        }
        const entries = readdirSync(safeDir);
        // 1. Collect all syn-request files (files with "syn-" prefix or "syn" in name,
        //    excluding resolution files).
        const synRequestFiles: string[] = [];
        for (const entry of entries) {
          if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;
          if (entry.includes("resolution")) continue;
          if (entry.startsWith("syn-") || entry.includes("syn-request") || entry.includes("syn_request")) {
            synRequestFiles.push(resolve(safeDir, entry));
          }
        }
        // 2. For each request, check if there is a corresponding resolution file.
        const pending: Array<{ filePath: string; id: unknown; summary: unknown; priority: unknown; recommendation: unknown }> = [];
        for (const filePath of synRequestFiles) {
          try {
            const doc = readYamlFile(filePath) as Record<string, unknown>;
            const id = doc.id as string | undefined;
            if (!id) continue;
            // Check for matching resolution in same directory.
            const baseDir = dirname(filePath);
            const baseName = basename(filePath).replace(/\.(ya?ml)$/, "");
            const hasResolution =
              existsSync(resolve(baseDir, `${baseName}-resolution.yaml`)) ||
              existsSync(resolve(baseDir, `${id}-resolution.yaml`)) ||
              entries.some((e: string) => {
                if (!e.endsWith(".yaml") && !e.endsWith(".yml")) return false;
                try {
                  const candidatePath = resolve(baseDir, e);
                  const candidate = readYamlFile(candidatePath) as Record<string, unknown>;
                  return candidate.syn_request_id === id;
                } catch {
                  return false;
                }
              });
            if (!hasResolution) {
              pending.push({
                filePath,
                id: doc.id,
                summary: doc.summary,
                priority: doc.priority,
                recommendation: doc.recommendation,
              });
            }
          } catch {
            // skip files that can't be parsed as YAML
          }
        }
        // Sort by priority (critical > high > medium > low)
        const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        pending.sort((a, b) => {
          const ra = priorityRank[String(a.priority)] ?? 99;
          const rb = priorityRank[String(b.priority)] ?? 99;
          return ra - rb;
        });
        return {
          success: true,
          data: {
            count: pending.length,
            pending,
            message: pending.length > 0
              ? `Found ${pending.length} pending syn-request(s).`
              : `No pending syn-requests — everything is resolved.`,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to list pending syn-requests: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_resolution_create: async (args: {
      filePath: string;
      synRequestId: string;
      decision: string;
      decisionSummary: string;
      rationale: string;
      principal: string;
      nextSteps?: string[];
    }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const resolution: Record<string, unknown> = {
          syn_resolution_version: "1.0",
          id: `${args.synRequestId}-resolution`,
          syn_request_id: args.synRequestId,
          principal: args.principal,
          timestamp: new Date().toISOString(),
          decision: args.decision,
          decision_summary: args.decisionSummary,
          rationale: args.rationale,
        };
        if (args.nextSteps && args.nextSteps.length > 0) {
          resolution.next_steps = args.nextSteps;
        }
        writeYamlFile(safePath, resolution);
        return {
          success: true,
          data: {
            message: `Created niche syn-resolution at ${args.filePath}`,
            document: resolution,
          },
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to create niche syn-resolution: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    statuz_niche_syn_resolution_read: async (args: { filePath: string }): Promise<ToolResult> => {
      try {
        const safePath = assertSafePath(args.filePath);
        const data = readYamlFile(safePath);
        return {
          success: true,
          data,
        };
      } catch (err) {
        return {
          success: false,
          error: `Failed to read niche syn-resolution: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
