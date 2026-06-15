import { readFileSync } from "fs";
import { join } from "path";

export type SchemaType = "statuz" | "cluster" | "arrow-map" | "syn-proposal" | "niche";

export interface SchemaInfo {
  type: SchemaType;
  name: string;
  schema: Record<string, unknown>;
  version: string;
}

const SCHEMA_PATHS: Record<SchemaType, string> = {
  statuz: join(__dirname, "../../../../spec/statuz.schema.json"),
  cluster: join(__dirname, "../../../../spec/cluster.schema.json"),
  "arrow-map": join(__dirname, "../../../../spec/arrow-map.schema.json"),
  "syn-proposal": join(__dirname, "../../../../spec/syn-proposal.schema.json"),
  niche: join(__dirname, "../../../../spec/niche/niche-manifest.schema.json"),
};

const cachedSchemas = new Map<SchemaType, SchemaInfo>();

export function loadSchema(type: SchemaType): SchemaInfo {
  if (cachedSchemas.has(type)) {
    return cachedSchemas.get(type)!;
  }

  const path = SCHEMA_PATHS[type];
  if (!path) {
    throw new Error(`Unknown schema type: ${type}`);
  }

  try {
    const content = readFileSync(path, "utf-8");
    const schema = JSON.parse(content);
    const version = schema["version"] || schema["statuz_version"] || schema["cluster_version"] || "1.0";
    
    const info: SchemaInfo = {
      type,
      name: schema.title || type,
      schema,
      version,
    };

    cachedSchemas.set(type, info);
    return info;
  } catch (err) {
    throw new Error(`Failed to load schema ${type}: ${(err as Error).message}`);
  }
}

export function loadAllSchemas(): SchemaInfo[] {
  return Object.keys(SCHEMA_PATHS).map((key) => loadSchema(key as SchemaType));
}

export function getSchemaVersion(type: SchemaType): string {
  return loadSchema(type).version;
}

export function getSchemaTypes(): SchemaType[] {
  return Object.keys(SCHEMA_PATHS) as SchemaType[];
}