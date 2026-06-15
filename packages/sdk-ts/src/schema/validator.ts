import Ajv, { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { SchemaType, SchemaInfo } from "./registry";
import { loadSchema } from "./registry";
import type { ValidationResult } from "../types";

export interface ValidationError {
  path: string;
  message: string;
  schemaPath?: string;
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const cachedValidators = new Map<SchemaType, ValidateFunction>();

function getValidator(type: SchemaType): ValidateFunction {
  if (cachedValidators.has(type)) {
    return cachedValidators.get(type)!;
  }

  const schemaInfo = loadSchema(type);
  const validator = ajv.compile(schemaInfo.schema);
  cachedValidators.set(type, validator);
  return validator;
}

export function validate(type: SchemaType, data: unknown): ValidationResult {
  const validator = getValidator(type);
  const valid = validator(data);

  if (valid) {
    return { valid: true };
  }

  const errors: ValidationError[] = (validator.errors || []).map((err: ErrorObject) => ({
    path: err.instancePath || "(root)",
    message: err.message || "Unknown error",
    schemaPath: err.schemaPath,
  }));

  return { valid: false, errors };
}

export function validateSchema(type: SchemaType): ValidationResult {
  const schemaInfo = loadSchema(type);
  try {
    const valid = ajv.validateSchema(schemaInfo.schema);
    if (valid) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: (ajv.errors || []).map((err: ErrorObject) => ({
        path: err.schemaPath || "(root)",
        message: err.message || "Unknown schema error",
      })),
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{ path: "(root)", message: (err as Error).message }],
    };
  }
}

export function formatErrors(errors: ValidationError[]): string {
  return errors.map((err) => `  ${err.path}: ${err.message}`).join("\n");
}