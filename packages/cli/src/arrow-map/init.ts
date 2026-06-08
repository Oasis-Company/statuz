import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import YAML from "yaml";
import type { ArrowMap, Arrow, StatuNode } from "./types.js";

interface InitOptions {
  fromNiche?: boolean;
  template?: string;
  output: string;
}

export async function initArrowMap(options: InitOptions): Promise<void> {
  let arrowMap: ArrowMap;

  if (options.fromNiche) {
    arrowMap = await initFromNiche();
  } else if (options.template) {
    arrowMap = await initFromTemplate(options.template);
  } else {
    arrowMap = createBlankMap();
  }

  const outputPath = resolve(process.cwd(), options.output);
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const yamlContent = YAML.stringify(arrowMap);
  writeFileSync(outputPath, yamlContent, "utf8");
  console.log(`✅ Arrow Map created: ${outputPath}`);
  console.log(`   ID: ${arrowMap.id}`);
  console.log(`   Nodes: ${arrowMap.nodes.length}`);
  console.log(`   Arrows: ${arrowMap.arrows.length}`);
}

function createBlankMap(): ArrowMap {
  return {
    arrow_map_version: "0.1.0",
    id: `project:${Date.now()}`,
    name: "New Arrow Map",
    description: "Created by statuz arrow-map init",
    version: "1.0.0",
    status: "draft",
    nodes: [
      {
        id: "project-root",
        type: "project",
        name: "Current Project",
        description: "Root node for this project",
      },
    ],
    arrows: [],
    storage: {
      local_cache: "./.statuz/arrow-maps/",
    },
  };
}

async function initFromNiche(): Promise<ArrowMap> {
  const nichePath = resolve(process.cwd(), ".statuz/niche/manifest.yaml");
  if (!existsSync(nichePath)) {
    throw new Error(`No niche manifest found at ${nichePath}`);
  }

  const nicheContent = readFileSync(nichePath, "utf8");
  const niche = YAML.parse(nicheContent) as any;

  const nodes: StatuNode[] = (niche.declared_position?.does || []).map(
    (task: string, i: number) => ({
      id: `task-${i}`,
      type: "component",
      name: task,
      description: `Task from niche manifest: ${task}`,
    })
  );

  const arrows: Arrow[] = (niche.relations?.agent_graph || []).map(
    (rel: any, i: number) => ({
      id: `arrow-${i}`,
      source: rel.from,
      target: rel.to,
      type: rel.type || "dependency",
      properties: {
        reason: "Imported from niche agent_graph",
      },
    })
  );

  return {
    arrow_map_version: "0.1.0",
    id: `niche:${niche.declared_position?.name || "unknown"}`,
    name: `${niche.declared_position?.name || "Project"} Topology`,
    description: "Auto-generated from niche manifest",
    version: "1.0.0",
    status: "draft",
    nodes,
    arrows,
    storage: {
      local_cache: "./.statuz/arrow-maps/",
    },
  };
}

async function initFromTemplate(templateId: string): Promise<ArrowMap> {
  const registryPath = resolve(
    process.env.HOME || process.env.USERPROFILE || "",
    `.statuz/maps/${templateId}.yaml`
  );
  if (!existsSync(registryPath)) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const templateContent = readFileSync(registryPath, "utf8");
  const template = YAML.parse(templateContent) as ArrowMap;

  return {
    ...template,
    id: `${templateId}-instance-${Date.now()}`,
    version: "1.0.0",
    status: "draft",
  };
}
