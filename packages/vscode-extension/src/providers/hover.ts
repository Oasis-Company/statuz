import * as vscode from 'vscode';
import { SchemaLoader } from '../utils/schemaLoader';
import YAML from 'yaml';

export class StatuzHoverProvider implements vscode.HoverProvider {
    private schemaLoader: SchemaLoader;

    constructor(schemaLoader: SchemaLoader) {
        this.schemaLoader = schemaLoader;
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        if (document.languageId !== 'yaml' && document.languageId !== 'yml') {
            return null;
        }

        const schemaInfo = this.schemaLoader.getSchemaForFile(document.fileName);
        if (!schemaInfo) {
            return null;
        }

        const yamlPath = this.getYamlPathAtPosition(document, position);
        if (!yamlPath) {
            return null;
        }

        const description = this.schemaLoader.getDescriptionForPath(schemaInfo, yamlPath);
        if (!description) {
            return null;
        }

        const markdownString = new vscode.MarkdownString();
        markdownString.appendMarkdown(`**${schemaInfo.name}**`);
        markdownString.appendMarkdown('\n\n');
        markdownString.appendMarkdown(description);

        const hoverRange = this.getHoverRange(document, position);
        return new vscode.Hover(markdownString, hoverRange);
    }

    private getYamlPathAtPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
        try {
            const text = document.getText();
            const yamlDoc = YAML.parseDocument(text) as any;
            const offset = document.offsetAt(position);
            
            if (typeof yamlDoc.getNodeAt === 'function') {
                const node = yamlDoc.getNodeAt(offset);

                if (!node) {
                    return null;
                }

                if (typeof yamlDoc.getPathTo === 'function') {
                    const path = yamlDoc.getPathTo(node);
                    if (!path) {
                        return null;
                    }

                    return path.join('/');
                }
            }
        } catch (error) {
            // Fall through to null
        }
        return null;
    }

    private getHoverRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
        const line = document.lineAt(position);
        const text = line.text;
        const keyMatch = text.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);

        if (keyMatch) {
            const keyStart = line.range.start.translate(0, keyMatch[1].length);
            const keyEnd = keyStart.translate(0, keyMatch[2].length);
            return new vscode.Range(keyStart, keyEnd);
        }

        return new vscode.Range(position, position.translate(0, 1));
    }
}