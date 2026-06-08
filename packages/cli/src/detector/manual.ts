import * as readline from "node:readline";
import type { Arrow, StatuNode } from "../arrow-map/types.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

export async function detectManual(): Promise<void> {
  console.log("🔍 Manual Arrow Detection");
  console.log("Answer the following questions to discover arrows.\n");

  const nodeId = await ask("What node are we examining? (e.g., auth-service): ");
  const nodeName = await ask(`What is the name of "${nodeId}"? (optional): `);

  const node: StatuNode = {
    id: nodeId,
    type: "component",
    name: nodeName || nodeId,
  };

  const arrows: Arrow[] = [];

  const dependents = await ask(
    `\n1. What depends on "${nodeId}"? (comma-separated, or "none"): `
  );
  if (dependents !== "none" && dependents !== "") {
    for (const dep of dependents.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: dep,
        target: nodeId,
        type: "dependency",
        properties: {
          reason: `Discovered: ${dep} depends on ${nodeId}`,
          criticality: "high",
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  const dependencies = await ask(
    `2. What does "${nodeId}" depend on? (comma-separated, or "none"): `
  );
  if (dependencies !== "none" && dependencies !== "") {
    for (const dep of dependencies.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: nodeId,
        target: dep,
        type: "dependency",
        properties: {
          reason: `Discovered: ${nodeId} depends on ${dep}`,
          criticality: "high",
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  const validators = await ask(
    `3. Who validates "${nodeId}"? (comma-separated, or "none"): `
  );
  if (validators !== "none" && validators !== "") {
    for (const validator of validators.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: validator,
        target: nodeId,
        type: "validation",
        properties: {
          reason: `Discovered: ${validator} validates ${nodeId}`,
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  const infoIn = await ask(
    `4. What information flows INTO "${nodeId}"? (comma-separated, or "none"): `
  );
  if (infoIn !== "none" && infoIn !== "") {
    for (const source of infoIn.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: source,
        target: nodeId,
        type: "information_flow",
        properties: {
          reason: `Discovered: information flows from ${source} to ${nodeId}`,
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  const infoOut = await ask(
    `5. What information flows OUT OF "${nodeId}"? (comma-separated, or "none"): `
  );
  if (infoOut !== "none" && infoOut !== "") {
    for (const target of infoOut.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: nodeId,
        target: target,
        type: "information_flow",
        properties: {
          reason: `Discovered: information flows from ${nodeId} to ${target}`,
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  const constraints = await ask(
    `6. What constraints apply to "${nodeId}"? (comma-separated, or "none"): `
  );
  if (constraints !== "none" && constraints !== "") {
    for (const constraint of constraints.split(",").map((s) => s.trim())) {
      arrows.push({
        id: `arrow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        source: constraint,
        target: nodeId,
        type: "constraint",
        properties: {
          reason: `Discovered: ${constraint} constrains ${nodeId}`,
        },
        metadata: {
          confidence: 1.0,
          discovery_method: "manual",
          discovered_at: new Date().toISOString(),
        },
      });
    }
  }

  rl.close();

  console.log(`\n✅ Discovered ${arrows.length} arrows:`);
  for (const arrow of arrows) {
    console.log(`   ${arrow.type}: ${arrow.source} → ${arrow.target}`);
  }
  console.log("\n💡 Next step: Add these to an Arrow Map file!");
}
