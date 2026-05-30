import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function initNiche(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder found. Please open a folder first.');
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const nicheDir = path.join(workspaceRoot, '.statuz', 'niche');
	const manifestFile = path.join(nicheDir, 'manifest.yaml');

	try {
		if (!fs.existsSync(nicheDir)) {
			fs.mkdirSync(nicheDir, { recursive: true });
		}

		if (fs.existsSync(manifestFile)) {
			const answer = await vscode.window.showWarningMessage(
				'niche manifest.yaml already exists. Do you want to overwrite it?',
				'Overwrite',
				'Cancel'
			);

			if (answer !== 'Overwrite') {
				return;
			}
		}

		const defaultManifest = `niche_version: "1.0"
id: "${generateNicheId()}"

declared_position:
  project_name: ${path.basename(workspaceRoot)}
  purpose: ""
  does: []
  does_not: []

strategic_bets: []
success_signals: []
relevant_signals: []

evidence_window_days: 30

drift_thresholds:
  task_drift: 0.25
  collaboration_drift: 0.2
  boundary_drift: 0.1

syn_policy:
  auto_trigger: true
  required_approvers: []
`;

		fs.writeFileSync(manifestFile, defaultManifest, 'utf-8');

		const document = await vscode.workspace.openTextDocument(manifestFile);
		await vscode.window.showTextDocument(document);

		vscode.window.showInformationMessage('Niche initialized successfully!');

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to initialize Niche: ${errorMessage}`);
		console.error('Niche init error:', error);
	}
}

function generateNicheId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `niche-${timestamp}-${random}`;
}
