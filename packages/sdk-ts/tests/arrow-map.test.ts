import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ArrowMapIO } from "../src/arrow-map/arrow-map.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const TEST_DIR = resolve(process.cwd(), ".test-arrow-map-temp");

describe("ArrowMapIO", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read a valid Arrow Map YAML", () => {
    const yaml = `
arrow_map_version: "0.1.0"
id: "niche:backend-v1"
name: "Backend Service Topology"
description: "Payment API backend architecture"
niche_category: "microservice-backend"
version: "1.0.0"
status: "stable"
nodes:
  - id: "payment-api"
    type: "service"
    name: "Payment API"
    description: "Main payment processing service"
    status: "active"
    labels: ["backend", "payment"]
    tags: ["critical"]
  - id: "auth-service"
    type: "service"
    name: "Auth Service"
    status: "planned"
    labels: ["backend", "auth"]
arrows:
  - id: "pay-auth-dep"
    source: "payment-api"
    target: "auth-service"
    type: "dependency"
    description: "Payment API depends on Auth Service"
    properties:
      reason: "Authentication required for payment processing"
      criticality: "critical"
    metadata:
      discovery_method: "manual"
`;
    const filePath = join(TEST_DIR, "map.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const map = ArrowMapIO.read(filePath);

    expect(map.arrow_map_version).toBe("0.1.0");
    expect(map.id).toBe("niche:backend-v1");
    expect(map.name).toBe("Backend Service Topology");
    expect(map.nodes).toHaveLength(2);
    expect(map.arrows).toHaveLength(1);
    expect(map.arrows[0].type).toBe("dependency");
  });

  it("should round-trip Arrow Map preserving all fields", () => {
    const yaml = `
arrow_map_version: "0.1.0"
id: "test:round-trip"
name: "Round Trip Test"
nodes:
  - id: "node-a"
    type: "service"
    name: "Service A"
    status: "active"
    labels: ["test"]
    tags: ["tag1"]
    metadata:
      created_at: "2026-06-10T00:00:00Z"
  - id: "node-b"
    type: "service"
    name: "Service B"
    status: "planned"
arrows:
  - id: "arrow-1"
    source: "node-a"
    target: "node-b"
    type: "dependency"
    properties:
      reason: "test"
      criticality: "high"
    type_properties:
      dependency_type: "hard"
      failure_mode: "cascade"
    temporal:
      effective_from: "2026-06-10"
    tags: ["critical"]
    metadata:
      discovery_method: "inferred"
      confidence: 0.85
namespaces:
  statuz: "https://statuz.org/nodes/"
  local: "./"
invariants:
  - description: "No circular dependencies"
    severity: "error"
templates:
  - name: "service_port"
    description: "Port number for the service"
    default: 8080
    required: false
extends:
  - map_id: "parent:base-topology"
    version: "1.0.0"
    override: false
storage:
  canonical_path: "./arrow-maps/backend-v1.yaml"
  registry: "statuz.org"
metadata:
  created_at: "2026-06-10T00:00:00Z"
  author: "test"
`;
    const filePath = join(TEST_DIR, "rt.yaml");
    writeFileSync(filePath, yaml, "utf8");

    const map = ArrowMapIO.read(filePath);
    const outputPath = join(TEST_DIR, "rt-out.yaml");
    ArrowMapIO.write(outputPath, map);

    const readBack = ArrowMapIO.read(outputPath);
    expect(readBack).toEqual(map);
    expect(readBack.namespaces).toBeDefined();
    expect(readBack.invariants).toHaveLength(1);
    expect(readBack.templates).toHaveLength(1);
    expect(readBack.extends).toHaveLength(1);
    expect(readBack.storage).toBeDefined();
    expect(readBack.metadata).toBeDefined();
  });

  it("should validate a valid Arrow Map", () => {
    const map = {
      arrow_map_version: "0.1.0" as const,
      id: "test:validate",
      nodes: [{ id: "n1", type: "service" }],
      arrows: [],
    };

    const result = ArrowMapIO.validate(map);
    expect(result.valid).toBe(true);
  });

  it("should reject an Arrow Map missing required fields", () => {
    const map = {
      arrow_map_version: "0.1.0" as const,
      id: "test:invalid",
    };

    const result = ArrowMapIO.validate(map);
    expect(result.valid).toBe(false);
  });
});
