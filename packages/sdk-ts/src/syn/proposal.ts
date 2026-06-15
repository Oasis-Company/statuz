/**
 * SynProposalIO — Read, write, validate SYN proposal documents.
 *
 * A proposal is a structured YAML document describing what changes are
 * suggested: new project additions to cluster.yaml, arrows to create,
 * and .statuz/ configuration to initialize.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import * as yaml from "yaml";
import Ajv from "ajv";
import addFormatsImport from "ajv-formats";
const addFormats = addFormatsImport as any;

export interface SynProposalClusterMapAddition {
  map_id: string;
  version?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface SynProposalCrossMapArrow {
  from_map: string;
  from_node: string;
  to_map: string;
  to_node: string;
  type: string;
  description: string;
  [key: string]: unknown;
}

export interface SynProposalClusterAdditions {
  maps: SynProposalClusterMapAddition[];
  cross_map_arrows?: SynProposalCrossMapArrow[];
  [key: string]: unknown;
}

export interface SynProposalProject {
  path: string;
  name: string;
  type: string;
  framework?: string[];
  language?: string;
  [key: string]: unknown;
}

export interface SynProposalStatuzInit {
  agent_name: string;
  project_name: string;
  current_state?: {
    stage?: string;
    status?: string;
    task?: string;
    next_action?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SynProposalNiche {
  declared_position?: {
    does?: string[];
    does_not?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SynProposal {
  proposal_version: string;
  id: string;
  created_at: string;
  source: string;
  status: "pending_approval" | "approved" | "rejected";
  project: SynProposalProject;
  cluster_additions: SynProposalClusterAdditions;
  statuz_init: SynProposalStatuzInit;
  niche?: SynProposalNiche;
  notes?: string[];
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export class SynProposalIO {
  private static ajv = (() => {
    const instance = new Ajv({ allErrors: true, strict: false });
    addFormats(instance);
    return instance;
  })();
  private static schemaCache: Record<string, unknown> | null = null;

  static read(filePath: string): SynProposal {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`Proposal file not found: ${fullPath}`);
    }
    try {
      return yaml.parse(readFileSync(fullPath, "utf-8")) as SynProposal;
    } catch (err) {
      throw new Error(`Invalid YAML in proposal file: ${fullPath}`);
    }
  }

  static write(filePath: string, proposal: SynProposal): void {
    const fullPath = resolve(process.cwd(), filePath);
    const dir = dirname(fullPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      throw new Error(`Could not create directory: ${dir}`);
    }
    writeFileSync(fullPath, yaml.stringify(proposal), "utf-8");
  }

  static validate(data: unknown): ValidationResult {
    const schema = SynProposalIO.loadSchema();
    const compiled = SynProposalIO.ajv.compile(schema);
    if (compiled(data)) return { valid: true };
    return {
      valid: false,
      errors: (compiled.errors || []).map((err: any) => ({
        path: err.instancePath || "(root)",
        message: err.message || "Unknown validation error",
      })),
    };
  }

  static validateFile(filePath: string): ValidationResult {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [{ path: "(root)", message: `File not found: ${fullPath}` }],
      };
    }
    try {
      const doc = yaml.parse(readFileSync(fullPath, "utf-8"));
      return SynProposalIO.validate(doc);
    } catch (err) {
      return {
        valid: false,
        errors: [{ path: "(root)", message: `Invalid YAML: ${(err as Error).message}` }],
      };
    }
  }

  static updateStatus(filePath: string, newStatus: "approved" | "rejected"): void {
    const proposal = SynProposalIO.read(filePath);
    proposal.status = newStatus;
    SynProposalIO.write(filePath, proposal);
  }

  private static loadSchema(): Record<string, unknown> {
    if (SynProposalIO.schemaCache) return SynProposalIO.schemaCache;
    const candidates = [
      resolve(process.cwd(), "spec/syn-proposal.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../spec/syn-proposal.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../../spec/syn-proposal.schema.json"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          const schema = JSON.parse(readFileSync(candidate, "utf-8"));
          SynProposalIO.schemaCache = schema;
          return schema;
        } catch {
          continue;
        }
      }
    }
    throw new Error("Could not find syn-proposal.schema.json");
  }
}
