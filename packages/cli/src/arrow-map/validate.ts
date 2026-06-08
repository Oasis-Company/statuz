import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type { ArrowMap } from "./types.js";

const Ajv = AjvImport as any;
const addFormats = addFormatsImport as any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const arrowSchema = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../../66-implementation/spec/arrow.schema.json"),
    "utf8"
  )
);
const statuNodeSchema = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../../66-implementation/spec/statu-node.schema.json"),
    "utf8"
  )
);
const arrowMapSchema = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../../66-implementation/spec/arrow-map.schema.json"),
    "utf8"
  )
);

ajv.addSchema(arrowSchema, "arrow.schema.json");
ajv.addSchema(statuNodeSchema, "statu-node.schema.json");

const validateArrowMap = ajv.compile(arrowMapSchema);

export function validateArrowMapYaml(yamlContent: string): { 
  valid: boolean; 
  errors?: string[]; 
  data?: ArrowMap 
} {
  try {
    const data = YAML.parse(yamlContent) as ArrowMap;
    const valid = validateArrowMap(data);

    if (!valid) {
      const errors = validateArrowMap.errors?.map((err: any) => 
        `${err.instancePath || "(root)"}: ${err.message}`
      ) || ["Unknown validation error"];
      return { valid: false, errors };
    }

    return { valid: true, data };
  } catch (err) {
    if (err instanceof YAML.YAMLError) {
      return { valid: false, errors: [`Invalid YAML: ${err.message}`] };
    }
    return { valid: false, errors: [`Could not parse YAML: ${(err as Error).message}`] };
  }
}

export function validateArrowMapFile(filePath: string): { 
  valid: boolean; 
  errors?: string[]; 
  data?: ArrowMap 
} {
  const absolutePath = resolve(process.cwd(), filePath);
  try {
    const content = readFileSync(absolutePath, "utf8");
    return validateArrowMapYaml(content);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as any).code === "ENOENT") {
      return { valid: false, errors: [`File not found: ${absolutePath}`] };
    }
    return { valid: false, errors: [`Could not read file: ${(err as Error).message}`] };
  }
}
