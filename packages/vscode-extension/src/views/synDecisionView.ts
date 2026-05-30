import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

interface SynRequest {
	syn_version: string;
	id: string;
	type: string;
	source: string;
	calibration_id?: string;
	timestamp: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	summary: string;
	context: {
		evidence_summary?: string;
		evidence_window?: string;
		[key: string]: unknown;
	};
	options: Array<{
		id: string;
		title: string;
		description: string;
		pros?: string[];
		cons?: string[];
	}>;
	recommendation?: string;
	requested_decision_by?: string;
}

interface SynResolution {
	syn_resolution_version: string;
	id: string;
	syn_request_id: string;
	principal: string;
	timestamp: string;
	decision: string;
	decision_summary: string;
	rationale: string;
	effective_date?: string;
	next_steps?: string[];
	audit_trail?: string[];
}

export class SynDecisionViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'statuz.synDecisionView';
	private webviewView: vscode.WebviewView | undefined;
	private currentRequest: SynRequest | undefined;
	private currentFilePath: string | undefined;

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void | Thenable<void> {
		this.webviewView = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri]
		};

		webviewView.webview.html = this.getHtmlForWebview();

		webviewView.webview.onDidReceiveMessage(async (message) => {
			await this.handleMessage(message);
		});
	}

	public openSynRequest(filePath: string): void {
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			const parsed = yaml.parse(content) as SynRequest;

			if (parsed.syn_version && parsed.type === 'human_decision_required') {
				this.currentRequest = parsed;
				this.currentFilePath = filePath;

				if (this.webviewView) {
					this.webviewView.show(true);
					this.webviewView.webview.postMessage({
						type: 'loadRequest',
						data: parsed
					});
				}
			} else {
				vscode.window.showErrorMessage('Invalid SYN request file');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load SYN request: ${error}`);
		}
	}

	private async handleMessage(message: { type: string; data?: unknown }): Promise<void> {
		switch (message.type) {
			case 'submitDecision':
				await this.submitDecision(message.data as {
					decision: string;
					rationale: string;
				});
				break;
			case 'cancel':
				if (this.webviewView) {
					this.webviewView.webview.html = this.getEmptyHtml();
				}
				break;
		}
	}

	private async submitDecision(data: {
		decision: string;
		rationale: string;
	}): Promise<void> {
		if (!this.currentRequest || !this.currentFilePath) {
			vscode.window.showErrorMessage('No SYN request loaded');
			return;
		}

		const principal = await this.getUserName();
		const selectedOption = this.currentRequest.options.find(
			(opt) => opt.id === data.decision
		);

		const resolutionId = `${this.currentRequest.id}-resolution`;
		const now = new Date().toISOString();

		const resolution: SynResolution = {
			syn_resolution_version: '1.0',
			id: resolutionId,
			syn_request_id: this.currentRequest.id,
			principal,
			timestamp: now,
			decision: data.decision,
			decision_summary: selectedOption?.title || data.decision,
			rationale: data.rationale,
			effective_date: now,
			audit_trail: [path.basename(this.currentFilePath)]
		};

		const resolutionsDir = path.dirname(this.currentFilePath).replace('requests', 'resolutions');
		if (!fs.existsSync(resolutionsDir)) {
			fs.mkdirSync(resolutionsDir, { recursive: true });
		}

		const resolutionPath = path.join(resolutionsDir, `${resolutionId}.yaml`);
		const resolutionYaml = yaml.stringify(resolution, { indent: 2 });

		fs.writeFileSync(resolutionPath, resolutionYaml, 'utf-8');

		vscode.window.showInformationMessage(
			`SYN Resolution saved: ${resolutionId}`,
			'Open File'
		).then((selection) => {
			if (selection === 'Open File') {
				vscode.window.showTextDocument(vscode.Uri.file(resolutionPath));
			}
		});

		if (this.webviewView) {
			this.webviewView.webview.postMessage({
				type: 'decisionSubmitted',
				data: { success: true, resolutionId }
			});
		}
	}

	private async getUserName(): Promise<string> {
		const gitConfigPath = path.join(
			process.env.USERPROFILE || '',
			'.gitconfig'
		);

		if (fs.existsSync(gitConfigPath)) {
			const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
			const nameMatch = gitConfig.match(/name\s*=\s*(.+)/i);
			if (nameMatch && nameMatch[1]) {
				return nameMatch[1].trim();
			}
		}

		return process.env.USERNAME || process.env.USER || 'anonymous';
	}

	private getEmptyHtml(): string {
		return `<!DOCTYPE html>
<html>
<head>
	<style>
		body {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100vh;
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			color: #888;
		}
		.empty-state {
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="empty-state">
		<p>Select a SYN request to view</p>
	</div>
</body>
</html>`;
	}

	private getHtmlForWebview(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			font-size: 14px;
			line-height: 1.5;
			color: #333;
			padding: 16px;
			background: #f5f5f5;
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		.header {
			background: white;
			border-radius: 8px;
			padding: 16px;
			margin-bottom: 16px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		.header h1 {
			font-size: 18px;
			margin-bottom: 8px;
			color: #1a1a1a;
		}
		.header .meta {
			display: flex;
			gap: 16px;
			font-size: 12px;
			color: #666;
		}
		.priority-badge {
			padding: 2px 8px;
			border-radius: 4px;
			font-weight: 500;
		}
		.priority-high, .priority-critical { background: #fee2e2; color: #dc2626; }
		.priority-medium { background: #fef3c7; color: #d97706; }
		.priority-low { background: #dcfce7; color: #16a34a; }
		.section {
			background: white;
			border-radius: 8px;
			padding: 16px;
			margin-bottom: 16px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		}
		.section h2 {
			font-size: 14px;
			font-weight: 600;
			margin-bottom: 12px;
			color: #1a1a1a;
		}
		.summary {
			font-size: 15px;
			color: #444;
		}
		.evidence {
			background: #f9fafb;
			border-radius: 6px;
			padding: 12px;
			font-size: 13px;
			color: #555;
		}
		.options-list {
			list-style: none;
		}
		.option-item {
			border: 2px solid #e5e7eb;
			border-radius: 8px;
			padding: 12px;
			margin-bottom: 12px;
			cursor: pointer;
			transition: all 0.2s;
		}
		.option-item:hover {
			border-color: #3b82f6;
			background: #f8fafc;
		}
		.option-item.selected {
			border-color: #3b82f6;
			background: #eff6ff;
		}
		.option-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 8px;
		}
		.option-radio {
			width: 18px;
			height: 18px;
			accent-color: #3b82f6;
		}
		.option-title {
			font-weight: 600;
			color: #1a1a1a;
		}
		.option-description {
			font-size: 13px;
			color: #555;
			margin-left: 26px;
			margin-bottom: 8px;
		}
		.pros-cons {
			margin-left: 26px;
			font-size: 12px;
		}
		.pros { color: #16a34a; }
		.cons { color: #dc2626; }
		.rationale-section {
			margin-top: 16px;
		}
		.rationale-section label {
			display: block;
			font-weight: 600;
			margin-bottom: 8px;
		}
		.rationale-section textarea {
			width: 100%;
			min-height: 100px;
			padding: 12px;
			border: 1px solid #d1d5db;
			border-radius: 6px;
			font-family: inherit;
			font-size: 13px;
			resize: vertical;
		}
		.rationale-section textarea:focus {
			outline: none;
			border-color: #3b82f6;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}
		.actions {
			display: flex;
			gap: 12px;
			margin-top: 16px;
		}
		.btn {
			padding: 10px 20px;
			border-radius: 6px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			border: none;
			transition: all 0.2s;
		}
		.btn-primary {
			background: #3b82f6;
			color: white;
		}
		.btn-primary:hover {
			background: #2563eb;
		}
		.btn-primary:disabled {
			background: #93c5fd;
			cursor: not-allowed;
		}
		.btn-secondary {
			background: #e5e7eb;
			color: #374151;
		}
		.btn-secondary:hover {
			background: #d1d5db;
		}
		.success-message {
			text-align: center;
			padding: 40px;
			color: #16a34a;
		}
		.success-message h2 {
			font-size: 18px;
			margin-bottom: 8px;
		}
	</style>
</head>
<body>
	<div class="container" id="mainContainer">
		<div class="header">
			<h1 id="requestTitle">SYN Request</h1>
			<div class="meta">
				<span id="requestId"></span>
				<span id="requestPriority"></span>
				<span id="requestTimestamp"></span>
			</div>
		</div>

		<div class="section">
			<h2>Summary</h2>
			<p class="summary" id="requestSummary"></p>
		</div>

		<div class="section">
			<h2>Evidence</h2>
			<div class="evidence" id="requestEvidence"></div>
		</div>

		<div class="section">
			<h2>Decision Options</h2>
			<ul class="options-list" id="optionsList"></ul>
		</div>

		<div class="section rationale-section">
			<label for="rationale">Rationale (required)</label>
			<textarea id="rationale" placeholder="Explain your decision..."></textarea>
		</div>

		<div class="actions">
			<button class="btn btn-primary" id="submitBtn" disabled>Submit Decision</button>
			<button class="btn btn-secondary" id="cancelBtn">Cancel</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		let selectedDecision = null;

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'loadRequest') {
				loadRequest(message.data);
			} else if (message.type === 'decisionSubmitted') {
				showSuccess(message.data.resolutionId);
			}
		});

		function loadRequest(data) {
			document.getElementById('requestId').textContent = data.id;
			document.getElementById('requestTitle').textContent = 'SYN Request: ' + data.summary;
			document.getElementById('requestSummary').textContent = data.summary;
			document.getElementById('requestTimestamp').textContent = new Date(data.timestamp).toLocaleString();

			const priorityEl = document.getElementById('requestPriority');
			priorityEl.textContent = data.priority.toUpperCase();
			priorityEl.className = 'priority-badge priority-' + data.priority;

			const evidence = data.context?.evidence_summary || 'No evidence provided';
			document.getElementById('requestEvidence').textContent = evidence;

			const optionsList = document.getElementById('optionsList');
			optionsList.innerHTML = '';
			data.options.forEach((option, index) => {
				const li = document.createElement('li');
				li.className = 'option-item';
				li.innerHTML = \`
					<div class="option-header">
						<input type="radio" class="option-radio" name="decision" value="\${option.id}" id="opt\${index}">
						<label class="option-title" for="opt\${index}">\${option.title}</label>
					</div>
					<div class="option-description">\${option.description}</div>
					\${option.pros && option.pros.length ? '<div class="pros-cons pros"><strong>Pros:</strong> ' + option.pros.join(', ') + '</div>' : ''}
					\${option.cons && option.cons.length ? '<div class="pros-cons cons"><strong>Cons:</strong> ' + option.cons.join(', ') + '</div>' : ''}
				\`;
				li.addEventListener('click', () => selectOption(option.id, li));
				optionsList.appendChild(li);
			});

			if (data.recommendation) {
				const recEl = document.querySelector(\`input[value="\${data.recommendation}"]\`);
				if (recEl) {
					selectOption(data.recommendation, recEl.closest('.option-item'));
				}
			}
		}

		function selectOption(optionId, element) {
			document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
			element.classList.add('selected');
			document.querySelector(\`input[value="\${optionId}"]\`).checked = true;
			selectedDecision = optionId;
			updateSubmitButton();
		}

		function updateSubmitButton() {
			const rationale = document.getElementById('rationale').value.trim();
			document.getElementById('submitBtn').disabled = !selectedDecision || !rationale;
		}

		document.getElementById('rationale').addEventListener('input', updateSubmitButton);

		document.getElementById('submitBtn').addEventListener('click', () => {
			if (selectedDecision) {
				vscode.postMessage({
					type: 'submitDecision',
					data: {
						decision: selectedDecision,
						rationale: document.getElementById('rationale').value.trim()
					}
				});
			}
		});

		document.getElementById('cancelBtn').addEventListener('click', () => {
			vscode.postMessage({ type: 'cancel' });
		});

		function showSuccess(resolutionId) {
			document.getElementById('mainContainer').innerHTML = \`
				<div class="success-message">
					<h2>✓ Decision Submitted</h2>
					<p>Resolution saved: \${resolutionId}</p>
				</div>
			\`;
		}
	</script>
</body>
</html>`;
	}
}
