/**
 * Arrow Map Cluster IO
 *
 * Read, write, and validate Arrow Map Clusters - organization-level
 * ecosystem topology containing multiple Arrow Maps and cross-map arrows.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import * as yaml from "yaml";
import Ajv from "ajv";
import addFormatsImport from "ajv-formats";
const addFormats = addFormatsImport as any;
import type { ArrowMapCluster, ClusterOptions, CrossMapArrow, ClusterMapRef } from "./cluster-types.js";

export class ArrowMapClusterIO {
  private static ajv = (() => {
    const instance = new Ajv({ allErrors: true, strict: false });
    addFormats(instance);
    return instance;
  })();
  private static schemaCache: Record<string, unknown> | null = null;

  /**
   * Load the Arrow Map Cluster schema
   */
  private static loadSchema(): Record<string, unknown> {
    if (this.schemaCache) return this.schemaCache;

    const candidates = [
      resolve(process.cwd(), "spec/cluster.schema.json"),
      resolve(dirname(import.meta.dirname), "../../../spec/cluster.schema.json"),
      resolve(dirname(import.meta.dirname), "../../spec/cluster.schema.json"),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const schemaContent = readFileSync(candidate, "utf8");
        const parsed = JSON.parse(schemaContent) as Record<string, unknown>;
        this.schemaCache = parsed;
        return parsed;
      }
    }

    throw new Error("Cluster schema not found. Expected at spec/cluster.schema.json");
  }

  /**
   * Read an Arrow Map Cluster from a YAML file
   */
  static read(path: string): ArrowMapCluster {
    if (!existsSync(path)) {
      throw new Error(`Arrow Map Cluster file not found: ${path}`);
    }

    const content = readFileSync(path, "utf8");
    const doc = yaml.parse(content) as ArrowMapCluster;

    return doc;
  }

  /**
   * Write an Arrow Map Cluster to a YAML file
   */
  static write(path: string, cluster: ArrowMapCluster): void {
    const validation = this.validate(cluster);
    if (!validation.valid) {
      throw new Error(`Invalid cluster: ${validation.errors.join("; ")}`);
    }

    const content = yaml.stringify(cluster, {
      defaultKeyType: "PLAIN",
      defaultStringType: "QUOTE_DOUBLE",
      lineWidth: 0,
    });

    writeFileSync(path, content, "utf8");
  }

  /**
   * Validate an Arrow Map Cluster against the schema
   */
  static validate(cluster: ArrowMapCluster): { valid: boolean; errors: string[] } {
    const schema = this.loadSchema();
    const validate = this.ajv.compile(schema);
    const valid = validate(cluster);

    if (!valid && validate.errors) {
      const errors = validate.errors.map(err => {
        const path = err.instancePath || "(root)";
        return `${path}: ${err.message}`;
      });
      return { valid: false, errors };
    }

    // Additional validation: description is required for all cross_map_arrows
    const descriptionErrors: string[] = [];
    for (const arrow of cluster.cross_map_arrows) {
      if (!arrow.description || arrow.description.length < 10) {
        descriptionErrors.push(`Cross-map arrow '${arrow.id}' missing or too short description (minimum 10 characters)`);
      }
    }

    if (descriptionErrors.length > 0) {
      return { valid: false, errors: descriptionErrors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate an Arrow Map Cluster file
   */
  static validateFile(path: string): { valid: boolean; errors: string[] } {
    const cluster = this.read(path);
    return this.validate(cluster);
  }

  /**
   * Create a new Arrow Map Cluster
   */
  static create(options: {
    id: string;
    name: string;
    description?: string;
    maps: ClusterMapRef[];
    organization?: string;
    team?: string;
  }): ArrowMapCluster {
    return {
      cluster_version: "1.0",
      id: options.id,
      name: options.name,
      description: options.description,
      maps: options.maps,
      cross_map_arrows: [],
      metadata: {
        organization: options.organization,
        team: options.team,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Add a cross-map arrow to a cluster
   */
  static addCrossMapArrow(cluster: ArrowMapCluster, arrow: CrossMapArrow): ArrowMapCluster {
    // Check if arrow with same ID already exists
    if (cluster.cross_map_arrows.find(a => a.id === arrow.id)) {
      throw new Error(`Cross-map arrow with ID '${arrow.id}' already exists in cluster`);
    }

    cluster.cross_map_arrows.push(arrow);
    cluster.metadata = {
      ...cluster.metadata,
      updated_at: new Date().toISOString(),
    };

    return cluster;
  }

  /**
   * Remove a cross-map arrow from a cluster
   */
  static removeCrossMapArrow(cluster: ArrowMapCluster, arrowId: string): ArrowMapCluster {
    cluster.cross_map_arrows = cluster.cross_map_arrows.filter(a => a.id !== arrowId);
    cluster.metadata = {
      ...cluster.metadata,
      updated_at: new Date().toISOString(),
    };

    return cluster;
  }

  /**
   * Find cross-map arrows involving a specific map
   */
  static findArrowsForMap(cluster: ArrowMapCluster, mapIdOrAlias: string): CrossMapArrow[] {
    return cluster.cross_map_arrows.filter(arrow => {
      const fromMatch = arrow.from_map === mapIdOrAlias || arrow.from_map === "*";
      const toMatch = arrow.to_map === mapIdOrAlias || arrow.to_map === "*";
      return fromMatch || toMatch;
    });
  }

  /**
   * Find cross-map arrows involving a specific node
   */
  static findArrowsForNode(cluster: ArrowMapCluster, nodeId: string): CrossMapArrow[] {
    return cluster.cross_map_arrows.filter(arrow => {
      const fromMatch = arrow.from_node === nodeId || arrow.from_node === "*";
      const toMatch = arrow.to_node === nodeId || arrow.to_node === "*";
      return fromMatch || toMatch;
    });
  }

  /**
   * Get a summary of the cluster for display
   */
  static getSummary(cluster: ArrowMapCluster): string {
    const lines: string[] = [
      `Cluster: ${cluster.name} (${cluster.id})`,
      `Version: ${cluster.cluster_version}`,
      `Maps: ${cluster.maps.length}`,
      `Cross-map Arrows: ${cluster.cross_map_arrows.length}`,
      "",
      "Maps included:",
    ];

    for (const map of cluster.maps) {
      const alias = map.alias ? ` (alias: ${map.alias})` : "";
      lines.push(`  - ${map.map_id}@${map.version} [${map.scope}]${alias}`);
    }

    if (cluster.cross_map_arrows.length > 0) {
      lines.push("", "Cross-map arrows:");
      for (const arrow of cluster.cross_map_arrows) {
        const criticality = arrow.criticality ? ` [${arrow.criticality}]` : "";
        lines.push(`  - ${arrow.id}: ${arrow.from_map}/${arrow.from_node} → ${arrow.to_map}/${arrow.to_node}${criticality}`);
      }
    }

    return lines.join("\n");
  }
}