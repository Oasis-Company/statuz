import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import * as yaml from "yaml";
import { ArrowMapClusterIO } from "@statuz/sdk-ts";
import type { ArrowMapCluster, CrossMapArrow, MapScope } from "@statuz/sdk-ts";

const VALID_SCOPES: MapScope[] = ["internal", "product", "infrastructure", "shared", "external"];
const VALID_TYPES = ["dependency", "information_flow", "responsibility", "validation", "resource_transfer", "influence", "constraint"];
const VALID_CRITICALITIES = ["critical", "high", "medium", "low"];

export const clusterCommand = new Command("cluster")
  .description("Manage Arrow Map Clusters — organization-level ecosystem topology")
  .addCommand(
    new Command("init")
      .description("Create a new Arrow Map Cluster")
      .requiredOption("--id <id>", "Cluster ID. Recommended format: scope:name (e.g. oasis:company-atlas). Simple names also allowed.")
      .requiredOption("--name <name>", "Human-readable name for the cluster")
      .option("--description <text>", "Optional description of what this cluster represents")
      .option("--organization <name>", "Organization that owns this cluster")
      .option("--team <name>", "Team responsible for maintaining this cluster")
      .option(
        "--map <entry...>",
        "Map reference in format map_id:version:scope (repeatable). Scope must be one of: internal, product, infrastructure, shared, external",
      )
      .option("--output <path>", "Output file path", "./arrow-map-cluster.yaml")
      .action((options) => {
        const outPath = resolve(process.cwd(), options.output);
        const outDir = dirname(outPath);

        if (existsSync(outPath)) {
          console.error(`Error: File already exists: ${outPath}`);
          process.exit(1);
        }

        if (!/^[a-z0-9-]+(:[a-z0-9-]+)*$/.test(options.id)) {
          console.error(`Error: Invalid cluster ID format. Use lowercase letters, numbers, and hyphens. Recommended: scope:name (e.g. oasis:company-atlas). Got: ${options.id}`);
          process.exit(1);
        }

        const maps: Array<{ map_id: string; version: string; scope: MapScope }> = [];
        if (options.map && options.map.length > 0) {
          for (const entry of options.map) {
            const parts = entry.split(":");
            if (parts.length !== 3) {
              console.error(`Error: Invalid map reference format. Expected map_id:version:scope, got: ${entry}`);
              process.exit(1);
            }
            const [mapId, version, rawScope] = parts;
            if (!VALID_SCOPES.includes(rawScope as MapScope)) {
              console.error(`Error: Invalid scope '${rawScope}'. Must be one of: ${VALID_SCOPES.join(", ")}`);
              process.exit(1);
            }
            if (!/^\d+\.\d+\.\d+$/.test(version)) {
              console.error(`Error: Invalid version format. Expected semantic version (e.g. 1.0.0), got: ${version}`);
              process.exit(1);
            }
            maps.push({ map_id: mapId, version, scope: rawScope as MapScope });
          }
        } else {
          console.error("Error: At least one --map reference is required. Use --map map_id:version:scope");
          process.exit(1);
        }

        const cluster = ArrowMapClusterIO.create({
          id: options.id,
          name: options.name,
          description: options.description,
          maps,
          organization: options.organization,
          team: options.team,
        });

        if (outDir && outDir !== "." && !existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true });
        }

        ArrowMapClusterIO.write(outPath, cluster);
        console.log(`✅ Created cluster: ${options.name} (${options.id})`);
        console.log(`   Maps: ${maps.length}`);
        console.log(`   Output: ${outPath}`);
      }),
  )
  .addCommand(
    new Command("validate")
      .description("Validate an Arrow Map Cluster YAML file")
      .argument("<file>", "Path to Arrow Map Cluster YAML file")
      .action((file: string) => {
        const filePath = resolve(process.cwd(), file);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const result = ArrowMapClusterIO.validateFile(filePath);
        if (result.valid) {
          const cluster = ArrowMapClusterIO.read(filePath);
          console.log(`✅ Valid cluster: ${cluster.name} (${cluster.id})`);
          console.log(`   Maps: ${cluster.maps.length}`);
          console.log(`   Cross-map arrows: ${cluster.cross_map_arrows.length}`);
        } else {
          console.error(`❌ Validation failed for ${filePath}:`);
          result.errors.forEach((err) => console.error(`   - ${err}`));
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command("show")
      .description("Show a summary of an Arrow Map Cluster")
      .argument("<file>", "Path to Arrow Map Cluster YAML file")
      .action((file: string) => {
        const filePath = resolve(process.cwd(), file);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        const cluster = ArrowMapClusterIO.read(filePath);
        console.log(ArrowMapClusterIO.getSummary(cluster));
      }),
  )
  .addCommand(
    new Command("arrow-add")
      .description("Add a cross-map arrow to a cluster")
      .argument("<file>", "Path to Arrow Map Cluster YAML file")
      .requiredOption("--from-map <map>", "Source Arrow Map ID")
      .requiredOption("--from-node <node>", "Source node ID within the source map")
      .requiredOption("--to-map <map>", "Target Arrow Map ID")
      .requiredOption("--to-node <node>", "Target node ID within the target map")
      .requiredOption("--type <type>", `Arrow type. Must be one of: ${VALID_TYPES.join(", ")}`)
      .option("--criticality <level>", `Criticality level. Must be one of: ${VALID_CRITICALITIES.join(", ")}`, "medium")
      .requiredOption("--description <text>", "Human-readable explanation of what this arrow represents (min 10 characters)")
      .action((file: string, options: any) => {
        const filePath = resolve(process.cwd(), file);

        if (!existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        if (!VALID_TYPES.includes(options.type)) {
          console.error(`Error: Invalid type '${options.type}'. Must be one of: ${VALID_TYPES.join(", ")}`);
          process.exit(1);
        }

        if (options.criticality && !VALID_CRITICALITIES.includes(options.criticality)) {
          console.error(`Error: Invalid criticality '${options.criticality}'. Must be one of: ${VALID_CRITICALITIES.join(", ")}`);
          process.exit(1);
        }

        if (!options.description || options.description.length < 10) {
          console.error(`Error: description is required and must be at least 10 characters. Got: ${options.description ? `${options.description.length} chars` : "empty"}`);
          process.exit(1);
        }

        let cluster: ArrowMapCluster;
        try {
          cluster = ArrowMapClusterIO.read(filePath);
        } catch (err) {
          console.error(`Error: Failed to read cluster file: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }

        const arrowId = `cma-${options.fromMap}-${options.fromNode}-${options.toMap}-${options.toNode}`;

        const arrow: CrossMapArrow = {
          id: arrowId,
          from_map: options.fromMap,
          from_node: options.fromNode,
          to_map: options.toMap,
          to_node: options.toNode,
          type: options.type,
          description: options.description,
          criticality: options.criticality,
          metadata: {
            discovered_at: new Date().toISOString(),
          },
        };

        try {
          ArrowMapClusterIO.addCrossMapArrow(cluster, arrow);
          ArrowMapClusterIO.write(filePath, cluster);
          console.log(`✅ Added cross-map arrow: ${arrowId}`);
          console.log(`   ${options.fromMap}/${options.fromNode} → ${options.toMap}/${options.toNode} (${options.type})`);
          console.log(`   Criticality: ${options.criticality}`);
        } catch (err) {
          console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      }),
  );
