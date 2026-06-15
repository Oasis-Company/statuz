/**
 * Dashboard server for Statuz — local web UI for viewing agent status.
 */

import { Command } from "commander";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as yaml from "yaml";
import { PendingActionsIO, Statuz, ArrowMapIO } from "@statuz/sdk-ts";

export const dashboardCommand = new Command("dashboard")
  .description("Start a local web dashboard for viewing Statuz status")
  .option("--port <number>", "Port to listen on", "3333")
  .option("--host <host>", "Host to bind to", "localhost")
  .option("--statuz-path <path>", "Path to statuz.yaml", ".statuz/statuz.yaml")
  .option("--pending-actions-path <path>", "Path to pending-actions.yaml", ".statuz/pending-actions.yaml")
  .option("--arrow-map-path <path>", "Path to arrow-map.yaml", ".statuz/arrow-map.yaml")
  .action((options: any) => {
    const port = parseInt(options.port, 10);
    const host = options.host;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || "/";

      if (url === "/" || url === "/index.html") {
        const html = generateDashboard(
          resolve(process.cwd(), options.statuzPath),
          resolve(process.cwd(), options.pendingActionsPath),
          resolve(process.cwd(), options.arrowMapPath)
        );
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      } else if (url === "/style.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(cssStyles);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
    });

    server.listen(port, host, () => {
      console.log(`✅ Statuz Dashboard running at http://${host}:${port}`);
      console.log(`   Press Ctrl+C to stop`);
    });

    process.on("SIGINT", () => {
      server.close(() => {
        console.log("\n👋 Dashboard stopped");
        process.exit(0);
      });
    });
  });

function generateDashboard(statuzPath: string, pendingActionsPath: string, arrowMapPath: string): string {
  const statuzData = loadStatuz(statuzPath);
  const pendingActionsData = loadPendingActions(pendingActionsPath);
  const arrowMapData = loadArrowMap(arrowMapPath);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statuz Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${cssStyles}</style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">⚡</span>
          <span class="logo-text">Statuz</span>
        </div>
        <span class="header-subtitle">Agent Runtime Status Dashboard</span>
      </div>
      <div class="header-right">
        <span class="status-badge ${statuzData.available ? "online" : "offline"}">
          ${statuzData.available ? "✓ Online" : "✗ No Status File"}
        </span>
      </div>
    </header>

    <div class="main-grid">
      ${statuzSection(statuzData)}
      ${pendingActionsSection(pendingActionsData)}
      ${arrowMapSection(arrowMapData)}
    </div>

    <footer class="footer">
      <span>Statuz Protocol v0.5.1</span>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

function loadStatuz(path: string): {
  available: boolean;
  identity?: { agentName: string; projectName: string; org?: string; env?: string };
  currentState?: { stage?: string; task?: string; status?: string; nextAction?: string };
  progress?: { checkpoints: number; completedSteps: number };
  updatedAt?: string;
} {
  if (!existsSync(path)) {
    return { available: false };
  }
  try {
    const content = readFileSync(path, "utf8");
    const doc = yaml.parse(content);
    return {
      available: true,
      identity: {
        agentName: doc.identity?.agent_name || "Unknown",
        projectName: doc.identity?.project_name || "Unknown",
        org: doc.identity?.organization,
        env: doc.identity?.environment,
      },
      currentState: {
        stage: doc.current_state?.stage,
        task: doc.current_state?.task,
        status: doc.current_state?.status,
        nextAction: doc.current_state?.next_action,
      },
      progress: {
        checkpoints: doc.checkpoints?.length || 0,
        completedSteps: doc.progress?.completed?.length || 0,
      },
      updatedAt: doc.updated_at,
    };
  } catch {
    return { available: false };
  }
}

function loadPendingActions(path: string): {
  available: boolean;
  actions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedTo: string;
    agentBlockedOn: number;
  }>;
  counts: { total: number; pending: number; inProgress: number; done: number; blocked: number; cancelled: number };
} {
  if (!existsSync(path)) {
    return { available: false, actions: [], counts: { total: 0, pending: 0, inProgress: 0, done: 0, blocked: 0, cancelled: 0 } };
  }
  try {
    const doc = PendingActionsIO.read(path);
    const actions = doc.pending_actions.map((a: any) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      priority: a.priority || "medium",
      assignedTo: a.assigned_to,
      agentBlockedOn: (a.agent_blocked_on?.length || 0),
    }));
    const summary = PendingActionsIO.getSummary(doc);
    return {
      available: true,
      actions,
      counts: {
        total: summary.total,
        pending: summary.pending,
        inProgress: summary.in_progress,
        done: summary.done,
        blocked: summary.blocked,
        cancelled: summary.cancelled,
      },
    };
  } catch {
    return { available: false, actions: [], counts: { total: 0, pending: 0, inProgress: 0, done: 0, blocked: 0, cancelled: 0 } };
  }
}

function loadArrowMap(path: string): {
  available: boolean;
  name?: string;
  nodes: number;
  arrows: number;
  description?: string;
} {
  if (!existsSync(path)) {
    return { available: false, nodes: 0, arrows: 0 };
  }
  try {
    const map = ArrowMapIO.read(path);
    return {
      available: true,
      name: map.name,
      nodes: map.nodes?.length || 0,
      arrows: map.arrows?.length || 0,
      description: map.description,
    };
  } catch {
    return { available: false, nodes: 0, arrows: 0 };
  }
}

function statuzSection(data: ReturnType<typeof loadStatuz>): string {
  if (!data.available) {
    return `
<div class="card">
  <div class="card-header">
    <span class="card-icon">👤</span>
    <h2>Agent Identity</h2>
  </div>
  <div class="card-body empty-state">
    <p>No statuz.yaml found at the current path.</p>
    <p>Run <code>statuz init</code> to create one.</p>
  </div>
</div>
    `;
  }

  const statusColors: Record<string, string> = {
    idle: "status-idle",
    in_progress: "status-in-progress",
    completed: "status-completed",
    blocked: "status-blocked",
  };

  return `
<div class="card">
  <div class="card-header">
    <span class="card-icon">👤</span>
    <h2>Agent Identity</h2>
    ${data.updatedAt ? `<span class="card-date">Updated: ${new Date(data.updatedAt).toLocaleString()}</span>` : ""}
  </div>
  <div class="card-body">
    <div class="identity-grid">
      <div class="identity-item">
        <label>Agent</label>
        <span class="value">${data.identity?.agentName}</span>
      </div>
      <div class="identity-item">
        <label>Project</label>
        <span class="value">${data.identity?.projectName}</span>
      </div>
      ${data.identity?.org ? `<div class="identity-item"><label>Organization</label><span class="value">${data.identity.org}</span></div>` : ""}
      ${data.identity?.env ? `<div class="identity-item"><label>Environment</label><span class="value">${data.identity.env}</span></div>` : ""}
    </div>
    
    <div class="section-divider"></div>
    
    <div class="current-state">
      <label>Current State</label>
      <div class="state-row">
        ${data.currentState?.stage ? `<span class="state-tag">${data.currentState.stage}</span>` : ""}
        ${data.currentState?.status ? `<span class="state-tag ${statusColors[data.currentState.status] || ""}">${data.currentState.status}</span>` : ""}
      </div>
      ${data.currentState?.task ? `<p class="task-text">${data.currentState.task}</p>` : ""}
      ${data.currentState?.nextAction ? `<p class="next-action">Next: ${data.currentState.nextAction}</p>` : ""}
    </div>
    
    <div class="section-divider"></div>
    
    <div class="progress-stats">
      <div class="progress-item">
        <span class="progress-value">${data.progress?.checkpoints || 0}</span>
        <span class="progress-label">Checkpoints</span>
      </div>
      <div class="progress-item">
        <span class="progress-value">${data.progress?.completedSteps || 0}</span>
        <span class="progress-label">Completed</span>
      </div>
    </div>
  </div>
</div>
    `;
}

function pendingActionsSection(data: ReturnType<typeof loadPendingActions>): string {
  return `
<div class="card">
  <div class="card-header">
    <span class="card-icon">📋</span>
    <h2>Pending Actions</h2>
    <span class="card-badge">${data.counts.total} tasks</span>
  </div>
  <div class="card-body">
    ${data.counts.total > 0 ? `
    <div class="action-summary">
      <span class="summary-item ${data.counts.pending > 0 ? "highlight" : ""}">
        <span class="summary-num">${data.counts.pending}</span>
        <span class="summary-label">Pending</span>
      </span>
      <span class="summary-item">
        <span class="summary-num">${data.counts.inProgress}</span>
        <span class="summary-label">In Progress</span>
      </span>
      <span class="summary-item success">
        <span class="summary-num">${data.counts.done}</span>
        <span class="summary-label">Done</span>
      </span>
      <span class="summary-item ${data.counts.blocked > 0 ? "warning" : ""}">
        <span class="summary-num">${data.counts.blocked}</span>
        <span class="summary-label">Blocked</span>
      </span>
    </div>
    ` : ""}
    
    <div class="action-list">
      ${data.actions.slice(0, 5).map((action) => `
      <div class="action-item">
        <div class="action-header">
          <span class="action-id">${action.id}</span>
          <span class="action-status ${action.status}">${action.status.replace("_", " ")}</span>
        </div>
        <span class="action-title">${action.title}</span>
        <div class="action-meta">
          <span class="action-priority ${action.priority}">${action.priority}</span>
          <span class="action-assigned">${action.assignedTo}</span>
          ${action.agentBlockedOn > 0 ? `<span class="action-blocked">Blocked: ${action.agentBlockedOn}</span>` : ""}
        </div>
      </div>
      `).join("")}
      
      ${data.actions.length === 0 ? `
      <div class="empty-state">
        <p>No pending actions yet.</p>
        <p>Use <code>statuz pending-actions add</code> to create one.</p>
      </div>
      ` : ""}
      
      ${data.actions.length > 5 ? `<p class="more-link">And ${data.actions.length - 5} more...</p>` : ""}
    </div>
  </div>
</div>
    `;
}

function arrowMapSection(data: ReturnType<typeof loadArrowMap>): string {
  return `
<div class="card">
  <div class="card-header">
    <span class="card-icon">🔗</span>
    <h2>Arrow Map</h2>
    ${data.name ? `<span class="card-badge">${data.name}</span>` : ""}
  </div>
  <div class="card-body">
    ${data.available ? `
    <div class="map-stats">
      <div class="map-stat-item">
        <span class="map-stat-value">${data.nodes}</span>
        <span class="map-stat-label">Nodes</span>
      </div>
      <div class="map-stat-item">
        <span class="map-stat-value">${data.arrows}</span>
        <span class="map-stat-label">Arrows</span>
      </div>
    </div>
    ${data.description ? `<p class="map-description">${data.description}</p>` : ""}
    ` : `
    <div class="empty-state">
      <p>No arrow-map.yaml found.</p>
      <p>Run <code>statuz arrow-map init</code> to create one.</p>
    </div>
    `}
  </div>
</div>
    `;
}

const cssStyles = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  min-height: 100vh;
  color: #e0e0e0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #7b2fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  font-size: 14px;
  color: #888;
}

.header-right {
  display: flex;
  gap: 12px;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.online {
  background: rgba(0, 212, 255, 0.15);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
}

.status-badge.offline {
  background: rgba(255, 100, 100, 0.15);
  color: #ff6464;
  border: 1px solid rgba(255, 100, 100, 0.3);
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(0, 212, 255, 0.3);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.card-icon {
  font-size: 20px;
}

.card-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.card-date {
  margin-left: auto;
  font-size: 12px;
  color: #888;
}

.card-badge {
  margin-left: auto;
  padding: 4px 10px;
  background: rgba(123, 47, 255, 0.2);
  color: #9d4edd;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.card-body {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #888;
}

.empty-state code {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: #00d4ff;
}

.identity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.identity-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 10px;
}

.identity-item label {
  display: block;
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.identity-item .value {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 16px 0;
}

.current-state label {
  display: block;
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.state-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.state-tag {
  padding: 4px 12px;
  background: rgba(123, 47, 255, 0.2);
  color: #9d4edd;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.state-tag.status-idle {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.state-tag.status-in-progress {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.state-tag.status-completed {
  background: rgba(0, 255, 128, 0.2);
  color: #00ff80;
}

.state-tag.status-blocked {
  background: rgba(255, 100, 100, 0.2);
  color: #ff6464;
}

.task-text {
  margin-top: 10px;
  font-size: 14px;
  color: #ccc;
  line-height: 1.5;
}

.next-action {
  margin-top: 8px;
  font-size: 13px;
  color: #00d4ff;
  font-style: italic;
}

.progress-stats {
  display: flex;
  gap: 24px;
}

.progress-item {
  text-align: center;
}

.progress-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.progress-label {
  font-size: 12px;
  color: #888;
}

.action-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}

.summary-item.highlight {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.summary-item.success {
  background: rgba(0, 255, 128, 0.1);
}

.summary-item.warning {
  background: rgba(255, 100, 100, 0.1);
}

.summary-num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.summary-label {
  font-size: 11px;
  color: #888;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 14px;
  border-radius: 10px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.action-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.action-id {
  font-size: 11px;
  font-weight: 600;
  color: #888;
}

.action-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.action-status.in_progress {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.action-status.done {
  background: rgba(0, 255, 128, 0.2);
  color: #00ff80;
}

.action-status.blocked {
  background: rgba(255, 100, 100, 0.2);
  color: #ff6464;
}

.action-status.cancelled {
  background: rgba(136, 136, 136, 0.2);
  color: #888;
}

.action-title {
  display: block;
  font-size: 14px;
  color: #fff;
  margin-bottom: 8px;
}

.action-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-priority {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(123, 47, 255, 0.2);
  color: #9d4edd;
}

.action-priority.critical {
  background: rgba(255, 100, 100, 0.2);
  color: #ff6464;
}

.action-priority.high {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.action-priority.medium {
  background: rgba(123, 47, 255, 0.2);
  color: #9d4edd;
}

.action-priority.low {
  background: rgba(136, 136, 136, 0.2);
  color: #888;
}

.action-assigned {
  font-size: 11px;
  color: #888;
}

.action-blocked {
  font-size: 11px;
  color: #ff6464;
  font-weight: 500;
}

.more-link {
  text-align: center;
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

.map-stats {
  display: flex;
  gap: 24px;
}

.map-stat-item {
  flex: 1;
  text-align: center;
}

.map-stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff, #7b2fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.map-stat-label {
  font-size: 12px;
  color: #888;
}

.map-description {
  margin-top: 16px;
  font-size: 13px;
  color: #aaa;
  line-height: 1.6;
}

.footer {
  text-align: center;
  padding: 24px;
  color: #666;
  font-size: 13px;
}
`;
