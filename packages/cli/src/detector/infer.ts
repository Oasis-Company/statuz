import type { Arrow, ArrowMap } from "../arrow-map/types.js";

export interface InferredArrow {
  arrow: Arrow;
  inference_type: "transitive" | "symmetry" | "completeness" | "pattern";
  explanation: string;
}

export function inferArrows(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];

  inferred.push(...inferTransitive(arrowMap));
  inferred.push(...inferSymmetry(arrowMap));
  inferred.push(...inferCompleteness(arrowMap));

  return inferred;
}

function inferTransitive(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  const arrows = arrowMap.arrows;

  // If A→B and B→C, suggest A→C
  for (const ab of arrows) {
    if (ab.type !== "dependency") continue;

    for (const bc of arrows) {
      if (bc.type !== "dependency") continue;
      if (ab.target !== bc.source) continue;

      // Check if A→C already exists
      const exists = arrows.some(
        (a) =>
          a.source === ab.source &&
          a.target === bc.target &&
          a.type === "dependency"
      );

      if (!exists) {
        const arrow: Arrow = {
          id: `inferred-transitive-${ab.source}-${bc.target}`,
          source: ab.source,
          target: bc.target,
          type: "dependency",
          properties: {
            reason: `Inferred transitive dependency: ${ab.source} → ${ab.target} → ${bc.target}`,
            criticality: "medium",
            weight: 0.6,
          },
          metadata: {
            confidence: 0.6,
            discovery_method: "inferred",
            discovered_at: new Date().toISOString(),
          },
        };

        inferred.push({
          arrow,
          inference_type: "transitive",
          explanation: `Transitive closure: ${ab.source} → ${ab.target} → ${bc.target} suggests ${ab.source} → ${bc.target}`,
        });
      }
    }
  }

  return inferred;
}

function inferSymmetry(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];
  const arrows = arrowMap.arrows;

  // If A validates B, suggest B informs A
  for (const arrow of arrows) {
    if (arrow.type !== "validation") continue;

    const exists = arrows.some(
      (a) =>
        a.source === arrow.target &&
        a.target === arrow.source &&
        a.type === "information_flow"
    );

    if (!exists) {
      const suggested: Arrow = {
        id: `inferred-symmetry-${arrow.target}-${arrow.source}`,
        source: arrow.target,
        target: arrow.source,
        type: "information_flow",
        properties: {
          reason: `Inferred symmetry: ${arrow.source} validates ${arrow.target}, so ${arrow.target} should inform ${arrow.source}`,
          criticality: "low",
          weight: 0.5,
        },
        metadata: {
          confidence: 0.5,
          discovery_method: "inferred",
          discovered_at: new Date().toISOString(),
        },
      };

      inferred.push({
        arrow: suggested,
        inference_type: "symmetry",
        explanation: `Symmetry: ${arrow.source} validates ${arrow.target} → ${arrow.target} should inform ${arrow.source}`,
      });
    }
  }

  return inferred;
}

function inferCompleteness(arrowMap: ArrowMap): InferredArrow[] {
  const inferred: InferredArrow[] = [];

  // Find nodes with no incoming arrows (potential orphans)
  for (const node of arrowMap.nodes) {
    const hasIncoming = arrowMap.arrows.some((a) => a.target === node.id);

    if (!hasIncoming && node.type !== "project") {
      const arrow: Arrow = {
        id: `inferred-completeness-${node.id}`,
        source: "unknown",
        target: node.id,
        type: "dependency",
        properties: {
          reason: `Inferred completeness check: ${node.id} has no incoming arrows — something must depend on it or it is orphaned`,
          criticality: "low",
          weight: 0.3,
        },
        metadata: {
          confidence: 0.3,
          discovery_method: "inferred",
          discovered_at: new Date().toISOString(),
        },
      };

      inferred.push({
        arrow,
        inference_type: "completeness",
        explanation: `Completeness check: ${node.id} has no incoming arrows — may be orphaned`,
      });
    }
  }

  return inferred;
}
