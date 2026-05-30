import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface StatuzData {
	statuz_version?: string;
	updated_at?: string;
	identity?: {
		agent_name?: string;
		project_name?: string;
		organization?: string;
		environment?: string;
	};
	current_state?: {
		stage?: string;
		task?: string;
		status?: string;
		last_checkpoint?: string;
		next_action?: string;
	};
	progress?: {
		completed?: string[];
		blocked_by?: string[];
		open_questions?: string[];
	};
	relations?: {
		related_agents?: string[];
		related_files?: string[];
		related_tools?: string[];
	};
	rules?: {
		should?: string[];
		should_not?: string[];
	};
	checkpoints?: Array<{
		id?: string;
		at?: string;
		summary?: string;
		next_action?: string;
	}>;
}

export async function resumeFromStatuz(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder found. Please open a folder first.');
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const statuzFile = path.join(workspaceRoot, '.statuz', 'statuz.yaml');

	try {
		if (!fs.existsSync(statuzFile)) {
			const answer = await vscode.window.showWarningMessage(
				'statuz.yaml not found. Would you like to initialize it?',
				'Initialize',
				'Cancel'
			);

			if (answer === 'Initialize') {
				const { initStatuz } = await import('./init');
				await initStatuz();
			}
			return;
		}

		const content = fs.readFileSync(statuzFile, 'utf-8');
		const data: StatuzData = yaml.parse(content);

		if (!data) {
			vscode.window.showErrorMessage('Failed to parse statuz.yaml. Please check the file format.');
			return;
		}

		const agentName = data.identity?.agent_name || 'Unknown Agent';
		const projectName = data.identity?.project_name || 'Unknown Project';
		const status = data.current_state?.status || 'unknown';
		const nextAction = data.current_state?.next_action || 'No next action defined';
		const task = data.current_state?.task || 'No task defined';
		const stage = data.current_state?.stage || 'unknown';
		const lastCheckpoint = data.current_state?.last_checkpoint || 'None';
		
		const completedItems = data.progress?.completed || [];
		const blockedBy = data.progress?.blocked_by || [];
		const openQuestions = data.progress?.open_questions || [];

		const statusEmoji = status === 'in_progress' ? '🔄' : 
			status === 'completed' ? '✅' : 
			status === 'blocked' ? '⛔' : '📋';

		const message = `${statusEmoji} Agent: ${agentName} (${projectName})

📍 Current Status: ${status.toUpperCase()}
📋 Task: ${task}
🎯 Stage: ${stage}
📝 Last Checkpoint: ${lastCheckpoint}

🔜 Next Action: ${nextAction}`;

		const details: string[] = [];

		if (completedItems.length > 0) {
			details.push(`\n✅ Completed (${completedItems.length}):`);
			completedItems.slice(0, 3).forEach(item => {
				details.push(`  - ${item}`);
			});
			if (completedItems.length > 3) {
				details.push(`  ... and ${completedItems.length - 3} more`);
			}
		}

		if (blockedBy.length > 0) {
			details.push(`\n⛔ Blocked By (${blockedBy.length}):`);
			blockedBy.forEach(item => {
				details.push(`  - ${item}`);
			});
		}

		if (openQuestions.length > 0) {
			details.push(`\n❓ Open Questions (${openQuestions.length}):`);
			openQuestions.forEach(item => {
				details.push(`  - ${item}`);
			});
		}

		const fullMessage = message + details.join('');

		vscode.window.showInformationMessage(fullMessage);

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to resume from Statuz: ${errorMessage}`);
		console.error('Statuz resume error:', error);
	}
}
