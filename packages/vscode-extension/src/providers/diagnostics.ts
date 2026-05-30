import * as vscode from 'vscode';
import { SchemaLoader } from '../utils/schemaLoader';
import YAML from 'yaml';

export class StatuzDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private schemaLoader: SchemaLoader;

    constructor(schemaLoader: SchemaLoader) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('statuz');
        this.schemaLoader = schemaLoader;
    }

    public activate(subscriptions: vscode.Disposable[]): void {
        subscriptions.push(this.diagnosticCollection);

        vscode.workspace.onDidOpenTextDocument(
            doc => this.validateDocument(doc),
            null,
            subscriptions
        );
        vscode.workspace.onDidSaveTextDocument(
            doc => this.validateDocument(doc),
            null,
            subscriptions
        );
        vscode.workspace.onDidCloseTextDocument(
            doc => this.diagnosticCollection.delete(doc.uri),
            null,
            subscriptions
        );

        vscode.workspace.textDocuments.forEach(doc => this.validateDocument(doc));
    }

    private validateDocument(document: vscode.TextDocument): void {
        if (document.languageId !== 'yaml' && document.languageId !== 'yml') {
            return;
        }

        const schemaInfo = this.schemaLoader.getSchemaForFile(document.fileName);
        if (!schemaInfo) {
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        const validation = this.schemaLoader.validateYaml(document.getText(), schemaInfo);

        if (!validation.valid) {
            for (const error of validation.errors) {
                const range = this.getErrorRange(document, error);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    error.message,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'statuz';
                diagnostic.code = error.keyword;
                diagnostics.push(diagnostic);
            }
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private getErrorRange(document: vscode.TextDocument, error: any): vscode.Range {
        const text = document.getText();
        const lines = text.split('\n');

        if (error.instancePath) {
            const path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
            try {
                const yamlDoc = YAML.parseDocument(text);
                const node = yamlDoc.getIn(path.split('.'));
                
                if (node && (node as any).range) {
                    const [start, , end] = (node as any).range;
                    const startPos = document.positionAt(start);
                    const endPos = document.positionAt(end);
                    return new vscode.Range(startPos, endPos);
                }
            } catch {
                // Fall through to default range
            }
        }

        return new vscode.Range(0, 0, 0, 0);
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}