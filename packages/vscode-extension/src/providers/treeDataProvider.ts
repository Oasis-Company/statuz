import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

interface TreeNode {
	label: string;
	type: 'root' | 'core' | 'niche' | 'folder' | 'file';
	filePath?: string;
	children?: TreeNode[];
	isSynRequest?: boolean;
}

export class NicheTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
	private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private workspaceRoot: string | undefined;
	private static synViewProvider: { openSynRequest: (path: string) => void } | undefined;

	constructor() {
		this.workspaceRoot = this.getWorkspaceRoot();
	}

	static setSynDecisionViewProvider(provider: { openSynRequest: (path: string) => void }): void {
		NicheTreeDataProvider.synViewProvider = provider;
	}

	private getWorkspaceRoot(): string | undefined {
		const folders = vscode.workspace.workspaceFolders;
		return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
	}

	refresh(): void {
		this.workspaceRoot = this.getWorkspaceRoot();
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TreeNode): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(
			element.label,
			element.type === 'folder' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
		);

		if (element.type === 'file' && element.filePath) {
			treeItem.resourceUri = vscode.Uri.file(element.filePath);

			if (element.isSynRequest) {
				treeItem.command = {
					command: 'statuz.openSynDecision',
					title: 'Open SYN Decision',
					arguments: [element.filePath]
				};
				treeItem.iconPath = new vscode.ThemeIcon('request-changes');
				treeItem.contextValue = 'synRequest';
			} else {
				treeItem.command = {
					command: 'statuz.openFile',
					title: 'Open File',
					arguments: [element.filePath]
				};
				treeItem.iconPath = vscode.ThemeIcon.File;
				treeItem.contextValue = 'file';
			}
		} else if (element.type === 'folder') {
			treeItem.iconPath = vscode.ThemeIcon.Folder;
			treeItem.contextValue = 'folder';
		} else if (element.type === 'root') {
			treeItem.iconPath = new vscode.ThemeIcon('symbol-property');
			treeItem.contextValue = 'root';
		} else if (element.type === 'core') {
			treeItem.iconPath = new vscode.ThemeIcon('gear');
			treeItem.contextValue = 'core';
		} else if (element.type === 'niche') {
			treeItem.iconPath = new vscode.ThemeIcon('target');
			treeItem.contextValue = 'niche';
		}

		return treeItem;
	}

	getChildren(element?: TreeNode): TreeNode[] {
		if (!this.workspaceRoot) {
			return [];
		}

		if (!element) {
			return this.getRootNodes();
		}

		return element.children || [];
	}

	private getRootNodes(): TreeNode[] {
		if (!this.workspaceRoot) {
			return [];
		}

		const nodes: TreeNode[] = [];

		const statuzFile = path.join(this.workspaceRoot, '.statuz', 'statuz.yaml');
		const coreNode: TreeNode = {
			label: 'Core',
			type: 'core',
			children: []
		};

		if (fs.existsSync(statuzFile)) {
			coreNode.children = [
				{
					label: 'statuz.yaml',
					type: 'file',
					filePath: statuzFile
				}
			];
		}

		nodes.push(coreNode);

		const nicheDir = path.join(this.workspaceRoot, '.statuz', 'niche');
		if (fs.existsSync(nicheDir)) {
			const nicheNode = this.buildNicheTree(nicheDir);
			if (nicheNode.children && nicheNode.children.length > 0) {
				nodes.push(nicheNode);
			}
		}

		return nodes;
	}

	private buildNicheTree(nicheDir: string): TreeNode {
		const nicheNode: TreeNode = {
			label: 'Niche',
			type: 'niche',
			children: []
		};

		const manifestFile = path.join(nicheDir, 'manifest.yaml');
		if (fs.existsSync(manifestFile)) {
			nicheNode.children!.push({
				label: 'Manifest',
				type: 'file',
				filePath: manifestFile
			});
		}

		nicheNode.children!.push(
			this.buildFolderNode('Signals', path.join(nicheDir, 'signals')),
			this.buildFolderNode('Assessments', path.join(nicheDir, 'assessments')),
			this.buildFolderNode('Contexts', path.join(nicheDir, 'contexts')),
			this.buildFolderNode('Outcomes', path.join(nicheDir, 'outcomes')),
			this.buildFolderNode('Calibrations', path.join(nicheDir, 'calibrations')),
			this.buildSynNode(path.join(nicheDir, 'syn'))
		);

		return nicheNode;
	}

	private buildFolderNode(name: string, folderPath: string): TreeNode {
		const folderNode: TreeNode = {
			label: name,
			type: 'folder',
			children: []
		};

		if (fs.existsSync(folderPath)) {
			const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
			const count = files.length;
			folderNode.label = `${name} (${count})`;

			folderNode.children = files.map(file => ({
				label: file,
				type: 'file' as const,
				filePath: path.join(folderPath, file)
			}));
		}

		return folderNode;
	}

	private buildSynNode(synPath: string): TreeNode {
		const synNode: TreeNode = {
			label: 'SYN',
			type: 'folder',
			children: []
		};

		if (fs.existsSync(synPath)) {
			const requestsPath = path.join(synPath, 'requests');
			const resolutionsPath = path.join(synPath, 'resolutions');

			const requestsNode = this.buildSynRequestsNode(requestsPath);
			const resolutionsNode = this.buildFolderNode('Resolutions', resolutionsPath);

			synNode.children = [requestsNode, resolutionsNode].filter(node => {
				return node.children && node.children.length > 0;
			});

			const totalCount = synNode.children.reduce((sum, child) => {
				if (child.children) {
					const match = child.label!.match(/\((\d+)\)/);
					return sum + (match ? parseInt(match[1]) : 0);
				}
				return sum;
			}, 0);
			synNode.label = `SYN (${totalCount})`;
		}

		return synNode;
	}

	private buildSynRequestsNode(requestsPath: string): TreeNode {
		const node: TreeNode = {
			label: 'Requests',
			type: 'folder',
			children: []
		};

		if (fs.existsSync(requestsPath)) {
			const files = fs.readdirSync(requestsPath).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
			const count = files.length;
			node.label = `Requests (${count})`;

			node.children = files.map(file => {
				const filePath = path.join(requestsPath, file);
				const isSynRequest = this.isSynRequestFile(filePath);
				return {
					label: file,
					type: 'file' as const,
					filePath,
					isSynRequest
				};
			});
		}

		return node;
	}

	private isSynRequestFile(filePath: string): boolean {
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			const parsed = yaml.parse(content);
			return parsed?.syn_version === '1.0' && parsed?.type === 'human_decision_required';
		} catch {
			return false;
		}
	}
}

export async function openFile(filePath: string): Promise<void> {
	await vscode.window.showTextDocument(vscode.Uri.file(filePath));
}
