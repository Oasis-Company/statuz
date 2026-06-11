/**
 * SynResolutionIO — Read, write, and validate SYN resolution YAML files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { SynResolution, ValidationResult } from "./types.js";

export class SynResolutionIO {
  static read(filePath: string): SynResolution {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    try {
      const raw = readFileSync(fullPath, "utf8");
      return YAML.parse(raw) as SynResolution;
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        throw new Error(`Invalid YAML in file: ${fullPath}\n  ${err.message}`);
      }
      throw new Error(`Could not read file: ${fullPath}`);
    }
  }

  static write(filePath: string, data: SynResolution): void {
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
    const schema = SynResolutionIO.loadSchema();
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
      return SynResolutionIO.validate(YAML.parse(raw));
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

  private static loadSchema(): Record<string, unknown> {
    const candidates = [
      resolve(process.cwd(), "spec/niche/niche-syn.schema.json"),
      resolve(dirname(import.meta.dirname), "../../spec/niche/niche-syn.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../spec/niche/niche-syn.schema.json"),
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
    throw new Error("Could not find niche-syn.schema.json.");
  }
}
