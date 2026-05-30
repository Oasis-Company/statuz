import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';
import * as vscode from 'vscode';

export interface SchemaInfo {
    name: string;
    schema: any;
    filePatterns: string[];
}

export class SchemaLoader {
    private ajv: Ajv;
    private schemas: Map<string, SchemaInfo> = new Map();
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.ajv = new Ajv({ allErrors: true });
        addFormats(this.ajv);
        this.loadSchemas();
    }

    private loadSchemas(): void {
        const schemasPath = path.join(this.context.extensionPath, 'schemas');
        
        this.loadSchema(
            'statuz',
            path.join(schemasPath, 'statuz.schema.json'),
            ['**/.statuz/statuz.yaml', '**/statuz.yaml']
        );

        const nichePath = path.join(schemasPath, 'niche');
        this.loadSchema(
            'niche-manifest',
            path.join(nichePath, 'niche-manifest.schema.json'),
            ['**/.statuz/niche/manifest.yaml', '**/niche-manifest.yaml']
        );
        this.loadSchema(
            'niche-signal',
            path.join(nichePath, 'niche-signal.schema.json'),
            ['**/.statuz/niche/signals/*.yaml']
        );
        this.loadSchema(
            'niche-assessment',
            path.join(nichePath, 'niche-assessment.schema.json'),
            ['**/.statuz/niche/assessments/*.yaml']
        );
        this.loadSchema(
            'niche-context',
            path.join(nichePath, 'niche-context.schema.json'),
            ['**/.statuz/niche/contexts/*.yaml']
        );
        this.loadSchema(
            'niche-outcome',
            path.join(nichePath, 'niche-outcome.schema.json'),
            ['**/.statuz/niche/outcomes/*.yaml']
        );
        this.loadSchema(
            'niche-calibration',
            path.join(nichePath, 'niche-calibration.schema.json'),
            ['**/.statuz/niche/calibrations/*.yaml']
        );
        this.loadSchema(
            'niche-syn',
            path.join(nichePath, 'niche-syn.schema.json'),
            ['**/.statuz/niche/syn/*.yaml']
        );
    }

    private loadSchema(name: string, filePath: string, filePatterns: string[]): void {
        try {
            const schemaContent = fs.readFileSync(filePath, 'utf-8');
            const schema = JSON.parse(schemaContent);
            this.ajv.addSchema(schema, schema.$id);
            this.schemas.set(name, {
                name,
                schema,
                filePatterns
            });
        } catch (error) {
            console.error(`Failed to load schema ${name}:`, error);
        }
    }

    getSchemaForFile(filePath: string): SchemaInfo | null {
        for (const [, schemaInfo] of this.schemas) {
            for (const pattern of schemaInfo.filePatterns) {
                if (filePath.includes(pattern.replace('**/', '').replace('*.yaml', ''))) {
                    return schemaInfo;
                }
            }
        }
        return null;
    }

    validateYaml(yamlContent: string, schema: SchemaInfo): { valid: boolean; errors: any[] } {
        try {
            const data = YAML.parse(yamlContent);
            const validate = this.ajv.compile(schema.schema);
            const valid = validate(data);
            return {
                valid: valid as boolean,
                errors: validate.errors || []
            };
        } catch (error) {
            return {
                valid: false,
                errors: [{ message: `YAML parse error: ${(error as Error).message}` }]
            };
        }
    }

    getDescriptionForPath(schema: SchemaInfo, path: string): string | null {
        let current: any = schema.schema;
        const parts = path.split('/').filter(p => p);
        
        for (const part of parts) {
            if (current.properties && current.properties[part]) {
                current = current.properties[part];
            } else if (current.items) {
                current = current.items;
            } else if (current.patternProperties) {
                for (const pattern in current.patternProperties) {
                    if (new RegExp(pattern).test(part)) {
                        current = current.patternProperties[pattern];
                        break;
                    }
                }
            }
        }
        
        return current.description || null;
    }

    getAllSchemas(): SchemaInfo[] {
        return Array.from(this.schemas.values());
    }
}