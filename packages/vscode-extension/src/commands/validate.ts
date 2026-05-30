import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface ValidationResult {
	file: string;
	valid: boolean;
	errors: string[];
}

export async function validateAllFiles(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('No workspace folder found. Please open a folder first.');
		return;
	}

	const workspaceRoot = workspaceFolders[0].uri.fsPath;
	const statuzDir = path.join(workspaceRoot, '.statuz');

	try {
		if (!fs.existsSync(statuzDir)) {
			vscode.window.showInformationMessage('No .statuz directory found. Run "Statuz: Initialize Statuz" first.');
			return;
		}

		const results: ValidationResult[] = [];
		await validateDirectory(statuzDir, results);

		const validFiles = results.filter(r => r.valid);
		const invalidFiles = results.filter(r => !r.valid);

		if (results.length === 0) {
			vscode.window.showInformationMessage('No Statuz files found to validate.');
			return;
		}

		if (invalidFiles.length === 0) {
			vscode.window.showInformationMessage(`All ${validFiles.length} Statuz file(s) are valid!`);
		} else {
			const errorMessages = invalidFiles.map(f => 
				`${path.relative(workspaceRoot, f.file)}: ${f.errors.join('; ')}`
			).join('\n');

			const fullMessage = `Validation Summary:\n` +
				`✓ Valid: ${validFiles.length}\n` +
				`✗ Invalid: ${invalidFiles.length}\n\n` +
				`Errors:\n${errorMessages}`;

			vscode.window.showWarningMessage(`Found ${invalidFiles.length} invalid file(s). Check output for details.`);
			
			console.log('=== Statuz Validation Results ===');
			console.log(fullMessage);
		}

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
		console.error('Statuz validation error:', error);
	}
}

async function validateDirectory(dir: string, results: ValidationResult[]): Promise<void> {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			await validateDirectory(fullPath, results);
		} else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
			const result = await validateFile(fullPath);
			results.push(result);
		}
	}
}

async function validateFile(filePath: string): Promise<ValidationResult> {
	const result: ValidationResult = {
		file: filePath,
		valid: true,
		errors: []
	};

	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const parsed = yaml.parse(content);

		if (!parsed) {
			result.valid = false;
			result.errors.push('File is empty or invalid YAML');
			return result;
		}

		const fileName = path.basename(filePath);
		
		if (fileName === 'statuz.yaml') {
			validateStatuzFile(parsed, result);
		} else if (fileName === 'manifest.yaml') {
			validateManifestFile(parsed, result);
		} else {
			result.valid = true;
		}

	} catch (error) {
		result.valid = false;
		const errorMessage = error instanceof Error ? error.message : String(error);
		result.errors.push(`Parse error: ${errorMessage}`);
	}

	return result;
}

function validateStatuzFile(data: any, result: ValidationResult): void {
	if (!data.statuz_version) {
		result.valid = false;
		result.errors.push('Missing required field: statuz_version');
	}

	if (!data.identity) {
		result.valid = false;
		result.errors.push('Missing required field: identity');
	} else {
		if (!data.identity.agent_name) {
			result.valid = false;
			result.errors.push('Missing required field: identity.agent_name');
		}
		if (!data.identity.project_name) {
			result.valid = false;
			result.errors.push('Missing required field: identity.project_name');
		}
	}

	if (!data.current_state) {
		result.valid = false;
		result.errors.push('Missing required field: current_state');
	} else {
		if (!data.current_state.status) {
			result.valid = false;
			result.errors.push('Missing required field: current_state.status');
		}
	}
}

function validateManifestFile(data: any, result: ValidationResult): void {
	if (!data.niche_version) {
		result.valid = false;
		result.errors.push('Missing required field: niche_version');
	}

	if (!data.declared_position) {
		result.valid = false;
		result.errors.push('Missing required field: declared_position');
	} else {
		if (!data.declared_position.project_name) {
			result.valid = false;
			result.errors.push('Missing required field: declared_position.project_name');
		}
		if (!data.declared_position.purpose) {
			result.valid = false;
			result.errors.push('Missing required field: declared_position.purpose');
		}
		if (!Array.isArray(data.declared_position.does) || data.declared_position.does.length === 0) {
			result.valid = false;
			result.errors.push('Missing required field: declared_position.does');
		}
		if (!Array.isArray(data.declared_position.does_not) || data.declared_position.does_not.length === 0) {
			result.valid = false;
			result.errors.push('Missing required field: declared_position.does_not');
		}
	}
}
