/**
 * ArrowProposalIO — Read, write, and validate Arrow Proposal YAML files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { ArrowProposal, ValidationResult } from "./proposal-types.js";
import type { ArrowMap } from "./types.js";
import { ArrowMapIO } from "./arrow-map.js";

export class ArrowProposalIO {
  static read(filePath: string): ArrowProposal {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    try {
      const raw = readFileSync(fullPath, "utf8");
      return YAML.parse(raw) as ArrowProposal;
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        throw new Error(`Invalid YAML in file: ${fullPath}\n  ${err.message}`);
      }
      throw new Error(`Could not read file: ${fullPath}`);
    }
  }

  static write(filePath: string, data: ArrowProposal): void {
    const fullPath = resolve(process.cwd(), filePath);
    const outDir = dirname(fullPath);
    try {
      mkdirSync(outDir, { recursive: true });
    } catch {
      throw new Error(`Could not create directory: ${outDir}`);
    }
    try {
      writeFileSync(fullPath, YAML.stringify(data), "utf8");
    } catch {
      throw new Error(`Could not write file: ${fullPath}`);
    }
  }

  static validate(data: unknown): ValidationResult {
    const schema = ArrowProposalIO.loadSchema();
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (validate(data)) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: (validate.errors || []).map((err: any) => ({
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
      const raw = readFileSync(fullPath, "utf8");
      return ArrowProposalIO.validate(YAML.parse(raw));
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        return {
          valid: false,
          errors: [{ path: "(root)", message: `Invalid YAML: ${err.message}` }],
        };
      }
      return {
        valid: false,
        errors: [{ path: "(root)", message: `Could not read file: ${fullPath}` }],
      };
    }
  }

  static apply(proposal: ArrowProposal, arrowMap: ArrowMap): ArrowMap {
    if (proposal.status !== "approved") {
      throw new Error("Cannot apply a proposal that is not approved");
    }

    const updatedMap = { ...arrowMap };
    updatedMap.nodes = [...(arrowMap.nodes || [])];
    updatedMap.arrows = [...(arrowMap.arrows || [])];

    for (const change of proposal.changes) {
      if (change.target === "node") {
        ArrowProposalIO.applyNodeChange(updatedMap, change);
      } else if (change.target === "arrow") {
        ArrowProposalIO.applyArrowChange(updatedMap, change);
      }
    }

    return updatedMap;
  }

  private static applyNodeChange(map: ArrowMap, change: { action: string; node?: any }): void {
    if (!change.node) return;

    const nodeId = change.node.id;

    switch (change.action) {
      case "add":
        if (!map.nodes.find(n => n.id === nodeId)) {
          map.nodes.push(change.node);
        }
        break;
      case "remove":
        map.nodes = map.nodes.filter(n => n.id !== nodeId);
        // Remove arrows connected to this node (using source/target, not from/to)
        map.arrows = map.arrows.filter(a => a.source !== nodeId && a.target !== nodeId);
        break;
      case "update":
        const existingNodeIdx = map.nodes.findIndex(n => n.id === nodeId);
        if (existingNodeIdx !== -1) {
          map.nodes[existingNodeIdx] = { ...map.nodes[existingNodeIdx], ...change.node };
        }
        break;
    }
  }

  private static applyArrowChange(map: ArrowMap, change: { action: string; arrow?: any }): void {
    if (!change.arrow) return;

    const arrowId = change.arrow.id;

    switch (change.action) {
      case "add":
        if (!map.arrows.find(a => a.id === arrowId)) {
          map.arrows.push(change.arrow);
        }
        break;
      case "remove":
        map.arrows = map.arrows.filter(a => a.id !== arrowId);
        break;
      case "update":
        const existingArrowIdx = map.arrows.findIndex(a => a.id === arrowId);
        if (existingArrowIdx !== -1) {
          map.arrows[existingArrowIdx] = { ...map.arrows[existingArrowIdx], ...change.arrow };
        }
        break;
    }
  }

  private static loadSchema(): Record<string, unknown> {
    const candidates = [
      resolve(process.cwd(), "66-implementation/spec/arrow-proposal.schema.json"),
      resolve(dirname(import.meta.dirname), "../../66-implementation/spec/arrow-proposal.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../66-implementation/spec/arrow-proposal.schema.json"),
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
    throw new Error("Could not find arrow-proposal.schema.json.");
  }
}