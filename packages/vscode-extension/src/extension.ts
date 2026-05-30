import * as vscode from 'vscode';
import { SchemaLoader } from './utils/schemaLoader';
import { StatuzDiagnosticProvider } from './providers/diagnostics';
import { StatuzHoverProvider } from './providers/hover';
import { NicheTreeDataProvider, openFile } from './providers/treeDataProvider';
import { initStatuz } from './commands/init';
import { validateAllFiles } from './commands/validate';
import { resumeFromStatuz } from './commands/resume';
import { initNiche } from './commands/initNiche';

export function activate(context: vscode.ExtensionContext) {
	console.log('Statuz extension is now active!');

	const schemaLoader = new SchemaLoader(context);

	const diagnosticProvider = new StatuzDiagnosticProvider(schemaLoader);
	diagnosticProvider.activate(context.subscriptions);

	const hoverProvider = new StatuzHoverProvider(schemaLoader);
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(['yaml', 'yml'], hoverProvider)
	);

	const nicheTreeDataProvider = new NicheTreeDataProvider();
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('nicheExplorer', nicheTreeDataProvider)
	);

	const openFileCommand = vscode.commands.registerCommand('statuz.openFile', async (filePath: string) => {
		await openFile(filePath);
	});

	const refreshTreeCommand = vscode.commands.registerCommand('statuz.refreshTree', () => {
		nicheTreeDataProvider.refresh();
	});

	const helloWorldCommand = vscode.commands.registerCommand('statuz.helloWorld', () => {
		vscode.window.showInformationMessage('Hello from Statuz!');
	});

	const initCommand = vscode.commands.registerCommand('statuz.init', async () => {
		await initStatuz();
	});

	const validateCommand = vscode.commands.registerCommand('statuz.validate', async () => {
		await validateAllFiles();
	});

	const resumeCommand = vscode.commands.registerCommand('statuz.resume', async () => {
		await resumeFromStatuz();
	});

	const initNicheCommand = vscode.commands.registerCommand('statuz.initNiche', async () => {
		await initNiche();
	});

	context.subscriptions.push(
		helloWorldCommand,
		initCommand,
		validateCommand,
		resumeCommand,
		initNicheCommand,
		openFileCommand,
		refreshTreeCommand
	);
}

export function deactivate() {
	console.log('Statuz extension is now deactivated.');
}
