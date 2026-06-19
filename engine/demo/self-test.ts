/**
 * Statuz Engine Self-Test
 * 
 * The engine eats its own dogfood — models Statuz's own project structure
 * and runs the three core queries to prove the concept.
 * 
 * Run: npx ts-node engine/demo/self-test.ts
 */

import { GraphEngine } from '../src/graph';
import type { Node, Edge } from '../src/types';

function buildStatuzTopology(): GraphEngine {
  const g = new GraphEngine();

  // ─── Nodes ──────────────────────────────────────────
  
  const nodes: Node[] = [
    // Core Engine
    { id: 'engine-graph',    type: 'component', label: 'GraphEngine',    status: 'active' },
    { id: 'engine-types',    type: 'component', label: 'Type System',    status: 'active' },
    { id: 'engine-queries',  type: 'component', label: 'Query Layer',    status: 'active' },
    
    // CLIDashboard
    { id: 'dashboard-cli',   type: 'component', label: 'CLI Dashboard',  status: 'planned' },
    { id: 'dashboard-viz',   type: 'component', label: 'Graph Visualizer',status: 'planned' },
    
    // People
    { id: 'human-ceaser',    type: 'human',      label: 'Ceaserzhao',    status: 'active' },
    { id: 'human-dev',       type: 'human',      label: 'Senior Dev',    status: 'active' },
    
    // External
    { id: 'dep-typescript',  type: 'dependency',  label: 'TypeScript',   status: 'active' },
    { id: 'dep-node',        type: 'dependency',  label: 'Node.js',      status: 'active' },
    
    // Project artifacts
    { id: 'design-philosophy',type: 'doc',        label: '设计哲学论述',   status: 'active' },
    { id: 'legacy-code',     type: 'artifact',    label: 'Legacy packages',status: 'dormant' },
    { id: 'agenda-july',     type: 'goal',        label: 'July MVP',     status: 'active' },
  ];

  for (const n of nodes) g.addNode(n);

  // ─── Edges ──────────────────────────────────────────

  const edges: Edge[] = [
    // Engine internals
    { id: 'e01', source: 'engine-graph',   target: 'engine-types',   relation: 'contains',     weight: 1.0, description: 'GraphEngine imports type definitions' },
    { id: 'e02', source: 'engine-graph',   target: 'engine-queries', relation: 'contains',     weight: 1.0, description: 'Query methods are part of GraphEngine' },
    { id: 'e03', source: 'engine-queries', target: 'engine-types',   relation: 'depends_on',   weight: 0.9, description: 'Query results return typed objects' },
    
    // Dashboard depends on Engine
    { id: 'e04', source: 'dashboard-cli',  target: 'engine-graph',   relation: 'depends_on',   weight: 1.0, description: 'Dashboard reads from GraphEngine' },
    { id: 'e05', source: 'dashboard-viz',  target: 'engine-graph',   relation: 'depends_on',   weight: 1.0, description: 'Visualizer renders graph state' },
    { id: 'e06', source: 'dashboard-viz',  target: 'dashboard-cli',  relation: 'informs',      weight: 0.8, description: 'Viz feeds visual data to CLI dashboard' },
    
    // People → Work
    { id: 'e07', source: 'human-ceaser',   target: 'design-philosophy',relation: 'produces',   weight: 1.0, description: 'Ceaser wrote the design philosophy' },
    { id: 'e08', source: 'human-ceaser',   target: 'agenda-july',    relation: 'produces',    weight: 1.0, description: 'July deadline set by Ceaser' },
    { id: 'e09', source: 'human-dev',      target: 'engine-graph',   relation: 'produces',    weight: 1.0, description: 'Senior dev builds the engine' },
    { id: 'e10', source: 'human-dev',      target: 'dashboard-cli',  relation: 'produces',    weight: 0.9, description: 'Senior dev builds the dashboard' },
    
    // Goals drive work
    { id: 'e11', source: 'agenda-july',    target: 'engine-graph',   relation: 'informs',      weight: 1.0, description: 'July MVP requires engine to be done' },
    { id: 'e12', source: 'agenda-july',    target: 'dashboard-cli',  relation: 'informs',      weight: 1.0, description: 'July MVP requires dashboard' },
    
    // Design philosophy informs architecture
    { id: 'e13', source: 'design-philosophy',target: 'engine-graph', relation: 'informs',      weight: 1.0, description: 'Philosophy defines engine requirements' },
    { id: 'e14', source: 'design-philosophy',target: 'dashboard-cli',relation: 'informs',      weight: 0.9, description: 'Philosophy defines dashboard requirements' },
    
    // Dependencies
    { id: 'e15', source: 'engine-graph',   target: 'dep-typescript', relation: 'depends_on',   weight: 1.0, description: 'Engine written in TypeScript' },
    { id: 'e16', source: 'dashboard-cli',  target: 'dep-node',      relation: 'depends_on',   weight: 0.9, description: 'CLI runs on Node.js' },
    
    // Legacy relationship
    { id: 'e17', source: 'engine-graph',   target: 'legacy-code',   relation: 'informs',      weight: 0.3, description: 'New engine supersedes legacy packages' },
  ];

  for (const e of edges) g.addEdge(e);

  return g;
}

// ─── Run it ───────────────────────────────────────────

const g = buildStatuzTopology();

console.log('╔══════════════════════════════════════════════╗');
console.log('║        Statuz Graph Engine — Self Test       ║');
console.log('╚══════════════════════════════════════════════╝\n');

// Basic stats
const s = g.size;
console.log(`📊 Graph: ${s.nodes} nodes, ${s.edges} edges\n`);

// ─── Q1: traverse ─────────────────────────────────────

console.log('━━━ Q1: traverse("engine-graph") ━━━');
const t = g.traverse('engine-graph');
console.log(`  engine-graph connects to ${t.nodes.length} nodes directly:`);
for (const n of t.nodes) {
  const edge = t.edges.find(e => e.target === n.id)!;
  console.log(`    → ${n.label} [${edge.relation}] — ${edge.description}`);
}

// ─── Q2: impact ───────────────────────────────────────

console.log('\n━━━ Q2: impact("engine-graph") ━━━');
const impact = g.impact('engine-graph');
console.log(`  If engine-graph changes, ${impact.affected.length} nodes affected:`);
for (const id of impact.affected) {
  const n = g.getNode(id)!;
  console.log(`    ⚡ ${n.label} (${n.type})`);
}
console.log(`  Critical path: ${impact.critical_path ? 'YES ⚠️' : 'no'}`);

// ─── Q3: path ─────────────────────────────────────────

console.log('\n━━━ Q3: path("human-ceaser", "dashboard-cli") ━━━');
const pt = g.path('human-ceaser', 'dashboard-cli');
if (pt.exists) {
  console.log(`  Path found (${pt.length} steps):`);
  for (const e of pt.path) {
    console.log(`    ${g.getNode(e.source)!.label} → ${g.getNode(e.target)!.label} [${e.relation}]`);
  }
} else {
  console.log('  No path exists');
}

// ─── Centrality ───────────────────────────────────────

console.log('\n━━━ Centrality (Top 5) ━━━');
for (const n of g.centrality(5)) {
  const bar = '█'.repeat(Math.round(n.score));
  console.log(`  ${n.label.padEnd(22)} score: ${n.score.toFixed(0).padStart(2)} ${bar}`);
}

// ─── Health ───────────────────────────────────────────

console.log('\n━━━ Health Report ━━━');
const health = g.health();
console.log(`  Nodes: ${health.total_nodes}  Edges: ${health.total_edges}`);
console.log(`  Orphans:   [${health.orphans.map(id => g.getNode(id)!.label).join(', ') || 'none'}]`);
console.log(`  Sources:   [${health.sources.map(id => g.getNode(id)!.label).join(', ') || 'none'}]`);
console.log(`  Sinks:     [${health.sinks.map(id => g.getNode(id)!.label).join(', ') || 'none'}]`);
console.log(`  Key nodes: [${health.high_centrality.map(id => g.getNode(id)!.label).join(', ')}]`);
console.log(`  Components: ${health.disconnected_components}`);

// ─── Diff ─────────────────────────────────────────────

console.log('\n━━━ Diff Test ━━━');
const snap1 = g.snapshot();

// Simulate: remove legacy code node, add new dep
g.removeNode('legacy-code');
g.addNode({ id: 'dep-vitest', type: 'dependency', label: 'Vitest', status: 'active' });
g.addEdge({
  id: 'e-new', source: 'engine-graph', target: 'dep-vitest',
  relation: 'depends_on', weight: 0.8,
  description: 'Engine tests use Vitest',
});

const diff = g.diff(snap1);
console.log(`  Nodes added:   [${diff.nodes_added.map(id => g.getNode(id)!.label).join(', ')}]`);
console.log(`  Nodes removed: [${diff.nodes_removed.join(', ') || 'legacy-code (removed)'}]`);
console.log(`  Edges added:   ${diff.edges_added.length}`);
console.log(`  Edges removed: ${diff.edges_removed.length}`);

// ─── Next action hint ─────────────────────────────────

console.log('\n━━━ "What should I do next?" ━━━');
// Find the planned node closest to completion:
// path from current work (engine-graph) to goal (agenda-july)
const next = g.path('engine-graph', 'agenda-july');
if (next.exists) {
  const firstStep = next.path[0];
  console.log(`  Current:  ${g.getNode('engine-graph')!.label}`);
  console.log(`  Next:     ${g.getNode(firstStep.target)!.label} [${firstStep.relation}]`);
  console.log(`  Goal:     ${g.getNode('agenda-july')!.label}`);
  console.log(`  Distance: ${next.length} steps`);
}

console.log('\n✅ Self-test complete.\n');
