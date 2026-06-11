/**
 * ArrowMapIO — Read, write, and validate Arrow Map YAML files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import YAML from "yaml";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;
import type { ArrowMap, ValidationResult } from "./types.js";

export class ArrowMapIO {
  static read(filePath: string): ArrowMap {
    const fullPath = resolve(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    try {
      const raw = readFileSync(fullPath, "utf8");
      return YAML.parse(raw) as ArrowMap;
    } catch (err) {
      if (err instanceof YAML.YAMLError) {
        throw new Error(`Invalid YAML in file: ${fullPath}\n  ${err.message}`);
      }
      throw new Error(`Could not read file: ${fullPath}`);
    }
  }

  static write(filePath: string, data: ArrowMap): void {
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
    const { schema, nodeSchema, arrowSchema } = ArrowMapIO.loadAllSchemas();
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(nodeSchema, "statu-node.schema.json");
    ajv.addSchema(arrowSchema, "arrow.schema.json");
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
      return ArrowMapIO.validate(YAML.parse(raw));
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
    return ArrowMapIO.loadAllSchemas().schema;
  }

  private static loadAllSchemas(): {
    schema: Record<string, unknown>;
    nodeSchema: Record<string, unknown>;
    arrowSchema: Record<string, unknown>;
  } {
    const candidates = [
      [
        resolve(process.cwd(), "66-implementation/spec/arrow-map.schema.json"),
        resolve(process.cwd(), "66-implementation/spec/statu-node.schema.json"),
        resolve(process.cwd(), "66-implementation/spec/arrow.schema.json"),
      ],
      [
        resolve(dirname(import.meta.dirname), "../../66-implementation/spec/arrow-map.schema.json"),
        resolve(dirname(import.meta.dirname), "../../66-implementation/spec/statu-node.schema.json"),
        resolve(dirname(import.meta.dirname), "../../66-implementation/spec/arrow.schema.json"),
      ],
      [
        resolve(dirname(import.meta.dirname), "../../../66-implementation/spec/arrow-map.schema.json"),
        resolve(dirname(import.meta.dirname), "../../../66-implementation/spec/statu-node.schema.json"),
        resolve(dirname(import.meta.dirname), "../../../66-implementation/spec/arrow.schema.json"),
      ],
    ];
    for (const [mainPath, nodePath, arrowPath] of candidates) {
      if (existsSync(mainPath) && existsSync(nodePath) && existsSync(arrowPath)) {
        try {
          return {
            schema: JSON.parse(readFileSync(mainPath, "utf8")),
            nodeSchema: JSON.parse(readFileSync(nodePath, "utf8")),
            arrowSchema: JSON.parse(readFileSync(arrowPath, "utf8")),
          };
        } catch {
          continue;
        }
      }
    }
    throw new Error("Could not find arrow-map.schema.json, statu-node.schema.json, or arrow.schema.json.");
  }
}
