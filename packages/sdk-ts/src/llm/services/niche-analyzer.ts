import type { LlmClient } from "../client.js";
import type { LlmMessage, NicheAnalysis, LlmConfig } from "../types.js";
import type { NicheManifest } from "../../niche/types.js";

export class NicheAnalyzer {
  private client: LlmClient;

  constructor(client: LlmClient) {
    this.client = client;
  }

  async analyzeProjectPurpose(readme: string, codeSamples: string[] = []): Promise<NicheAnalysis> {
    const codeContext = codeSamples.slice(0, 3).map((code, i) => {
      return `\n=== Code Sample ${i + 1} ===\n${code.slice(0, 500)}`;
    }).join("\n");

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are an AI agent ecosystem analyst. Your task is to analyze a software project and extract its purpose and positioning.

Output format:
{
  "purpose": "Brief description of what this project does",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "targetDomain": "The domain/industry this project targets",
  "valueProposition": "What value this project provides",
  "competitiveAdvantage": "Unique differentiator (optional)"
}`,
      },
      {
        role: "user",
        content: `Analyze this project to understand its purpose and positioning.

README content:
${readme.slice(0, 2000)}

Code samples:
${codeContext}

Provide your analysis in JSON format.`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.3,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(response.content) as NicheAnalysis;
    } catch {
      return {
        purpose: response.content,
        keyFeatures: [],
        targetDomain: "general",
        valueProposition: response.content,
      };
    }
  }

  async generatePositioning(analysis: NicheAnalysis): Promise<{ does: string[]; doesNot: string[] }> {
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are an AI agent ecosystem niche specialist. Given a project analysis, generate a positioning statement that describes what the project does (DOES) and what it does NOT do (DOES_NOT).

DOES statements should describe the project's core capabilities and responsibilities.
DOES_NOT statements should describe what the project intentionally avoids or delegates to others.

Output format (JSON):
{
  "does": ["statement 1", "statement 2", "statement 3"],
  "doesNot": ["statement 1", "statement 2", "statement 3"]
}

Each statement should be concise (under 20 words) and declarative.`,
      },
      {
        role: "user",
        content: `Generate positioning statements for this project:

Purpose: ${analysis.purpose}
Key Features: ${analysis.keyFeatures.join(", ")}
Target Domain: ${analysis.targetDomain}
Value Proposition: ${analysis.valueProposition}

Provide DOES and DOES_NOT statements in JSON format.`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.4,
      maxTokens: 1024,
    });

    try {
      return JSON.parse(response.content) as { does: string[]; doesNot: string[] };
    } catch {
      return {
        does: [analysis.purpose],
        doesNot: [],
      };
    }
  }

  async validateNicheChanges(current: NicheManifest, newInfo: string): Promise<{ valid: boolean; message: string }> {
    const currentPositioning = current.declared_position || { does: [], does_not: [] };
    const currentDoes = currentPositioning.does || [];
    const currentDoesNot = currentPositioning.does_not || [];

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: `You are a niche drift detector. Compare the current niche positioning with new information and determine if there's significant drift.

Respond in JSON format:
{
  "valid": true/false,
  "message": "Explanation of why the changes are valid or invalid"
}

Consider changes valid if they:
- Expand on existing positioning
- Add new features that align with core purpose
- Clarify existing statements

Consider changes invalid if they:
- Contradict existing DOES statements
- Add DOES statements that conflict with DOES_NOT statements
- Represent a major pivot away from core purpose`,
      },
      {
        role: "user",
        content: `Current DOES: ${currentDoes.join(", ")}
Current DOES_NOT: ${currentDoesNot.join(", ")}

New information: ${newInfo}

Is this new information consistent with the current niche positioning?`,
      },
    ];

    const response = await this.client.chat(messages, {
      temperature: 0.2,
      maxTokens: 512,
    });

    try {
      return JSON.parse(response.content) as { valid: boolean; message: string };
    } catch {
      return { valid: true, message: "Validation inconclusive, assuming valid" };
    }
  }
}