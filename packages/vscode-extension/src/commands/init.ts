import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function initStatuz(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder found. Please open a folder first.');
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const statuzDir = path.join(workspaceRoot, '.statuz');
	const statuzFile = path.join(statuzDir, 'statuz.yaml');

	try {
		if (!fs.existsSync(statuzDir)) {
			fs.mkdirSync(statuzDir, { recursive: true });
		}

		if (fs.existsSync(statuzFile)) {
			const answer = await vscode.window.showWarningMessage(
				'statuz.yaml already exists. Do you want to overwrite it?',
				'Overwrite',
				'Cancel'
			);

			if (answer !== 'Overwrite') {
				return;
			}
		}

		const defaultStatuz = `statuz_version: "0.1"
updated_at: "${new Date().toISOString()}"

identity:
  agent_name: ${process.env.USER || 'agent'}
  project_name: ${path.basename(workspaceRoot)}
  organization: ""
  environment: local-dev

role:
  name: ""
  responsibilities: []
  boundaries: []

current_state:
  stage: initialization
  task: ""
  status: pending
  last_checkpoint: ""
  next_action: ""

progress:
  completed: []
  blocked_by: []
  open_questions: []

relations:
  related_agents: []
  related_files: []
  related_tools: []

rules:
  should: []
  should_not: []

checkpoints: []
`;

		fs.writeFileSync(statuzFile, defaultStatuz, 'utf-8');

		const document = await vscode.workspace.openTextDocument(statuzFile);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('Statuz initialized successfully!');

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to initialize Statuz: ${errorMessage}`);
		console.error('Statuz init error:', error);
	}
}
