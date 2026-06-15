/**
 * Proposal Engine — converts ScanResult + cluster.yaml into a
 * SYN proposal document.
 *
 * Phase 0.1 uses pattern matching only; no LLM.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename, resolve, dirname } from "path";
import * as yaml from "yaml";
import { ProjectScanner } from "@statuz/sdk-ts";
import type { ScanResult } from "@statuz/sdk-ts";
import { SynProposalIO, type SynProposal, type SynProposalCrossMapArrow, type SynProposalClusterMapAddition } from "@statuz/sdk-ts";

export interface ProposalEngineOptions {
  projectPath: string;
  clusterPath?: string;
  customArrowDescriptions?: Record<string, string>;
  idCounter?: number;
}

export interface ProposalEngineResult {
  proposal: SynProposal;
  outputPath: string;
}

/** Generate a SYN proposal from project discovery. */
export function generateProposal(options: ProposalEngineOptions): ProposalEngineResult {
  const scan = ProjectScanner.scan(options.projectPath);
  const cluster = options.clusterPath ? loadCluster(options.clusterPath) : null;
  const proposedMaps = buildProposedMaps(scan, cluster);
  const proposedArrows = buildProposedArrows(scan, cluster, options.customArrowDescriptions || {});
  const niche = buildNiche(scan);

  const proposal: SynProposal = {
    proposal_version: "1.0",
    id: `PROP-${String(options.idCounter || nextId()).padStart(3, "0")}`,
    created_at: new Date().toISOString(),
    source: "agent-discover",
    status: "pending_approval",
    project: {
      path: toProjectRelative(options.projectPath),
      name: scan.projectName,
      type: scan.projectType,
      framework: scan.frameworks,
      language: scan.language,
    },
    cluster_additions: {
      maps: proposedMaps,
      cross_map_arrows: proposedArrows,
    },
    statuz_init: {
      agent_name: `${scan.projectName}-agent`,
      project_name: scan.projectName,
      current_state: {
        stage: "initialization",
        status: "not_started",
        task: `Initialize ${scan.projectName} — a ${scan.projectType} project${scan.frameworks.length ? " using " + scan.frameworks.join(", ") : ""}`,
        next_action: determineNextAction(scan.projectType),
      },
    },
    niche,
    notes: buildNotes(scan),
  };

  const outputPath = resolve(process.cwd(), ".statuz/syn", `${proposal.id}.yaml`);
  SynProposalIO.write(outputPath, proposal);

  return { proposal, outputPath };
}

/** Apply an approved proposal: update cluster.yaml and create .statuz/ in target project. */
export function applyProposal(proposal: SynProposal, clusterPath?: string): ApplyResult {
  // 1. Update cluster.yaml
  const appliedCluster = updateCluster(proposal, clusterPath);

  // 2. Create project-level .statuz/
  const projectStatuz = createProjectStatuz(proposal);

  return {
    clusterUpdated: appliedCluster,
    clusterPath: appliedCluster?.path || null,
    projectStatuzDir: projectStatuz,
    filesCreated: [
      ...(projectStatuz?.files || []),
      ...(appliedCluster?.updated ? [clusterPath || "cluster.yaml"] : []),
    ].filter(Boolean) as string[],
  };
}

export interface ApplyResult {
  clusterUpdated: { updated: boolean; path?: string } | null;
  clusterPath: string | null;
  projectStatuzDir: { dir: string; files: string[] } | null;
  filesCreated: string[];
}

// -- internal helpers -----------------------------------------------------

let idCounterState = 0;
function nextId(): number {
  idCounterState += 1;
  return idCounterState;
}

function loadCluster(clusterPath: string): { id: string; name: string; maps: any[]; arrows: any[] } | null {
  const abs = resolve(process.cwd(), clusterPath);
  if (!existsSync(abs)) return null;
  try {
    const doc = yaml.parse(readFileSync(abs, "utf-8"));
    return {
      id: doc.id || basename(abs),
      name: doc.name || basename(abs),
      maps: doc.maps || [],
      arrows: doc.cross_map_arrows || [],
    };
  } catch {
    return null;
  }
}

function buildProposedMaps(scan: ScanResult, cluster: ReturnType<typeof loadCluster>): SynProposalClusterMapAddition[] {
  if (cluster === null) {
    // No parent cluster — propose creating a cluster with this project as the only map
    return [{ map_id: scan.projectName, version: "1.0.0", scope: "product" }];
  }
  const existingIds = new Set((cluster.maps || []).map((m: any) => m.map_id));
  if (existingIds.has(scan.projectName)) return []; // Already in cluster
  return [{ map_id: scan.projectName, version: "1.0.0", scope: inferScope(scan.projectType) }];
}

function inferScope(projectType: string): "product" | "shared" | "library" | "infrastructure" {
  switch (projectType) {
    case "frontend":
    case "backend":
    case "mobile":
      return "product";
    case "library":
      return "library";
    default:
      return "product";
  }
}

function buildProposedArrows(
  scan: ScanResult,
  cluster: ReturnType<typeof loadCluster>,
  customDescriptions: Record<string, string>
): SynProposalCrossMapArrow[] {
  if (!cluster || !cluster.maps || cluster.maps.length === 0) return [];

  const arrows: SynProposalCrossMapArrow[] = [];
  const existingArrowKeys = new Set(
    (cluster.arrows || []).map(
      (a: any) => `${a.from_map}:${a.from_node}->${a.to_map}:${a.to_node}`
    )
  );

  for (const sibling of cluster.maps as any[]) {
    if (sibling.map_id === scan.projectName) continue;

    // Heuristic 1: If this project is a frontend and sibling is a backend → frontend depends on backend
    if (scan.projectType === "frontend" && isBackendProject(sibling)) {
      const key = `${scan.projectName}:api-client->${sibling.map_id}:rest-api`;
      if (!existingArrowKeys.has(key)) {
        arrows.push({
          from_map: scan.projectName,
          from_node: "api-client",
          to_map: sibling.map_id,
          to_node: "rest-api",
          type: "dependency",
          description:
            customDescriptions[key] ||
            `${scan.projectName} → ${sibling.map_id} (auto-detected: frontend depends on backend REST API)`,
        });
      }
    }

    // Heuristic 2: If this project is a backend and sibling is a frontend → backend provides data to frontend
    if (scan.projectType === "backend" && isFrontendProject(sibling)) {
      const key = `${sibling.map_id}:api-client->${scan.projectName}:rest-api`;
      if (!existingArrowKeys.has(key)) {
        arrows.push({
          from_map: sibling.map_id,
          from_node: "api-client",
          to_map: scan.projectName,
          to_node: "rest-api",
          type: "dependency",
          description:
            customDescriptions[key] ||
            `${sibling.map_id} → ${scan.projectName} (auto-detected: frontend depends on backend REST API)`,
        });
      }
    }

    // Heuristic 3: If this project is mobile and sibling is backend → mobile depends on backend
    if (scan.projectType === "mobile" && isBackendProject(sibling)) {
      const key = `${scan.projectName}:networking->${sibling.map_id}:rest-api`;
      if (!existingArrowKeys.has(key)) {
        arrows.push({
          from_map: scan.projectName,
          from_node: "networking",
          to_map: sibling.map_id,
          to_node: "rest-api",
          type: "dependency",
          description:
            customDescriptions[key] ||
            `${scan.projectName} → ${sibling.map_id} (auto-detected: mobile app depends on backend REST API)`,
        });
      }
    }
  }

  return arrows;
}

function isBackendProject(map: any): boolean {
  const id = String(map.map_id || "").toLowerCase();
  return (
    id.includes("backend") ||
    id.includes("server") ||
    id.includes("api") ||
    map.scope === "product"
  );
}

function isFrontendProject(map: any): boolean {
  const id = String(map.map_id || "").toLowerCase();
  return id.includes("frontend") || id.includes("web") || id.includes("client");
}

function buildNiche(scan: ScanResult): { declared_position: { does: string[]; does_not: string[] } } {
  const does: string[] = [];
  const does_not: string[] = [];

  switch (scan.projectType) {
    case "frontend":
      does.push(`${scan.projectName} is a user-facing web application`);
      does.push(`Renders UI and handles user interaction`);
      does.push(`Makes API calls to backend services`);
      does_not.push(`Does not contain database or server-side business logic`);
      does_not.push(`Does not handle server-side authentication token signing`);
      break;
    case "backend":
      does.push(`${scan.projectName} provides REST/JSON APIs`);
      does.push(`Handles business logic and data persistence`);
      does_not.push(`Does not render user-facing HTML/JSX views`);
      break;
    case "mobile":
      does.push(`${scan.projectName} is a mobile application`);
      does.push(`Native UI for iOS/Android`);
      does.push(`Networking with backend APIs`);
      does_not.push(`Does not implement core business logic on device`);
      break;
    case "library":
      does.push(`${scan.projectName} is a reusable library`);
      does.push(`Provides shared utilities/classes to consumers`);
      does_not.push(`Does not run standalone`);
      break;
    default:
      does.push(`${scan.projectName} — project type undetermined by scanner`);
      does_not.push(`Human review required`);
  }

  return { declared_position: { does, does_not } };
}

function buildNotes(scan: ScanResult): string[] {
  const notes: string[] = [];
  if (scan.rawImports.length > 0) {
    notes.push(`Imports detected (from sample): ${scan.rawImports.slice(0, 3).join(", ")}`);
  }
  if (scan.projectType === "unknown") {
    notes.push(`Project type could not be determined automatically — please review.`);
  }
  if (scan.siblingProjectDirs.length > 0) {
    notes.push(`Sibling directories detected: ${scan.siblingProjectDirs.slice(0, 3).join(", ")}`);
  }
  return notes;
}

function determineNextAction(projectType: string): string {
  switch (projectType) {
    case "frontend":
      return "Scaffold component structure and API client";
    case "backend":
      return "Define routes, models, and middleware";
    case "mobile":
      return "Scaffold screens and networking layer";
    case "library":
      return "Define public API surface and export index";
    default:
      return "Clarify project purpose and choose a framework";
  }
}

function toProjectRelative(path: string): string {
  const abs = resolve(process.cwd(), path);
  // return a "./xxx" relative path
  if (abs.startsWith(process.cwd())) {
    return "." + abs.slice(process.cwd().length).replace(/\\/g, "/");
  }
  return path.replace(/\\/g, "/");
}

function updateCluster(
  proposal: SynProposal,
  clusterPath?: string
): { updated: boolean; path?: string } | null {
  const abs = clusterPath
    ? resolve(process.cwd(), clusterPath)
    : findExistingCluster();

  if (!abs) {
    // No existing cluster → create one in current dir with just this project
    const newCluster = {
      cluster_version: "1.0",
      id: `cluster-${Date.now()}`,
      name: `${proposal.project.name} ecosystem`,
      maps: proposal.cluster_additions.maps,
      cross_map_arrows: proposal.cluster_additions.cross_map_arrows || [],
    };
    const outPath = resolve(process.cwd(), "cluster.yaml");
    writeYaml(outPath, newCluster);
    return { updated: true, path: outPath };
  }

  // Update existing cluster
  let doc: any;
  try {
    doc = yaml.parse(readFileSync(abs, "utf-8"));
  } catch {
    doc = { cluster_version: "1.0", id: "cluster", name: "Ecosystem", maps: [], cross_map_arrows: [] };
  }

  doc.maps = doc.maps || [];
  const existingMapIds = new Set(doc.maps.map((m: any) => m.map_id));

  let changed = false;
  for (const m of proposal.cluster_additions.maps) {
    if (!existingMapIds.has(m.map_id)) {
      doc.maps.push(m);
      changed = true;
    }
  }

  doc.cross_map_arrows = doc.cross_map_arrows || [];
  const existingArrowKeys = new Set(
    doc.cross_map_arrows.map(
      (a: any) => `${a.from_map}:${a.from_node}->${a.to_map}:${a.to_node}`
    )
  );

  for (const arrow of proposal.cluster_additions.cross_map_arrows || []) {
    const key = `${arrow.from_map}:${arrow.from_node}->${arrow.to_map}:${arrow.to_node}`;
    if (!existingArrowKeys.has(key)) {
      doc.cross_map_arrows.push({
        id: `cma-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...arrow,
      });
      changed = true;
    }
  }

  if (changed) {
    writeYaml(abs, doc);
    return { updated: true, path: abs };
  }
  return { updated: false, path: abs };
}

function findExistingCluster(): string | null {
  const candidates = [
    resolve(process.cwd(), "cluster.yaml"),
    resolve(process.cwd(), ".statuz/cluster.yaml"),
    resolve(process.cwd(), "arrow-map-cluster.yaml"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function createProjectStatuz(proposal: SynProposal): { dir: string; files: string[] } | null {
  const projectDir = resolve(process.cwd(), proposal.project.path.replace(/^\.\//, ""));
  const statuzDir = join(projectDir, ".statuz");
  const created: string[] = [];

  try {
    // 1. statuz.yaml
    const statuz = {
      statuz_version: "0.1",
      identity: {
        agent_name: proposal.statuz_init.agent_name,
        project_name: proposal.statuz_init.project_name,
      },
      current_state: proposal.statuz_init.current_state || {
        stage: "initialization",
        status: "not_started",
      },
    };
    writeYaml(join(statuzDir, "statuz.yaml"), statuz);
    created.push(join(statuzDir, "statuz.yaml"));

    // 2. arrow-map.yaml
    const arrowMap = {
      arrow_map_version: "1.0",
      id: `${proposal.project.name}-map`,
      name: `${proposal.project.name} topology`,
      nodes: [
        {
          id: proposal.project.type === "frontend" || proposal.project.type === "mobile" ? "api-client" : "rest-api",
          name: proposal.project.type === "frontend" || proposal.project.type === "mobile" ? "API Client" : "REST API",
          type: "component",
          scope: "internal",
        },
      ],
      arrows: [],
    };
    writeYaml(join(statuzDir, "arrow-map.yaml"), arrowMap);
    created.push(join(statuzDir, "arrow-map.yaml"));

    // 3. niche.yaml
    if (proposal.niche) {
      const niche = {
        niche_version: "1.0",
        id: `${proposal.project.name}-niche`,
        name: `${proposal.project.name} ecological position`,
        declared_position: proposal.niche.declared_position,
      };
      writeYaml(join(statuzDir, "niche.yaml"), niche);
      created.push(join(statuzDir, "niche.yaml"));
    }

    return { dir: statuzDir, files: created };
  } catch (err) {
    return { dir: statuzDir, files: created };
  }
}

function writeYaml(path: string, data: any): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.stringify(data), "utf-8");
}
