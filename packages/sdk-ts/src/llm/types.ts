export type LlmProvider = "openai" | "anthropic" | "custom";

export type LlmRole = "system" | "user" | "assistant" | "tool";

export interface LlmMessage {
  role: LlmRole;
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface LlmTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface LlmUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LlmResponse {
  content: string;
  usage?: LlmUsage;
  finish_reason?: string;
  tool_calls?: LlmToolCall[];
}

export interface LlmStreamChunk {
  content: string;
  is_done: boolean;
  usage?: LlmUsage;
}

export interface LlmConfig {
  enabled: boolean;
  provider: LlmProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  services?: Record<string, Partial<Omit<LlmConfig, "enabled" | "provider">>>;
}

export interface LlmServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface NicheAnalysis {
  purpose: string;
  keyFeatures: string[];
  targetDomain: string;
  valueProposition: string;
  competitiveAdvantage?: string;
}

export interface ArrowAnalysis {
  fromNode: string;
  toNode: string;
  relationshipType: string;
  description: string;
  confidence: number;
}

export interface CodeAnalysis {
  dependencies: string[];
  projectType: string;
  purpose: string;
  keyFunctions: string[];
}

export interface LlmError extends Error {
  code?: string;
  status?: number;
  retryable: boolean;
}