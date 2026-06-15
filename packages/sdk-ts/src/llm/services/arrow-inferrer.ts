import type { LlmClient } from "../client.js";
import type { LlmMessage, ArrowAnalysis, LlmConfig } from "../types.js";
import type { ScanResult } from "../../agent/types.js";
import type { ArrowMapCluster } from "../../arrow-map/cluster-types.js";

export class ArrowInferrer {
  private client: LlmClient;

  constructor(client: LlmClient) {
    this.client = client;
  }

  async inferArrows(project: ScanResult, cluster: ArrowMapCluster): Promise<ArrowAnalysis[]> {
    const existingMaps = cluster.maps?.map((m) => m.map_id) || [];
    const projectName = project.projectName;
    const projectType = project.projectType;
    const dependencies = project.rawImports;
    const frameworks = project.frameworks;

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are an AI agent ecosystem analyst. Your task is to infer arrows (relationships) between projects in an Arrow Map cluster.

Given a project scan result and existing cluster maps, suggest meaningful relationships.

Arrow types to consider:
- dependency: One project depends on another
- information_flow: Information flows from one project to another
- responsibility: One project is responsible for another
- validation: One project validates another
- resource_transfer: Resources are transferred between projects
- influence: One project influences another

Output format (JSON):
[
  {
    "fromNode": "source-project",
    "toNode": "target-project",
    "relationshipType": "dependency|information_flow|responsibility|validation|resource_transfer|influence",
    "description": "Human-readable description of this relationship",
    "confidence": 0.0-1.0
  }
]`,
      },
      {
        role: "user",
        content: `Project: ${projectName}
Type: ${projectType}
Frameworks: ${frameworks.join(", ")}
Dependencies: ${dependencies.join(", ")}

Existing maps in cluster: ${existingMaps.join(", ")}

Suggest arrows from this project to other projects in the cluster. Provide your analysis in JSON format.`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.4,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(response.content) as ArrowAnalysis[];
    } catch {
      return [];
    }
  }

  async generateArrowDescription(
    from: string,
    to: string,
    context: string = ""
  ): Promise<string> {
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are an AI agent that generates clear, concise descriptions for arrows between nodes in an Arrow Map.

Given two nodes and optional context, generate a brief description (20-50 words) explaining the relationship.

Output only the description text, no JSON.`,
      },
      {
        role: "user",
        content: `From: ${from}
To: ${to}
Context: ${context || "No additional context"}

Generate a concise description for this arrow.`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.3,
      maxTokens: 128,
    });

    return response.content.trim();
  }

  async validateArrowSemantics(
    fromNode: string,
    toNode: string,
    arrowType: string
  ): Promise<{ valid: boolean; message: string; suggestions: string[] }> {
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are an arrow semantics validator. Check if an arrow between two nodes makes semantic sense.

Output format (JSON):
{
  "valid": true/false,
  "message": "Explanation of validity",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`,
      },
      {
        role: "user",
        content: `From: ${fromNode}
To: ${toNode}
Arrow Type: ${arrowType}

Is this arrow semantically valid? If not, suggest better types or improvements.`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.2,
      maxTokens: 512,
    });

    try {
      return JSON.parse(response.content) as { valid: boolean; message: string; suggestions: string[] };
    } catch {
      return {
        valid: true,
        message: "Validation inconclusive",
        suggestions: [],
      };
    }
  }
}